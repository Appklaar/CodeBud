"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProcessEnv = void 0;
const getProcessEnv = () => {
    try {
        const data = process.env;
        return data;
    }
    catch (e) {
        return {};
    }
};
exports.getProcessEnv = getProcessEnv;
