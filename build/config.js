"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
const DEV_MODE = "PRODUCTION";
const CONFIG_INNER = {
    PRODUCT_NAME: "CodeBud",
    MAX_IDENTICAL_CONSOLE_WARNINGS_IN_A_ROW: 3,
    DOMAIN: "unitap.online",
    MAIN_URL: "https://unitap.online",
    BASE_URL: 'https://unitap.online/api',
    DEV: {
        "PRODUCTION": false,
        "DEVELOPMENT": true
    },
    MAIN_SOCKET_ADDRESS: {
        "PRODUCTION": "https://unitap.online",
        "DEVELOPMENT": "http://192.168.0.14:3000"
    },
    SOCKET_PATH: {
        "PRODUCTION": "/connect/socket.io",
        "DEVELOPMENT": ""
    },
    SOCKET_RECONNECTION_DELAY: 5e3,
    NETWORK_INTERCEPTOR: {
        FILTER_INNER_REQUESTS: {
            "PRODUCTION": true,
            "DEVELOPMENT": true
        }
    }
};
exports.CONFIG = {
    ...CONFIG_INNER,
    DEV: CONFIG_INNER.DEV[DEV_MODE],
    MAIN_SOCKET_ADDRESS: CONFIG_INNER.MAIN_SOCKET_ADDRESS[DEV_MODE],
    SOCKET_PATH: CONFIG_INNER.SOCKET_PATH[DEV_MODE],
    NETWORK_INTERCEPTOR: { ...CONFIG_INNER.NETWORK_INTERCEPTOR, FILTER_INNER_REQUESTS: CONFIG_INNER.NETWORK_INTERCEPTOR.FILTER_INNER_REQUESTS[DEV_MODE] }
};
