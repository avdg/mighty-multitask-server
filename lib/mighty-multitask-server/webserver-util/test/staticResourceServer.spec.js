import { strict as assert } from 'assert';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { findAssetRoute, configurableResourceRouterHandler } from '../src/staticResourceServer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('staticResourceServer', function () {
  describe('findAssetRoute', function () {
    it('resolves string route relative to assetBasePath', function () {
      const config = {
        assetBasePath: join(__dirname, 'fixtures'),
        assetRoutes: {
          '123/test.html': 'assets/login-form.html'
        }
      };

      const route = findAssetRoute('123/test.html', config);
      assert.equal(route.type, 'file');
      assert.ok(route.filePath.endsWith(join('fixtures', 'assets', 'login-form.html')));
    });

    it('respects object route overrides', function () {
      const config = {
        assetBasePath: join(__dirname, 'fixtures'),
        handlerReadFile: () => {},
        handlerGetMimeType: () => {},
        assetRoutes: {
          '123/test.html': {
            filePath: 'assets/login-form.html',
            responseHeaders: { 'X-Test': '1' }
          }
        }
      };

      const route = findAssetRoute('123/test.html', config);
      assert.equal(route.type, 'file');
      assert.ok(route.filePath.endsWith(join('fixtures', 'assets', 'login-form.html')));
      assert.deepEqual(route.responseHeaders, { 'X-Test': '1' });
    });

    it('returns function route for function mappings', async function () {
      const handlerFn = async (req, res, state) => true;
      const config = { assetRoutes: { '123/test.html': handlerFn } };
      const route = findAssetRoute('123/test.html', config);
      assert.equal(route.type, 'function');
      assert.equal(route.handler, handlerFn);
    });
  });

  describe('configurableResourceRouterHandler (async)', function () {
    it('serves an asset route after url prefix normalization', async function () {
      const config = {
        resourceServePath: join(__dirname, 'fixtures'),
        assetBasePath: join(__dirname, 'fixtures'),
        assetRoutes: {
          '123/test.html': 'assets/login-form.html'
        },
        urlPrefixes: ['/test/']
      };

      const handler = configurableResourceRouterHandler(config);

      // Minimal mock req/res
      const req = { url: '/test/123/test.html' };
      const res = {
        status: null,
        headers: {},
        body: [],
        writeHead(status, headers) {
          this.status = status;
          Object.assign(this.headers, headers || {});
        },
        setHeader(name, value) {
          this.headers[name] = value;
        },
        write(chunk) {
          this.body.push(typeof chunk === 'string' ? chunk : chunk.toString());
        },
        end() {
          // no-op
        }
      };

      const handled = await handler(req, res, {});
      assert.equal(handled, true);
      assert.equal(res.status, 200);
      const body = res.body.join('');
      assert.ok(body.includes('<h1>Login Form</h1>'));
      assert.ok(res.headers['Content-Type'] || res.headers['content-type']);
    });
  });
});
