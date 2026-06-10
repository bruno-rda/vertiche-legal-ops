import type { Documento } from '@/client/types.gen';
import type { EstadoOcr as EstadoOCR } from '@/client/types.gen';
import { mockTramites } from './tramites';

const ocrStates: EstadoOCR[] = [
  'completado',
  'completado',
  'completado',
  'procesando',
  'baja_confianza',
  'error',
];

const docNames = [
  'Licencia_Funcionamiento_2025.pdf',
  'Permiso_Uso_Suelo.pdf',
  'Dictamen_Proteccion_Civil.pdf',
  'Constancia_Bomberos.pdf',
  'Alta_IMSS.pdf',
  'Licencia_Sanitaria_COFEPRIS.pdf',
  'Aviso_Apertura_SARE.pdf',
  'Permiso_Anuncio_Municipal.pdf',
  'Dictamen_Ambiental.pdf',
  'Registro_REPSE.pdf',
  'Comprobante_Pago_Derechos.pdf',
  'Acta_Constitutiva.pdf',
];

let docCounter = 0;

function generateDocumentosForTramites(): Documento[] {
  const docs: Documento[] = [];

  // Each tramite gets 0-2 documents
  mockTramites.forEach((tramite) => {
    const numDocs = Math.floor(Math.random() * 3);
    for (let i = 0; i < numDocs; i++) {
      docCounter++;
      const estadoOcr = ocrStates[Math.floor(Math.random() * ocrStates.length)];
      const docName = docNames[Math.floor(Math.random() * docNames.length)];

      const newDoc: Documento = {
        id: `doc-${String(docCounter).padStart(4, '0')}`,
        tramite_ids: [tramite.id],
        tramite_nombres: [tramite.nombre],
        nombre_archivo: `${tramite.tienda_id}_${docName}`,
        ruta_archivo: `https://api.vertiche.com/docs/${docCounter}/${docName}`,
        estado_ocr: estadoOcr,
        datos_extraidos:
          estadoOcr === 'completado' || estadoOcr === 'baja_confianza'
            ? {
                fecha_vigencia: {
                  value: tramite.fecha_vencimiento,
                  confidence: estadoOcr === 'baja_confianza' ? 45 : 95,
                },
                numero_permiso: {
                  value: `PERM-${Math.floor(Math.random() * 90000) + 10000}`,
                  confidence: estadoOcr === 'baja_confianza' ? 55 : 92,
                },
                referencia_pago: {
                  value: `REF-${Math.floor(Math.random() * 900000) + 100000}`,
                  confidence: 88,
                },
                domicilio: {
                  value: `Av. Principal #${100 + docCounter}, Col. Centro`,
                  confidence: 99,
                },
              }
            : undefined,
        requiere_revision_manual: estadoOcr === 'baja_confianza',
        cargado_por: Math.random() > 0.5 ? 'usr-001' : 'usr-002',
        cargado_por_nombre: Math.random() > 0.5 ? 'Ana García López' : 'Carlos Mendoza Ruiz',
        cargado_en: new Date(Date.now() - Math.floor(Math.random() * 60) * 86400000).toISOString(),
        tienda_id: tramite.tienda_id,
        tienda_nombre: tramite.tienda_nombre,
      };

      docs.push(newDoc);
      tramite.documentos!.push(newDoc);
    }
  });

  return docs;
}

export const mockDocumentos: Documento[] = generateDocumentosForTramites();
