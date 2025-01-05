import EventEmitter from 'node:events';

export function createInstances(state) {
    state.instances.events = new EventEmitter();
}
