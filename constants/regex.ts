export const validateApiKey = (key: string) => /^[a-z0-9]{16}$/.test(key);

export const validateHexColor = (color: string) => /^#([0-9a-f]{3}){1,2}$/i.test(color);