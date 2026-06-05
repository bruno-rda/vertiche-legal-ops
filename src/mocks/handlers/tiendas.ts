import { http, HttpResponse } from 'msw';
import { mockTiendas } from '../data/tiendas';
import { mockTramites } from '../data/tramites';
import { mockAlertas } from '../data/alertas';
import { mockDocumentos } from '../data/documentos';
import type { CumplimientoEstado } from '@/types';

export const tiendasHandlers = [
  // GET /api/tiendas — paginated, filterable, sortable list
  http.get('*/api/tiendas', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('page_size') || '25');
    const search = url.searchParams.get('search')?.toLowerCase();
    const estado = url.searchParams.get('estado');
    const estadoCumplimiento = url.searchParams.get('estado_cumplimiento');
    const sortBy = url.searchParams.get('sort_by') || 'nombre';
    const sortOrder = url.searchParams.get('sort_order') || 'asc';

    let filtered = [...mockTiendas];

    if (search) {
      filtered = filtered.filter(
        (t) =>
          t.nombre.toLowerCase().includes(search) ||
          t.municipio.toLowerCase().includes(search)
      );
    }
    if (estado) {
      filtered = filtered.filter((t) => t.estado === estado);
    }
    if (estadoCumplimiento) {
      filtered = filtered.filter((t) => t.estado_cumplimiento === estadoCumplimiento);
    }

    // Sort
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'nombre') cmp = a.nombre.localeCompare(b.nombre);
      else if (sortBy === 'cumplimiento') cmp = a.cumplimiento - b.cumplimiento;
      else if (sortBy === 'tramites_vencidos') cmp = a.tramites_vencidos - b.tramites_vencidos;
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return HttpResponse.json({
      data,
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    });
  }),

  // GET /api/tiendas/:id
  http.get('*/api/tiendas/:id', ({ params }) => {
    const tienda = mockTiendas.find((t) => t.id === params.id);
    if (!tienda) {
      return HttpResponse.json({ detail: 'Tienda no encontrada' }, { status: 404 });
    }
    return HttpResponse.json(tienda);
  }),

  // PUT /api/tiendas/:id
  http.put('*/api/tiendas/:id', async ({ request, params }) => {
    const tienda = mockTiendas.find((t) => t.id === params.id);
    if (!tienda) {
      return HttpResponse.json({ detail: 'Tienda no encontrada' }, { status: 404 });
    }

    const data = await request.json() as any;
    
    // Update basic fields
    if (data.nombre) tienda.nombre = data.nombre;
    if (data.estado) tienda.estado = data.estado;
    if (data.municipio) tienda.municipio = data.municipio;
    if (data.direccion) tienda.direccion = data.direccion;

    // Ideally, we'd add to the history mock here, but since the history mock is regenerated per request, we'll just return the updated tienda.
    return HttpResponse.json(tienda);
  }),

  // GET /api/tiendas/:id/expediente
  http.get('*/api/tiendas/:id/expediente', ({ params }) => {
    const tramites = mockTramites.filter((t) => t.tienda_id === params.id);
    const vigentes = tramites.filter((t) => t.estado === 'vigente').length;
    const cumplimiento = tramites.length > 0 ? Math.round((vigentes / tramites.length) * 100) : 0;

    return HttpResponse.json({
      id: `exp-${params.id}`,
      tienda_id: params.id,
      tramites,
      cumplimiento,
      ultima_actualizacion: new Date().toISOString(),
    });
  }),

  // POST /api/tiendas/:id/tramites
  http.post('*/api/tiendas/:id/tramites', async ({ request, params }) => {
    const tienda = mockTiendas.find((t) => t.id === params.id);
    if (!tienda) {
      return HttpResponse.json({ detail: 'Tienda no encontrada' }, { status: 404 });
    }

    const data = await request.json() as any;

    const newTramite = {
      id: `tramite-${Date.now()}`,
      tienda_id: tienda.id,
      tienda_nombre: tienda.nombre,
      nombre: data.nombre,
      tipo: data.tipo,
      estado: 'pendiente_documentacion' as const,
      fecha_inicio: data.fecha_inicio,
      fecha_vencimiento: data.es_permanente ? '' : data.fecha_vencimiento,
      es_permanente: data.es_permanente,
      es_recurrente: data.es_recurrente,
      periodo_recurrencia: data.es_recurrente ? data.periodo_recurrencia : undefined,
      observaciones: [],
      documentos: [],
      historial: [{
        id: `hist-new-${Date.now()}`,
        entidad_tipo: 'tramite',
        entidad_id: `tramite-${Date.now()}`,
        accion: 'tramite_creado',
        usuario_id: 'usr-admin',
        usuario_nombre: 'Admin User',
        fecha: new Date().toISOString(),
        detalle: 'Trámite creado manualmente',
      }],
    };

    mockTramites.push(newTramite as any);

    return HttpResponse.json(newTramite, { status: 201 });
  }),

  // GET /api/tiendas/:id/alertas
  http.get('*/api/tiendas/:id/alertas', ({ params }) => {
    const alertas = mockAlertas.filter((a) => a.tienda_id === params.id);
    return HttpResponse.json(alertas);
  }),

  // GET /api/tiendas/:id/documentos
  http.get('*/api/tiendas/:id/documentos', ({ params }) => {
    const docs = mockDocumentos.filter((d) => d.tienda_id === params.id);
    return HttpResponse.json(docs);
  }),

  // GET /api/tiendas/:id/historial
  http.get('*/api/tiendas/:id/historial', ({ params }) => {
    const tienda = mockTiendas.find((t) => t.id === params.id);
    if (!tienda) return HttpResponse.json([]);

    // Generate some mock history
    const historial = [
      {
        id: `hist-${params.id}-1`,
        entidad_tipo: 'tramite',
        entidad_id: `tramite-0001`,
        accion: 'documento_cargado',
        usuario_id: 'usr-001',
        usuario_nombre: 'Ana García López',
        fecha: new Date(Date.now() - 2 * 86400000).toISOString(),
        detalle: 'Se cargó Licencia_Funcionamiento_2025.pdf',
      },
      {
        id: `hist-${params.id}-2`,
        entidad_tipo: 'tramite',
        entidad_id: `tramite-0002`,
        accion: 'estado_cambiado',
        usuario_id: 'usr-001',
        usuario_nombre: 'Ana García López',
        fecha: new Date(Date.now() - 5 * 86400000).toISOString(),
        detalle: 'Estado cambiado de "En revisión" a "Vigente"',
        valor_anterior: 'en_revision',
        valor_nuevo: 'vigente',
      },
      {
        id: `hist-${params.id}-3`,
        entidad_tipo: 'documento',
        entidad_id: `doc-0001`,
        accion: 'datos_modificados',
        usuario_id: 'usr-002',
        usuario_nombre: 'Carlos Mendoza Ruiz',
        fecha: new Date(Date.now() - 10 * 86400000).toISOString(),
        detalle: 'Se corrigieron datos de OCR: fecha de vigencia actualizada',
      },
    ];

    return HttpResponse.json(historial);
  }),
];

// Dashboard-specific handler
export const dashboardHandlers = [
  http.get('*/api/dashboard/metrics', () => {
    const total = mockTiendas.length;
    const enCumplimiento = mockTiendas.filter((t) => t.estado_cumplimiento === 'vigente').length;
    const porVencer = mockTiendas.filter((t) => t.tramites_por_vencer > 0).length;
    const enRiesgo = mockTiendas.filter((t) => t.estado_cumplimiento === 'critico').length;

    return HttpResponse.json({
      total_tiendas: total,
      en_cumplimiento: enCumplimiento,
      por_vencer: porVencer,
      en_riesgo_critico: enRiesgo,
      porcentaje_cumplimiento: Math.round((enCumplimiento / total) * 100),
    });
  }),

  http.get('*/api/dashboard/cumplimiento-por-estado', () => {
    const byState = new Map<string, { tiendas: number; cumplimientoSum: number; criticos: number }>();

    mockTiendas.forEach((t) => {
      const current = byState.get(t.estado) || { tiendas: 0, cumplimientoSum: 0, criticos: 0 };
      current.tiendas++;
      current.cumplimientoSum += t.cumplimiento;
      if (t.estado_cumplimiento === 'critico') current.criticos++;
      byState.set(t.estado, current);
    });

    const result: CumplimientoEstado[] = Array.from(byState.entries()).map(([estado, data]) => ({
      estado,
      total_tiendas: data.tiendas,
      cumplimiento: Math.round(data.cumplimientoSum / data.tiendas),
      tramites_criticos: data.criticos,
    }));

    result.sort((a, b) => a.cumplimiento - b.cumplimiento);

    return HttpResponse.json(result);
  }),

  http.get('*/api/dashboard/alertas-recientes', () => {
    const activas = mockAlertas.filter((a) => !a.silenciada).slice(0, 10);
    return HttpResponse.json(activas);
  }),

  http.get('*/api/dashboard/tramites-proximos', () => {
    const proximos = mockTramites
      .filter((t) => t.estado === 'por_vencer' || t.estado === 'vencido')
      .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())
      .slice(0, 10);
    return HttpResponse.json(proximos);
  }),
];
