import fs from 'fs';
import { join as pathJoin } from 'path';

export async function scanAppPaths(state) {
    const pathScannerInstances = [
        ...createVendorPathScanner(state),
        ...createPackagesPathScanner(state),
    ];

    const results = await Promise.allSettled(pathScannerInstances);

    const validModuleFolders = [];
    for (const result of results) {
        if (result.status === 'fulfilled') {
            validModuleFolders.push(...result.value);
        }
    }

    return validModuleFolders;
}

export function createVendorPathScanner(state) {
    const appPaths = state.settings.appModules.appPaths;
    const pathScannerInstances = [];

    for (const appPath of appPaths) {
        pathScannerInstances.push(scanVendorPath(state, appPath));
    }

    return pathScannerInstances;
}

export function createPackagesPathScanner(state) {
    const appPackages = state.settings.appModules.appPackages;
    const pathScannerInstances = [];

    for (const appPackage of appPackages) {
        pathScannerInstances.push(scanPackage(state, appPackage));
    }

    return pathScannerInstances;
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

export async function scanPackage(state, packageName) {
    let module = null;
    try {
        module = await import(packageName);
    } catch (error) {
        console.error(
            'Module import error:',
            {
                packageName,
                error,
            }
        );

        return [];
    }

    const validModuleFolders = [];
    if (module && typeof module.appModulePath === 'string') {
        validModuleFolders.push(module.appModulePath);
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
