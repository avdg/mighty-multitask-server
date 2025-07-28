# Quickstart: Hello World

This document provides a step-by-step guide to setting up and running the "hello world" example for the mighty-multitask-server.

## Prerequisites

- Node.js
- npm

> [!NOTE]
> You can download Node.js and npm from the official [Node.js website](https://nodejs.org/). However, we recommend using a version manager like [nvm](https://github.com/nvm-sh/nvm) to manage your Node.js versions. Nvm allows you to easily switch between different Node.js versions, which can be very helpful when working on multiple projects with different requirements.

## Setup

1. **Create a new directory for your project:**

   ```bash
   mkdir my-project
   cd my-project
   ```

2. **Initialize a git repository:**

   ```bash
   git init
   ```

3. **Add the `mighty-multitask-server` as a git submodule:**

   ```bash
   git submodule add https://github.com/avdg/mighty-multitask-server.git mighty-multitask-server
   ```

4. **Create the following directory structure. The files mentioned will be created in the subsequent steps.**

   ```
   .
   ├── mighty-multitask-server
   ├── src
   │   └── app
   │       ├── code
   │       │   └── my-app
   │       │       ├── config
   │       │       │   └── webserver.js
   │       │       ├── pub
   │       │       │   └── index.html
   │       │       └── module.js
   │       └── config
   │           └── config.js
   ├── index.js
   └── package.json
   ```

5. **Create a `package.json` file with the following content:**

   ```json
   {
     "name": "my-project",
     "version": "1.0.0",
     "description": "A simple example of a mighty-multitask-server project.",
     "main": "index.js",
     "type": "module",
     "scripts": {
       "start": "node index.js"
     },
     "dependencies": {
       "@mighty-multitask-server/boot": "file:./mighty-multitask-server/lib/mighty-multitask-server/boot",
       "@mighty-multitask-server/core-api": "file:./mighty-multitask-server/lib/mighty-multitask-server/core-api",
       "@mighty-multitask-server/webserver-util": "file:./mighty-multitask-server/lib/mighty-multitask-server/webserver-util"
     },
     "author": "",
     "license": "ISC"
   }
   ```

   > [!NOTE]
   > Alternatively, you can add the submodules as dependencies in your `package.json` and install them using `npm install`. This can be a more convenient way to manage the dependencies, as you won't need to manually initialize and update the submodules. After running `npm install`, the packages will be available in your `node_modules` directory.
   >
   > Here is the npm i command to install the 3 packages, you just need to adjust the relative path of each package:
   >
   > ```bash
   > npm install mighty-multitask-server/lib/mighty-multitask-server/boot
   > npm install mighty-multitask-server/lib/mighty-multitask-server/core-api
   > npm install mighty-multitask-server/lib/mighty-multitask-server/webserver-util
   > ```

6. **Initialize a node project:**

   ```bash
   npm init -y
   ```

7. **Create an `index.js` file with the following content:**

   ```javascript
   import { join as pathJoin } from 'path';
   import { boot } from '@mighty-multitask-server/boot';

   if (import.meta.filename !== process.argv[1]) {
     console.error('This file should only be used as the main entry point');
     process.exit(1);
   }

   boot(pathJoin(import.meta.dirname, 'src/app'));
   ```

8. **Create a `src/app/config/config.js` file with the following content:**

   ```javascript
   import { join as pathJoin } from 'path';

   export default {
       appModules: {
           'appPaths': [
               pathJoin(import.meta.dirname, '../code'),
           ],
           'appPackages': [
               '@mighty-multitask-server/core-api',
           ],
           'excludedModules': [],
       },
       webserver: {
           hostname: 'localhost',
           port: 80,
       },
       varDir: pathJoin(import.meta.dirname, '../../../var'),
   }
   ```

9. **Create a `src/app/code/my-app/module.js` file with the following content:**

   ```javascript
   export default {
       name : 'my-app',
   }
   ```

10. **Create a `src/app/code/my-app/config/webserver.js` file with the following content:**

    ```javascript
    import { join as pathJoin } from 'path';

    import {
        resourceRouterHandler
    } from "@mighty-multitask-server/webserver-util";

    export default {
        handlers: [
            resourceRouterHandler(pathJoin(import.meta.dirname, '../pub')),
        ]
    }
    ```

11. **Create a `src/app/code/my-app/pub/index.html` file with the following content:**

    ```html
    <!DOCTYPE html>
    <html>
    <head>
      <title>Hello World</title>
    </head>
    <body>
      <h1>Hello, World!</h1>
    </body>
    </html>
    ```

12. **Install the dependencies:**

    ```bash
    npm install
    ```

## Running the Server

To start the server, run the following command:

```bash
npm start
```

You should see a message indicating that the server is running. You can then access the server at `http://localhost:80/index.html`.
