import type { Tienda, EstadoCumplimiento } from '@/types';

const estados = [
  'Jalisco', 'Nuevo León', 'Ciudad de México', 'Estado de México',
  'Puebla', 'Guanajuato', 'Querétaro', 'Chihuahua', 'Sonora',
  'Baja California', 'Yucatán', 'Veracruz', 'Coahuila', 'Sinaloa',
  'Aguascalientes',
];

const municipios: Record<string, string[]> = {
  'Jalisco': ['Guadalajara', 'Zapopan', 'Tlaquepaque', 'Tonalá'],
  'Nuevo León': ['Monterrey', 'San Pedro Garza García', 'San Nicolás', 'Apodaca'],
  'Ciudad de México': ['Polanco', 'Santa Fe', 'Coyoacán', 'Roma Norte'],
  'Estado de México': ['Naucalpan', 'Tlalnepantla', 'Ecatepec', 'Metepec'],
  'Puebla': ['Puebla Centro', 'Angelópolis', 'Cholula'],
  'Guanajuato': ['León', 'Irapuato', 'Celaya'],
  'Querétaro': ['Querétaro Centro', 'Juriquilla', 'El Marqués'],
  'Chihuahua': ['Chihuahua Centro', 'Ciudad Juárez'],
  'Sonora': ['Hermosillo', 'Ciudad Obregón'],
  'Baja California': ['Tijuana', 'Mexicali', 'Ensenada'],
  'Yucatán': ['Mérida Centro', 'Mérida Norte'],
  'Veracruz': ['Veracruz Puerto', 'Xalapa', 'Boca del Río'],
  'Coahuila': ['Saltillo', 'Torreón'],
  'Sinaloa': ['Culiacán', 'Mazatlán'],
  'Aguascalientes': ['Aguascalientes Centro'],
};

const marcas = [
  'Cuidado con el Perro', 'Oggi', 'Sahara', 'Non Stop',
  'Vertiche', 'Milano', 'Brantano', 'Price Shoes',
];

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateTienda(index: number): Tienda {
  const estado = estados[index % estados.length];
  const munis = municipios[estado] || ['Centro'];
  const municipio = munis[index % munis.length];
  const cumplimiento = Math.floor(Math.random() * 60) + 40; // 40-100

  let estadoCumplimiento: EstadoCumplimiento;
  if (cumplimiento >= 85) estadoCumplimiento = 'vigente';
  else if (cumplimiento >= 60) estadoCumplimiento = 'en_riesgo';
  else estadoCumplimiento = 'critico';

  const totalTramites = Math.floor(Math.random() * 8) + 4; // 4-12
  const tramitesVencidos = estadoCumplimiento === 'critico' ? Math.floor(Math.random() * 3) + 1 : 0;
  const tramitesPorVencer = estadoCumplimiento !== 'vigente' ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 2);

  const daysAgo = Math.floor(Math.random() * 30);
  const ultimaActualizacion = new Date(Date.now() - daysAgo * 86400000).toISOString();

  return {
    id: `tienda-${String(index + 1).padStart(3, '0')}`,
    nombre: `Vertiche ${municipio} ${index > 14 ? (Math.floor(index / 15) + 1).toString() : ''}`.trim(),
    estado,
    municipio,
    direccion: `Av. Principal #${100 + index}, Col. Centro, ${municipio}, ${estado}`,
    marcas: pickRandom(marcas, Math.floor(Math.random() * 3) + 1),
    cumplimiento,
    estado_cumplimiento: estadoCumplimiento,
    total_tramites: totalTramites,
    tramites_vencidos: tramitesVencidos,
    tramites_por_vencer: tramitesPorVencer,
    ultima_actualizacion: ultimaActualizacion,
  };
}

export const mockTiendas: Tienda[] = Array.from({ length: 55 }, (_, i) => generateTienda(i));
