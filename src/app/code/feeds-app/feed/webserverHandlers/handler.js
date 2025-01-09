import { readFileSync } from 'fs';

import { getFilePathFromUrlPath } from '@mighty-multitask-server/webserver-util';
import libsodium from 'libsodium-wrappers';

export function getResourceHandler(config) {
    if (typeof config !== Object) {
        config = {};
    }

    try {
        config.githubApiKey = readFileSync('/etc/secrets/github_api_key', 'utf8').trim();
    } catch (e) {
        console.error('Failed to read GitHub API key');
    }

    return async function (req, res, state) {
        const pathInfo = getFilePathFromUrlPath(req.url, state);

        if (!pathInfo) {
            return false;
        }

        const lastSlash = pathInfo.requestPath.lastIndexOf('/');

        let requestedDirectory = pathInfo.requestPath.substring(0, lastSlash);

        if (requestedDirectory !== 'feeds-app') {
            return false;
        }

        let requestedFile = pathInfo.requestPath.substring(lastSlash + 1);

        if (requestedFile === 'config.json' && req.method === 'GET') {
            if (!config.githubApiKey) {
                return false;
            }

            // https://api.github.com/repos/avdg/mighty-multitask-server/codespaces/secrets/feed_settings
            const feedSettings = await fetch(
                'https://api.github.com/repos/avdg/mighty-multitask-server/environments/render_com/secrets/session',
                {
                    headers: {
                        Accept: 'application/vnd.github+json',
                        Authorization: `Bearer ${config.githubApiKey}`,
                        'X-GitHub-Api-Version': '2022-11-28',
                    },
                }
            );

            if (!feedSettings.ok) {
                return false;
            }

            const feedSettingsJson = await feedSettings.json();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.write(JSON.stringify(feedSettingsJson));
            res.end();

            return true;
        }

        if (requestedFile === 'updateConfig' && res.method === 'POST') {
            if (!config.githubApiKey) {
                return false;
            }

            const keyResponse = await fetch(
                'https://api.github.com/repos/avdg/mighty-multitask-server/codespaces/secrets/public-key',
                {
                    headers: {
                        Accept: 'application/vnd.github.v3+json',
                        Authorization: `Bearer ${config.githubApiKey}`,
                        'X-GitHub-Api-Version': '2022-11-28',
                    },
                }
            );

            if (!keyResponse.ok) {
                return false;
            }

            const { key_id: keyId, key } = await keyResponse.json();

            const body = 'TMP_TEST_CONTENT';

            await sodiumReady;
            const binkey = libsodium.from_base64(key , libsodium.base64_variants.ORIGINAL);
            const binsec = libsodium.from_string(body);

            const encBytes = libsodium.crypto_box_seal(binsec, binkey);
            const encOutput = libsodium.to_base64(encBytes , libsodium.base64_variants.ORIGINAL);

            const updateConfig = await fetch(
                'https://api.github.com/repos/avdg/mighty-multitask-server/codespaces/secrets/feed_settings',
                {
                    method: 'PUT',
                    headers: {
                        Accept: 'application/vnd.github+json',
                        Authorization: `Bearer ${config.githubApiKey}`,
                        'X-GitHub-Api-Version': '2022-11-28',
                    },
                    body: JSON.stringify({
                        encrypted_value: encOutput,
                        key_id: keyId,
                    }),
                }
            );

            if (!updateConfig.ok) {
                return false;
            }

            res.writeHead(200);
            res.end();

            return true;
        }
    }
}
