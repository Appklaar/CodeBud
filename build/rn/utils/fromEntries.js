"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fromEntries = (arr) => arr.reduce((acc, [k, v]) => {
    acc[k] = v;
    return acc;
}, {});
exports.default = fromEntries;
