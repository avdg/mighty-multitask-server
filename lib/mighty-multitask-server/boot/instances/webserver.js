import { createServer } from 'http';

export function createInstances(state) {
    createWebserverInstance(state);
}

export function createWebserverInstance(state) {
    if (!state.settings.webserver) {
        return;
    }

    const { hostname, port } = state.settings.webserver;

    state.instances.webserver = createServer((req, res) => {
        res.end('Hello World');
    });

    state.instances.webserver.listen(port, hostname, () => {
        console.log(`Webserver listening on ${hostname}:${port}`);
    });
}