import { http, HttpResponse } from 'msw';
import { mockUsers } from '../data/users';
import { mockTiendas } from '../data/tiendas';
import { mockTramites } from '../data/tramites';

export const usuariosHandlers = [
  http.get('*/api/usuarios', ({ request }) => {
    const url = new URL(request.url);
    const rol = url.searchParams.get('rol');
    const search = url.searchParams.get('search')?.toLowerCase();

    let filtered = [...mockUsers];

    if (rol) {
      filtered = filtered.filter((u) => u.rol === rol);
    }
    if (search) {
      filtered = filtered.filter(
        (u) => u.nombre.toLowerCase().includes(search) || u.email.toLowerCase().includes(search),
      );
    }

    // Don't send passwords
    const safeUsers = filtered.map(({ password: _, ...u }) => u);

    return HttpResponse.json(safeUsers);
  }),

  http.get('*/api/usuarios/:id', ({ params }) => {
    const { id } = params;
    const user = mockUsers.find((u) => u.id === id);

    if (!user) {
      return new HttpResponse(null, { status: 404 });
    }

    const { password: _, ...safeUser } = user;
    return HttpResponse.json(safeUser);
  }),

  http.delete('*/api/usuarios/:id', ({ params }) => {
    const { id } = params;
    const userIndex = mockUsers.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    mockUsers.splice(userIndex, 1);
    return new HttpResponse(null, { status: 200 });
  }),

  http.post('*/api/usuarios', async ({ request }) => {
    const body = (await request.json()) as any;
    const newUser = {
      id: `usr-${Math.floor(Math.random() * 10000)}`,
      nombre: body.nombre,
      email: body.email,
      rol: body.rol,
      fecha_creacion: new Date().toISOString(),
      estado: 'activo' as const,
      tiendas_asignadas: body.rol === 'OPERATOR' ? [] : undefined,
    };
    mockUsers.push({ ...newUser, password: 'password123' });
    return HttpResponse.json(newUser, { status: 201 });
  }),

  http.put('*/api/usuarios/:id/status', async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as { estado: 'activo' | 'inactivo' };
    const userIndex = mockUsers.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    mockUsers[userIndex].estado = body.estado;
    const { password: _, ...safeUser } = mockUsers[userIndex];
    return HttpResponse.json(safeUser);
  }),

  http.put('*/api/usuarios/:id/tiendas', async ({ params, request }) => {
    const { id } = params;
    const body = (await request.json()) as { tiendas_asignadas: string[] };
    const userIndex = mockUsers.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      return new HttpResponse(null, { status: 404 });
    }

    mockUsers[userIndex].tiendas_asignadas = body.tiendas_asignadas;
    const { password: _, ...safeUser } = mockUsers[userIndex];
    return HttpResponse.json(safeUser);
  }),

  http.get('*/api/usuarios/:id/tiendas-resumen', ({ params }) => {
    const { id } = params;
    const user = mockUsers.find((u) => u.id === id);

    if (!user || user.rol !== 'OPERATOR') {
      return new HttpResponse(null, { status: 404 });
    }

    const assignedTiendas = mockTiendas.filter((t) => user.tiendas_asignadas?.includes(t.id));

    const resumen = assignedTiendas.reduce(
      (acc, tienda) => {
        if (!acc[tienda.estado]) {
          acc[tienda.estado] = {
            estado: tienda.estado,
            total_tiendas: 0,
            cumplimiento_total: 0,
            tramites_criticos: 0,
            tiendas: [],
            vigentes: 0,
            por_vencer: 0,
            criticas: 0,
          };
        }

        acc[tienda.estado].total_tiendas++;
        acc[tienda.estado].cumplimiento_total += tienda.cumplimiento;
        acc[tienda.estado].tiendas.push({
          id: tienda.id,
          nombre: tienda.nombre,
          municipio: tienda.municipio,
          estado_cumplimiento: tienda.estado_cumplimiento,
        });

        if (tienda.estado_cumplimiento === 'vigente') acc[tienda.estado].vigentes++;
        if (tienda.estado_cumplimiento === 'en_riesgo') acc[tienda.estado].por_vencer++;
        if (tienda.estado_cumplimiento === 'critico') acc[tienda.estado].criticas++;

        const tiendaTramites = mockTramites.filter((tr) => tr.tienda_id === tienda.id);
        acc[tienda.estado].tramites_criticos += tiendaTramites.filter(
          (tr) => tr.estado === 'vencido',
        ).length;

        return acc;
      },
      {} as Record<string, any>,
    );

    const result = Object.values(resumen).map((r: any) => ({
      ...r,
      cumplimiento_promedio: Math.round(r.cumplimiento_total / r.total_tiendas),
    }));

    return HttpResponse.json(result);
  }),

  http.get('*/api/usuarios/:id/performance', ({ params, request }) => {
    const { id } = params;
    const url = new URL(request.url);
    const range = url.searchParams.get('range') || '30'; // 30, month, 90

    const user = mockUsers.find((u) => u.id === id);
    if (!user) {
      return new HttpResponse(null, { status: 404 });
    }

    // Generate deterministic pseudo-random numbers based on user ID and range
    const seed =
      typeof id === 'string'
        ? id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) +
          (range === '90' ? 90 : range === 'month' ? 15 : 30)
        : 123;

    // Helper to generate a number and its previous period value
    const generateTrend = (base: number) => {
      const value = Math.floor(base + (seed % (base * 0.5)));
      const previous_value = Math.floor(value * (0.8 + (seed % 40) / 100)); // Previous is 80-120% of current

      let trend: 'up' | 'down' | 'neutral' = 'neutral';
      if (value > previous_value) trend = 'up';
      else if (value < previous_value) trend = 'down';

      return { value, previous_value, trend };
    };

    const metrics = {
      documentos_cargados: generateTrend(range === '90' ? 120 : 45),
      tramites_resueltos: generateTrend(range === '90' ? 80 : 25),
      alertas_atendidas: generateTrend(range === '90' ? 60 : 18),
      tiempo_promedio_resolucion: generateTrend(range === '90' ? 4 : 3),
      tramites_vencidos_responsabilidad: generateTrend(range === '90' ? 5 : 2),
    };

    // Format tiempo_promedio to 1 decimal place
    metrics.tiempo_promedio_resolucion.value =
      Math.round((metrics.tiempo_promedio_resolucion.value * 0.8 + (seed % 10) * 0.1) * 10) / 10;
    metrics.tiempo_promedio_resolucion.previous_value =
      Math.round(
        (metrics.tiempo_promedio_resolucion.previous_value * 0.8 + (seed % 15) * 0.1) * 10,
      ) / 10;

    // Recalculate trend for float values just in case
    if (
      metrics.tiempo_promedio_resolucion.value > metrics.tiempo_promedio_resolucion.previous_value
    )
      metrics.tiempo_promedio_resolucion.trend = 'up';
    else if (
      metrics.tiempo_promedio_resolucion.value < metrics.tiempo_promedio_resolucion.previous_value
    )
      metrics.tiempo_promedio_resolucion.trend = 'down';
    else metrics.tiempo_promedio_resolucion.trend = 'neutral';

    const timeline = Array.from({ length: 20 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i * (range === '90' ? 4 : 1) - (seed % 2));

      const actions = [
        'Documento cargado',
        'Trámite resuelto',
        'Alerta atendida',
        'Estado actualizado',
        'Documento revisado',
      ];

      const assignedTiendas = user.tiendas_asignadas?.length
        ? mockTiendas.filter((t) => user.tiendas_asignadas!.includes(t.id))
        : mockTiendas;

      const tienda = assignedTiendas[(seed + i) % assignedTiendas.length] || mockTiendas[0];
      const tramite = mockTramites.find((t) => t.tienda_id === tienda.id) || mockTramites[0];

      return {
        id: `tl-${id}-${i}`,
        accion: actions[(seed + i) % actions.length],
        fecha: date.toISOString(),
        tienda_id: tienda.id,
        tienda_nombre: tienda.nombre,
        tramite_id: tramite?.id,
        tramite_nombre: tramite?.nombre,
      };
    });

    return HttpResponse.json({ metrics, timeline });
  }),
];
