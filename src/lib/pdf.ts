import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
  type PDFPageProxy,
} from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

// OCR engines (Tesseract in particular) perform best around 300 DPI.
// PDF.js viewports are expressed relative to 72 DPI ("scale: 1" === 72 DPI),
// so we derive the render scale from that ratio instead of a magic number.
const TARGET_DPI = 300;
const PDF_BASE_DPI = 72;
const BASE_SCALE = TARGET_DPI / PDF_BASE_DPI;

// Hard ceiling on the longest rendered edge so an oversized page (e.g. a
// wide-format scan) can't blow up memory or produce a canvas the browser
// refuses to allocate.
const MAX_RENDER_DIMENSION = 3500;

// Rendering pages fully in parallel can spike memory on large, many-page
// PDFs; doing them one-by-one is unnecessarily slow. A small worker pool
// gives most of the throughput benefit while keeping memory bounded and
// the main thread responsive.
const RENDER_CONCURRENCY = 3;

export async function loadPdf(file: File): Promise<PDFDocumentProxy> {
  const buffer = await file.arrayBuffer();

  return getDocument({
    data: buffer,
  }).promise;
}

function computeScale(page: PDFPageProxy): number {
  const unscaledViewport = page.getViewport({ scale: 1 });

  const longestEdge = Math.max(
    unscaledViewport.width,
    unscaledViewport.height,
  );

  if (longestEdge <= 0) {
    return BASE_SCALE;
  }

  return Math.min(BASE_SCALE, MAX_RENDER_DIMENSION / longestEdge);
}

async function renderPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
): Promise<Blob> {
  const page = await pdf.getPage(pageNumber);

  try {
    const scale = computeScale(page);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    const context = canvas.getContext("2d", {
      alpha: false,
    });

    if (!context) {
      throw new Error("Canvas context unavailable.");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    // Scanned PDFs commonly contain a single raster image per page; an
    // opaque white backdrop avoids compositing artifacts on any
    // transparent regions and matches what OCR engines expect.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    try {
      await page.render({
        canvasContext: context,
        viewport,
        background: "#ffffff",
        // "print" intent renders using print-fidelity appearance streams
        // rather than the interactive "display" intent, which is the more
        // faithful source to hand to an OCR engine. No memory cost.
        intent: "print",
      }).promise;

      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Failed to create image."));
            return;
          }

          resolve(blob);
        }, "image/png");
      });
    } finally {
      // Release the backing canvas buffer as soon as we're done with it.
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    page.cleanup();
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);

  let cursor = 0;

  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }

  const poolSize = Math.max(1, Math.min(limit, items.length));

  await Promise.all(Array.from({ length: poolSize }, () => run()));

  return results;
}

export async function renderPdfPageToImage(
  file: File,
  pageNumber = 1,
): Promise<Blob> {
  const pdf = await loadPdf(file);

  try {
    return await renderPage(pdf, pageNumber);
  } finally {
    await pdf.destroy();
  }
}

export async function renderAllPdfPages(file: File): Promise<Blob[]> {
  const pdf = await loadPdf(file);

  try {
    const pageNumbers = Array.from(
      { length: pdf.numPages },
      (_, index) => index + 1,
    );

    return await mapWithConcurrency(
      pageNumbers,
      RENDER_CONCURRENCY,
      (pageNumber) => renderPage(pdf, pageNumber),
    );
  } finally {
    await pdf.destroy();
  }
}