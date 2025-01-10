// URI,name,alternative-fr,alternative-nl,alternative-de,alternative-en,taf-tap-code,telegraph-code,country-code,longitude,latitude,avg_stop_times,official_transfer_time
const stationsUrl = 'https://raw.githubusercontent.com/iRail/stations/refs/heads/master/stations.csv';
const alternativeStationFields = ['alternative-fr', 'alternative-nl', 'alternative-de', 'alternative-en'];

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

    globalThis.stations = await fetchStations()
}

async function fetchStations() {
    return fetch(stationsUrl)
        .then(response => response.text())
        .then(text => {
            const lines = text.split('\n');
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
}

export function getStationSuggestions(searchString, resultCount) {
    if (!searchString) {
        return [];
    }

    const stations = [];
    const alternatives = {};

    const lookFor = searchString.trim().toUpperCase().replace().replace(/[\-']/g, ' ');
    for (const station of globalThis.stations) {
        // Check main station name
        const stationName = (station.name ?? '').replace(/[\-']/g, ' ').toUpperCase();
        if (stationName && stationName.includes(lookFor)) {
            stations.push({
                name: station.name,
                suggestion: stationName,
            });
            continue;
        }
        
        // Check alternative names
        for (const alternativeField of alternativeStationFields) {
            if (!station[alternativeField]) {
                continue;
            }
            const alternativeName = station[alternativeField].replace(/[\-']/g, ' ');
            if (alternativeName && alternativeName.includes(lookFor)) {
                stations.push({
                    name: station.name,
                    suggestion: alternativeName.includes(lookFor) ? alternativeName : `${alternativeName.toUpperCase() } -> ${stationName}`,
                });
                alternatives[station.name] = alternativeName;
                break;
            }
        }
    }

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

        if (results.length === 1) {
            selectedStationHolder.value = results[0].name;
        } else if (selectedStationHolder.innerText.length > 0) {
            selectedStationHolder.innerText = '';
        }

        lastAutoCompletedStation = element.value;
    }
}
