import { existsSync, mkdirSync } from 'fs';
import { DatabaseSync } from 'node:sqlite';
import { join as pathJoin } from 'path';

import { loadModulesConfig } from '../api/modulesConfig.js';
import { compareVersions } from '../core/versions.js';

export function createInstances(state) {
    loadDb(state).then(async () => {
        await applyDbSchemas(state);
        await runDbMigrationPatches(state);
        await runDbMigrationScripts(state);

        state.instances.appDbInstance.ready = true;
        console.log('Database setup update completed');
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

    for (const tableName in (schemaSettings.tables ?? {})) {
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
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT
                );
            `);

            for (const columnName in schemaSettings.tables[tableName].columns) {
                missingColumns.push(columnName);
            }
        }

        if (missingColumns.length > 0) {
            for (const columnName of missingColumns) {
                const columnSettings = schemaSettings.tables[tableName].columns[columnName];
                const columnType = columnSettings.type;
                const columnSize = columnSettings.size;
                const columnNullable = columnSettings.nullable;
                const columnUnique = columnSettings.unique;
                const columnDefault = columnSettings.default;

                const columnTypeDefinition = columnType
                    + (columnSize ? `(${columnSize})` : '')
                    + (columnNullable === false ? '' : ' NOT NULL')
                    + (columnUnique === true ? ' UNIQUE' : '')
                    + (columnDefault !== undefined ? ` DEFAULT ${columnDefault}` : '');

                const query = `
                    ALTER TABLE ${tableName}
                    ADD COLUMN ${columnName} ${columnTypeDefinition}
                `;
                try {
                    connection.exec(query);
                } catch (e) {
                    console.log(query, e);
                }
            }
        }

        if (shouldCreateTable) {
            console.log('Created table', tableName);
        } else if (missingColumns.length > 0) {
            console.log('Updated table', tableName, 'with columns', missingColumns);
        }
    }
}

async function runDbMigrationPatches(state) {
    const migrationSettings = (await loadModulesConfig(state, 'appDbPatches')).config;
    const connection = state.instances.appDbInstance.connection;

    const migrationPatches = migrationSettings.patches ?? {};

    for (const patchName in migrationPatches) {
        if (typeof migrationPatches[patchName] !== 'object'
            || typeof migrationPatches[patchName].apply !== 'function'
        ) {
            console.error('Invalid db patch', patchName);
            continue;
        }

        const patchExists = connection.prepare('SELECT name FROM app_db_patches WHERE name = ?')
        .get(patchName);
        
        if (typeof patchExists !== 'object' || patchExists.name !== patchName) {
            console.log('Applying db patch', patchName);

            connection.prepare('BEGIN TRANSACTION;').run();
            const result = await migrationPatches[patchName].apply(state);
            if (result !== false) {
                connection.prepare('INSERT INTO app_db_patches (name) VALUES (?)')
                    .run(patchName);
            }
            connection.prepare('COMMIT;').run();
        }
    }
}

async function runDbMigrationScripts(state) {
    const migrationSettings = (await loadModulesConfig(state, 'appDbMigrations')).config;
    const connection = state.instances.appDbInstance.connection;

    const migrationScripts = migrationSettings.migrations ?? {};

    for (const migrationScript in migrationScripts) {
        if (typeof migrationScripts[migrationScript] !== 'object'
            || typeof migrationScripts[migrationScript].apply !== 'function'
            || typeof migrationScripts[migrationScript].version !== 'string'
        ) {
            console.error('Invalid db migration', migrationScript);
            continue;
        }

        const currentMigrationVersion = connection.prepare(
            'SELECT version FROM app_db_migrations WHERE name = ?'
        ).get(migrationScript);
        
        if (typeof currentMigrationVersion !== 'object'
            || compareVersions(
                currentMigrationVersion.version,
                migrationScripts[migrationScript].version
            ) < 0
        ) {
            let migrationUpdateMessage = 'Applying db migration ' + migrationScript;
            if (currentMigrationVersion) {
                migrationUpdateMessage += ' from version ' + currentMigrationVersion.version;
            }
            migrationUpdateMessage += ' to version ' + migrationScripts[migrationScript].version;
            console.log(migrationUpdateMessage);

            const appMigrationVersion = currentMigrationVersion ?
                (currentMigrationVersion.version ?? null) : null;
            await migrationScripts[migrationScript].apply(
                state,
                appMigrationVersion
            );
            connection.prepare(`BEGIN TRANSACTION;`).run();
            connection.prepare(`
                INSERT INTO app_db_migrations (name, version)
                VALUES (?, ?)
            `).run(migrationScript, migrationScripts[migrationScript].version);
            connection.prepare(`COMMIT;`).run();
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
