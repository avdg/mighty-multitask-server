import { join as pathJoin } from 'path';

export default {
    appModules: {
        'appPaths': [
            pathJoin(import.meta.dirname, '../code'),
        ]
    },
    webserver: {
        hostname: 'localhost',
        port: 43211,
    },
}