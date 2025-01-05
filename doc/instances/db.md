# Db instance

The `Db` instance is a nodejs instance of sqlite that is used to interact with the database.
The db is stored by default at `var/data/app.sqlite`.

The `Db` instance is accessible from the state object from `state.instances.appDbInstance.connection`.

## Migrations

If the db file is not found, the db will be created and the migrations will be run.

Each app module can have their own set of migrations on top of the core migrations.
All migrations are run during the startup of the app.

There are three types of migrations:

- Db schemas: These are table layout descriptions describing how a table and its columns should look like.
              If a table or column is missing and is defined inside these configurations, it will be always be created.
- Db migration patches: These are small functions that can be run to change the structure of the db.
                        The name of the patch should be unique because the name is stored in the migration tracker.
                        Once a patch has been run succesfully, it will not be run again except if the patch callback
                        returned false.
- Db migration scripts: These are scripts that can be run to change the structure of the db.
                        These scripts should be bundled with a version number.
                        Only scripts with a higher version number than the current version will be run.
                        After a script is run, the version number of the migration script is stored in the db.

The db schemas should be defined in the app module at `config/appDbSchemas.js`.

Example of a db migration config script:

```js
export default {
    tables: {
        tableName: {
            columns: {
                'columnName': {
                    type: 'int',
                    size: '8',
                }
            }
        }
    }
};
```

The db migration patches should be defined in the app module at `config/appDbPatches.js`.

Example of a db migration patch:

```js
export default {
    patches: {
        patchName: {
            apply: async (state) => {
                await state.instances.appDbInstance.connection.prepare('CREATE TABLE tableName (columnName int)')
                    .run();
            }
        }
    }
};
```

The db migration scripts should be defined in the app module at `config/appDbMigrations.js`.

Example of a db migration script:

```js
export default {
    migrations: {
        migrationScriptName: {
            version: '1.0.0',
            script: async (state, lastVersion) => {
                // lastVersion is the last version that was known to the db or null if no version was known
                await state.instances.appDbInstance.connection.prepare('CREATE TABLE tableName (columnName int)')
                    .run();
            }
        }
    }
};
```
