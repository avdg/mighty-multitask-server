
## webserver-util Module

The `webserver-util` module helps you easily add web server features to your application. It provides simple tools for serving files, handling file types, and working with web addresses.


### Available Functions

#### File Serving & Routing
- `resourceRouterHandler(resourceServePath)`: Sets up a basic static file server for a given directory.
  ```js
  // Example: Serve files from the 'public' folder
  const handler = resourceRouterHandler(import.meta.resolve('./public'));
  ```
- `configurableResourceRouterHandler(config)`: Advanced static file server with configuration options (see below).
  ```js
  // Example: Serve files with custom options
  const handler = configurableResourceRouterHandler({
    resourceServePath: import.meta.resolve('./public'),
    indexFiles: ['index.html'],
    responseHeaders: { 'Cache-Control': 'max-age=600' }
  });
  ```

> **Note:** The following default functions are part of the core file serving functionality and are used internally by the router handlers. You can override them for custom behavior if needed:

- `defaultFileExists(filePath, logger)`: Checks if a file exists.
  ```js
  // Example: Check if a file exists
  const exists = defaultFileExists(import.meta.resolve('./public/image.png'));
  ```
- `defaultReadFile(filePath)`: Reads file content.
  ```js
  // Example: Read file content
  const content = defaultReadFile(import.meta.resolve('./public/index.html'));
  ```
- `defaultGetMimeType(filePath)`: Gets the MIME type for a file.
  ```js
  // Example: Get MIME type
  const mime = defaultGetMimeType(import.meta.resolve('./public/style.css'));
  ```


#### MIME Type Utilities
- `getMimeType(filePath)`: Returns the MIME type for a file path.
  ```js
  // Example: Get MIME type for a file
  const mime = getMimeType(import.meta.resolve('logo.svg')); // 'image/svg+xml'
  ```
- `isCompressible(extension)`: Checks if a file extension is suitable for compression.
  ```js
  // Example: Check if '.js' files are compressible
  const compressible = isCompressible('js'); // true
  ```
- `getCharset(extension)`: Gets the charset for a file extension.
  ```js
  // Example: Get charset for '.html' files
  const charset = getCharset('html'); // 'UTF-8'
  ```


#### URL Utilities
- `getFilePathFromUrlPath(path)`: Converts a URL path to a file path.
  ```js
  // Example: Convert URL path to file path
  const filePath = getFilePathFromUrlPath(import.meta.resolve('/images/photo.jpg')); // 'images/photo.jpg'
  ```

### How To Use

Import the parts you need in your code:

```js
const { getMimeType } = require('webserver-util/src/mimetype');
const { serveStatic, resourceRouterHandler, configurableResourceRouterHandler } = require('webserver-util/src/staticResourceServer');
```

#### Basic Static File Serving

```js
const handler = resourceRouterHandler('/path/to/static/files');
```

#### Advanced Static File Serving with Configuration

```js
const handler = configurableResourceRouterHandler({
  // Directory containing static files to serve (required)
  resourceServePath: '/path/to/static/files',

  // List of default index files to look for in directories
  indexFiles: ['index.html', 'index.htm'],

  // If true, redirects requests for index files to the directory URL ending with a slash
  redirectIndexFilesToSlashUrl: true,

  // Array of URL prefixes to serve static files from
  urlPrefixes: ['/static', '/public'],

  // Custom response headers to add to served files
  responseHeaders: { 'Cache-Control': 'max-age=3600' },

  // Function to check if a file exists (override default behavior)
  handlerFileExists: customFileExists,

  // Function to read file content (override default behavior)
  handlerReadFile: customReadFile,

  // Function to get MIME type for a file (override default behavior)
  handlerGetMimeType: customGetMimeType
});
```
> **Note:** All parameters except `resourceServePath` are optional.

You can customize file existence checks, file reading, MIME type detection, and response headers. Most options have sensible defaults, so you only need to set what you want to change.
