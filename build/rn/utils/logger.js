"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warn = void 0;
const config_1 = require("../../config");
const warn = (message) => console.warn(`${config_1.CONFIG.PRODUCT_NAME}: react-native-network-logger: ${message}`);
exports.warn = warn;
