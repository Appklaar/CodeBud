import { CONFIG } from "../config";

// returns the byte length of an utf8 string
const byteLength = (str: string) => {
  var s = str.length;

  for (var i = str.length - 1; i >= 0; i--) {
    var code = str.charCodeAt(i);

    if (code > 0x7f && code <= 0x7ff) 
      s++;
    else if (code > 0x7ff && code <= 0xffff) 
      s += 2;
    if (code >= 0xDC00 && code <= 0xDFFF) 
      i--; //trail surrogate
  }

  return s;
}

// Returns true if str byte size is ok, and false otherwise
export const payloadSizeValidator = (str: string) => {
  if (str.length < CONFIG.PAYLOAD_LIMITS.MIN_STRING_LENGTH_POSSIBLE_OVERLOAD)
    return true;

  return byteLength(str) <= CONFIG.PAYLOAD_LIMITS.MAX_BYTE_SIZE;
}