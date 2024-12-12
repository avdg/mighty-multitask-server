import { getAppSettings } from './settings.js';

export function boot(bootAppDir) {
    getAppSettings(bootAppDir).then(settings => {
        // console.log(settings);
    });
}