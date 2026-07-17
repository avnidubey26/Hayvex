import {
  createWorker,
  type LoggerMessage,
  type Worker,
} from "tesseract.js";

import {
  evaluateOcrResult,
  type OcrWordConfidence,
  type RawOcrResult,
} from "./ocrValidator";

let worker: Worker | null = null;

let progressCallback:
  | ((progress: number) => void)
  | undefined;

async function getWorker(): Promise<Worker> {
  if (worker) {
    return worker;
  }

  worker = await createWorker("eng", 1, {
    logger(message: LoggerMessage) {
      if (
        message.status === "recognizing text" &&
        typeof message.progress === "number"
      ) {
        progressCallback?.(message.progress);
      }
    },
  });

  await worker.setParameters({
    preserve_interword_spaces: "1",
    user_defined_dpi: "300",
  });

  return worker;
}

// Tesseract's typings don't declare per-word confidence on the result, but
// the runtime data does include it — extract it defensively rather than
// widening the imported type.
function extractWords(data: unknown): OcrWordConfidence[] {
  const rawWords = (data as { words?: unknown })?.words;

  if (!Array.isArray(rawWords)) {
    return [];
  }

  return rawWords
    .filter(
      (word): word is { text: string; confidence: number } =>
        typeof (word as { text?: unknown })?.text === "string" &&
        typeof (word as { confidence?: unknown })?.confidence === "number",
    )
    .map((word) => ({
      text: word.text,
      confidence: word.confidence,
    }));
}

/**
 * Runs OCR on an image and returns the recognized text ONLY if the OCR
 * decision engine (ocrValidator.ts) considers it reliable. Unreliable or
 * empty results are returned as "" so the UI never shows garbage OCR.
 */
export async function recognizeText(
  image: File | Blob,
  onProgress?: (progress: number) => void,
): Promise<string> {
  progressCallback = onProgress;

  try {
    const ocrWorker = await getWorker();

    const { data } = await ocrWorker.recognize(image);

    const raw: RawOcrResult = {
      text: data.text ?? "",
      overallConfidence:
        typeof data.confidence === "number" ? data.confidence : 0,
      words: extractWords(data),
    };

    return evaluateOcrResult(raw);
  } finally {
    progressCallback = undefined;
  }
}

export async function warmupOCR(): Promise<void> {
  await getWorker();
}

export async function terminateOCRWorker(): Promise<void> {
  if (!worker) {
    return;
  }

  await worker.terminate();

  worker = null;
}