export function compareVersions(version1, version2) {
    const parts1 = version1.split('.');
    const parts2 = version2.split('.');
    const length = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < length; i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;
        if (part1 > part2) {
            return 1;
        }
        if (part1 < part2) {
            return -1;
        }
    }

    if (parts1.length > parts2.length) {
        return 1;
    }

    if (parts1.length < parts2.length) {
        return -1;
    }

    return 0;
}