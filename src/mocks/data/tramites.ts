import type { Tramite, TramiteEstado } from '@/types';
import { mockTiendas } from './tiendas';

const tramiteNames = [
  { nombre: 'Licencia de Funcionamiento', tipo: 'municipal' as const },
  { nombre: 'Uso de Suelo', tipo: 'municipal' as const },
  { nombre: 'Protección Civil', tipo: 'estatal' as const },
  { nombre: 'Licencia Sanitaria', tipo: 'federal' as const },
  { nombre: 'Aviso de Apertura (SARE)', tipo: 'municipal' as const },
  { nombre: 'Registro ante IMSS', tipo: 'federal' as const },
  { nombre: 'Permiso de Anuncio', tipo: 'municipal' as const },
  { nombre: 'Licencia Ambiental', tipo: 'estatal' as const },
  { nombre: 'Constancia de Bomberos', tipo: 'municipal' as const },
  { nombre: 'Registro REPSE', tipo: 'federal' as const },
];


function randomDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

let tramiteCounter = 0;

function generateTramitesForTienda(tiendaId: string, tiendaNombre: string): Tramite[] {
  const count = Math.floor(Math.random() * 5) + 4; // 4-8 tramites per store
  const selected = [...tramiteNames].sort(() => Math.random() - 0.5).slice(0, count);

  return selected.map((t) => {
    tramiteCounter++;
    const estadoIndex = Math.random();
    let estado: TramiteEstado;
    if (estadoIndex < 0.35) estado = 'vigente';
    else if (estadoIndex < 0.50) estado = 'por_vencer';
    else if (estadoIndex < 0.65) estado = 'vencido';
    else if (estadoIndex < 0.75) estado = 'en_revision';
    else if (estadoIndex < 0.85) estado = 'presentado';
    else if (estadoIndex < 0.92) estado = 'en_espera_resolucion';
    else estado = 'pendiente_documentacion';

    let fechaVencimiento: string;
    if (estado === 'vencido') fechaVencimiento = randomDate(-Math.floor(Math.random() * 60) - 1);
    else if (estado === 'por_vencer') fechaVencimiento = randomDate(Math.floor(Math.random() * 28) + 1);
    else if (estado === 'vigente') fechaVencimiento = randomDate(Math.floor(Math.random() * 300) + 60);
    else fechaVencimiento = randomDate(Math.floor(Math.random() * 180) + 30);

    return {
      id: `tramite-${String(tramiteCounter).padStart(4, '0')}`,
      tienda_id: tiendaId,
      tienda_nombre: tiendaNombre,
      nombre: t.nombre,
      tipo: t.tipo,
      estado,
      fecha_inicio: randomDate(-365),
      fecha_vencimiento: fechaVencimiento,
      es_recurrente: Math.random() > 0.3,
      periodo_recurrencia: Math.random() > 0.5 ? 'anual' : 'bianual',
      observaciones: [],
      documentos: [],
      historial: [],
      asignado_a: Math.random() > 0.3 ? 'usr-001' : undefined,
    };
  });
}

export const mockTramites: Tramite[] = mockTiendas.flatMap((t) =>
  generateTramitesForTienda(t.id, t.nombre)
);
