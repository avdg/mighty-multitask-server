import { loadModuleConfig } from "@mighty-multitask-server/boot/api/modulesConfig.js";
import { getFilePathFromUrlPath } from "@mighty-multitask-server/webserver-util";

const pathPrefix = 'api/';

export function getEndPointsRouters(settings) {
    const paths = {};
    const customRouteHandlers = [];

    const apiConfig = loadModuleConfig('coreApi');

    if (apiConfig.apiPathHandlers) {
        for (const path in apiConfig.apiPathHandlers) {
            paths[path] = apiConfig.apiPathHandlers[path];
        }
    }

    if (apiConfig.customRouteHandlers) {
        customRouteHandlers.push(...apiConfig.customRouteHandlers);
    }

    return {
        paths,
        customRouteHandlers,
    };
}

export function apiRouterHandler(settings) {
    const endPointsRouters = getEndPointsRouters(settings);

    return function apiRouter(req, res, settings) {
        const pathInfo = getFilePathFromUrlPath(req.url, settings);

        if (!pathInfo) {
            return false;
        }

        // Only handle routers on path {apiPathPrefix}/endpoint
        let expectedPathPrefix = settings.pathPrefix ?? pathPrefix;
        if (!expectedPathPrefix.endsWith('/')) {
            expectedPathPrefix += '/';
        }

        if (!pathInfo.requestPath.startsWith(expectedPathPrefix)) {
            return false;
        }

        const path = pathInfo.requestPath.slice(expectedPathPrefix.length);

        if (endPointsRouters.paths[path]) {
            endPointsRouters.paths[path](req, res, settings);
            return true;
        }

        for (const customRouteHandler of endPointsRouters.customRouteHandlers) {
            if (customRouteHandler(req, res, path, settings)) {
                return true;
            }
        }

        return false;
    }
}