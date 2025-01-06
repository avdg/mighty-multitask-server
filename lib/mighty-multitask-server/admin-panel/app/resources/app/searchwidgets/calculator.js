const debounceTimeout = 300;
const timeoutLimit = 1000;

let isDebouncing = false;
let debounceHandle = null;
let activeWorker = null;

function triggerDebounce() {
    if (isDebouncing) {
        return;
    }

    isDebouncing = true;
    setTimeout(function() {
        isDebouncing = false;
        if (debounceHandle) {
            debounceHandle();
            debounceHandle = null;
            triggerDebounce();
        }
    }, debounceTimeout);
}

export const searchBar = {
    onInputChange: function (event) {
        const element = event.target;
        if (((isDebouncing || activeWorker !== null) && !debounceHandle)) {
            debounceHandle = function() {
                updateCalculationResult(element);
            }
            if (!isDebouncing) {
                triggerDebounce();
            }

            return;
        } else if (!isDebouncing && activeWorker === null) {
            updateCalculationResult(element);
            triggerDebounce();
        }
    }
}

export function updateCalculationResult(element) {
    if (activeWorker) {
        if (!debounceHandle) {
            debounceHandle = function() {
                updateCalculationResult(element);
            }
        }

        return;
    }

    calculate(element.value).then(function(result) {
        const navbar = element.closest('#navbar');
        let resultElements = navbar.getElementsByClassName('calculator-result');
        if (!result) {
            // Nothing to show
            while (resultElements.length > 0) {
                resultElements[0].remove();
            }

            return;
        }

        if (resultElements.length > 1) {
            // Remove all but the first
            for (let i = 1; i < resultElements.length; i++) {
                resultElements[i].remove();
            }
        }

        if (!(resultElements instanceof HTMLCollection) || resultElements.length === 0) {
            // Add a new one
            const resultElement = document.createElement('div');
            resultElement.classList.add('calculator-result');

            resultElements = [resultElement];
            navbar.appendChild(resultElement);
        }

        resultElements[0].innerText = result[0] + ' = ' + result[1];
    });
}

export async function calculate(input) {
    if ((input + '').trim().length === 0) {
        return null;
    }

    // return Math.floor(Math.random() * 1000);

    const webWorkerScript = `
        self.onmessage = function (event) {
            try {
                self.postMessage([${JSON.stringify(input)}, ${input}]);
            } catch (e) {
                self.postMessage(null);
            } finally {
                self.close();
            }
        };
    `;

    const blob = new Blob([webWorkerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    activeWorker = new Worker(workerUrl);
    if (!activeWorker) {
        return null;
    }

    return await (new Promise(function(resolve, reject) {
        const timeoutId = setTimeout(function() {

            activeWorker.terminate();
            activeWorker = null;
            resolve(null);
        }, timeoutLimit);

        activeWorker.onmessage = function (event) {
            clearTimeout(timeoutId);

            if (activeWorker) {
                activeWorker.terminate();
                activeWorker = null;
            }

            if (!Array.isArray(event.data) || event.data.length !== 2) {
                resolve(null);
                return;
            }

            if (("" + event.data[0]).trim() === ("" + event.data[1]).trim()) {
                resolve(null);
                return;
            }

            resolve(event.data);
        }

        activeWorker.onerror = function (event) {
            clearTimeout(timeoutId);
            if (activeWorker) {
                activeWorker.terminate();
                activeWorker = null;
            }
            resolve(null);
        }

        activeWorker.postMessage(true);
    }));
}