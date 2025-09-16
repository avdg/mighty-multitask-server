# Webserver instance

The `Webserver` instance spins up a configurable web server.
The web server instance is accessible from the state object from
`state.instances.webserver.server`.

## Global configuration

The globally scoped configuration is defined in the main module config at
`<main app folder>/config/config.js`.

Example of a web server configuration:

```js
export default {
    webserver: {
        hostname: 'localhost',
        port: 43211,
    },
}
```

When given the properties `sslPort`, `sslKeyFile` and `sslCertFile`,
the web server will also start an HTTPS server.

There is no support implemented yet for certificate hot reloading.

```js
import { join as pathJoin } from 'node:path';

export default {
    webserver: {
        hostname: 'localhost',
        port: 43211,
        sslPort: 43212,
        sslKey: '/path/to/ssl/key/file.pem',
        sslCert: pathJoin(import.meta.dirname, '../../../path/to/ssl/cert/file.pem'),
    },
}
```

## App module specific configuration

The web server configuration is defined in the app module at `config/webserver_config.js`.

Example of a web server configuration:

```js
export default {
    handlers: {
        resourceRouteHandler: function (req, res, state) {
            // Handle the request
            // Return true if the request was handled
            // Return false if the request was not handled,
            //     which also means that the request will be
            //     passed to next route handlers
        },
    },
    bootHandlers: [
        function (state) {
            // This function is called after the web server has started
        },
    ],
}
```

## Bundled webserver utils

See the `@mighty-multitask-server/webserver-util` package for enhanced web server utilities.
The module provides a route handler for serving static files and also include a basic library
for various tasks as linking a file with its mime type.
