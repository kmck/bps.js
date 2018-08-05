import crcHash from 'crc-hash';

import {
  BPS_START,
  BPS_FOOTER_LENGTH,
  SOURCE_READ,
  TARGET_READ,
  SOURCE_COPY,
  TARGET_COPY,
  decodeNumber,
  defaultLog,
  toIntBE,
  formatHex,
} from './utils';

export default function applyBpsPatch(sourceFile, patchFile, options = {}) {
  const { log = defaultLog } = options;
  const { length: sourceFileLength } = sourceFile;
  const { length: patchFileLength } = patchFile;
  const patchFileLengthWithoutFooter = patchFileLength - BPS_FOOTER_LENGTH;
  let index = 0;
  let outputOffset = 0;
  let sourceRelativeOffset = 0;
  let targetRelativeOffset = 0;

  function readPatchData(length) {
    if (index + length > patchFileLength) {
      throw new Error(`Unexpected end of file tried to read ${length} bytes at ${formatHex(index, 3)})`);
    }
    const start = index;
    index += length;
    return patchFile.slice(start, index);
  }

  function readPatchChecksum() {
    return toIntBE(Buffer.from(readPatchData(4)).reverse()).toString(16).padStart(8, 0);
  }

  function readPatchDataNumber() {
    const [value, nextIndex] = decodeNumber(patchFile, index);
    index = nextIndex;
    return value;
  }

  if (!readPatchData(BPS_START.length).equals(BPS_START)) {
    throw new Error('Patch file does not have BPS header');
  }

  const sourceFileSize = readPatchDataNumber();
  const targetFileSize = readPatchDataNumber();
  const metaDataLength = readPatchDataNumber();

  if (sourceFileLength !== sourceFileSize) {
    throw new Error(`Expected source filesize of ${sourceFileSize} bytes, got ${sourceFileLength} bytes instead`);
  }

  const metaData = readPatchData(metaDataLength);
  if (metaDataLength) {
    // @TODO: Check this...
    log('Metadata: %s', metaData.toString());
  }

  const targetFile = Buffer.alloc(targetFileSize);

  function sourceRead(length) {
    let i = length;
    log(`sourceRead: Copy ${length} source bytes to ${formatHex(outputOffset, 3)}`);
    while (i--) {
      targetFile.writeUInt8(sourceFile[outputOffset], outputOffset);
      outputOffset++;
    }
  }

  function targetRead(length) {
    let i = length;
    log(`targetRead: Write ${length} bytes to ${formatHex(outputOffset, 3)}`);
    while (i--) {
      targetFile.writeUInt8(toIntBE(readPatchData(1)), outputOffset++);
    }
  }

  function sourceCopy(length) {
    let i = length;
    const data = readPatchDataNumber();
    sourceRelativeOffset += (data & 1 ? -1 : 1) * (data >> 1);
    log(`sourceCopy: Copy ${length} source bytes at ${formatHex(sourceRelativeOffset, 3)} to ${formatHex(outputOffset, 3)}`);
    while (i--) {
      targetFile.writeUInt8(sourceFile[sourceRelativeOffset++], outputOffset++);
    }
  }

  function targetCopy(length) {
    let i = length;
    const data = readPatchDataNumber();
    targetRelativeOffset += (data & 1 ? -1 : +1) * (data >> 1);
    log(`targetCopy: Copy ${length} target bytes at ${formatHex(targetRelativeOffset, 3)} to ${formatHex(outputOffset, 3)}`);
    while (i--) {
      targetFile.writeUInt8(targetFile[targetRelativeOffset++], outputOffset++);
    }
  }

  while (index < patchFileLengthWithoutFooter) {
    const data = readPatchDataNumber();
    const command = data & 3;
    const length = (data >>> 2) + 1;

    switch (command) {
      case SOURCE_READ:
        sourceRead(length);
        break;
      case TARGET_READ:
        targetRead(length);
        break;
      case SOURCE_COPY:
        sourceCopy(length);
        break;
      case TARGET_COPY:
        targetCopy(length);
        break;
      default:
        throw new Error(`Unrecognized command ${formatHex(command, 1)}`);
    }
  }

  if (index !== patchFileLengthWithoutFooter) {
    throw new Error('Missed the footer?');
  }

  index = patchFileLengthWithoutFooter;

  const sourceChecksum = readPatchChecksum();
  const targetChecksum = readPatchChecksum();
  const patchChecksum = readPatchChecksum();

  const sourceCrc32 = crcHash.createHash('crc32').update(sourceFile).digest('hex');
  const targetCrc32 = crcHash.createHash('crc32').update(targetFile).digest('hex');
  const patchCrc32 = crcHash.createHash('crc32').update(patchFile.slice(0, -4)).digest('hex');

  if (sourceCrc32 !== sourceChecksum) {
    throw new Error(`Source file CRC32 mismatch! Expected ${sourceChecksum} but received ${sourceCrc32}`);
  }
  if (targetCrc32 !== targetChecksum) {
    throw new Error(`Target file CRC32 mismatch! Expected ${targetChecksum} but received ${targetCrc32}`);
  }
  if (patchCrc32 !== patchChecksum) {
    throw new Error(`Target file CRC32 mismatch! Expected ${patchChecksum} but received ${patchCrc32}`);
  }

  return targetFile;
}
