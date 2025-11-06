import sharp from "sharp";

export type PreprocessResult = {
  original: Buffer;
  processed: Buffer;
  metadata: {
    width: number | null;
    height: number | null;
    format: string | null;
    size: number;
  };
};

export async function preprocessReceiptImage(source: Buffer): Promise<PreprocessResult> {
  const rotated = await sharp(source, { failOn: "none" }).rotate().toBuffer();

  const pipeline = sharp(rotated, { failOn: "none" });

  const processed = await pipeline
    .clone()
    .grayscale()
    .normalize()
    .gamma()
    .linear(1.15, -10)
    .sharpen({ sigma: 1 })
    .toBuffer();

  const metadata = await pipeline.metadata();

  return {
    original: Buffer.from(rotated),
    processed: Buffer.from(processed),
    metadata: {
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      format: metadata.format ?? null,
      size: processed.byteLength,
    },
  };
}
