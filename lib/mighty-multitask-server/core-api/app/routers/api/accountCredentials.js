export function addAccuntCredentialHandler(req, res, settings) {
    // TODO add auth check
    const { accountCredentials } = settings;
    const { body } = req;
    const { username, password } = body;
    accountCredentials.push({ username, password });
    res.json({ success: true });
}