declare module "@google/generative-ai" {
  export interface GenerationConfig {
    responseMimeType?: string;
    temperature?: number;
  }

  export interface ContentPart {
    text?: string;
    inlineData?: {
      data: string;
      mimeType: string;
    };
  }

  export interface Content {
    role: string;
    parts: ContentPart[];
  }

  export interface CandidateContent {
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }

  export interface GenerateResponse {
    response?: {
      candidates?: CandidateContent[];
    };
  }

  export interface GenerativeModel {
    generateContent(request: { contents: Content[] }): Promise<GenerateResponse>;
  }

  export interface GenerativeModelOptions {
    model: string;
    generationConfig?: GenerationConfig;
    systemInstruction?: {
      parts: ContentPart[];
    };
  }

  export class GoogleGenerativeAI {
    constructor(apiKey: string, options?: { apiEndpoint?: string });
    getGenerativeModel(options: GenerativeModelOptions): GenerativeModel;
  }
}
