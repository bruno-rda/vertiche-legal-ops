import { http, HttpResponse } from 'msw';
import { mockUsers } from '../data/users';

export const authHandlers = [
  http.post('*/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };

    const user = mockUsers.find((u) => u.email === body.email && u.password === body.password);

    if (!user) {
      return HttpResponse.json({ detail: 'Credenciales incorrectas' }, { status: 401 });
    }

    const { password: _, ...userWithoutPassword } = user;
    return HttpResponse.json({
      token: `mock-jwt-token-${user.id}`,
      user: userWithoutPassword,
    });
  }),

  http.get('*/api/auth/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return HttpResponse.json({ detail: 'No autorizado' }, { status: 401 });
    }

    const tokenUserId = authHeader.replace('Bearer mock-jwt-token-', '');
    const user = mockUsers.find((u) => u.id === tokenUserId);

    if (!user) {
      return HttpResponse.json({ detail: 'No autorizado' }, { status: 401 });
    }

    const { password: _, ...userWithoutPassword } = user;
    return HttpResponse.json(userWithoutPassword);
  }),
];
