import mimeDb from '../resources/mime-db.json' with { type: 'json' };

export function getMimeType(filePath) {
    const extension = filePath.substring(filePath.lastIndexOf('.') + 1);

    if (!mimeDb[extension] || !mimeDb[extension].mimeType) {
        return 'application/octet-stream';
    }

    return mimeDb[extension].mimeType;
}

export function isCompressible(extension) {
    if (!mimeDb[extension]) {
        return false;
    }

    return mimeDb[extension].compressible ?? false;
}

export function getCharset(extension) {
    if (!mimeDb[extension] || !mimeDb[extension].charset) {
        return null;
    }

    return mimeDb[extension].charset;
}