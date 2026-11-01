// Pure-JS ISO/IEC 18004 QR Code Matrix Generator (Byte mode, ECC Level L/M, Versions 1..10)
// Works 100% offline in LAN / ZimaOS Docker with zero external dependencies.

const EXP_TABLE = new Uint8Array(256);
const LOG_TABLE = new Uint8Array(256);
for (let i = 0; i < 8; i++) EXP_TABLE[i] = 1 << i;
for (let i = 8; i < 256; i++) {
  EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
}
for (let i = 0; i < 255; i++) LOG_TABLE[EXP_TABLE[i]] = i;

function glog(n) {
  if (n < 1) throw new Error('glog(' + n + ')');
  return LOG_TABLE[n];
}
function gexp(n) {
  while (n < 0) n += 255;
  while (n >= 256) n -= 255;
  return EXP_TABLE[n];
}

function polyMultiply(p1, p2) {
  const num = new Uint8Array(p1.length + p2.length - 1);
  for (let i = 0; i < p1.length; i++) {
    if (p1[i] === 0) continue;
    for (let j = 0; j < p2.length; j++) {
      if (p2[j] === 0) continue;
      num[i + j] ^= gexp(glog(p1[i]) + glog(p2[j]));
    }
  }
  return num;
}

function polyMod(dividend, divisor) {
  let res = new Uint8Array(dividend);
  while (res.length >= divisor.length) {
    if (res[0] === 0) {
      res = res.slice(1);
      continue;
    }
    const ratio = glog(res[0]) - glog(divisor[0]);
    for (let i = 0; i < divisor.length; i++) {
      if (divisor[i] !== 0) {
        res[i] ^= gexp(glog(divisor[i]) + ratio);
      }
    }
    res = res.slice(1);
  }
  return res;
}

function getErrorCorrectPolynomial(ecLength) {
  let a = new Uint8Array([1]);
  for (let i = 0; i < ecLength; i++) {
    a = polyMultiply(a, new Uint8Array([1, gexp(i)]));
  }
  return a;
}

// Version 1..10 RS Block table for ECC Level L (1) -> [numBlocks, totalCount, dataCount]
const RS_BLOCK_TABLE_L = [
  null,
  [[1, 26, 19]],
  [[1, 44, 34]],
  [[1, 70, 55]],
  [[1, 100, 80]],
  [[1, 134, 108]],
  [[2, 86, 68]],
  [[2, 98, 78]],
  [[2, 121, 97]],
  [[2, 146, 116]],
  [[2, 86, 68], [2, 87, 69]],
];

const ALIGNMENT_PATTERNS = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

function getBCHTypeInfo(data) {
  let d = data << 10;
  const g = 0b10100110111;
  while (getBCHDigit(d) - getBCHDigit(g) >= 0) {
    d ^= g << (getBCHDigit(d) - getBCHDigit(g));
  }
  return ((data << 10) | d) ^ 0b101010000010010;
}

function getBCHTypeNumber(data) {
  let d = data << 12;
  const g = 0b1111100100101;
  while (getBCHDigit(d) - getBCHDigit(g) >= 0) {
    d ^= g << (getBCHDigit(d) - getBCHDigit(g));
  }
  return (data << 12) | d;
}

function getBCHDigit(data) {
  let digit = 0;
  while (data !== 0) {
    digit++;
    data >>>= 1;
  }
  return digit;
}

export function generateQrMatrix(text) {
  const bytes = new TextEncoder().encode(String(text || ''));
  let version = 1;
  for (let v = 1; v <= 10; v++) {
    const blocks = RS_BLOCK_TABLE_L[v];
    const totalDataCap = blocks.reduce((s, b) => s + b[0] * b[2], 0);
    const lenBits = v < 10 ? 8 : 16;
    const neededBytes = Math.ceil((4 + lenBits + bytes.length * 8) / 8);
    if (neededBytes <= totalDataCap) {
      version = v;
      break;
    }
  }

  const blocksDef = RS_BLOCK_TABLE_L[version];
  const rsBlocks = [];
  for (const [count, totalCount, dataCount] of blocksDef) {
    for (let i = 0; i < count; i++) {
      rsBlocks.push({ totalCount, dataCount });
    }
  }

  const totalDataCount = rsBlocks.reduce((s, b) => s + b.dataCount, 0);
  const bits = [];
  const putBits = (num, length) => {
    for (let i = length - 1; i >= 0; i--) {
      bits.push(((num >>> i) & 1) === 1);
    }
  };

  // Mode: Byte (0100)
  putBits(4, 4);
  putBits(bytes.length, version < 10 ? 8 : 16);
  for (let i = 0; i < bytes.length; i++) {
    putBits(bytes[i], 8);
  }

  if (bits.length + 4 <= totalDataCount * 8) {
    putBits(0, 4);
  }
  while (bits.length % 8 !== 0) {
    bits.push(false);
  }
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < totalDataCount * 8) {
    putBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  const dataBytes = new Uint8Array(totalDataCount);
  for (let i = 0; i < totalDataCount; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      if (bits[i * 8 + j]) b |= 0x80 >>> j;
    }
    dataBytes[i] = b;
  }

  let offset = 0;
  let maxDcCount = 0;
  let maxEcCount = 0;
  const dcdata = [];
  const ecdata = [];

  for (let r = 0; r < rsBlocks.length; r++) {
    const dcCount = rsBlocks[r].dataCount;
    const ecCount = rsBlocks[r].totalCount - dcCount;
    maxDcCount = Math.max(maxDcCount, dcCount);
    maxEcCount = Math.max(maxEcCount, ecCount);

    const dc = dataBytes.slice(offset, offset + dcCount);
    offset += dcCount;
    dcdata.push(dc);

    const rsPoly = getErrorCorrectPolynomial(ecCount);
    const rawPoly = new Uint8Array(dc.length + rsPoly.length - 1);
    rawPoly.set(dc, 0);
    const modPoly = polyMod(rawPoly, rsPoly);

    const ec = new Uint8Array(ecCount);
    const pad = ecCount - modPoly.length;
    for (let i = 0; i < ecCount; i++) {
      ec[i] = i >= pad ? modPoly[i - pad] : 0;
    }
    ecdata.push(ec);
  }

  const interleaved = [];
  for (let i = 0; i < maxDcCount; i++) {
    for (let r = 0; r < rsBlocks.length; r++) {
      if (i < dcdata[r].length) interleaved.push(dcdata[r][i]);
    }
  }
  for (let i = 0; i < maxEcCount; i++) {
    for (let r = 0; r < rsBlocks.length; r++) {
      if (i < ecdata[r].length) interleaved.push(ecdata[r][i]);
    }
  }

  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => Array(size).fill(null));

  const setupPositionProbePattern = (row, col) => {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || size <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || size <= col + c) continue;
        if (
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4)
        ) {
          modules[row + r][col + c] = true;
        } else {
          modules[row + r][col + c] = false;
        }
      }
    }
  };

  setupPositionProbePattern(0, 0);
  setupPositionProbePattern(size - 7, 0);
  setupPositionProbePattern(0, size - 7);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (modules[i][6] === null) modules[i][6] = i % 2 === 0;
    if (modules[6][i] === null) modules[6][i] = i % 2 === 0;
  }

  // Alignment patterns
  const pos = ALIGNMENT_PATTERNS[version];
  for (let i = 0; i < pos.length; i++) {
    for (let j = 0; j < pos.length; j++) {
      const row = pos[i];
      const col = pos[j];
      if (modules[row][col] !== null) continue;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          if (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0)) {
            modules[row + r][col + c] = true;
          } else {
            modules[row + r][col + c] = false;
          }
        }
      }
    }
  }

  // TypeNumber (version >= 7)
  if (version >= 7) {
    const tBits = getBCHTypeNumber(version);
    for (let i = 0; i < 18; i++) {
      const mod = ((tBits >>> i) & 1) === 1;
      modules[Math.floor(i / 3)][(i % 3) + size - 8 - 3] = mod;
      modules[(i % 3) + size - 8 - 3][Math.floor(i / 3)] = mod;
    }
  }

  // Reserve format info areas before data placement
  for (let i = 0; i < 15; i++) {
    if (i < 6) modules[i][8] = false;
    else if (i < 8) modules[i + 1][8] = false;
    else modules[size - 15 + i][8] = false;

    if (i < 8) modules[8][size - i - 1] = false;
    else if (i < 9) modules[8][15 - i - 1 + 1] = false;
    else modules[8][15 - i - 1] = false;
  }
  modules[size - 8][8] = true;

  // Map data bits with maskPattern 0: (row + col) % 2 === 0
  const maskPattern = 0;
  let inc = -1;
  let row = size - 1;
  let bitIndex = 7;
  let byteIndex = 0;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    while (true) {
      for (let c = 0; c < 2; c++) {
        if (modules[row][col - c] === null) {
          let dark = false;
          if (byteIndex < interleaved.length) {
            dark = ((interleaved[byteIndex] >>> bitIndex) & 1) === 1;
          }
          const mask = (row + (col - c)) % 2 === 0;
          if (mask) dark = !dark;
          modules[row][col - c] = dark;
          bitIndex--;
          if (bitIndex === -1) {
            byteIndex++;
            bitIndex = 7;
          }
        }
      }
      row += inc;
      if (row < 0 || size <= row) {
        row -= inc;
        inc = -inc;
        break;
      }
    }
  }

  // Write Final Format Info (ECC Level L = 01, Mask = 000 -> data = (1 << 3) | 0 = 8)
  const typeBits = getBCHTypeInfo((1 << 3) | maskPattern);
  for (let i = 0; i < 15; i++) {
    const mod = ((typeBits >>> i) & 1) === 1;
    if (i < 6) modules[i][8] = mod;
    else if (i < 8) modules[i + 1][8] = mod;
    else modules[size - 15 + i][8] = mod;

    if (i < 8) modules[8][size - i - 1] = mod;
    else if (i < 9) modules[8][15 - i - 1 + 1] = mod;
    else modules[8][15 - i - 1] = mod;
  }
  modules[size - 8][8] = true;

  return modules;
}
