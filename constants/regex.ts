export const validateApiKey = (key: string) => /^[a-z0-9]{16}$/.test(key);

export const validateHexColor = (color: string) => /^#([0-9a-f]{3}){1,2}$/i.test(color);

export const localhostSymbolicateRegex = (url: string) => /localhost:(.*)\/symbolicate$/.test(url);

export const validateHexId24Symbols = (id: string) => /^(?:[0-9A-Fa-f]{24})$/.test(id);