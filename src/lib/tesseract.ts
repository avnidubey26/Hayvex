import {
  createWorker,
  type LoggerMessage,
  type Worker,
} from "tesseract.js";

let worker: Worker | null = null;

let progressCallback: ((progress: number) => void) | undefined;

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

  return worker;
}

export async function recognizeText(
  image: File | Blob,
  onProgress?: (progress: number) => void,
): Promise<string> {
  progressCallback = onProgress;

  try {
    const ocrWorker = await getWorker();

    const result = await ocrWorker.recognize(image);

    return result.data.text.trim();
  } finally {
    progressCallback = undefined;
  }
}

export async function terminateOCRWorker(): Promise<void> {
  if (!worker) {
    return;
  }

  await worker.terminate();
  worker = null;
}