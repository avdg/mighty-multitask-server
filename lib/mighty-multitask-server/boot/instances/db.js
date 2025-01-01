import { existsSync, mkdirSync } from 'fs';
import { DatabaseSync } from 'node:sqlite';
import { join as pathJoin } from 'path';

import { loadModulesConfig } from '../api/modulesConfig.js';

export function createInstances(state) {
    loadDb(state).then(async () => {
        await applyDbSchemas(state);

        state.instances.appDbInstance.ready = true;
    });
}

async function loadDb(state) {
    if (!existsSync(pathJoin(state.settings.varDir, '/data/app.sqlite'))) {
        mkdirSync(pathJoin(state.settings.varDir, '/data'), { recursive: true });
    }

    state.instances.appDbInstance = {
        connection: null,
        ready: false,
    };

    state.instances.appDbInstance.connection = new DatabaseSync(
        pathJoin(state.settings.varDir, '/data/app.sqlite')
    );

    await setupMinimumDbSchema(state);
}

async function applyDbSchemas(state) {
    const schemaSettings = (await loadModulesConfig(state, 'appDbSchemas')).config;
    const connection = state.instances.appDbInstance.connection;

    const bootQueries = (((state.settings ?? {}).appDbInstance ?? {}).bootQueries) ?? [];
    for (const query of bootQueries) {
        connection.exec(query);
    }

    for (const tableName in schemaSettings.tables) {
        const tableExists = connection.prepare('SELECT name FROM sqlite_schema WHERE type = ? AND name = ?')
            .get('table', tableName);
        
        const shouldCreateTable = typeof tableExists !== 'object' || tableExists.name !== tableName;
        const missingColumns = [];
        const existingColumns = [];

        if (!shouldCreateTable) {
            const columns = connection.prepare(`PRAGMA table_info(${tableName})`).all();

            for (const columnName in schemaSettings.tables[tableName].columns) {
                const columnExists = columns.find(column => column.name === columnName);

                if (!columnExists) {
                    missingColumns.push(columnName);
                } else {
                    existingColumns.push(columnName);
                }
            }
        }


        if (shouldCreateTable) {
            connection.exec(`
                CREATE TABLE ${tableName} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT
                );
            `);
        }

        if (missingColumns.length > 0) {
            for (const columnName of missingColumns) {
                const columnSettings = schemaSettings.tables[tableName].columns[columnName];
                const columnType = columnSettings.type;
                const columnSize = columnSettings.size;

                const query = `
                    ALTER TABLE ${tableName}
                    ADD COLUMN ${columnName} ${columnType}(${columnSize})
                `;
                try {
                    connection.exec(query);
                } catch (e) {
                    console.log(query, e);
                }
            }
        }
    }
}

async function setupMinimumDbSchema(state) {
    state.instances.appDbInstance.connection.exec(`
        CREATE TABLE IF NOT EXISTS app_db_patches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        );
    `);

    state.instances.appDbInstance.connection.exec(`
        CREATE TABLE IF NOT EXISTS app_db_migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            version TEXT NOT NULL
        );
    `);

    state.instances.appDbInstance.connection.exec(`
        CREATE TABLE IF NOT EXISTS app_db_data_setup (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            version TEXT NOT NULL
        );
    `);

    state.instances.appD
}
