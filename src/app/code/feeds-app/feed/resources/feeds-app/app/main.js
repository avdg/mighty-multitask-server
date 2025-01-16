// URI,name,alternative-fr,alternative-nl,alternative-de,alternative-en,taf-tap-code,telegraph-code,country-code,longitude,latitude,avg_stop_times,official_transfer_time
const stationsUrl = 'https://raw.githubusercontent.com/iRail/stations/refs/heads/master/stations.csv';
const embarkmentStatisticsUrl = 'https://raw.githubusercontent.com/iRail/stations/refs/heads/master/embarkment_statistics.csv';
const alternativeStationFields = ['alternative-fr', 'alternative-nl', 'alternative-de', 'alternative-en'];

const stationLiveboardCacheTtl = '30';
const stationLiveboardErrorTtl = '10';
const stationLiveboardUpdateInterval = '60';
const stationLiveboardUpdateIntervalError = '10';
const stationLiveboardCache = {};

export function bootstrap() {
    loadAppContent().then(() => {
        showPickStation();
    });
}

async function loadAppContent() {
    if (!document.getElementById('list_stations')) {
        const stationDatalist = document.createElement('datalist');
        stationDatalist.id = 'list_stations';
        
        document.head.appendChild(stationDatalist);
    }

    await Promise.allSettled([
        (async() => {
            globalThis.stations = await fetchStations();
        })(),
        (async() => {
            globalThis.embarkmentStatistics = await fetchEmbarkmentStatistics();
        })(),
    ]);
}

/***** rate limit controller for external data fetchers *****/

const rateLimitIrailApiPerSec = 3;
let currentAllowedRate = rateLimitIrailApiPerSec;
async function rateLimitIrailApi(callback) {
    while (currentAllowedRate <= 0) {
        await sleep(1000);
    }

    currentAllowedRate--;
    setTimeout(() => {
        currentAllowedRate++;
    }, 1000);
    return await callback();
}

/***** external data fetchers *****/

async function fetchStations() {
    return fetch(stationsUrl)
        .then(response => response.text())
        .then(text => {
            const lines = text.trim().split('\n');
            const headers = lines[0].split(',');

            return lines.slice(1).map(line => {
                const values = line.split(',');
                const station = {};

                headers.forEach((header, index) => {
                    station[header] = values[index];
                });

                // Merge all station names into one array
                station.names = [
                    station.name,
                    station['alternative-fr'],
                    station['alternative-nl'],
                    station['alternative-de'],
                    station['alternative-en'],
                ].filter(Boolean).map(
                    station => station.replace(/[\-']/g, ' ')
                );

                return station;
            });
        });
}

async function fetchEmbarkmentStatistics() {
    return fetch(embarkmentStatisticsUrl)
        .then(response => response.text())
        .then(text => {
            const lines = text.trim().split('\n');
            const headers = lines[0].split(',');
            const statistics = {};
            
            lines.slice(1).map(line => {
                const values = line.split(',');
                const rawStatistics = {};

                headers.forEach((header, index) => {
                    rawStatistics[header] = values[index];
                });

                statistics[rawStatistics.name] = {
                    nmbs_short_name: rawStatistics.nmbs_short_name ?? undefined,
                    average_weekday_embarkments: rawStatistics.average_weekday_embarkments ?
                        (+(rawStatistics.average_weekday_embarkments.replace(/\./g, ''))) : undefined,
                    average_saturday_embarkments: rawStatistics.average_saturday_embarkments ?
                        (+(rawStatistics.average_saturday_embarkments.replace(/\./g, ''))) : undefined,
                    average_sunday_embarkments: rawStatistics.average_sunday_embarkments ?
                        (+(rawStatistics.average_sunday_embarkments.replace(/\./g, ''))) : undefined
                };

                statistics[rawStatistics.name].average_day_embarkments = Math.round((
                    ((statistics[rawStatistics.name].average_weekday_embarkments ?? 0) * 5)
                    + ((statistics[rawStatistics.name].average_saturday_embarkments ?? 0) * 1)
                    + ((statistics[rawStatistics.name].average_sunday_embarkments ?? 0) * 1)
                ) / 7);
            });

            return statistics;
        });
}

async function fetchLiveboard(station, settings) {
    if (stationLiveboardCache[station] && stationLiveboardCache[station].ttl > Date.now()) {
        return stationLiveboardCache[station];
    }

    const params = {
        station: station,
        alerts: true,
        format: 'json',
    }

    const url = new URL('https://api.irail.be/v1/liveboard/');
    url.search = new URLSearchParams(params).toString();

    const requestedAt = Date.now();
    const results = await rateLimitIrailApi(() => fetch(url));

    let finalResults = null;
    if (!results.ok) {
        finalResults = {
            error: results.statusText,
        };
    } else {
        finalResults = await results.json();
    }

    stationLiveboardCache[station] = {
        data: finalResults,
        ttl: Date.now() + ((
            results.ok
                ? stationLiveboardCacheTtl
                : stationLiveboardErrorTtl
        ) * 1000),
        requestedAt,
    };

    return stationLiveboardCache[station];
}

const CACHE_KEY_VEHICLE_COMPOSITION_PREFIX = 'vehicle_composition_';
const CACHE_KEY_VEHICLE_COMPOSITION_TTL = 10 * 60 * 1000;
async function fetchVehicleComposition(vehicleId) {
    // Use an Object that can simluate sessionStorage if no sessionStorage is available
    const storage = getSessionStorage();

    if (storage.getItem(CACHE_KEY_VEHICLE_COMPOSITION_PREFIX + vehicleId)) {
        const result = JSON.parse(storage.getItem(CACHE_KEY_VEHICLE_COMPOSITION_PREFIX + vehicleId));

        if (result.ttl > Date.now()) {
            return result;
        }

        storage.removeItem(CACHE_KEY_VEHICLE_COMPOSITION_PREFIX + vehicleId);
    }

    const params = {
        id: vehicleId,
        format: 'json',
    }

    const url = new URL('https://api.irail.be/v1/composition/');
    url.search = new URLSearchParams(params).toString();

    const requestedAt = Date.now();
    const results = await rateLimitIrailApi(() => fetch(url));
    const finalResults = await results.json();
    const parsedResults = parseCompositionData(finalResults);

    const cacheData = {
        data: parsedResults,
        ttl: Date.now() + (
            results.ok
                ? CACHE_KEY_VEHICLE_COMPOSITION_TTL
                : (stationLiveboardErrorTtl * 1000)
        ),
        requestedAt,
    };

    storage.setItem(CACHE_KEY_VEHICLE_COMPOSITION_PREFIX + vehicleId, JSON.stringify(cacheData));

    return cacheData;
}

function hasVehicleCompositionInCache(vehicleId) {
    const storage = getSessionStorage();
    return storage.getItem(CACHE_KEY_VEHICLE_COMPOSITION_PREFIX + vehicleId);
}

/***** content loaders *****/

export async function loadHtmlTemplate(templateUrl) {
    const response = await fetch(templateUrl);
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const content = doc.getElementById('content');

    if (!content) {
        throw new Error('Template does not contain an element with id `content`');
    }

    return {
        body: content,
    }
}

export async function loadContent(templateUrl) {
    const content = await loadHtmlTemplate(templateUrl);
    
    // clear body
    document.body.innerHTML = '';

    // append content
    document.body.appendChild(content.body);
}

/***** helpers *****/
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function normalizeStationName(stationName) {
    return stationName
    .trim()
    .toUpperCase()
    .replace(/[\-']/g, ' ')
    .replace(/[ÂÀÁ]/g, 'A')
    .replace(/[ÉÈÊË]/g, 'E')
    .replace(/[ÎÍ]/g, 'I')
    .replace(/[ÔÖ]/g, 'O')
    .replace(/[ÜÛ]/g, 'U')
    .replace(/Ž/g, 'Z')
    .replace(/Œ/g, 'OE');
}

export function getSessionStorage() {
    return window.sessionStorage || (function() {
        if (window.alternativeSessionStorage) {
            return window.alternativeSessionStorage;
        }

        const storage = {};
        storage.getItem = function(key) {
            return storage[key];
        };
        storage.setItem = function(key, value) {
            storage[key] = value;
        }

        window.alternativeSessionStorage = storage;
        return storage;
    })();
}

/***** app *****/

export async function showPickStation() {
    await loadContent(
        new URL(
            'templates/pickStation.html',
            import.meta.url
        ).href
    );

    const stationInput = document.getElementById('stationInput');
    const selectedStationHolder = document.getElementById('selectedStation');

    stationInput.addEventListener('keyup', autoCompleteStations(stationInput, selectedStationHolder));
    stationInput.addEventListener('focus', autoCompleteStations(stationInput, selectedStationHolder));
    stationInput.addEventListener('input', autoCompleteStations(stationInput, selectedStationHolder));
}

let lastLiveboardUpdate = 0;
let lastSelectedStation = '';
async function updateLiveboardFromSelectedStation() {
    const selectedStationHolder = document.getElementById('selectedStation');
    if (!selectedStationHolder.dataset.selectedStation) {
        return;
    }

    lastSelectedStation = selectedStationHolder.dataset.selectedStation;
    lastLiveboardUpdate = Date.now();

    const liveboardResults = await fetchLiveboard(selectedStationHolder.dataset.selectedStation);
    console.log(liveboardResults);

    const timeTableElement = document.getElementById('timetable');
    const timeTableBodyElement = timeTableElement.querySelector('tbody');
    const timeTableMessagesElement = document.getElementById('timetable-messages');
    const timeTableUpdateTimestampElement = document.getElementById('timetable-update-time');
    timeTableBodyElement.innerHTML = '';


    if (liveboardResults.data.error || !liveboardResults.data.departures?.departure) {
        timeTableMessagesElement.innerText = liveboardResults.data.error;
        timeTableUpdateTimestampElement.innerText = liveboardResults.data.requestedAt ? new Date(liveboardResults.data.requestedAt).toLocaleString() : '';

        if (!liveboardResults.data.error) {
            hideLiveboard();
        }

        return;
    }

    timeTableMessagesElement.innerText = '';
    timeTableUpdateTimestampElement.innerText = liveboardResults
        ? (
            'Updated at: ' + new Date(liveboardResults.requestedAt).toLocaleTimeString()
            + ' on ' + new Date(liveboardResults.requestedAt).toLocaleDateString()
        )
        : '';

    for (const departure of liveboardResults.data.departures.departure) {
        const row = document.createElement('tr');

        const cellTime = document.createElement('td');
        let cellTimeContent = departure.time ? new Date(departure.time * 1000).toLocaleTimeString(
            undefined,
            {hour: '2-digit', minute: '2-digit'}
        ) : '';
        if (departure.delay > 0) {
            cellTime.classList.add('delayed');
            const minutes = Math.floor(departure.delay / 60);
            const seconds = departure.delay % 60;
            const estimatedDepartureTime = new Date(((+departure.time) + (+departure.delay)) * 1000);
            cellTimeContent += `&nbsp;+${minutes}m`;
            if (seconds > 0) {
                cellTimeContent += `&nbsp;${seconds}s)`;
            }
            cellTimeContent += ")";

            cellTimeContent = `${estimatedDepartureTime.toLocaleTimeString(
                undefined,
                {hour: '2-digit', minute: '2-digit'}
            )} <br>(${cellTimeContent}`;
        }
        cellTime.innerHTML = cellTimeContent;
        row.appendChild(cellTime);

        const cellPlatform = document.createElement('td');
        if (departure.canceled !== '1') {
            cellPlatform.innerText = departure.platform ?? '';
        }

        cellPlatform.classList.add('column-platform-content');
        if (departure.platforminfo?.normal === '0') {
            cellPlatform.classList.add('different-platform');
        }

        row.appendChild(cellPlatform);

        const cellTrainType = document.createElement('td');
        cellTrainType.innerText = departure.vehicleinfo?.type ?? '';
        row.appendChild(cellTrainType);

        const cellDestination = document.createElement('td');
        cellDestination.innerText = departure.stationinfo?.standardname ?? '';
        if (departure.canceled === '1') {
            cellDestination.classList.add('canceled-destination');
        }
        row.appendChild(cellDestination);

        row.dataset.vehicleId = departure.vehicle;
        timeTableBodyElement.appendChild(row);
    }

    timeTableElement.classList.remove('not-visible');

    setTimeout(() => {
        autoRefreshLiveboard(selectedStationHolder.dataset.selectedStation);
    }, stationLiveboardUpdateInterval * 1000);

    // TMP code behind ?test=1 flag
    if (new URLSearchParams(window.location.search).get('test') !== '1') {
        return;
    }
    let bestId = null;
    for (const departure of liveboardResults.data.departures.departure) {
        if (departure.canceled === '1') {
            continue;
        }

        if (departure.vehicleinfo?.type === 'BUS') {
            continue;
        }

        if (hasVehicleCompositionInCache(departure.vehicle)) {
            const trainDataTableRow = document.querySelector('tr[data-vehicle-id="' + departure.vehicle + '"]');
            if (trainDataTableRow) {
                const trainDataCell = document.createElement('td');
                trainDataCell.colSpan = 4;
                trainDataCell.appendChild(renderCompositionData(
                    JSON.parse(getSessionStorage().getItem(CACHE_KEY_VEHICLE_COMPOSITION_PREFIX + departure.vehicle)).data
                ));
                trainDataTableRow.appendChild(trainDataCell);
            }
            continue;
        }

        if (bestId) {
            continue;
        }

        bestId = departure.vehicle;
    }

    if (bestId) {
        const vehicleComposition = await fetchVehicleComposition(bestId);
        console.log(vehicleComposition);

        const trainDataTableRow = document.querySelector('tr[data-vehicle-id="' + bestId + '"]');
        if (trainDataTableRow) {
            const trainDataCell = document.createElement('td');
            trainDataCell.colSpan = 4;
            trainDataCell.appendChild(renderCompositionData(vehicleComposition.data));
            trainDataTableRow.appendChild(trainDataCell);
        }
    }
}

function autoRefreshLiveboard(station) {
    if (lastSelectedStation !== station ||
        Date.now() - lastLiveboardUpdate < stationLiveboardUpdateInterval * 1000
    ) {
        return;
    }

    updateLiveboardFromSelectedStation();
}

function hideLiveboard() {
    const liveboardElement = document.getElementById('timetable');
    if (!liveboardElement) {
        return;
    }

    liveboardElement.classList.add('not-visible');

    const timeTableBody = liveboardElement.querySelector('tbody');
    while (timeTableBody.firstChild) {
        timeTableBody.removeChild(timeTableBody.firstChild);
    }
}

export function getStationSuggestions(searchString, resultCount) {
    if (!searchString) {
        return [];
    }

    const stations = [];
    const alternatives = {};

    const lookFor = normalizeStationName(searchString);
    for (const station of globalThis.stations) {
        // Check main station name
        const stationNameNormalized = normalizeStationName(station.name ?? '');
        const stationNameWithoutSpaces = stationNameNormalized.replace(/\s/g, '');
        if (stationNameNormalized && (
            stationNameNormalized.includes(lookFor) ||
            stationNameWithoutSpaces.includes(lookFor.replace(/\s/g, ''))
        )) {
            stations.push({
                name: station.name,
                matchingName: stationNameNormalized,
                suggestion: stationNameNormalized.includes(lookFor)
                    ? station.name
                    : `${stationNameWithoutSpaces.toUpperCase()} -> ${station.name.toUpperCase()}`,
            });
            continue;
        }
        
        // Check alternative names
        for (const alternativeField of alternativeStationFields) {
            if (!station[alternativeField]) {
                continue;
            }
            const alternativeNameFormatted = station[alternativeField].replace(/[\-']/g, ' ').toUpperCase();
            if (alternativeNameFormatted && alternativeNameFormatted.includes(lookFor)) {
                stations.push({
                    name: station.name,
                    matchingName: alternativeNameFormatted,
                    suggestion: station[alternativeField].includes(lookFor) ? station[alternativeField] : `${alternativeNameFormatted.toUpperCase() } -> ${station.name.toUpperCase()}`,
                });
                alternatives[station.name] = alternativeNameFormatted;
                break;
            }
        }
    }

    stations.sort(function(a, b) {
        const scoreA = window.embarkmentStatistics[a.name]?.average_day_embarkments ?? 0;
        const scoreB = window.embarkmentStatistics[b.name]?.average_day_embarkments ?? 0;
    
        return scoreB - scoreA;
    });

    return stations.slice(0, resultCount);
}

/***** event handlers *****/

let lastAutoCompletedStation = null;
function autoCompleteStations(element, selectedStationHolder) {
    return function(e) {
        if (lastAutoCompletedStation === element.value) {
            return;
        }

        const stationListElement = document.getElementById('list_stations');
        while (stationListElement.lastChild) {
            stationListElement.removeChild(stationListElement.lastChild);
        }

        const results = getStationSuggestions(element.value, 5);

        for (const result of results) {
            const option = document.createElement('option');
            option.value = result.suggestion;
            stationListElement.appendChild(option);
        }

        const currentInput = normalizeStationName(element.value);
        let matchingIndex = -1;
        if (results.length === 1) {
            selectedStationHolder.innerText = results[0].matchingName;
            selectedStationHolder.dataset.selectedStation = results[0].name;
            updateLiveboardFromSelectedStation();
        } else if (results.length > 1 && (
            (matchingIndex = results.findIndex(
                result => result.matchingName === currentInput
                || result.matchingName.includes("(" + currentInput + ")")
            )) >= 0
        )) {
            selectedStationHolder.innerText = results[matchingIndex].matchingName;
            selectedStationHolder.dataset.selectedStation = results[matchingIndex].name;
            updateLiveboardFromSelectedStation();
        } else if (selectedStationHolder.innerText.length > 0) {
            selectedStationHolder.innerText = '';
            selectedStationHolder.dataset.selectedStation = undefined;
            hideLiveboard();
        }

        lastAutoCompletedStation = element.value;
    }
}

function parseCompositionData(data) {
    const compositionOutput = [];

    const segments = data?.composition?.segments?.segment;

    if (!segments) {
        return compositionOutput;
    }

    for (const segment of segments) {
        if (!segment || !segment.composition || !segment.composition.units?.unit) {
            continue;
        }

        const segmentData = {
            origin: segment.origin.standardname,
            destination: segment.destination.standardname,
            source: segment.composition.source,
            units: [],
        };

        for (const unit of segment.composition.units.unit) {
            segmentData.units.push({
                materialType: unit.materialType,
                materialProperties: {
                    materialNumber: unit.materialNumber,
                    materialSubTypeName: unit.materialSubTypeName,
                    tractionType: unit.tractionType,
                    lengthInMeter: unit.lengthInMeter,
                    seatsFirstClass: parseInt(unit.seatsFirstClass),
                    seatsCoupeFirstClass: parseInt(unit.seatsCoupeFirstClass),
                    standingPlacesFirstClass: parseInt(unit.standingPlacesFirstClass),
                    seatsSecondClass: parseInt(unit.seatsSecondClass),
                    seatsCoupeSecondClass: parseInt(unit.seatsCoupeSecondClass),
                    standingPlacesSecondClass: parseInt(unit.standingPlacesSecondClass),
                    hasSemiAutomaticInteriorDoors: unit.hasSemiAutomaticInteriorDoors === '1',
                },
                hasToilets: unit.hasToilets === '1',
                hasSecondClassOutlets: unit.hasSecondClassOutlets === '1',
                hasFirstClassOutlets: unit.hasFirstClassOutlets === '1',
                hasHeating: unit.hasHeating === '1',
                hasAirco: unit.hasAirco === '1',
                canPassToNextUnit: unit.canPassToNextUnit === '1',
                tractionPosition: unit.tractionPosition,
                hasPrmSection: unit.hasPrmSection === '1',
                hasPriorityPlaces: unit.hasPriorityPlaces === '1',
                hasBikeSection: unit.hasBikeSection === '1',
            });
        }

        compositionOutput.push(segmentData);
    }

    // Attempt to find segments that are connected
    for (let firstPos = 0; firstPos < compositionOutput.length; firstPos++) {
        for (let secondPos = firstPos + 1; secondPos < compositionOutput.length; secondPos++) {
            if (compositionOutput[firstPos].destination === compositionOutput[secondPos].origin
                && JSON.stringify(compositionOutput[firstPos].units) === JSON.stringify(compositionOutput[secondPos].units)
            ) {
                compositionOutput[firstPos].destination = compositionOutput[secondPos].destination;
                compositionOutput.splice(secondPos, 1);
                secondPos--;
                continue;
            }

            if (compositionOutput[firstPos].origin === compositionOutput[secondPos].destination
                && JSON.stringify(compositionOutput[firstPos].units) === JSON.stringify(compositionOutput[secondPos].units)
            ) {
                compositionOutput[firstPos].origin = compositionOutput[secondPos].origin;
                compositionOutput.splice(secondPos, 1);
                secondPos--;
                continue;
            }
        }
    }

    return compositionOutput;
}

const unitConditions = {
    '🚽': function (unit) {
        return unit.hasToilets;
    },
    '1️⃣': function (unit) {
        return unit.materialProperties.seatsFirstClass > 0
            || unit.materialProperties.coupeSeatsFirstClass > 0
            || unit.materialProperties.standingPlacesFirstClass > 0;
    },
    '2️⃣': function (unit) {
        return unit.materialProperties.seatsSecondClass > 0
            || unit.materialProperties.coupeSeatsSecondClass > 0
            || unit.materialProperties.standingPlacesSecondClass > 0;
    },
    '🚲': function (unit) {
        return unit.hasBikeSection;
    },
    '♿': function (unit) {
        return unit.hasPrmSection;
    },
};
function renderCompositionData(data) {
    // Create data from scratch
    const compositionTable = document.createElement('table');
    compositionTable.classList.add('composition-table');

    for (const segment of data) {
        if (data.length > 1) {
            const segmentRow = document.createElement('tr');
            const segmentHeader = document.createElement('td');
            segmentHeader.innerText = `${segment.origin} -> ${segment.destination}`;
            segmentRow.appendChild(segmentHeader);
            compositionTable.appendChild(segmentRow);
        }

        const unitPropertiesRow = document.createElement('tr');
        const unitPropertiesCell = document.createElement('td');
        for (let unitIndex = 0; unitIndex < segment.units.length; unitIndex++) {
            const unit = segment.units[unitIndex];
            const unitSpan = document.createElement('span');
            unitSpan.classList.add('train-unit');

            let lastSameUnit = unitIndex;
            while (
                (lastSameUnit + 1) < segment.units.length
                && segment.units[lastSameUnit + 1].materialType.parent_type === unit.materialType.parent_type
                && segment.units[lastSameUnit + 1].materialProperties.materialNumber === unit.materialProperties.materialNumber
            ) {
                lastSameUnit++;
            }
            const groupedUnitCount = (lastSameUnit - unitIndex) + 1;

            const materialTypeInfo = (
                (unit.materialType.parent_type ?? '')
                + ' '
                + (unit.materialProperties.materialNumber ?? '')
            ).trim();

            if (groupedUnitCount <= 1) {
                const unitPropertiesData = [materialTypeInfo];
                for (const condition in unitConditions) {
                    if (unitConditions[condition](unit)) {
                        unitPropertiesData.push(condition);
                    }
                }

                unitSpan.innerText = unitPropertiesData.filter(Boolean).join('');
                unitPropertiesCell.appendChild(unitSpan);

                continue;
            }

            const sharedProperties = [];
            const uniqueProperties = [];
            for (const condition in unitConditions) {
                const firstConditionResult = unitConditions[condition](unit);
                let allSame = true;
                for (let i = unitIndex + 1; i <= lastSameUnit; i++) {
                    if (firstConditionResult !== unitConditions[condition](segment.units[i])) {
                        uniqueProperties.push(condition);
                        allSame = false;
                        break;
                    }
                }

                if (allSame) {
                    sharedProperties.push(condition);
                }
            }

            unitSpan.innerText = materialTypeInfo;
            for (const condition of sharedProperties) {
                if (unitConditions[condition](unit)) {
                    unitSpan.innerText += condition;
                }
            }
            for (let i = unitIndex; i <= lastSameUnit; i++) {
                let uniquePropertiesText = "";
                for (const condition of uniqueProperties) {
                    if (unitConditions[condition](segment.units[i])) {
                        uniquePropertiesText += condition;
                    }
                }

                // Create new span for each unit
                const groupedUnitSpan = document.createElement('span');
                groupedUnitSpan.classList.add('grouped-train-unit');
                groupedUnitSpan.innerText += uniquePropertiesText;

                if (groupedUnitSpan.innerText.length <= 0) {
                    groupedUnitSpan.innerHTML = '&nbsp;&nbsp;&nbsp;';
                }

                unitSpan.appendChild(groupedUnitSpan);
            }

            unitPropertiesCell.appendChild(unitSpan);
            unitIndex = lastSameUnit;
        }
        unitPropertiesRow.appendChild(unitPropertiesCell);
        compositionTable.appendChild(unitPropertiesRow);
    }

    return compositionTable;
}
