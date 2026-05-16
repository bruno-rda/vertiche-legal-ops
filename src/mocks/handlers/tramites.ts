import { http, HttpResponse } from 'msw';
import { mockTramites } from '../data/tramites';
import { mockTiendas } from '../data/tiendas';

export const tramitesHandlers = [
  // GET /api/tramites — global list with filters
  http.get('*/api/tramites', ({ request }) => {
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

    if (search) {
      filtered = filtered.filter(
        (t) =>
          t.nombre.toLowerCase().includes(search) ||
          (t.tienda_nombre?.toLowerCase().includes(search) ?? false)
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
      const tiendaIds = new Set(
        mockTiendas.filter((s) => s.estado === estadoGeo).map((s) => s.id)
      );
      filtered = filtered.filter((t) => tiendaIds.has(t.tienda_id));
    }

    // Default sort: by expiration ascending
    filtered.sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime());

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return HttpResponse.json({ data, total, page, page_size: pageSize, total_pages: totalPages });
  }),

  // GET /api/tramites/:id
  http.get('*/api/tramites/:id', ({ params }) => {
    const tramite = mockTramites.find((t) => t.id === params.id);
    if (!tramite) {
      return HttpResponse.json({ detail: 'Trámite no encontrado' }, { status: 404 });
    }

    // Enrich with mock observaciones and historial
    return HttpResponse.json({
      ...tramite,
      observaciones: [
        {
          id: `obs-${tramite.id}-1`,
          descripcion: 'La fecha de vigencia del documento no coincide con la registrada en el sistema.',
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
];
