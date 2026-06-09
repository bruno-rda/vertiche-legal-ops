import { http, HttpResponse } from 'msw';
import { mockAlertas } from '../data/alertas';
import { getUserFromRequest } from '../utils';

export const alertasHandlers = [
  http.get('*/api/alertas', ({ request }) => {
    const url = new URL(request.url);
    const severidad = url.searchParams.get('severidad');
    const tipo = url.searchParams.get('tipo');
    const silenciada = url.searchParams.get('silenciada');
    const resuelta = url.searchParams.get('resuelta');
    const tiendaId = url.searchParams.get('tienda_id');
    const search = url.searchParams.get('search')?.toLowerCase();

    let filtered = [...mockAlertas];

    const user = getUserFromRequest(request);
    if (user?.rol === 'OPERATOR' && user.tiendas_asignadas) {
      filtered = filtered.filter((a) => user.tiendas_asignadas!.includes(a.tienda_id));
    }

    if (search) {
      filtered = filtered.filter(
        (a) =>
          a.mensaje.toLowerCase().includes(search) ||
          (a.tienda_nombre && a.tienda_nombre.toLowerCase().includes(search)) ||
          (a.tramite_nombre && a.tramite_nombre.toLowerCase().includes(search)),
      );
    }

    if (severidad) filtered = filtered.filter((a) => a.severidad === severidad);
    if (tipo) filtered = filtered.filter((a) => a.tipo === tipo);
    if (silenciada !== null && silenciada !== undefined) {
      filtered = filtered.filter((a) => a.silenciada === (silenciada === 'true'));
    }
    if (resuelta !== null && resuelta !== undefined) {
      filtered = filtered.filter((a) => !!a.resuelta === (resuelta === 'true'));
    }
    if (tiendaId) filtered = filtered.filter((a) => a.tienda_id === tiendaId);

    return HttpResponse.json(filtered);
  }),

  http.post('*/api/alertas/:id/silenciar', async ({ params, request }) => {
    const body = (await request.json()) as { duracion_dias: number; nota?: string };
    const index = mockAlertas.findIndex((a) => a.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ detail: 'Alerta no encontrada' }, { status: 404 });
    }

    mockAlertas[index] = {
      ...mockAlertas[index],
      silenciada: true,
      silenciada_hasta: new Date(Date.now() + body.duracion_dias * 86400000).toISOString(),
      silenciada_por: 'usr-001',
    };

    return HttpResponse.json(mockAlertas[index]);
  }),

  http.post('*/api/alertas/:id/resolver', async ({ params }) => {
    const index = mockAlertas.findIndex((a) => a.id === params.id);
    if (index === -1) return HttpResponse.json({ detail: 'Alerta no encontrada' }, { status: 404 });

    mockAlertas[index] = {
      ...mockAlertas[index],
      silenciada: false,
      resuelta: true,
      fecha_resolucion: new Date().toISOString(),
      resuelta_por: 'usr-001',
    };
    return HttpResponse.json(mockAlertas[index]);
  }),

  http.post('*/api/alertas/:id/reactivar', async ({ params }) => {
    const index = mockAlertas.findIndex((a) => a.id === params.id);
    if (index === -1) return HttpResponse.json({ detail: 'Alerta no encontrada' }, { status: 404 });

    mockAlertas[index] = {
      ...mockAlertas[index],
      silenciada: false,
      silenciada_hasta: undefined,
      silenciada_por: undefined,
    };
    return HttpResponse.json(mockAlertas[index]);
  }),

  http.post('*/api/alertas/:id/notificar/:canal', async ({ params }) => {
    const index = mockAlertas.findIndex((a) => a.id === params.id);
    if (index === -1) return HttpResponse.json({ detail: 'Alerta no encontrada' }, { status: 404 });

    await new Promise((r) => setTimeout(r, 800));

    const canal = params.canal as 'email' | 'whatsapp';
    mockAlertas[index] = {
      ...mockAlertas[index],
      notificaciones_enviadas: {
        ...(mockAlertas[index].notificaciones_enviadas || { email: false, whatsapp: false }),
        [canal]: true,
      },
    };
    return HttpResponse.json(mockAlertas[index]);
  }),

  // Count of active critical alerts (for sidebar badge)
  http.get('*/api/alertas/count', ({ request }) => {
    let alertas = [...mockAlertas];
    const user = getUserFromRequest(request);

    if (user?.rol === 'OPERATOR' && user.tiendas_asignadas) {
      alertas = alertas.filter((a) => user.tiendas_asignadas!.includes(a.tienda_id));
    }

    const criticalCount = alertas.filter(
      (a) => !a.silenciada && !a.resuelta && a.severidad === 'critical',
    ).length;
    return HttpResponse.json({ count: criticalCount });
  }),
];
