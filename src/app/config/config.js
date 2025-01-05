import { join as pathJoin } from 'path';

export default {
    appModules: {
        'appPaths': [
            pathJoin(import.meta.dirname, '../code'),
        ],
        'appPackages': [
            '@mighty-multitask-server/core-api',
        ],
        'excludedModules': [],
    },
    webserver: {
        hostname: 'localhost',
        port: 43211,
    },
    varDir: pathJoin(import.meta.dirname, '../../../var'),
}
