import type { User } from '@/types';

export const mockUsers: (User & { password: string })[] = [
  {
    id: 'usr-001',
    nombre: 'Ana García López',
    email: 'ana.garcia@vertiche.com',
    rol: 'ADMIN',
    password: 'admin123',
  },
  {
    id: 'usr-002',
    nombre: 'Carlos Mendoza Ruiz',
    email: 'carlos.mendoza@vertiche.com',
    rol: 'OPERATOR',
    password: 'operator123',
  },
  {
    id: 'usr-003',
    nombre: 'María Fernández Ortiz',
    email: 'maria.fernandez@vertiche.com',
    rol: 'VIEWER',
    password: 'viewer123',
  },
];
