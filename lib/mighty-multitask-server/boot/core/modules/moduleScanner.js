import fs from 'fs';

export async function scanAppPaths(state) {
    const appPaths = state.settings.appModules.appPaths;
    const pathScannerInstances = [];

    for (const appPath of appPaths) {
        pathScannerInstances.push(scanModulesInPath(state, appPath));
    }

    const results = await Promise.allSettled(pathScannerInstances);

    const validModuleFolders = [];
    for (const result of results) {
        if (result.status === 'fulfilled') {
            validModuleFolders.push(...result.value);
        }
    }

    return validModuleFolders;
}

export async function scanModulesInPath(state, path) {
    const pathContents = fs.readdirSync(path);
    const moduleInstances = [];

    for (const pathContent of pathContents) {
        const fullPath = path + '/' + pathContent;
        if (!fs.statSync(fullPath).isDirectory()) {
            continue;
        }

        moduleInstances.push(isValidModuleFolder(state, fullPath));
    }

    const results = await Promise.allSettled(moduleInstances);

    const validModuleFolders = [];
    for (const result of results) {
        if (result.status === 'fulfilled' && result.value !== null) {
            validModuleFolders.push(result.value);
        }
    }

    return validModuleFolders;
}

export async function isValidModuleFolder(state, path) {
    const modulePath = path + '/module.js';
    const moduleFileStat = fs.statSync(modulePath);

    if (!moduleFileStat.isFile()) {
        return null;
    }

    return path;
}
