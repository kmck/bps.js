export const BPS_START = Buffer.from('BPS1');
export const BPS_FOOTER_LENGTH = 12;

export const SOURCE_READ = 0;
export const TARGET_READ = 1;
export const SOURCE_COPY = 2;
export const TARGET_COPY = 3;

/* eslint-disable no-console */
export function defaultLog(message) {
  if (console) {
    if (console.debug) {
      console.debug(message);
    } else if (console.log) {
      console.log(message);
    }
  }
}
/* eslint-enable no-console */

export function encodeNumber(value) {
  let data = value;
  const encoded = [];
  while (true) { // eslint-disable-line no-constant-condition
    const x = data & 0x7f;
    data >>= 7;
    if (!data) {
      encoded.push(0x80 | x);
      break;
    }
    encoded.push(x);
    data--;
  }
  return Buffer.from(encoded);
}

export function decodeNumber(data, offset = 0) {
  let index = offset;
  let value = 0;
  let shift = 1;

  while (true) { // eslint-disable-line no-constant-condition
    const x = data[index];
    index += 1;
    value += (x & 0x7f) * shift;
    if (x & 0x80) {
      break;
    }
    shift <<= 7;
    value += shift;
  }

  return [value, index];
}

export function toIntBE(buffer) {
  let value = 0;
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer.readUInt8(i);
  }
  return value >>> 0;
}

export function formatHex(v, byteLength = 1) {
  const value = Buffer.isBuffer(v) ? toIntBE(v) : v;
  return `0x${value.toString(16).padStart(2 * byteLength, '0')}`;
}
