import { useRef, useState } from "preact/hooks";
import ImagePreview from "./ImagePreview";
import ProgressBar from "./ProgressBar";
import OCRResult from "./OCRResult";
import { recognizeText } from "../lib/tesseract";

import {
  renderPdfPageToImage,
  renderAllPdfPages,
} from "../lib/pdf";

export default function UploadCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [dragActive, setDragActive] = useState(false);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrText, setOcrText] = useState("");

  const IMAGE_LIMIT = 10 * 1024 * 1024;
  const PDF_LIMIT = 100 * 1024 * 1024;

  function resetState() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setOcrText("");
    setProgress(0);
    setLoading(false);
    setDragActive(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function validateFile(file: File): boolean {
    if (file.type.startsWith("image/")) {
      if (file.size > IMAGE_LIMIT) {
        alert("Image size must be 10MB or less.");
        return false;
      }

      return true;
    }

    if (file.type === "application/pdf") {
      if (file.size > PDF_LIMIT) {
        alert("PDF size must be 100MB or less.");
        return false;
      }

      return true;
    }

    alert("Only image and PDF files are supported.");
    return false;
  }

  async function handleFile(file: File) {
    if (!validateFile(file)) return;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setOcrText("");
    setProgress(0);

    // Image Preview
    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
      return;
    }

    // PDF Preview (First Page)
    try {
      const firstPage = await renderPdfPageToImage(file, 1);

      const preview = URL.createObjectURL(firstPage);

      setPreviewUrl(preview);
    } catch (error) {
      console.error(error);
      alert("Unable to render PDF preview.");
      resetState();
    }
  }
  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleInputChange(e: Event) {
    const input = e.target as HTMLInputElement;

    if (!input.files?.length) return;

    void handleFile(input.files[0]);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setDragActive(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer?.files?.[0];

    if (!file) return;

    void handleFile(file);
  }

  async function handleOCR() {
    if (!selectedFile || loading) return;

    setLoading(true);
    setProgress(0);
    setOcrText("");

    try {
      // Image OCR
      if (selectedFile.type.startsWith("image/")) {
        const text = await recognizeText(selectedFile, (value) => {
          setProgress(value);
        });

        setProgress(1);
        setOcrText(text);
        return;
      }

      // Multi-page PDF OCR
      const pageImages = await renderAllPdfPages(selectedFile);

      let finalText = "";

      for (let i = 0; i < pageImages.length; i++) {
        setProgress(i / pageImages.length);

        const pageText = await recognizeText(pageImages[i]);

        finalText += `\n\n========== PAGE ${i + 1} ==========\n\n`;
        finalText += pageText;
      }

      setProgress(1);
      setOcrText(finalText.trim());
    } catch (error) {
      console.error(error);
      alert("OCR failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="mx-auto w-full max-w-4xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl">
      <div
        class={`group cursor-pointer rounded-3xl border-2 border-dashed py-8 px-8 transition-all duration-300 ${dragActive
            ? "border-violet-500 bg-violet-500/10 shadow-[0_0_40px_rgba(139,92,246,.25)]"
            : "border-white/20 hover:border-violet-400 hover:bg-white/5"
          }`}
        onClick={openFilePicker}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,application/pdf"
          class="hidden"
          onChange={handleInputChange}
        />

        <div class="space-y-4 text-center">
          <div class="text-4xl transition-transform duration-300 group-hover:scale-110">
            📄
          </div>

          <h2 class="text-xl font-bold tracking-tight text-white">
            Upload Image or PDF
          </h2>

          <p class="text-sm text-zinc-400">
            Drag & Drop or Click to Browse
          </p>

          <p class="text-sm text-zinc-500">
            Images ≤ 10MB • PDFs ≤ 100MB
          </p>
        </div>
      </div>

      {previewUrl && (
        <div class="mt-6">
          <ImagePreview src={previewUrl} />
        </div>
      )}

      {selectedFile && (
        <div class="mt-5 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={handleOCR}
            disabled={loading}
            class="rounded-xl bg-violet-600 px-5 py-2.5 font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Processing..." : "Extract Text"}
          </button>

          <button
            type="button"
            onClick={resetState}
            disabled={loading}
            class="rounded-xl border border-white/20 px-5 py-2.5 font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            New File
          </button>
        </div>
      )}

      {loading && (
        <div class="mt-5">
          <ProgressBar progress={progress} />
        </div>
      )}

      {ocrText && (
        <div class="mt-6">
          <OCRResult text={ocrText} />
        </div>
      )}
    </div>
  );
}