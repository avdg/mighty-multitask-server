export function getFilePathFromUrlPath (path, state) {
    path = path.replace(/^\/+|\/\//g, '');

    const pathPrefix = '';

    if (typeof path !== 'string' || !path.startsWith(pathPrefix)) {
        return null;
    }

    const serverPath = path
        .slice(pathPrefix.length) // Remove path prefix
        .replace(/\.\./g, '.'); // Avoid directory traversal

    const queryIndex = serverPath.indexOf('?');
    const requestPath = queryIndex === -1 ? serverPath : serverPath.slice(0, queryIndex);
    const query = queryIndex === -1 ? '' : serverPath.slice(queryIndex + 1);

    return {
        requestPath,
        query,
    };
};