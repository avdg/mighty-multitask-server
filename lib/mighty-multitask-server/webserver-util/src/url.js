export function getFilePathFromUrlPath (path) {
    path = path.replace(/^\/+|\/\//g, '');

    try {
        path = decodeURIComponent(path);
    } catch (e) {
        // Return nothing when decoding the path causes errors
        return null;
    }

    if (typeof path !== 'string') {
        return null;
    }

    const segments = path.split('/');
    // Avoid directory traversal
    if (segments.includes('..') || segments.includes('.')) {
        return null;
    }

    // Separate the request path and query string
    const [requestPath, query = ''] = path.split('?', 2);

    return {
        requestPath,
        query,
    };
};
