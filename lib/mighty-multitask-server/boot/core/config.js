import fs from 'fs';
import { join as pathJoin } from 'path';

import { mergeConfig } from '../api/mergeConfig.js';

const sortFileNames = (a, b) => {
    let offsetCounter = 0;
    while (a[offsetCounter] === b[offsetCounter]) {
        offsetCounter++;
    }

    // If both characters from the first unequal part are numbers, collect the whole number and compare them as numbers
    if (!isNaN(a[offsetCounter]) && !isNaN(b[offsetCounter])) {
        let aNumber = '';
        let bNumber = '';
        while (!isNaN(a[offsetCounter])) {
            aNumber += a[offsetCounter];
            offsetCounter++;
        }
        while (!isNaN(b[offsetCounter])) {
            bNumber += b[offsetCounter];
            offsetCounter++;
        }

        return parseInt(aNumber) - parseInt(bNumber);
    }

    // Otherwise, use localeCompare
    return a.localeCompare(b);
}

export async function getAppMainConfig(bootAppDir) {
    const configPath = pathJoin(bootAppDir, 'config');

    if (!fs.statSync(configPath).isDirectory()) {
        throw new Error('Config path must be a directory');
    }

    const configFiles = fs.readdirSync(configPath)
        .filter(a => a.endsWith('.js'))
        .sort(sortFileNames);

    const importedConfigs = configFiles.map(a => {
        let path = pathJoin(configPath, a);
        
        if (!path.startsWith('file://')) {
            path = 'file://' + path;
        }

        return import(path)
    });

    const results = await Promise.allSettled(importedConfigs);
    const finalConfig = {};
    let foundErrors = false;

    for (const result of results) {
        if (result.status === 'fulfilled') {
            mergeConfig(finalConfig, result.value.default);
        } else {
            console.error(result.reason);
            foundErrors = true;
        }
    }

    if (foundErrors) {
        throw new Error('Some config files failed to load');
    }

    return finalConfig;
}