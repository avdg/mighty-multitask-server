import { checkIfUserIsLoggedIn } from "../../lib/auth.js";

export function setupAccounts(settings) {
    checkIfUserIsLoggedIn().then(loggedIn => {
        // if (!loggedIn) {
        //     showLoginForm();
        //     return;
        // }
    });
}