export default {
    migrations: {
        'core-api:add-credential-types': {
            apply: async function(state, lastVersion) {
                const preparedStatement = state.instances.appDbInstance.connection.prepare(
                    'INSERT INTO app_credential_types (credential_type, credential_category, enabled) VALUES (?, ?, ?)'
                );
                
                // Classic credentials
                preparedStatement.run('password', 'credential', 1);
                // Id-tokens (Alternative to session tokens - proves identity and authentication)
                preparedStatement.run('id-token', 'credential', 1);
                // Bearer token or personal access token (scope rescrictions can be optionally applied)
                preparedStatement.run('bearer-token', 'credential', 1);
                // Access token (authorization token to retrieve access token)
                preparedStatement.run('access-token', 'credential', 1);
                // Refresh token (authentication token obtained through access token)
                preparedStatement.run('refresh-token', 'credential', 1);
                // App token through X-API-KEY, etc.
                preparedStatement.run('app-token', 'credential', 1);
                // 1-time recovery access token (to skip 2nd factor )
                preparedStatement.run('recover', 'second-factor', 1);
                // Time limited recovery token (to reset password)
                preparedStatement.run('passwordforget', 'password-recovery', 1);
            },
            version: '1.0.0',
        }
    }
}
