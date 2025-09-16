import { readFileSync } from 'fs';
import { createServer } from 'http';
import { createSecureServer } from 'node:http2';
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

    state.instances.webserver.serverInstance.on('error', (err) => {
        console.error('Webserver error:', err);
    });

    state.instances.webserver.serverInstance.on('close', () => {
        console.log('Webserver closed');
    });

    if (state.settings.webserver.sslPort && state.settings.webserver.sslKey && state.settings.webserver.sslCert) {
        state.instances.webserver.secureServerInstance = createSecureServer(
            {
                key: readFileSync(state.settings.webserver.sslKey),
                cert: readFileSync(state.settings.webserver.sslCert),
            },
            routeHandler(state)
        );

        state.instances.webserver.secureServerInstance.listen(state.settings.webserver.sslPort, hostname, () => {
            console.log(`Secure webserver listening on ${hostname}:${state.settings.webserver.sslPort}`);
        });

        state.instances.webserver.secureServerInstance.on('error', (err) => {
            console.error('Secure webserver error:', err);
        });

        state.instances.webserver.secureServerInstance.on('close', () => {
            console.log('Secure webserver closed');
        });
    }
}
