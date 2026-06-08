import type { User } from '@/types';

export const mockUsers: (User & { password: string })[] = [
  {
    id: 'usr-001',
    nombre: 'Ana García López',
    email: 'ana.garcia@vertiche.com',
    rol: 'ADMIN',
    password: 'admin123',
    fecha_ingreso: '2023-01-15T10:00:00Z',
  },
  {
    id: 'usr-002',
    nombre: 'Carlos Mendoza Ruiz',
    email: 'carlos.mendoza@vertiche.com',
    rol: 'OPERATOR',
    password: 'operator123',
    tiendas_asignadas: ['tienda-001', 'tienda-002', 'tienda-003', 'tienda-004', 'tienda-005'],
    fecha_ingreso: '2024-03-20T09:00:00Z',
  },
  {
    id: 'usr-003',
    nombre: 'María Fernández Ortiz',
    email: 'maria.fernandez@vertiche.com',
    rol: 'VIEWER',
    password: 'viewer123',
    fecha_ingreso: '2024-05-10T11:30:00Z',
  },
  {
    id: 'usr-004',
    nombre: 'Roberto Silva',
    email: 'roberto.silva@vertiche.com',
    rol: 'OPERATOR',
    password: 'operator123',
    tiendas_asignadas: ['tienda-006', 'tienda-007', 'tienda-008'],
    fecha_ingreso: '2025-02-01T08:00:00Z',
  },
  {
    id: 'usr-005',
    nombre: 'Luis Gómez (Sin tiendas)',
    email: 'luis.gomez@vertiche.com',
    rol: 'OPERATOR',
    password: 'operator123',
    tiendas_asignadas: [],
    fecha_ingreso: '2026-05-20T14:00:00Z',
  },
];
