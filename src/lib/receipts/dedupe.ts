import sharp from "sharp";

const HASH_SIZE = 32;

function bitsToHex(bits: number[]): string {
  const hex: string[] = [];
  for (let i = 0; i < bits.length; i += 4) {
    const nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
    hex.push(nibble.toString(16));
  }
  return hex.join("");
}

export async function generatePerceptualHash(imageBuffer: Buffer): Promise<string> {
  const { data } = await sharp(imageBuffer)
    .grayscale()
    .resize(HASH_SIZE, HASH_SIZE, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Array.from(data);
  const mean = pixels.reduce((sum, value) => sum + value, 0) / pixels.length;
  const bits = pixels.map((value) => (value >= mean ? 1 : 0));
  return bitsToHex(bits);
}

export function hammingDistance(hashA: string, hashB: string): number {
  if (hashA.length !== hashB.length) {
    return Number.POSITIVE_INFINITY;
  }

  let distance = 0;
  for (let i = 0; i < hashA.length; i += 1) {
    const digitA = parseInt(hashA[i], 16);
    const digitB = parseInt(hashB[i], 16);
    const xor = digitA ^ digitB;
    distance += xor.toString(2).split("0").join("").length;
  }
  return distance;
}

export function hashesAreSimilar(hashA: string, hashB: string, tolerance = 10): boolean {
  return hammingDistance(hashA, hashB) <= tolerance;
}
