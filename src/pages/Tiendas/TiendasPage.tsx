import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import type { Tienda, PaginatedResponse, User } from '@/types';
import { Badge } from '@/components/Badge';
import { ProgressBar } from '@/components/ProgressBar';
import { Pagination } from '@/components/Pagination';
import { SearchInput } from '@/components/SearchInput';
import { EmptyState } from '@/components/EmptyState';
import { TableSkeleton } from '@/components/Skeleton';
import { formatDate } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const ESTADOS = [
  'Aguascalientes', 'Baja California', 'Chihuahua', 'Ciudad de México',
  'Coahuila', 'Estado de México', 'Guanajuato', 'Jalisco', 'Nuevo León',
  'Puebla', 'Querétaro', 'Sinaloa', 'Sonora', 'Veracruz', 'Yucatán',
];

export function TiendasPage() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const page = parseInt(sp.get('page') || '1');
  const search = sp.get('search') || '';
  const estado = sp.get('estado') || '';
  const ec = sp.get('estado_cumplimiento') || '';
  const operadorId = sp.get('operador_id') || '';
  const sortBy = sp.get('sort_by') || 'nombre';
  const sortOrder = sp.get('sort_order') || 'asc';
  
  const user = useAuthStore(s => s.user);

  const { data: usuarios } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => api.get<User[]>('/api/usuarios'),
    enabled: user?.rol === 'ADMIN',
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tiendas', page, search, estado, ec, operadorId, sortBy, sortOrder],
    queryFn: () => api.get<PaginatedResponse<Tienda>>('/api/tiendas', {
      page, page_size: 25,
      search: search || undefined, estado: estado || undefined,
      estado_cumplimiento: ec || undefined, 
      operador_id: operadorId || undefined,
      sort_by: sortBy, sort_order: sortOrder,
    }),
  });

  const up = (k: string, v: string) => {
    const p = new URLSearchParams(sp);
    v ? p.set(k, v) : p.delete(k);
    if (k !== 'page') p.set('page', '1');
    setSp(p);
  };
  const clear = () => setSp({});
  const hasFilters = search || estado || ec || operadorId;

  const isUnassignedOperator = user?.rol === 'OPERATOR' && (!user.tiendas_asignadas || user.tiendas_asignadas.length === 0);

  if (isUnassignedOperator) {
    return (
      <div className="pt-20">
        <EmptyState 
          variant="no-data" 
          title="Sin tiendas asignadas" 
          description="No tienes tiendas asignadas." 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-text-primary">Tiendas</h1>
        <p className="text-sm text-text-secondary mt-1">Red nacional de tiendas Vertiche</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={(v) => up('search', v)} placeholder="Buscar por nombre o municipio..." className="w-full sm:w-72" />
        <div className="relative">
          <select value={estado} onChange={(e) => up('estado', e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer">
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>
        <div className="relative">
          <select value={ec} onChange={(e) => up('estado_cumplimiento', e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer">
            <option value="">Todos los niveles</option>
            <option value="vigente">En cumplimiento</option>
            <option value="en_riesgo">En riesgo</option>
            <option value="critico">Crítico</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>
        {user?.rol === 'ADMIN' && usuarios && (
          <div className="relative">
            <select value={operadorId} onChange={(e) => up('operador_id', e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer">
              <option value="">Todos los operadores</option>
              <option value="unassigned">Sin asignar</option>
              {usuarios.filter(u => u.rol === 'OPERATOR').map((u) => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          </div>
        )}
        <div className="relative">
          <select value={`${sortBy}:${sortOrder}`} onChange={(e) => { const [sb, so] = e.target.value.split(':'); const p = new URLSearchParams(sp); p.set('sort_by', sb); p.set('sort_order', so); p.set('page', '1'); setSp(p); }} className="appearance-none pl-3 pr-8 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer">
            <option value="nombre:asc">Nombre A-Z</option>
            <option value="nombre:desc">Nombre Z-A</option>
            <option value="cumplimiento:asc">Menor cumplimiento</option>
            <option value="cumplimiento:desc">Mayor cumplimiento</option>
            <option value="tramites_vencidos:desc">Más vencidos</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>
        {hasFilters && <button onClick={clear} className="text-sm text-text-secondary hover:text-text-primary underline">Limpiar filtros</button>}
      </div>
      <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
        {isLoading ? <TableSkeleton rows={8} cols={6} /> : isError ? (
          <EmptyState variant="error" action={{ label: 'Reintentar', onClick: () => window.location.reload() }} />
        ) : data && data.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['Tienda', 'Estado', 'Municipio', 'Cumplimiento', 'Trámites', 'Actualización'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((t) => (
                    <tr key={t.id} onClick={() => navigate(`/tiendas/${t.id}`)} className="border-b border-border last:border-b-0 hover:bg-surface/60 cursor-pointer transition-colors">
                      <td className="px-4 py-3.5 text-sm font-medium text-text-primary">{t.nombre}</td>
                      <td className="px-4 py-3.5 text-sm text-text-secondary">{t.estado}</td>
                      <td className="px-4 py-3.5 text-sm text-text-secondary">{t.municipio}</td>
                      <td className="px-4 py-3.5 min-w-[160px]"><ProgressBar value={t.cumplimiento} showLabel size="sm" /></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {t.tramites_vencidos > 0 && <Badge variant="vencido" size="sm">{t.tramites_vencidos}</Badge>}
                          {t.tramites_por_vencer > 0 && <Badge variant="por_vencer" size="sm">{t.tramites_por_vencer}</Badge>}
                          {(t.tramites_vencidos > 0 || t.tramites_por_vencer > 0) && <span className="text-xs text-text-muted">/ </span>}
                          <span className="text-xs text-text-muted">{t.total_tramites}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-text-muted">{formatDate(t.ultima_actualizacion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 border-t border-border">
              <Pagination page={data.page} totalPages={data.total_pages} onPageChange={(p) => up('page', String(p))} />
            </div>
          </>
        ) : <EmptyState variant="no-results" action={hasFilters ? { label: 'Limpiar filtros', onClick: clear } : undefined} />}
      </div>
    </div>
  );
}
