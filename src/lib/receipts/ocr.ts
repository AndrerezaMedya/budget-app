import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

import Tesseract from "tesseract.js";

export type OcrResult = {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; x1: number; y0: number; y1: number };
  }>;
};

type OcrProgressPayload = {
  status: string;
  progress: number;
};

type PerformReceiptOcrOptions = {
  onProgress?: (payload: OcrProgressPayload) => void;
};

type TesseractLoggerEvent = {
  status?: string;
  progress?: number;
};

type ResolvedTesseractAssets = {
  workerPath: string;
  corePath: string;
  cachePath: string;
};

const nodeRequire = createRequire(import.meta.url);

let cachedAssets: ResolvedTesseractAssets | null = null;

function normalizeResolvedPath(resolved: string): string {
  const trimmed = resolved.replace(/\s+\[[^\]]+\]\s*\([^)]*\)$/u, "");
  if (trimmed.startsWith("[project]/")) {
    const relative = trimmed.slice("[project]/".length);
    const cwd = process.cwd();
    const projectRoot = path.resolve(cwd, "..");
    const candidates = [
      path.resolve(projectRoot, relative),
      path.resolve(cwd, relative),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    return path.resolve(projectRoot, relative);
  }
  if (trimmed.startsWith("[project]\\")) {
    const relative = trimmed.slice("[project]\\".length);
    const cwd = process.cwd();
    const projectRoot = path.resolve(cwd, "..");
    const candidates = [
      path.resolve(projectRoot, relative),
      path.resolve(cwd, relative),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    return path.resolve(projectRoot, relative);
  }
  return trimmed;
}

function resolveTesseractAssets(): ResolvedTesseractAssets {
  if (cachedAssets) {
    return cachedAssets;
  }

  const workerPath = normalizeResolvedPath(
    nodeRequire.resolve("tesseract.js/src/worker-script/node/index.js"),
  );
  const corePath = normalizeResolvedPath(
    nodeRequire.resolve("tesseract.js-core/tesseract-core.wasm.js"),
  );
  const cachePath = path.join(os.tmpdir(), "tesseract-cache");

  cachedAssets = { workerPath, corePath, cachePath };
  return cachedAssets;
}

export async function performReceiptOcr(imageBuffer: Buffer, options: PerformReceiptOcrOptions = {}): Promise<OcrResult> {
  const { onProgress } = options;
  const assets = resolveTesseractAssets();
  const { data } = await Tesseract.recognize(imageBuffer, "eng+ind", {
    tessjs_create_hocr: "1",
    workerPath: assets.workerPath,
  corePath: assets.corePath,
    cachePath: assets.cachePath,
    logger: onProgress
      ? (message: TesseractLoggerEvent) => {
          const value = typeof message.progress === "number" ? message.progress : 0;
          if (typeof message.status === "string") {
            onProgress({ status: message.status, progress: value });
          }
        }
      : undefined,
  });

  const words = (data.words ?? []).map((word) => ({
    text: word.text,
    confidence: word.confidence,
    bbox: {
      x0: word.bbox?.x0 ?? 0,
      x1: word.bbox?.x1 ?? 0,
      y0: word.bbox?.y0 ?? 0,
      y1: word.bbox?.y1 ?? 0,
    },
  }));

  return {
    text: data.text?.trim() ?? "",
    confidence: data.confidence ?? 0,
    words,
  };
}
