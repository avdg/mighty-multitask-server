import { randomText } from "./random.js";

export function getClientToken() {
    return sessionStorage.getItem('admin.clientToken');
}

export function setClientToken(token) {
    if (!token) {
        token = randomText(64);
    }

    sessionStorage.setItem('admin.clientToken', token);
    return token;
}

export async function checkIfUserIsLoggedIn() {
    fetch('/api/auth', {
        headers: {
            'Authorization': 'Bearer ' + getClientToken()
        }
    }).then(response => {
        if (response.status === 200) {
            return true;
        } else {
            return false;
        }
    });
}

export async function login(username, password) {
    return fetch('/api/auth', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getClientToken(),
        },
        body: JSON.stringify({
            username: username,
            password: password
        }),
    }).then(response => {
        if (response.status === 200) {
            return true;
        } else {
            return false;
        }
    });
}