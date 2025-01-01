export function createState() {
    return {
        settings: {
            appDbInstance: {
                bootQueries: [
                    "PRAGMA encoding = 'UTF-8';",
                ],
            }
        },
        modulePaths: [],
        modules: {},
        instances: {},
    };
}