import mergeWith from 'lodash.mergewith';

export function mergeConfig(object, sources) {
    if (Array.isArray(object) && Array.isArray(sources)) {
        // If both arrays do not include objects or arrays, return the merged array
        const isObjectOrArray = (value) => Array.isArray(value) || typeof value === 'object';
        if (!object.some(isObjectOrArray) && !sources.some(isObjectOrArray)) {
            return object.concat(sources);
        }
    }

    return mergeWith(object, sources, (objValue, srcValue) => {
        if (Array.isArray(objValue)) {
            return objValue.concat(srcValue);
        }
    });
}
