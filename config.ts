type DevMode = "PRODUCTION" | "DEVELOPMENT";

const DEV_MODE: DevMode = "PRODUCTION";

const CONFIG_INNER = {
  MAIN_URL: "https://unitap.online",
  DEV: {
    "PRODUCTION": false,
    "DEVELOPMENT": true
  },
  MAIN_SOCKET_ADDRESS: {
    "PRODUCTION": "https://unitap.online",
    "DEVELOPMENT": "http://192.168.0.12:3000"
  },
  SOCKET_PATH: {
    "PRODUCTION": "/connect/socket.io",
    "DEVELOPMENT": ""
  },
  SOCKET_RECONNECTION_DELAY: 5e3
};

export const CONFIG = {
  ...CONFIG_INNER,
  DEV: CONFIG_INNER.DEV[DEV_MODE],
  MAIN_SOCKET_ADDRESS: CONFIG_INNER.MAIN_SOCKET_ADDRESS[DEV_MODE],
  SOCKET_PATH: CONFIG_INNER.SOCKET_PATH[DEV_MODE]
};