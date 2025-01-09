import { createServer } from 'http';
import { loadModulesConfig } from '../api/modulesConfig.js';

export function createInstances(state) {
    createWebserverInstance(state);
    loadConfig(state);
}

export async function loadConfig(state) {
    const config = (await loadModulesConfig(state, 'webserver')).config;

    if (!config) {
        return;
    }

    state.instances.webserver.routeHandlers = config.handlers || [];
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
