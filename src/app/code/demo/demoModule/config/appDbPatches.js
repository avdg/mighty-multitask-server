export default {
    patches: {
        test_patch: {
            apply: async function(state) {
                await state.instances.appDbInstance.connection.prepare(
                    'CREATE TABLE IF NOT EXISTS test_patch (id INTEGER PRIMARY KEY, name TEXT)'
                ).run();
            }
        }
    }
}