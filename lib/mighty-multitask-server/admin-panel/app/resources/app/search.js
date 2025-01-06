export function setupSearch(settings) {
    const navbar = document.querySelector('#navbar');
    const searchInput = navbar.querySelector('#search-input');

    if (!searchInput) {
        searchInput = document.createElement('input');
        searchInput.id = 'search-input';
        searchInput.type = 'text';
        searchInput.placeholder = 'Navigate...';
        navbar.appendChild(searchInput);
    }

    searchInput.addEventListener('input', onInputChangeHandler(settings));
}

export function onInputChangeHandler(settings) {
    return function (event) {
        for (const provider of settings.searchProviders) {
            provider.onInputChange(event);
        }
    }
}