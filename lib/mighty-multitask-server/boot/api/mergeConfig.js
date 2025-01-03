import mergeWith from 'lodash.mergewith';

export function mergeConfig(object, sources) {
    return mergeWith(object, sources, (objValue, srcValue) => {
        if (Array.isArray(objValue)) {
            return objValue.concat(srcValue);
        }
    });
}