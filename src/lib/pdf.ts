import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

export async function loadPdf(file: File): Promise<PDFDocumentProxy> {
  const buffer = await file.arrayBuffer();

  return getDocument({
    data: buffer,
  }).promise;
}

async function renderPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
): Promise<Blob> {
  const page = await pdf.getPage(pageNumber);

  const viewport = page.getViewport({
    scale: 3,
  });

  const canvas = document.createElement("canvas");

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas context unavailable.");
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: context,
    viewport,
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
}

export async function renderPdfPageToImage(
  file: File,
  pageNumber = 1,
): Promise<Blob> {
  const pdf = await loadPdf(file);

  return renderPage(pdf, pageNumber);
}

export async function renderAllPdfPages(
  file: File,
): Promise<Blob[]> {
  const pdf = await loadPdf(file);

  const pages: Blob[] = [];

  for (let page = 1; page <= pdf.numPages; page++) {
    pages.push(await renderPage(pdf, page));
  }

  return pages;
}