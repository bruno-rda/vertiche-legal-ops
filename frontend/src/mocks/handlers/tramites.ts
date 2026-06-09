import { http, HttpResponse } from 'msw';
import { mockTramites } from '../data/tramites';
import { mockTiendas } from '../data/tiendas';
import { getUserFromRequest } from '../utils';

export const tramitesHandlers = [
  // GET /api/tramites — global list with filters
  http.get('*/api/tramites', async ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('page_size') || '25');
    const search = url.searchParams.get('search')?.toLowerCase();
    const estado = url.searchParams.get('estado');
    const tipo = url.searchParams.get('tipo');
    const estadoGeo = url.searchParams.get('estado_geografico');
    const soloVencidos = url.searchParams.get('solo_vencidos') === 'true';
    const porVencerDias = url.searchParams.get('por_vencer_dias');

    let filtered = [...mockTramites];

    const user = getUserFromRequest(request);
    if (user?.rol === 'OPERATOR' && user.tiendas_asignadas) {
      filtered = filtered.filter((t) => user.tiendas_asignadas!.includes(t.tienda_id));
    }

    if (search) {
      filtered = filtered.filter(
        (t) =>
          t.nombre.toLowerCase().includes(search) ||
          (t.tienda_nombre?.toLowerCase().includes(search) ?? false),
      );
    }
    if (estado) filtered = filtered.filter((t) => t.estado === estado);
    if (tipo) filtered = filtered.filter((t) => t.tipo === tipo);
    if (soloVencidos) filtered = filtered.filter((t) => t.estado === 'vencido');
    if (porVencerDias) {
      const days = parseInt(porVencerDias);
      const limit = new Date();
      limit.setDate(limit.getDate() + days);
      filtered = filtered.filter((t) => {
        const venc = new Date(t.fecha_vencimiento);
        return venc <= limit && t.estado !== 'vencido';
      });
    }

    // Filter by geographic state (requires looking up the tienda)
    if (estadoGeo) {
      const tiendaIds = new Set(mockTiendas.filter((s) => s.estado === estadoGeo).map((s) => s.id));
      filtered = filtered.filter((t) => tiendaIds.has(t.tienda_id));
    }

    // Default sort: by expiration ascending
    filtered.sort(
      (a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime(),
    );

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    let data = filtered.slice(start, start + pageSize);

    // Inject up-to-date documents to accurately reflect associations
    const { mockDocumentos } = await import('../data/documentos');
    data = data.map((t) => ({
      ...t,
      documentos: mockDocumentos.filter((d) => d.tramite_ids.includes(t.id)),
    }));

    return HttpResponse.json({ data, total, page, page_size: pageSize, total_pages: totalPages });
  }),

  // GET /api/tramites/:id
  http.get('*/api/tramites/:id', async ({ params }) => {
    const tramite = mockTramites.find((t) => t.id === params.id);
    if (!tramite) {
      return HttpResponse.json({ detail: 'Trámite no encontrado' }, { status: 404 });
    }

    const { mockDocumentos } = await import('../data/documentos');
    const upToDateDocs = mockDocumentos.filter((d) => d.tramite_ids.includes(tramite.id));

    // Enrich with mock observaciones and historial
    return HttpResponse.json({
      ...tramite,
      documentos: upToDateDocs,
      observaciones: [
        {
          id: `obs-${tramite.id}-1`,
          descripcion:
            'La fecha de vigencia del documento no coincide con la registrada en el sistema.',
          severidad: 'warning',
          fecha: new Date(Date.now() - 3 * 86400000).toISOString(),
        },
      ],
      historial: [
        {
          id: `hist-${tramite.id}-1`,
          entidad_tipo: 'tramite',
          entidad_id: tramite.id,
          accion: 'estado_cambiado',
          usuario_id: 'usr-001',
          usuario_nombre: 'Ana García López',
          fecha: new Date(Date.now() - 7 * 86400000).toISOString(),
          detalle: 'Estado cambiado a "En revisión"',
        },
        {
          id: `hist-${tramite.id}-2`,
          entidad_tipo: 'tramite',
          entidad_id: tramite.id,
          accion: 'documento_cargado',
          usuario_id: 'usr-002',
          usuario_nombre: 'Carlos Mendoza Ruiz',
          fecha: new Date(Date.now() - 14 * 86400000).toISOString(),
          detalle: 'Se cargó documento de respaldo',
        },
      ],
    });
  }),

  // PUT /api/tramites/:id
  http.put('*/api/tramites/:id', async ({ request, params }) => {
    const tramiteIndex = mockTramites.findIndex((t) => t.id === params.id);
    if (tramiteIndex === -1) {
      return HttpResponse.json({ detail: 'Trámite no encontrado' }, { status: 404 });
    }

    const updates = (await request.json()) as any;
    const tramite = mockTramites[tramiteIndex];

    // Update fields
    if (updates.nombre !== undefined) tramite.nombre = updates.nombre;
    if (updates.fecha_inicio !== undefined) tramite.fecha_inicio = updates.fecha_inicio;
    if (updates.fecha_vencimiento !== undefined)
      tramite.fecha_vencimiento = updates.fecha_vencimiento;
    if (updates.es_permanente !== undefined) {
      tramite.es_permanente = updates.es_permanente;
      if (tramite.es_permanente) {
        tramite.fecha_vencimiento = '';
        tramite.estado = 'vigente'; // Permanente doesn't expire
      }
    }

    // Calculate new status if not permanente
    if (!tramite.es_permanente && tramite.fecha_vencimiento) {
      const days = Math.ceil(
        (new Date(tramite.fecha_vencimiento).getTime() - new Date().getTime()) / (1000 * 3600 * 24),
      );
      if (days < 0) tramite.estado = 'vencido';
      else if (days <= 15) tramite.estado = 'por_vencer';
      else if (tramite.estado === 'vencido' || tramite.estado === 'por_vencer')
        tramite.estado = 'vigente';
    }

    // In a real app we'd add to historial here
    if (!tramite.historial) tramite.historial = [];
    tramite.historial.unshift({
      id: `hist-${tramite.id}-${Date.now()}`,
      entidad_tipo: 'tramite',
      entidad_id: tramite.id,
      accion: 'tramite_actualizado',
      usuario_id: 'usr-admin',
      usuario_nombre: 'Admin User',
      fecha: new Date().toISOString(),
      detalle: 'Detalles del trámite actualizados',
    });

    return HttpResponse.json(tramite);
  }),
];
