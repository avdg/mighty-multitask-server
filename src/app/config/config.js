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
        hostname: '0.0.0.0',
        port: process.env.PORT || 43211,
    },
    varDir: pathJoin(import.meta.dirname, '../../../var'),
}
