import { http, HttpResponse } from 'msw';
import { mockDocumentos } from '../data/documentos';
import { getUserFromRequest } from '../utils';

export const documentosHandlers = [
  http.get('*/api/documentos', ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('page_size') || '25');
    const estadoOcr = url.searchParams.get('estado_ocr');
    const revision = url.searchParams.get('requiere_revision');
    const tiendaId = url.searchParams.get('tienda_id');
    const tramiteId = url.searchParams.get('tramite_id');

    let filtered = [...mockDocumentos];

    const user = getUserFromRequest(request);
    if (user?.rol === 'OPERATOR' && user.tiendas_asignadas) {
      filtered = filtered.filter(
        (d) => d.tienda_id && user.tiendas_asignadas!.includes(d.tienda_id),
      );
    }

    if (estadoOcr) filtered = filtered.filter((d) => d.estado_ocr === estadoOcr);
    if (revision === 'true') filtered = filtered.filter((d) => d.requiere_revision_manual);
    if (tiendaId) filtered = filtered.filter((d) => d.tienda_id === tiendaId);
    if (tramiteId) filtered = filtered.filter((d) => d.tramite_ids.includes(tramiteId));

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

  http.patch('*/api/documentos/:id', async ({ params, request }) => {
    const docIndex = mockDocumentos.findIndex((d) => d.id === params.id);
    if (docIndex === -1) {
      return HttpResponse.json({ detail: 'Documento no encontrado' }, { status: 404 });
    }
    const updates = (await request.json()) as any;

    // Auto-populate tramite_nombres if tramite_ids is updated
    if (updates.tramite_ids) {
      const { mockTramites } = await import('../data/tramites');
      updates.tramite_nombres = updates.tramite_ids.map((id: string) => {
        const t = mockTramites.find((t) => t.id === id);
        return t ? t.nombre : 'Trámite';
      });
    }

    mockDocumentos[docIndex] = { ...mockDocumentos[docIndex], ...updates };
    return HttpResponse.json(mockDocumentos[docIndex]);
  }),

  http.post('*/api/documentos/upload', async ({ request }) => {
    const formData = await request.formData().catch(() => null);

    let tramite_ids: string[] = [];
    let tramite_nombres: string[] = [];
    let file = null;
    if (formData) {
      file = formData.get('file');
      const ids = formData.getAll('tramite_ids');
      if (ids.length > 0) {
        tramite_ids = ids.map((id) => id.toString());
        const { mockTramites } = await import('../data/tramites');
        tramite_nombres = tramite_ids.map((id) => {
          const t = mockTramites.find((t) => t.id === id);
          return t ? t.nombre : 'Trámite';
        });
      }
    }

    // Simulate upload — return a new doc in "procesando" state
    return HttpResponse.json({
      id: `doc-new-${Date.now()}`,
      tramite_ids,
      tramite_nombres,
      nombre_archivo: file instanceof File ? file.name : 'nuevo_documento.pdf',
      url: 'https://api.vertiche.com/docs/new/documento.pdf',
      estado_ocr: 'procesando',
      requiere_revision_manual: false,
      cargado_por: 'usr-001',
      cargado_por_nombre: 'Ana García López',
      cargado_en: new Date().toISOString(),
    });
  }),

  http.post('*/api/documentos/:id/rename', async ({ params, request }) => {
    const docIndex = mockDocumentos.findIndex((d) => d.id === params.id);
    if (docIndex === -1) {
      return HttpResponse.json({ detail: 'Documento no encontrado' }, { status: 404 });
    }
    const { nombre_archivo } = (await request.json()) as any;
    mockDocumentos[docIndex].nombre_archivo = nombre_archivo;
    return HttpResponse.json(mockDocumentos[docIndex]);
  }),

  http.post('*/api/documentos/:id/ocr-review', async ({ params, request }) => {
    const docIndex = mockDocumentos.findIndex((d) => d.id === params.id);
    if (docIndex === -1) {
      return HttpResponse.json({ detail: 'Documento no encontrado' }, { status: 404 });
    }
    const { datos_extraidos } = (await request.json()) as any;

    // Update the values and set confidence to 100 since it was manually reviewed
    const updatedFields: any = {};
    for (const [key, value] of Object.entries(datos_extraidos)) {
      updatedFields[key] = { value, confidence: 100 };
    }

    mockDocumentos[docIndex].datos_extraidos = {
      ...mockDocumentos[docIndex].datos_extraidos,
      ...updatedFields,
    };
    mockDocumentos[docIndex].estado_ocr = 'completado';
    mockDocumentos[docIndex].requiere_revision_manual = false;

    return HttpResponse.json(mockDocumentos[docIndex]);
  }),

  http.post('*/api/tiendas/:id/documentos', async ({ params, request }) => {
    const { fileName, tramiteIds } = (await request.json()) as any;

    // Auto-populate tramite_nombres
    const { mockTramites } = await import('../data/tramites');
    const tramiteNombres = tramiteIds.map((id: string) => {
      const t = mockTramites.find((t) => t.id === id);
      return t ? t.nombre : 'Trámite';
    });

    const newDoc: any = {
      id: `doc-new-${Date.now()}`,
      tramite_ids: tramiteIds,
      tramite_nombres: tramiteNombres,
      nombre_archivo: fileName || 'nuevo_documento.pdf',
      url: 'https://api.vertiche.com/docs/new/documento.pdf',
      estado_ocr: 'procesando',
      requiere_revision_manual: false,
      cargado_por: 'usr-001',
      cargado_por_nombre: 'Ana García López',
      cargado_en: new Date().toISOString(),
      tienda_id: params.id,
    };

    mockDocumentos.push(newDoc);
    return HttpResponse.json(newDoc);
  }),
];
