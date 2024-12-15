import { join as pathJoin } from 'path';

export default {
    appModules: {
        'appPaths': [
            pathJoin(import.meta.dirname, '../code'),
        ],
        'excludedModules': [],
    },
    webserver: {
        hostname: 'localhost',
        port: 43211,
    },
}