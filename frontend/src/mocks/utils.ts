import { mockUsers } from './data/users';
import type { Usuario } from '@/client/types.gen';

export function getUserFromRequest(request: Request): (Usuario & { password?: string }) | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return null;
  }

  const tokenUserId = authHeader.replace('Bearer mock-jwt-token-', '');
  const user = mockUsers.find((u) => u.id === tokenUserId);

  return user || null;
}
