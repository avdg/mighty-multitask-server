import { createServer } from 'http';
import { loadModulesConfig } from '../api/modulesConfig.js';

export function createInstances(state) {
    createWebserverInstance(state);
    loadConfig(state).then(() => {
        bootHandler(state)
    });
}

export async function loadConfig(state) {
    let config = (await loadModulesConfig(state, 'webserver')).config;

    if (!config) {
        config = {};
    }

    state.instances.webserver.routeHandlers = config.handlers || [];
    state.instances.webserver.bootHandlers = config.bootHandlers || [];
}

export function routeHandler(state) {
    return async (req, res) => {
        for (const routeHandler of state.instances.webserver.routeHandlers) {
            if (await Promise.resolve(routeHandler(req, res, state))) {
                return;
            }
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
    }
}

export async function bootHandler(state) {
    const promises = [];

    for (const bootHandler of state.instances.webserver.bootHandlers) {
        promises.push(bootHandler(state));
    }

    return Promise.allSettled(promises);
}

export function createWebserverInstance(state) {
    if (!state.settings.webserver) {
        return;
    }

    const { hostname, port } = state.settings.webserver;

    state.instances.webserver = {
        routeHandlers: [],
    };

    state.instances.webserver.serverInstance = createServer(routeHandler(state));

    state.instances.webserver.serverInstance.listen(port, hostname, () => {
        console.log(`Webserver listening on ${hostname}:${port}`);
    });
}
