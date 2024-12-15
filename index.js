import { join as pathJoin } from 'path';
import { boot } from '@mighty-multitask-server/boot';

if (import.meta.filename !== process.argv[1]) {
    console.error('This file should only be used as the main entry point');
    process.exit(1);
}
boot(pathJoin(import.meta.dirname, 'src/app'));
