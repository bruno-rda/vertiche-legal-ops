import { mockUsers } from './data/users';
import type { User } from '@/types';

export function getUserFromRequest(request: Request): (User & { password?: string }) | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return null;
  }

  const tokenUserId = authHeader.replace('Bearer mock-jwt-token-', '');
  const user = mockUsers.find((u) => u.id === tokenUserId);

  return user || null;
}
