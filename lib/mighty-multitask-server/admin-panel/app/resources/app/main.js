import { loadContent } from "../lib/templates/loadContent.js";
import { settings } from "./settings.js";

// TODO
function clearContent() {
    document.body.innerHTML = '';
}

function showDashboard() {
    return loadContent('../templates/dashboard.html');
}

// TODO - move function, but also only add the content to the relevant part of the dashboard instead of replacing the whole dashboard
function showLoginForm() {
    // Get path to ../templates/login-form.html
    loadContent('../templates/login-form.html');
}

export function bootstrap() {
    showDashboard().then(() => {
        for (const task of settings.webpageTasks) {
            task(settings);
        }
    });
}