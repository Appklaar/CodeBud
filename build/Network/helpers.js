"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldProceedIntercepted = void 0;
const regex_1 = require("../constants/regex");
const config_1 = require("./../config");
const DEFAULT_IGNORED_PATTERNS = [
    regex_1.localhostSymbolicateRegex
];
const shouldProceedIntercepted = (url) => {
    if (config_1.CONFIG.NETWORK_INTERCEPTOR.FILTER_INNER_REQUESTS === false)
        return true;
    for (const r of DEFAULT_IGNORED_PATTERNS)
        if (r(url))
            return false;
    return url.indexOf(config_1.CONFIG.MAIN_URL) === -1;
};
exports.shouldProceedIntercepted = shouldProceedIntercepted;
