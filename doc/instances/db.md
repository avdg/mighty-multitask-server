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
              If a table or column is missing and is defined inside these configurations, it will be always be created. Please note that columns are not recreated or altered
              if their definition does not match with the configuration from the db schema.
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
                    nullable: false,
                    unique: true,
                    default: 'empty'
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

## Order of execution

Because db schemas are simple definitions of tables and columns, they are always run first.
These tables and column definitions are assumed to be effect-free compared to other types
of migrations and are in some cases even required to be run first in order to make other
migrations work.

Patches are run after the db schemas. The order of patches is not guaranteed and should not be relied upon. If certain logic in a patch determines that a patch should only be run later,
the patch apply handler should return false. Note that returning false will also have
the effect that the server keeps running without rerunning the patch until the server is restarted.

Db migration scripts are run after the patches. The order of scripts is not guaranteed and should not be relied upon. There is currently no mechanism implemented to rerun a migration script while the version number that is tracked by the db is equal to the version number
of the script.
