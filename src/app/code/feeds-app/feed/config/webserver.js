import { join as pathJoin} from 'path';

import { resourceRouterHandler } from "@mighty-multitask-server/webserver-util";
// import { getResourceHandler } from '../webserverHandlers/handler.js';

export default {
    handlers: [
        resourceRouterHandler(pathJoin(import.meta.dirname, '../resources')),
        // getResourceHandler(),
    ]
}
