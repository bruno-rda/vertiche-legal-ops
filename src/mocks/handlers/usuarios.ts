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
        (u) =>
          u.nombre.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)
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

    const assignedTiendas = mockTiendas.filter((t) =>
      user.tiendas_asignadas?.includes(t.id)
    );

    const resumen = assignedTiendas.reduce((acc, tienda) => {
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
        (tr) => tr.estado === 'vencido'
      ).length;

      return acc;
    }, {} as Record<string, any>);

    const result = Object.values(resumen).map((r: any) => ({
      ...r,
      cumplimiento_promedio: Math.round(r.cumplimiento_total / r.total_tiendas),
    }));

    return HttpResponse.json(result);
  }),
];
