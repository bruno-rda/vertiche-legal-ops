import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import type { Tramite, PaginatedResponse } from '@/types';
import { Badge } from '@/components/Badge';
import { Pagination } from '@/components/Pagination';
import { SearchInput } from '@/components/SearchInput';
import { EmptyState } from '@/components/EmptyState';
import { TableSkeleton } from '@/components/Skeleton';
import { formatDate, daysRemaining } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { ESTADOS_MEXICO } from '@/lib/constants';
import { useAuthStore } from '@/stores/authStore';

export function TramitesPage() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const page = parseInt(sp.get('page') || '1');
  const search = sp.get('search') || '';
  const estado = sp.get('estado') || '';
  const tipo = sp.get('tipo') || '';
  const estadoGeo = sp.get('estado_geografico') || '';
  const soloVencidos = sp.get('solo_vencidos') === 'true';
  const porVencerDias = sp.get('por_vencer_dias') || '';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tramites', page, search, estado, tipo, estadoGeo, soloVencidos, porVencerDias],
    queryFn: () => api.get<PaginatedResponse<Tramite>>('/api/tramites', {
      page, page_size: 25,
      search: search || undefined, estado: estado || undefined, tipo: tipo || undefined,
      estado_geografico: estadoGeo || undefined,
      solo_vencidos: soloVencidos || undefined,
      por_vencer_dias: porVencerDias || undefined,
    }),
  });

  const up = (k: string, v: string) => {
    const p = new URLSearchParams(sp);
    v ? p.set(k, v) : p.delete(k);
    if (k !== 'page') p.set('page', '1');
    setSp(p);
  };
  const clear = () => setSp({});
  const hasFilters = search || estado || tipo || estadoGeo || soloVencidos || porVencerDias;

  const quickFilterValue = soloVencidos ? 'solo_vencidos' : porVencerDias === '30' ? 'por_vencer_30' : porVencerDias === '60' ? 'por_vencer_60' : '';

  const handleQuickFilterChange = (val: string) => {
    const p = new URLSearchParams(sp);
    p.set('page', '1');
    p.delete('estado');
    p.delete('solo_vencidos');
    p.delete('por_vencer_dias');
    
    if (val === 'solo_vencidos') p.set('solo_vencidos', 'true');
    else if (val === 'por_vencer_30') p.set('por_vencer_dias', '30');
    else if (val === 'por_vencer_60') p.set('por_vencer_dias', '60');
    
    setSp(p);
  };

  const user = useAuthStore(s => s.user);
  const isUnassignedOperator = user?.rol === 'OPERATOR' && (!user.tiendas_asignadas || user.tiendas_asignadas.length === 0);

  if (isUnassignedOperator) {
    return (
      <div className="pt-20">
        <EmptyState 
          variant="no-data" 
          title="Sin tiendas asignadas" 
          description="No tienes tiendas asignadas, por lo que no hay trámites que mostrar." 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-text-primary">Trámites</h1>
        <p className="text-sm text-text-secondary mt-1">Vista global de todos los trámites de la red</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={(v) => up('search', v)} placeholder="Buscar trámite o tienda..." className="w-full sm:w-72" />
        <div className="relative">
          <select value={estado} onChange={e => up('estado', e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer">
            <option value="">Todos los estados</option>
            <option value="vigente">Vigente</option>
            <option value="por_vencer">Por vencer</option>
            <option value="vencido">Vencido</option>
            <option value="en_revision">En revisión</option>
            <option value="presentado">Presentado</option>
            <option value="pendiente_documentacion">Pendiente</option>
            <option value="en_espera_resolucion">En espera</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>
        <div className="relative">
          <select value={tipo} onChange={e => up('tipo', e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer">
            <option value="">Todos los tipos</option>
            <option value="federal">Federal</option>
            <option value="estatal">Estatal</option>
            <option value="municipal">Municipal</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>
        <div className="relative">
          <select value={estadoGeo} onChange={e => up('estado_geografico', e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer">
            <option value="">Todos los estados geográficos</option>
            {ESTADOS_MEXICO.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>
        <div className="relative">
          <select value={quickFilterValue} onChange={e => handleQuickFilterChange(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer">
            <option value="">Filtros rápidos...</option>
            <option value="solo_vencidos">Solo vencidos</option>
            <option value="por_vencer_30">Por vencer en 30 días</option>
            <option value="por_vencer_60">Por vencer en 60 días</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>
        
        {hasFilters && <button onClick={clear} className="text-sm text-text-secondary hover:text-text-primary underline ml-2">Limpiar filtros</button>}
      </div>

      <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
        {isLoading ? <TableSkeleton rows={8} cols={7} /> : isError ? (
          <EmptyState variant="error" action={{ label: 'Reintentar', onClick: () => window.location.reload() }} />
        ) : data && data.data.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-border">
                  {['Tienda','Trámite','Tipo','Estado','Vencimiento','Días','Docs'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr></thead>
                <tbody>{data.data.map(t => {
                  const days = daysRemaining(t.fecha_vencimiento);
                  return (
                    <tr key={t.id} onClick={() => navigate(`/tiendas/${t.tienda_id}/tramites/${t.id}`)} className="border-b border-border last:border-b-0 hover:bg-surface/60 cursor-pointer transition-colors">
                      <td className="px-4 py-3.5 text-sm text-text-secondary">{t.tienda_nombre}</td>
                      <td className="px-4 py-3.5 text-sm font-medium text-text-primary">{t.nombre}</td>
                      <td className="px-4 py-3.5 text-sm text-text-secondary capitalize">{t.tipo}</td>
                      <td className="px-4 py-3.5"><Badge variant={t.estado} size="sm" /></td>
                      <td className="px-4 py-3.5 text-sm text-text-muted">{formatDate(t.fecha_vencimiento)}</td>
                      <td className={`px-4 py-3.5 text-sm font-semibold ${days < 0 ? 'text-danger' : days <= 15 ? 'text-warning' : 'text-text-secondary'}`}>
                        {days < 0 ? `${Math.abs(days)}d vencido` : `${days}d`}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-text-muted">{t.documentos?.length || 0}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
            <div className="px-4 border-t border-border">
              <Pagination page={data.page} totalPages={data.total_pages} onPageChange={p => up('page', String(p))} />
            </div>
          </>
        ) : <EmptyState variant="no-results" action={hasFilters ? { label: 'Limpiar filtros', onClick: clear } : undefined} />}
      </div>
    </div>
  );
}
