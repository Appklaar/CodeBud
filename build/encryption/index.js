"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionPlugin = void 0;
const tweetnacl_1 = require("tweetnacl");
const tweetnacl_util_1 = require("tweetnacl-util");
const helperFunctions_1 = require("../helpers/helperFunctions");
class EncryptionPlugin {
    _keyPair = null;
    _adminPanelPublicKey = null;
    _sharedKey = null;
    newNonce() {
        return (0, tweetnacl_1.randomBytes)(tweetnacl_1.box.nonceLength);
    }
    ;
    encryptData(json) {
        try {
            if (!this._sharedKey)
                throw new Error("Shared key not generated");
            const nonce = this.newNonce();
            const messageUint8 = (0, tweetnacl_util_1.decodeUTF8)((0, helperFunctions_1.jsonStringifyKeepMeta)(json));
            const encrypted = tweetnacl_1.box.after(messageUint8, nonce, this._sharedKey);
            const fullMessage = new Uint8Array(nonce.length + encrypted.length);
            fullMessage.set(nonce);
            fullMessage.set(encrypted, nonce.length);
            const base64FullMessage = (0, tweetnacl_util_1.encodeBase64)(fullMessage);
            return base64FullMessage;
        }
        catch (e) {
            (0, helperFunctions_1.codebudConsoleLog)(e);
            return JSON.stringify({ msg: "Data encryption error" });
        }
    }
    ;
    constructor() {
        this._keyPair = tweetnacl_1.box.keyPair();
    }
    ;
    get publicKey() {
        return this._keyPair?.publicKey;
    }
    ;
    setAdminPanelPublicKey(data) {
        if (this._keyPair) {
            this._adminPanelPublicKey = new Uint8Array(data);
            this._sharedKey = tweetnacl_1.box.before(this._adminPanelPublicKey, this._keyPair.secretKey);
        }
        else {
            (0, helperFunctions_1.codebudConsoleWarn)("No keypair generated!");
        }
    }
}
exports.EncryptionPlugin = EncryptionPlugin;
;
