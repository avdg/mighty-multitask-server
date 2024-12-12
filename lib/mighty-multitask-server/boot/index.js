import { getAppSettings } from './core/settings.js';
import { createState } from './core/state.js';

import { createInstances as createWebserverInstances } from './instances/webserver.js';

const defaultInstances = [
    createWebserverInstances,
];

function bootInstances(state, instances) {
    for (const instance of instances) {
        instance(state);
    }
}

async function run(bootAppDir) {
    const state = createState();
    const settings = await getAppSettings(bootAppDir);

    state.settings = settings;

    bootInstances(state, defaultInstances);
}

export function boot(bootAppDir) {
    run(bootAppDir);
}