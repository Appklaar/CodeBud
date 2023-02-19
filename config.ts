type DevMode = "PRODUCTION" | "DEVELOPMENT";

const DEV_MODE: DevMode = "PRODUCTION"

const CONFIG_INNER = {
  MAIN_URL: "https://unitap.online",
  SOCKET_PATH: "/connect/socket.io",
  DEV: {
    "PRODUCTION": false,
    "DEVELOPMENT": true
  },
  MAIN_SOCKET_ADDRESS: {
    "PRODUCTION": "https://unitap.online/connect/socket.io",
    "DEVELOPMENT": "http://192.168.0.14:3000"
  },
  SOCKET_RECONNECTION_DELAY: 5e3
};

export const CONFIG = {
  ...CONFIG_INNER,
  DEV: CONFIG_INNER.DEV[DEV_MODE],
  MAIN_SOCKET_ADDRESS: CONFIG_INNER.MAIN_SOCKET_ADDRESS[DEV_MODE],
};