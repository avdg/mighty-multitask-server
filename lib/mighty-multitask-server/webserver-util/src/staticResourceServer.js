import { readFileSync, existsSync as fileExistsSync } from "fs";
import { join as pathJoin } from "path";

import { getMimeType } from "./mimetype.js";
import { getFilePathFromUrlPath } from "./url.js";

export function resourceRouterHandler(resourceServePath) {
    return configurableResourceRouterHandler({ resourceServePath });
}

export function configurableResourceRouterHandler(config) {
    return function (req, res, state) {
        const pathInfo = getFilePathFromUrlPath(req.url, state);

        if (!pathInfo) {
            return false;
        }

        const pathsToFind = [];
        const lastSlash = pathInfo.requestPath.lastIndexOf('/');

        let requestedDirectory = pathInfo.requestPath.substring(0, lastSlash);
        let requestedFile = pathInfo.requestPath.substring(lastSlash + 1);

        // Check if the file is actually a directory
        if (requestedFile.indexOf('.') === -1) {
            requestedDirectory = requestedDirectory + '/' + requestedFile;
            requestedFile = undefined;
        }

        if (requestedFile) {
            pathsToFind.push(`${requestedDirectory}/${requestedFile}`);
        } else {
            pathsToFind.push(`${requestedDirectory}index.html`);
            pathsToFind.push(`${requestedDirectory}index.htm`);
        }

        for (let i = 0; i < pathsToFind.length; i++) {
            const fileLocation = pathJoin(config.resourceServePath, pathsToFind[i]);
            if (fileExistsSync(fileLocation)) {
                const fileContents = readFileSync(fileLocation);
                res.writeHead(200, { 'Content-Type': getMimeType(fileLocation) });

                if (config.responseHeaders) {
                    for (const header in config.responseHeaders) {
                        res.setHeader(header, config.responseHeaders[header]);
                    }
                }

                res.write(fileContents);
                res.end();
                return true;
            }
        }

        return false;
    }
}
