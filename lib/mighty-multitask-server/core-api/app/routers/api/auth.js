export function loginRouteHandler(req, res, settings) {
    const loginHandlers = {
        'credentials': attemptLoginWithCredentials,
    };

    for (const handlerName in loginHandlers) {
        if (loginHandlers[handlerName](req)) {
            res.writeHead(200).end();
            return;
        }
    }

    // TODO result is always 401 for now
    res.writeHead(401).end();
}

function attemptLoginWithCredentials(req) {
    const { username, password } = req.body;

    // Find the user in the database
    const connection = settings.instances.appDbInstance.connection;
    const user = connection.prepare('SELECT * FROM app_users WHERE username = ?')
        .get(username);

    return false;
}

export function logoutRouteHandler(req, res, settings) {
    res.writeHead(200).end();
}

export function checkAuthRouteHandler(req, res, settings) {
    // Find current session cookie from the request
    const sessionId = (req.cookies ?? {})['session_id'];

    if (!sessionId) {
        res.writeHead(401).end();
        return;
    }

    // Find the session in the database
    const connection = settings.instances.appDbInstance.connection;
    const session = connection.prepare('SELECT user_id FROM app_user_sessions WHERE session_id = ?')
        .get(sessionId);
    
    if (!session) {
        res.writeHead(401).end();
        return;
    }

    const user = connection.prepare('SELECT username FROM app_users WHERE id = ?')
        .get(session.user_id);

    // TODO return session information for localstorage
    res.writeHead(200);
    res.end(JSON.stringify({
        user_id: session.user_id,
        username: user.username,
    }));
}

export function checkPermissionsRouteHandler(req, res, settings) {
    const scope = req.body.scope;

    // TODO implement permission check based on scope and session
    res.writeHead(200).end();
}
