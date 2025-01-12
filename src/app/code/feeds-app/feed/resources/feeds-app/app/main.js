// URI,name,alternative-fr,alternative-nl,alternative-de,alternative-en,taf-tap-code,telegraph-code,country-code,longitude,latitude,avg_stop_times,official_transfer_time
const stationsUrl = 'https://raw.githubusercontent.com/iRail/stations/refs/heads/master/stations.csv';
const embarkmentStatisticsUrl = 'https://raw.githubusercontent.com/iRail/stations/refs/heads/master/embarkment_statistics.csv';
const alternativeStationFields = ['alternative-fr', 'alternative-nl', 'alternative-de', 'alternative-en'];

const stationLiveboardCacheTtl = '30';
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
    const params = {
        station: station,
        alerts: true,
        format: 'json',
    }

    if (stationLiveboardCache[station] && stationLiveboardCache[station].ttl > Date.now()) {
        return stationLiveboardCache[station];
    }

    const url = new URL('https://api.irail.be/v1/liveboard/');
    url.search = new URLSearchParams(params).toString();

    const requestedAt = Date.now();
    const results = await fetch(url);

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
        ttl: Date.now() + (stationLiveboardCacheTtl * 1000),
        requestedAt,
    };

    return stationLiveboardCache[station];
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

async function updateLiveboardFromSelectedStation() {
    const selectedStationHolder = document.getElementById('selectedStation');
    if (!selectedStationHolder.dataset.selectedStation) {
        return;
    }

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
    timeTableUpdateTimestampElement.innerText = liveboardResults ? new Date(liveboardResults.requestedAt).toLocaleString() : '';

    for (const departure of liveboardResults.data.departures.departure) {
        const row = document.createElement('tr');

        const cellTime = document.createElement('td');
        cellTime.innerText = departure.time ? new Date(departure.time * 1000).toLocaleTimeString(
            undefined,
            {hour: '2-digit', minute: '2-digit'}
        ) : '';
        row.appendChild(cellTime);

        const cellPlatform = document.createElement('td');
        if (departure.canceled !== '1') {
            cellPlatform.innerText = departure.platform ?? '';
        }

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

        timeTableBodyElement.appendChild(row);
    }

    timeTableElement.classList.remove('not-visible');
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
        if (stationNameNormalized && stationNameNormalized.includes(lookFor)) {
            stations.push({
                name: station.name,
                matchingName: stationNameNormalized,
                suggestion: stationNameNormalized,
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
                result => result.suggestion === currentInput
                || result.suggestion.includes("(" + currentInput + ")")
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
