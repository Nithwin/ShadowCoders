module.exports = {
    apps: [
        {
            name: 'shadowcoders-backend',
            cwd: './backend',
            script: 'dist/index.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'production',
            },
        },
        {
            name: 'shadowcoders-frontend',
            cwd: './frontend',
            script: 'node_modules/.bin/next',
            args: 'start',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'production',
            },
        },
    ],
};
