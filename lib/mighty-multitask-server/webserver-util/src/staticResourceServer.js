import { readFile, stat } from "fs";
import { join as pathJoin, isAbsolute as pathIsAbsolute } from "path";
import { promisify } from "util";

import { getMimeType } from "./mimetype.js";
import { getFilePathFromUrlPath } from "./url.js";

const statAsync = promisify(stat);
const readFileAsync = promisify(readFile);

/**
 * Creates a resource router handler with a simple configuration.
 * @param {string} resourceServePath - The base directory path to serve static files from
 * @returns {Function} The configured router handler function
 */
export function resourceRouterHandler(resourceServePath) {
    return configurableResourceRouterHandler({ resourceServePath });
}

/**
 * Default file existence checker that asynchronously verifies if a file exists and is a regular file.
 * @param {string} filePath - The absolute path to the file to check
 * @param {Function} [logger] - Optional logging function for error handling
 * @returns {Promise<boolean>} Promise that resolves to true if the file exists and is a regular file, false otherwise
 */
export async function defaultFileExists(filePath, logger = () => {}) {
    try {
        const stats = await statAsync(filePath);
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

/**
 * Default file reader that asynchronously reads the contents of a file.
 * @param {string} filePath - The absolute path to the file to read
 * @returns {Promise<Buffer>} Promise that resolves to the file contents as a Buffer
 */
export function defaultReadFile(filePath) {
    return readFileAsync(filePath);
}

/**
 * Default MIME type detector that determines the MIME type based on file extension.
 * @param {string} filePath - The path to the file (only the extension is used)
 * @returns {string} The MIME type string (e.g., 'text/html', 'application/json')
 */
export function defaultGetMimeType(filePath) {
    return getMimeType(filePath);
}

/**
 * Create a configurable resource router handler that serves static files.
 *
 * Configuration object properties:
 * @param {Object} config - Configuration options
 * @param {string} config.resourceServePath - Required. Base directory path to serve static files from.
 * @param {string[]} [config.indexFiles=['index.html','index.htm']] - Filenames considered index files when serving a directory.
 * @param {boolean} [config.redirectIndexFilesToSlashUrl=true] - If true, requests for index files (e.g. `/foo/index.html`) will be redirected to the slash URL (`/foo/`).
 * @param {(filePath:string, logger?:Function) => Promise<boolean>} [config.handlerFileExists] - Async function to check if a file exists and is a regular file. Defaults to an FS-based checker.
 * @param {(filePath:string) => Promise<Buffer|string>} [config.handlerReadFile] - Async function to read a file's contents. Defaults to an FS-based reader.
 * @param {(filePath:string) => string} [config.handlerGetMimeType] - Function that returns the MIME type for a file path. Defaults to the internal `getMimeType`.
 * @param {string[]} [config.urlPrefixes] - Optional array of URL prefixes to restrict serving (each prefix should not start with a leading slash; they will be normalized to end with a slash).
 * @param {Object.<string,string>} [config.responseHeaders] - Optional additional response headers to set on successful responses.
 * @param {Object.<string, string|Object|Function>} [config.assetRoutes] - Optional routing table for individual assets that are not located in `resourceServePath`.
 *   Keys are URL paths (without leading slash) and values can be:
 *     - string: a file system path to the asset (absolute or relative to the process cwd)
 *     - object: { filePath: string, readFile?: Function, getMimeType?: Function, responseHeaders?: Object }
 *     - function: an async function (req, res, state) => boolean that handles the request and returns true when handled.
 *   Example: { "vendor/jquery.js": "node_modules/jquery/dist/jquery.min.js" }
 */

/**
 * Find and normalize an asset route for a requested path key.
 *
 * This utility makes asset route handling testable by centralizing the
 * logic used to interpret `config.assetRoutes` values.
 *
 * @param {string} requestedPathKey - The normalized request path key (no leading slash)
 * @param {Object} config - The router configuration
 * @param {string} [config.assetBasePath] - Base path to resolve relative asset paths (defaults to process.cwd())
 * @param {Object.<string, string|Object|Function>} [config.assetRoutes] - The assetRoutes mapping
 * @returns {null|{type: 'function', handler: Function}|{type: 'file', filePath: string, readFile: Function, getMimeType: Function, responseHeaders: Object}}
 */
export function findAssetRoute(requestedPathKey, config) {
    if (!requestedPathKey || !config || !config.assetRoutes) return null;

    const route = config.assetRoutes[requestedPathKey];
    if (!route) return null;

    // Allow overriding the base path for resolving relative asset paths (useful for tests)
    const assetBasePath = config.assetBasePath || process.cwd();

    if (typeof route === 'function') {
        return { type: 'function', handler: route };
    }

    let assetFilePath = null;
    let assetReadFile = config.handlerReadFile;
    let assetGetMimeType = config.handlerGetMimeType;
    let assetResponseHeaders = null;

    if (typeof route === 'string') {
        assetFilePath = pathIsAbsolute(route) ? route : pathJoin(assetBasePath, route);
    } else if (typeof route === 'object' && route.filePath) {
        assetFilePath = pathIsAbsolute(route.filePath) ? route.filePath : pathJoin(assetBasePath, route.filePath);
        if (route.readFile) assetReadFile = route.readFile;
        if (route.getMimeType) assetGetMimeType = route.getMimeType;
        if (route.responseHeaders) assetResponseHeaders = route.responseHeaders;
    }

    if (!assetFilePath) return null;

    return {
        type: 'file',
        filePath: assetFilePath,
        readFile: assetReadFile,
        getMimeType: assetGetMimeType,
        responseHeaders: assetResponseHeaders,
    };
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
        config.urlPrefixes = [];
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

    // Normalize assetRoutes if provided: keys should not start with a leading slash
    if (config.assetRoutes && typeof config.assetRoutes !== 'object') {
        throw new Error('assetRoutes must be an object mapping URL paths to asset descriptors');
    } else if (!config.assetRoutes) {
        config.assetRoutes = {};
    } else {
        const normalized = {};
        for (const key in config.assetRoutes) {
            const normalizedKey = key.replace(/^\/+/, '');
            normalized[normalizedKey] = config.assetRoutes[key];
        }
        config.assetRoutes = normalized;
    }

    return async function (req, res, state) {
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

        // After prefix normalization, check assetRoutes for a mapping relative to the (possibly trimmed) URL
        const requestedPathKey = (requestedDirectory + requestedFile).replace(/^\/+/, '');
        if (requestedFile) {
            const assetRoute = findAssetRoute(requestedPathKey, config);
            if (assetRoute) {
                if (assetRoute.type === 'function') {
                    const handled = await assetRoute.handler(req, res, state);
                    if (handled) return true;
                } else if (assetRoute.type === 'file') {
                    if (await config.handlerFileExists(assetRoute.filePath)) {
                        const fileContent = await (assetRoute.readFile ? assetRoute.readFile(assetRoute.filePath) : config.handlerReadFile(assetRoute.filePath));
                        res.writeHead(200, { 'Content-Type': assetRoute.getMimeType ? assetRoute.getMimeType(assetRoute.filePath) : config.handlerGetMimeType(assetRoute.filePath) });
                        if (assetRoute.responseHeaders) {
                            for (const header in assetRoute.responseHeaders) {
                                res.setHeader(header, assetRoute.responseHeaders[header]);
                            }
                        } else if (config.responseHeaders) {
                            for (const header in config.responseHeaders) {
                                res.setHeader(header, config.responseHeaders[header]);
                            }
                        }
                        res.write(fileContent);
                        res.end();
                        return true;
                    }
                }
            }
        }

        let filePath = null;
        // If file exists, serve the file
        if (!redirectPath
            && await config.handlerFileExists(
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
                if (await config.handlerFileExists(pathJoin(filePathWithSlash, indexFile))) {
                    redirectPath = `${basePath}${requestedFile}/`;
                    break;
                }
            }
        }

        if (redirectPath) {
            res.writeHead(301, { Location: '/' + redirectPath.replace(/^\/+/, '') });
            res.end();
            return true;
        }

        if (!filePath && !requestedFile) {
            for (const indexFile of config.indexFiles) {
                if (await config.handlerFileExists(pathJoin(config.resourceServePath, `${requestedDirectory}${indexFile}`))) {
                    filePath = pathJoin(config.resourceServePath, `${requestedDirectory}${indexFile}`);
                    break;
                }
            }
        }

        if (filePath) {
            const fileContent = await config.handlerReadFile(filePath);
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
