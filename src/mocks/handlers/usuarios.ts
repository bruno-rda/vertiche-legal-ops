import { http, HttpResponse } from 'msw';
import { mockUsers } from '../data/users';

export const usuariosHandlers = [
  http.get('*/api/usuarios', ({ request }) => {
    const url = new URL(request.url);
    const rol = url.searchParams.get('rol');

    let filtered = [...mockUsers];

    if (rol) {
      filtered = filtered.filter((u) => u.rol === rol);
    }

    // Don't send passwords
    const safeUsers = filtered.map(({ password: _, ...u }) => u);

    return HttpResponse.json(safeUsers);
  }),
];
