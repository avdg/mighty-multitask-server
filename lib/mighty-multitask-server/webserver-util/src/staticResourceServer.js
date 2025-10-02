import { readFile, stat } from "fs";
import { join as pathJoin } from "path";
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
            res.writeHead(301, { Location: '/' + redirectPath });
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
