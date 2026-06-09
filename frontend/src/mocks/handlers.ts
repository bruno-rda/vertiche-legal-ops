import { authHandlers } from './handlers/auth';
import { tiendasHandlers, dashboardHandlers } from './handlers/tiendas';
import { tramitesHandlers } from './handlers/tramites';
import { alertasHandlers } from './handlers/alertas';
import { documentosHandlers } from './handlers/documentos';
import { usuariosHandlers } from './handlers/usuarios';

export const handlers = [
  ...authHandlers,
  ...dashboardHandlers,
  ...tiendasHandlers,
  ...tramitesHandlers,
  ...alertasHandlers,
  ...documentosHandlers,
  ...usuariosHandlers,
];
