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

  return await getDocument({
    data: buffer,
  }).promise;
}

export async function renderPdfPageToImage(
  file: File,
  pageNumber = 1,
): Promise<Blob> {
  const pdf = await loadPdf(file);

  const page = await pdf.getPage(pageNumber);

  const viewport = page.getViewport({
    scale: 2,
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