import { mergeConfig } from './api/mergeConfig.js';
import { loadModulesConfig, loadModuleConfig } from './api/modulesConfig.js';

import { loadModules } from './core/modules/loadModules.js';
import { getAppMainConfig } from './core/config.js';
import { createState } from './core/state.js';

import * as apiConfig from './api/modulesConfig.js';
import { createInstances as createDbInstances } from './instances/db.js';
import { createInstances as createEventsInstances } from './instances/events.js';
import { createInstances as createWebserverInstances } from './instances/webserver.js';
import { compareVersions } from './core/versions.js';

const defaultInstances = [
    // Low level instances
    createEventsInstances,

    // Service providing instances
    createDbInstances,
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
    const settings = await getAppMainConfig(bootAppDir);

    state.settings = mergeConfig(state.settings, settings);
    const instances = mergeConfig(state.settings.instances ?? [], defaultInstances);

    await loadAppModules(state)
    await bootInstances(state, instances);
}

export function boot(bootAppDir) {
    run(bootAppDir);
}

export const api = {
    compareVersions,
    config: apiConfig,
    loadModuleConfig,
    loadModulesConfig,
};
