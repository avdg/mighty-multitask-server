import { existsSync } from 'fs';
import { join as pathJoin } from 'path';

import merge from 'lodash.merge';

export async function loadModulesConfig(state, type) {
    if (typeof type !== 'string' || !type.match(/^[a-zA-Z][a-zA-Z0-9]*$/)) {
        throw new Error('Invalid type ' + type);
    }

    const configLoaders = [];
    for (const modulePath of state.modulePaths) {
        configLoaders.push(loadModuleConfig(modulePath, type));
    }

    const results = await Promise.allSettled(configLoaders);

    const finalConfig = {
        configLoadingTree: [],
        config: {},
    };

    for (const result of results) {
        if (result.status === 'fulfilled') {
            if (typeof result.value !== 'object' || result.value === null) {
                continue;
            }

            finalConfig.configLoadingTree.push(result.value);
            finalConfig.config = merge(
                finalConfig.config,
                result.value.config,
            );
        }
    }

    return finalConfig;
}

export async function loadModuleConfig(modulePath, type) {
    let moduleConfigPath = pathJoin(modulePath, '/config/' + type + '.js');
    
    if (!existsSync(moduleConfigPath)) {
        return null;
    }
    
    if (!moduleConfigPath.startsWith('file://')) {
        moduleConfigPath = 'file://' + moduleConfigPath;
    }
    
    try {
        const moduleConfig = await import(moduleConfigPath);
        return {
            modulePath,
            config: moduleConfig.default,
        };
    } catch (e) {
        console.error('Failed to load config for module at ' + modulePath, e);
        return null;
    }
}