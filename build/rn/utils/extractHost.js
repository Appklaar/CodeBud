"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const extractHost = (url) => {
    const host = url.split('//')[1]?.split(':')[0]?.split('/')[0] || undefined;
    return host;
};
exports.default = extractHost;
