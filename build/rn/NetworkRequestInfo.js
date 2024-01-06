"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkRequestInfo = void 0;
const FileReader_1 = __importDefault(require("react-native/Libraries/Blob/FileReader"));
const fromEntries_1 = __importDefault(require("./utils/fromEntries"));
class NetworkRequestInfo {
    id = '';
    type = '';
    url = '';
    method;
    status = -1;
    dataSent = '';
    responseContentType = '';
    responseSize = 0;
    requestHeaders = {};
    responseHeaders = {};
    response = '';
    responseURL = '';
    responseType = '';
    timeout = 0;
    closeReason = '';
    messages = '';
    serverClose = undefined;
    serverError = undefined;
    startTime = 0;
    endTime = 0;
    gqlOperation;
    constructor(id, type, method, url) {
        this.id = id;
        this.type = type;
        this.method = method;
        this.url = url;
    }
    get duration() {
        return this.endTime - this.startTime;
    }
    get curlRequest() {
        let headersPart = this.requestHeaders &&
            Object.entries(this.requestHeaders)
                .map(([key, value]) => `'${key}: ${this.escapeQuotes(value)}'`)
                .join(' -H ');
        headersPart = headersPart ? `-H ${headersPart}` : '';
        const body = this.dataSent && this.escapeQuotes(this.dataSent);
        const methodPart = this.method !== 'GET' ? `-X${this.method.toUpperCase()}` : '';
        const bodyPart = body ? `-d '${body}'` : '';
        const parts = ['curl', methodPart, headersPart, bodyPart, `'${this.url}'`];
        return parts.filter(Boolean).join(' ');
    }
    update(values) {
        Object.assign(this, values);
        if (values.dataSent) {
            const data = this.parseData(values.dataSent);
            this.gqlOperation = data?.operationName;
        }
    }
    escapeQuotes(value) {
        return value.replace?.(/'/g, `\\'`);
    }
    parseData(data) {
        try {
            if (data?._parts?.length) {
                return (0, fromEntries_1.default)(data?._parts);
            }
            return JSON.parse(data);
        }
        catch (e) {
            return { data };
        }
    }
    stringifyFormat(data) {
        return JSON.stringify(this.parseData(data), null, 2);
    }
    getRequestBody(replaceEscaped = false) {
        const body = this.stringifyFormat(this.dataSent);
        if (replaceEscaped) {
            return body.replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
        return body;
    }
    async parseResponseBlob() {
        const blobReader = new FileReader_1.default();
        blobReader.readAsText(this.response);
        return await new Promise((resolve, reject) => {
            const handleError = () => reject(blobReader.error);
            blobReader.addEventListener('load', () => {
                resolve(blobReader.result);
            });
            blobReader.addEventListener('error', handleError);
            blobReader.addEventListener('abort', handleError);
        });
    }
    async getResponseBody() {
        const body = await (this.responseType !== 'blob'
            ? this.response
            : this.parseResponseBlob());
        return this.stringifyFormat(body);
    }
}
exports.NetworkRequestInfo = NetworkRequestInfo;
