import { http, HttpResponse } from 'msw';
import { mockAlertas } from '../data/alertas';

// Keep a mutable copy for silencing
let alertas = [...mockAlertas];

export const alertasHandlers = [
  http.get('*/api/alertas', ({ request }) => {
    const url = new URL(request.url);
    const severidad = url.searchParams.get('severidad');
    const tipo = url.searchParams.get('tipo');
    const silenciada = url.searchParams.get('silenciada');
    const tiendaId = url.searchParams.get('tienda_id');

    let filtered = [...alertas];

    if (severidad) filtered = filtered.filter((a) => a.severidad === severidad);
    if (tipo) filtered = filtered.filter((a) => a.tipo === tipo);
    if (silenciada !== null && silenciada !== undefined) {
      filtered = filtered.filter((a) => a.silenciada === (silenciada === 'true'));
    }
    if (tiendaId) filtered = filtered.filter((a) => a.tienda_id === tiendaId);

    return HttpResponse.json(filtered);
  }),

  http.post('*/api/alertas/:id/silenciar', async ({ params, request }) => {
    const body = await request.json() as { duracion_dias: number; nota?: string };
    const index = alertas.findIndex((a) => a.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ detail: 'Alerta no encontrada' }, { status: 404 });
    }

    alertas[index] = {
      ...alertas[index],
      silenciada: true,
      silenciada_hasta: new Date(Date.now() + body.duracion_dias * 86400000).toISOString(),
      silenciada_por: 'usr-001',
    };

    return HttpResponse.json(alertas[index]);
  }),

  // Count of active critical alerts (for sidebar badge)
  http.get('*/api/alertas/count', () => {
    const criticalCount = alertas.filter((a) => !a.silenciada && a.severidad === 'critical').length;
    return HttpResponse.json({ count: criticalCount });
  }),
];
