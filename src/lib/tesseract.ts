import {
  createWorker,
  type LoggerMessage,
  type Worker,
} from "tesseract.js";

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

function cleanupOCRText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[^\S\n]+\n/g, "\n")
    .trim();
}
export async function recognizeText(
  image: File | Blob,
  onProgress?: (progress: number) => void,
): Promise<string> {
  progressCallback = onProgress;

  try {
    const ocrWorker = await getWorker();

    const {
      data: { text },
    } = await ocrWorker.recognize(image);

    return cleanupOCRText(text);
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