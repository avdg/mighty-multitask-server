import {
  getMimeType,
  isCompressible as isFiletypeCompressible,
  getCharset as getFiletypeCharser,
} from './src/mimetype.js';

import {
  configurableResourceRouterHandler,
  resourceRouterHandler,
} from './src/staticResourceServer.js';

import { getFilePathFromUrlPath } from './src/url.js';

export {
  getMimeType,
  getFilePathFromUrlPath,
  getFiletypeCharser,
  isFiletypeCompressible,
  configurableResourceRouterHandler,
  resourceRouterHandler,
};
