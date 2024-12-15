import fs from 'fs';
import { join as pathJoin } from 'path';

export async function scanAppPaths(state) {
    const appPaths = state.settings.appModules.appPaths;
    const pathScannerInstances = [];

    for (const appPath of appPaths) {
        pathScannerInstances.push(scanVendorPath(state, appPath));
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

export async function scanVendorPath(state, vendorPath) {
    const pathContents = fs.readdirSync(vendorPath);
    const vendorFolderInstances = [];

    for (const pathContent of pathContents) {
        const fullPath = pathJoin(vendorPath, pathContent);
        if (!fs.statSync(fullPath).isDirectory()) {
            continue;
        }

        vendorFolderInstances.push(scanModulesInPath(state, fullPath));
    }

    const results = await Promise.allSettled(vendorFolderInstances);

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
        const fullPath = pathJoin(path, pathContent);
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
