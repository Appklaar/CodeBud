"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonStringifyKeepMethods = exports.emptyMiddleware = exports.codebudConsoleLog = exports.codebudConsoleWarn = exports.stringifyIfNotString = exports.delay = void 0;
const config_1 = require("./config");
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
exports.delay = delay;
const stringifyIfNotString = (data) => {
    if (typeof data === "string") {
        data = data.replace(/'/g, `"`).replace(/\s/g, "");
        return data;
    }
    return JSON.stringify(data);
};
exports.stringifyIfNotString = stringifyIfNotString;
const memo = {
    warn: {
        data: "",
        identicalInARow: 0
    }
};
const codebudConsoleWarn = (...data) => {
    const dataStr = JSON.stringify(data);
    if (dataStr === memo.warn.data) {
        if (memo.warn.identicalInARow++ < config_1.CONFIG.MAX_IDENTICAL_CONSOLE_WARNINGS_IN_A_ROW)
            console.warn(`${config_1.CONFIG.PRODUCT_NAME}:`, ...data);
    }
    else {
        memo.warn.data = dataStr;
        memo.warn.identicalInARow = 1;
        console.warn(`${config_1.CONFIG.PRODUCT_NAME}:`, ...data);
    }
};
exports.codebudConsoleWarn = codebudConsoleWarn;
const codebudConsoleLog = (...data) => {
    console.log(`${config_1.CONFIG.PRODUCT_NAME}:`, ...data);
};
exports.codebudConsoleLog = codebudConsoleLog;
// @ts-ignore
const emptyMiddleware = () => next => action => {
    return next(action);
};
exports.emptyMiddleware = emptyMiddleware;
const jsonStringifyKeepMethods = (data) => {
    return JSON.stringify(data, function (key, value) {
        if (typeof value === 'function') {
            return "Function (...)";
        }
        else {
            return value;
        }
    });
};
exports.jsonStringifyKeepMethods = jsonStringifyKeepMethods;
