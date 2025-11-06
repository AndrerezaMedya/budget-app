declare module "tesseract.js" {
  export interface TesseractWord {
    text: string;
    confidence: number;
    bbox?: {
      x0: number;
      x1: number;
      y0: number;
      y1: number;
    };
  }

  export interface RecognizeData {
    text: string;
    confidence: number;
    words?: TesseractWord[];
  }

  export interface RecognizeResult {
    data: RecognizeData;
  }

  export type RecognizeOptions = Record<string, unknown>;

  const Tesseract: {
    recognize(
      image: Buffer | ArrayBufferLike | Blob | string,
      languages?: string,
      options?: RecognizeOptions,
    ): Promise<RecognizeResult>;
  };

  export default Tesseract;
}
