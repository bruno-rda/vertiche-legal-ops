import type { Alerta, AlertaSeveridad, AlertaTipo } from '@/types';
import { mockTiendas } from './tiendas';
import { mockTramites } from './tramites';

function generateAlertas(): Alerta[] {
  const alertas: Alerta[] = [];
  let counter = 0;

  // Generate alerts from overdue/expiring tramites
  const vencidos = mockTramites.filter((t) => t.estado === 'vencido');
  const porVencer = mockTramites.filter((t) => t.estado === 'por_vencer');

  vencidos.slice(0, 10).forEach((t) => {
    counter++;
    const tienda = mockTiendas.find((s) => s.id === t.tienda_id);
    alertas.push({
      id: `alerta-${String(counter).padStart(3, '0')}`,
      tipo: 'vencido',
      severidad: 'critical',
      tienda_id: t.tienda_id,
      tienda_nombre: tienda?.nombre || '',
      tramite_id: t.id,
      tramite_nombre: t.nombre,
      mensaje: `El trámite "${t.nombre}" de ${tienda?.nombre} ha vencido y requiere atención inmediata.`,
      fecha_generacion: new Date(Date.now() - Math.floor(Math.random() * 7) * 86400000).toISOString(),
      silenciada: false,
    });
  });

  porVencer.slice(0, 8).forEach((t) => {
    counter++;
    const tienda = mockTiendas.find((s) => s.id === t.tienda_id);
    alertas.push({
      id: `alerta-${String(counter).padStart(3, '0')}`,
      tipo: 'vencimiento_proximo',
      severidad: 'warning',
      tienda_id: t.tienda_id,
      tienda_nombre: tienda?.nombre || '',
      tramite_id: t.id,
      tramite_nombre: t.nombre,
      mensaje: `El trámite "${t.nombre}" de ${tienda?.nombre} está próximo a vencer.`,
      fecha_generacion: new Date(Date.now() - Math.floor(Math.random() * 14) * 86400000).toISOString(),
      silenciada: false,
    });
  });

  // Add some inconsistency and OCR alerts
  const inconsistencyTypes: { tipo: AlertaTipo; severidad: AlertaSeveridad; template: string }[] = [
    { tipo: 'inconsistencia', severidad: 'critical', template: 'Se detectó una inconsistencia en el expediente de {tienda}: la dirección registrada no coincide con el permiso.' },
    { tipo: 'baja_confianza_ocr', severidad: 'warning', template: 'El documento cargado en {tienda} tiene baja confianza de OCR y requiere revisión manual.' },
    { tipo: 'inconsistencia', severidad: 'warning', template: 'El número de permiso extraído por OCR no coincide con el registro previo en {tienda}.' },
  ];

  for (let i = 0; i < 6; i++) {
    counter++;
    const tienda = mockTiendas[Math.floor(Math.random() * mockTiendas.length)];
    const template = inconsistencyTypes[i % inconsistencyTypes.length];
    alertas.push({
      id: `alerta-${String(counter).padStart(3, '0')}`,
      tipo: template.tipo,
      severidad: template.severidad,
      tienda_id: tienda.id,
      tienda_nombre: tienda.nombre,
      mensaje: template.template.replace('{tienda}', tienda.nombre),
      fecha_generacion: new Date(Date.now() - Math.floor(Math.random() * 21) * 86400000).toISOString(),
      silenciada: false,
    });
  }

  // Add some silenced alerts
  for (let i = 0; i < 4; i++) {
    counter++;
    const tienda = mockTiendas[Math.floor(Math.random() * mockTiendas.length)];
    alertas.push({
      id: `alerta-${String(counter).padStart(3, '0')}`,
      tipo: 'vencimiento_proximo',
      severidad: 'info',
      tienda_id: tienda.id,
      tienda_nombre: tienda.nombre,
      mensaje: `Recordatorio: revisar renovación de trámite en ${tienda.nombre}.`,
      fecha_generacion: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString(),
      silenciada: true,
      silenciada_hasta: new Date(Date.now() + 15 * 86400000).toISOString(),
      silenciada_por: 'usr-001',
    });
  }

  return alertas.sort((a, b) => {
    const sevOrder = { critical: 0, warning: 1, info: 2 };
    if (sevOrder[a.severidad] !== sevOrder[b.severidad]) return sevOrder[a.severidad] - sevOrder[b.severidad];
    return new Date(b.fecha_generacion).getTime() - new Date(a.fecha_generacion).getTime();
  });
}

export const mockAlertas: Alerta[] = generateAlertas();
