export default {
    migrations: {
        test_another_migration: {
            apply: async function(state, lastVersion) {
                await state.instances.appDbInstance.connection.prepare(
                    'CREATE TABLE IF NOT EXISTS test_migration (id INTEGER PRIMARY KEY, name TEXT)'
                ).run();
            },
            version: '1.0.0',
        }
    }
}
