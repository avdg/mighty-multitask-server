import { loadModules } from './core/modules/loadModules.js';
import { getAppSettings } from './core/settings.js';
import { createState } from './core/state.js';

import { createInstances as createWebserverInstances } from './instances/webserver.js';
import * as apiConfig from './api/modulesConfig.js';

const defaultInstances = [
    createWebserverInstances,
];

async function loadAppModules(state) {
    await loadModules(state);
}

async function bootInstances(state, instances) {
    for (const instance of instances) {
        instance(state);
    }
}

async function run(bootAppDir) {
    const state = createState();
    const settings = await getAppSettings(bootAppDir);

    state.settings = settings;

    await loadAppModules(state)
    await bootInstances(state, defaultInstances);
}

export function boot(bootAppDir) {
    run(bootAppDir);
}

export const api = {
    config: apiConfig,
};