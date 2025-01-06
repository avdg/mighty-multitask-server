import { loadHtmlTemplate } from './templateLoader.js';

export async function loadContent(templateUrl) {
    const content = await loadHtmlTemplate(templateUrl);
    
    // clear body
    document.body.innerHTML = '';

    // append content
    document.body.appendChild(content.body);
}