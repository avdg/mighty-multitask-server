import { readFileSync, statSync } from "fs";
import { join as pathJoin } from "path";

import { getMimeType } from "./mimetype.js";
import { getFilePathFromUrlPath } from "./url.js";

export function resourceRouterHandler(resourceServePath) {
    return configurableResourceRouterHandler({ resourceServePath });
}

export function defaultFileExists(filePath, logger = () => {}) {
    try {
        const stats = statSync(filePath);
        return stats.isFile();
    } catch (error) {
        logger({
            type: 'Error while checking file existence',
            error,
            data: {
                filePath,
            }
        });
    }

    return false;  // Handle any errors accessing the path
}

export function defaultReadFile(filePath) {
    return readFileSync(filePath);
}

export function defaultGetMimeType(filePath) {
    return getMimeType(filePath);
}

export function configurableResourceRouterHandler(config) {
    if (!config) {
        config = {};
    }

    if (!config.resourceServePath) {
        throw new Error('resourceServePath is required');
    }

    if (!config.indexFiles) {
        config.indexFiles = ['index.html', 'index.htm'];
    }

    if (!config.redirectIndexFilesToSlashUrl) {
        config.redirectIndexFilesToSlashUrl = true;
    }

    if (!config.handlerFileExists) {
        config.handlerFileExists = defaultFileExists;
    }

    if (!config.handlerReadFile) {
        config.handlerReadFile = defaultReadFile;
    }

    if (!config.handlerGetMimeType) {
        config.handlerGetMimeType = defaultGetMimeType;
    }

    // Optionally restrict serving to specific URL prefixes (e.g., ['/admin/'])
    // Watch out that having a prefix can potentially break urls with absolute paths
    // e.g., if you have a prefix '/admin/' and loading a file
    // at /an-admin-file.js insteead of /admin/an-admin-file.js
    if (config.urlPrefixes && !Array.isArray(config.urlPrefixes)) {
        throw new Error('urlPrefixes must be an array of strings');
    } else if (!config.urlPrefixes) {
        config.urlPrefixes = ['/'];
    } else {
        // Make sure all prefixes do not start with a slash but do end with a slash
        config.urlPrefixes = config.urlPrefixes.map(prefix => {
            prefix = prefix.replace(/^\/+/, '');
            if (!prefix.endsWith('/')) {
                prefix += '/';
            }
            return prefix;
        });
    }

    return function (req, res, state) {
        const pathInfo = getFilePathFromUrlPath(req.url, state);

        if (!pathInfo) {
            return false;
        }

        // Make sure the requestDirectory always ends with a slash
        const lastSlash = pathInfo.requestPath.lastIndexOf('/');
        let requestedDirectory = pathInfo.requestPath.substring(0, lastSlash).replace(/\/+$/, '') + '/';
        let requestedFile = pathInfo.requestPath.substring(lastSlash + 1);

        // When seo friendly redirect is enabled, always remove index files from the request path
        let redirectPath = null;
        if (config.redirectIndexFilesToSlashUrl && requestedFile) {
            for (const indexFile of config.indexFiles) {
                if (requestedFile === indexFile) {
                    redirectPath = requestedDirectory;
                    break;
                }
            }
        }

        // If urlPrefixes is set, only serve if the URL starts with one of them
        console.log('Requested directory:', requestedDirectory, 'requested file:', requestedFile);
        if (config.urlPrefixes && config.urlPrefixes.length > 0) {
            // Find and remove the matching prefix
            let matchedPrefix = null;
            for (const prefix of config.urlPrefixes) {
                if (requestedDirectory.startsWith(prefix)) {
                    matchedPrefix = prefix;
                    break;
                }
            }

            if (!matchedPrefix) {
                return false;
            }

            // Remove the matched prefix from the requested directory
            requestedDirectory = '/' + requestedDirectory.substring(matchedPrefix.length);
        }
        console.log('Resolved requested directory:', requestedDirectory, 'for file:', requestedFile);

        let filePath = null;
        // If file exists, serve the file
        if (!redirectPath
            && config.handlerFileExists(
                pathJoin(config.resourceServePath, `${requestedDirectory}${requestedFile}`)
            )
        ) {
            filePath = pathJoin(config.resourceServePath, `${requestedDirectory}${requestedFile}`);
        }

        // Check if a slash is missing at the end of the directory, if so, redirect to the directory
        if (!filePath && requestedFile && requestedFile.indexOf('.') === -1) {
            // Directory path should not start with a slash
            // But because requestedDirectory is always ending with a slash, the content can be "/"
            // which means the ending slash is also the starting slash, so we need to remove the slash
            // in that case
            const basePath = requestedDirectory === '/' ? '' : requestedDirectory;
            const filePathWithSlash = pathJoin(config.resourceServePath, `${basePath}${requestedFile}/`);
            for (const indexFile of config.indexFiles) {
                if (config.handlerFileExists(pathJoin(filePathWithSlash, indexFile))) {
                    redirectPath = `${basePath}${requestedFile}/`;
                    break;
                }
            }
        }

        if (redirectPath) {
            res.writeHead(301, { Location: '/' + redirectPath });
            res.end();
            return true;
        }

        if (!filePath && !requestedFile) {
            for (const indexFile of config.indexFiles) {
                if (config.handlerFileExists(pathJoin(config.resourceServePath, `${requestedDirectory}${indexFile}`))) {
                    filePath = pathJoin(config.resourceServePath, `${requestedDirectory}${indexFile}`);
                    break;
                }
            }
        }

        if (filePath) {
            const fileContent = config.handlerReadFile(filePath);
            res.writeHead(200, { 'Content-Type': config.handlerGetMimeType(filePath) });
            if (config.responseHeaders) {
                for (const header in config.responseHeaders) {
                    res.setHeader(header, config.responseHeaders[header]);
                }
            }
            res.write(fileContent);
            res.end();
            return true;
        }

        return false;
    }
}
