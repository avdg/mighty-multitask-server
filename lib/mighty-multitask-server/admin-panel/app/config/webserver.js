import { join as pathJoin } from 'path';

import { resourceRouterHandler } from "@mighty-multitask-server/webserver-util";

export default {
    handlers: [
        resourceRouterHandler(pathJoin(import.meta.dirname, '../resources')),
    ]
}