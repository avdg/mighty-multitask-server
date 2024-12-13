import { scanAppPaths } from "./moduleScanner.js";

export async function loadModules(state) {
    state.modulePaths = await scanAppPaths(state);
}