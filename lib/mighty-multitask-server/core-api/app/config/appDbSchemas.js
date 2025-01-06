export default {
    tables: {
        app_credential_types: {
            columns: {
                id: {
                    type: 'int',
                    size: '8',
                    nullable: false,
                },
                credential_type: {
                    type: 'text',
                    nullable: false,
                },
                credential_category: {
                    type: 'text',
                    nullable: false,
                },
                enabled: {
                    type: 'int',
                    size: '1',
                    nullable: false,
                },
            },
        },
        app_users: {
            columns: {
                id: {
                    type: 'int',
                    size: '8',
                    nullable: false,
                },
                namespace: {
                    type: 'text',
                    nullable: false,
                },
                username: {
                    type: 'text',
                    nullable: false,
                },
                active: {
                    type: 'int',
                    size: '1',
                    nullable: false,
                },
                created_at: {
                    type: 'int',
                    size: '8',
                },
                failures_metadata: {
                    type: 'text',
                },
            },
        },
        app_users_credentials: {
            columns: {
                id: {
                    type: 'int',
                    size: '8',
                    nullable: false,
                },
                user_id: {
                    type: 'int',
                    size: '8',
                    nullable: false,
                },
                active: {
                    type: 'int',
                    size: '1',
                    nullable: false,
                },
                created_at: {
                    type: 'int',
                    size: '8',
                },
                updated_at: {
                    type: 'int',
                    size: '8',
                },
                credential_type: {
                    type: 'text',
                },
                credential_data: {
                    type: 'text',
                },
                credential_binary_data: {
                    type: 'blob',
                },
                validation_metadata: {
                    type: 'text',
                },
                authorized_scopes: {
                    type: 'text',
                },
            },
        },
        app_user_sessions: {
            columns: {
                id: {
                    type: 'int',
                    size: '8',
                    nullable: false,
                },
                user_id: {
                    type: 'int',
                    size: '8',
                },
                session_id: {
                    type: 'text',
                },
                created_at: {
                    type: 'int',
                    size: '8',
                },
                expires_at: {
                    type: 'int',
                    size: '8',
                },
                metadata: {
                    type: 'text',
                },
                identity: {
                    type: 'text',
                },
            },
        },
        
    }
}
