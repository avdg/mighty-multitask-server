export function accountCreateHandle(req, res, settings) {
    const { username, namespace } = req.body;

    const connection = settings.instances.appDbInstance.connection;
    const user = connection.prepare('SELECT * FROM app_users WHERE username = ? AND namespace = ?')
        .get(username, namespace);
    
    if (user) {
        res.writeHead(409).end("User already exists");
        return;
    }

    connection.prepare('INSERT INTO app_users (username, namespace) VALUES (?, ?)')
        .run(username, namespace);

    if (req.body.authentications) {
        // TODO: connect with authentication logic
    }
}
