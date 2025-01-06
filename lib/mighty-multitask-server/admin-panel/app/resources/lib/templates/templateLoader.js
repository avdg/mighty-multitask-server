export async function loadHtmlTemplate(templateUrl) {
    // TODO implement css and js dependencies loader
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