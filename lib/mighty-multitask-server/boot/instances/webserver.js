import { createServer } from 'http';

export function createInstances(state) {
    createWebserverInstance(state);
}

export function routeHandler(state) {
    return (req, res) => {
        for (const routeHandler of state.instances.webserver.routeHandlers) {
            if (routeHandler(req, res, settings)) {
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