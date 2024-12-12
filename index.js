import { join as pathJoin, dirname } from 'path';
import { boot } from '@mighty-multitask-server/boot';

if (import.meta.url !== `file:///${ process.argv[1].replace(/\\/g, '/').replace(/^\/+/, '')}`) {
    console.error('This file should only be used as the main entry point');
    process.exit(1);
}

boot(pathJoin(dirname(import.meta.url.replace(/^file:\/+/, '/')), 'src/app'));
