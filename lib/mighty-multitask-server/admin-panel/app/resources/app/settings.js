import { setupAccounts } from "./accounts/app.js";
import { setupSearch } from "./search.js";
import { searchBar as calculatorSearchBar } from "./searchwidgets/calculator.js";

export const settings = {
    webpageTasks: [
        setupSearch,
        setupAccounts,
    ],
    searchProviders: [
        calculatorSearchBar
    ],
};