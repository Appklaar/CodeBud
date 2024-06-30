import { box, randomBytes } from 'tweetnacl';
import { decodeUTF8, encodeBase64 } from 'tweetnacl-util';
import { codebudConsoleLog, codebudConsoleWarn, jsonStringifyKeepMeta } from '../helpers/helperFunctions';

export class EncryptionPlugin {
  private _keyPair: nacl.BoxKeyPair | null = null;
  private _adminPanelPublicKey: Uint8Array | null = null;
  private _sharedKey: Uint8Array | null = null;

  public newNonce() {
    return randomBytes(box.nonceLength);
  };

  public encryptData(json: any, removeCircularReferences?: boolean): {result: string, ok: boolean} {
    try {
      if (!this._sharedKey)
        throw new Error("Shared key not generated");

      const nonce = this.newNonce();
      const jsonStringified = jsonStringifyKeepMeta(json, removeCircularReferences);

      const messageUint8 = decodeUTF8(jsonStringified.result);

      const encrypted = box.after(messageUint8, nonce, this._sharedKey);

      const fullMessage = new Uint8Array(nonce.length + encrypted.length);
      fullMessage.set(nonce);
      fullMessage.set(encrypted, nonce.length);

      const base64FullMessage = encodeBase64(fullMessage);
      return {result: base64FullMessage, ok: jsonStringified.ok};
    } catch (e: any) {
      codebudConsoleLog(e?.message);
      return {result: JSON.stringify({msg: "Data encryption error"}), ok: false};
    }
  };

  constructor() {
    this._keyPair = box.keyPair();
  };

  public get publicKey() {
    return this._keyPair?.publicKey;
  };

  public setAdminPanelPublicKey(data: number[]) {
    if (this._keyPair) {
      this._adminPanelPublicKey = new Uint8Array(data);
      this._sharedKey = box.before(this._adminPanelPublicKey, this._keyPair.secretKey);
    } else {
      codebudConsoleWarn("No keypair generated!");
    }
  }
};