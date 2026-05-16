import { http, HttpResponse } from 'msw';
import { mockDocumentos } from '../data/documentos';

export const documentosHandlers = [
  http.get('*/api/documentos', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('page_size') || '25');
    const estadoOcr = url.searchParams.get('estado_ocr');
    const revision = url.searchParams.get('requiere_revision');
    const tiendaId = url.searchParams.get('tienda_id');

    let filtered = [...mockDocumentos];

    if (estadoOcr) filtered = filtered.filter((d) => d.estado_ocr === estadoOcr);
    if (revision === 'true') filtered = filtered.filter((d) => d.requiere_revision_manual);
    if (tiendaId) filtered = filtered.filter((d) => d.tienda_id === tiendaId);

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return HttpResponse.json({ data, total, page, page_size: pageSize, total_pages: totalPages });
  }),

  http.get('*/api/documentos/:id', ({ params }) => {
    const doc = mockDocumentos.find((d) => d.id === params.id);
    if (!doc) {
      return HttpResponse.json({ detail: 'Documento no encontrado' }, { status: 404 });
    }
    return HttpResponse.json(doc);
  }),

  http.post('*/api/documentos/upload', async () => {
    // Simulate upload — return a new doc in "procesando" state
    return HttpResponse.json({
      id: `doc-new-${Date.now()}`,
      tramite_ids: [],
      nombre_archivo: 'nuevo_documento.pdf',
      url: 'https://api.vertiche.com/docs/new/documento.pdf',
      estado_ocr: 'procesando',
      requiere_revision_manual: false,
      cargado_por: 'usr-001',
      cargado_por_nombre: 'Ana García López',
      cargado_en: new Date().toISOString(),
    });
  }),
];
