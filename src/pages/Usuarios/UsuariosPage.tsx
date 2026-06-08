import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { UsersTable } from './components/UsersTable';
import { InviteUserModal } from './components/InviteUserModal';
import { UserPlus, Search, ChevronDown } from 'lucide-react';
import type { User } from '@/types';

type Tab = 'activos' | 'inactivos';

export function UsuariosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const activeTab = (searchParams.get('tab') as Tab) || 'activos';
  const roleFilter = searchParams.get('rol') || '';
  const searchQuery = searchParams.get('search') || '';

  const [inputValue, setInputValue] = useState(searchQuery);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  useEffect(() => {
    const timer = setTimeout(() => updateParams('search', inputValue), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const { data: users, isLoading } = useQuery({
    queryKey: ['usuarios', roleFilter, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams();
      if (roleFilter) params.append('rol', roleFilter);
      if (searchQuery) params.append('search', searchQuery);
      return api.get<User[]>(`/api/usuarios?${params.toString()}`);
    },
    placeholderData: (prev) => prev,
  });

  const activos = users?.filter((u) => u.estado === 'activo') || [];
  const inactivos = users?.filter((u) => u.estado === 'inactivo') || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-text-primary mb-1">Usuarios</h1>
          <p className="text-text-secondary text-sm">
            Gestiona los accesos y asignaciones del equipo.
          </p>
        </div>
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors font-medium shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          Invitar usuario
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-0 border-b border-border overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => updateParams('tab', 'activos')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'activos'
                ? 'border-accent text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Activos ({activos.length})
          </button>
          <button
            onClick={() => updateParams('tab', 'inactivos')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'inactivos'
                ? 'border-accent text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Inactivos ({inactivos.length})
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`flex items-center border transition-all duration-300 ease-in-out rounded-lg overflow-hidden ${isSearchExpanded ? 'w-64 border-border bg-surface-card shadow-sm' : 'w-10 border-transparent hover:border-border bg-transparent cursor-pointer'}`}>
            <button
              onClick={() => {
                setIsSearchExpanded(true);
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
              className="p-2 text-text-muted hover:text-text-primary transition-colors focus:outline-none shrink-0"
              title="Buscar"
            >
              <Search className="w-5 h-5" />
            </button>
            <input
              ref={searchInputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className={`bg-transparent text-sm text-text-primary outline-none transition-all duration-300 ${isSearchExpanded ? 'w-full pr-3 opacity-100' : 'w-0 px-0 opacity-0'}`}
              onBlur={() => {
                if (!inputValue) setIsSearchExpanded(false);
              }}
            />
          </div>

          <div className="relative shrink-0">
            <select
              value={roleFilter}
              onChange={(e) => updateParams('rol', e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm bg-surface-card border border-border rounded-lg cursor-pointer"
            >
              <option value="">Todos los roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="OPERATOR">OPERATOR</option>
              <option value="VIEWER">VIEWER</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          </div>
        </div>
      </div>

      <UsersTable
        users={activeTab === 'inactivos' ? inactivos : activos}
        isLoading={isLoading}
        type={activeTab === 'inactivos' ? 'inactivos' : 'activos'}
      />

      <InviteUserModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
    </div>
  );
}
