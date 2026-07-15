import { useEffect, useRef, useState } from "preact/hooks";
import { Upload, FileImage } from "lucide-preact";

import ImagePreview from "./ImagePreview";
import ProgressBar from "./ProgressBar";
import OCRResult from "./OCRResult";

import { recognizeText } from "../lib/tesseract";
import { preprocessImage } from "../lib/imageProcessor";

import {
  renderPdfPageToImage,
  renderAllPdfPages,
} from "../lib/pdf";

type ProcessingStage =
  | "idle"
  | "analyzing"
  | "optimizing"
  | "extracting";

const STAGE_LABELS: Record<ProcessingStage, string> = {
  idle: "Extract Text",
  analyzing: "Analyzing image...",
  optimizing: "Optimizing image...",
  extracting: "Extracting text...",
};

const OCR_ERROR_MESSAGE =
  "Unable to accurately recognize this document.\n\nSuggestions:\n• Use a clearer image\n• Keep document straight\n• Improve lighting";

const EMPTY_RESULT_MESSAGE =
  "No readable text was found in this document.";

const MIN_WORD_LENGTH = 2;
const MAX_SYMBOL_RATIO = 0.6;
const COMPLETE_HOLD_MS = 250;

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

type OcrClassification = "empty" | "failure" | "ok";

function isMeaningfulWord(word: string): boolean {
  const alphanumeric = word.replace(/[^a-zA-Z0-9]/g, "");

  return alphanumeric.length >= MIN_WORD_LENGTH;
}

function classifyOcrText(text: string): OcrClassification {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return "empty";
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  const meaningfulWords = words.filter(isMeaningfulWord);

  const alphanumericCount = (trimmed.match(/[a-zA-Z0-9]/g) ?? []).length;
  const symbolRatio = 1 - alphanumericCount / trimmed.length;

  if (meaningfulWords.length === 0 || symbolRatio > MAX_SYMBOL_RATIO) {
    return "failure";
  }

  return "ok";
}

export default function UploadCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const previewUrlRef = useRef<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [dragActive, setDragActive] = useState(false);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrText, setOcrText] = useState("");
  const [processingStage, setProcessingStage] =
    useState<ProcessingStage>("idle");

  const IMAGE_LIMIT = 10 * 1024 * 1024;
  const PDF_LIMIT = 100 * 1024 * 1024;

  // Revokes the previous object URL (if any) exactly once, synchronously,
  // before swapping in the next one. This is the single source of truth
  // for preview URL cleanup — no other code path should call
  // URL.revokeObjectURL on previewUrl.
  function updatePreviewUrl(nextUrl: string | null) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
  }

  // Safety net for unmount only, so a URL created just before the
  // component goes away is still released.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  function resetState() {
    requestIdRef.current++;

    setSelectedFile(null);
    updatePreviewUrl(null);
    setOcrText("");
    setProgress(0);
    setLoading(false);
    setDragActive(false);
    setProcessingStage("idle");

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
    if (loading) return;
    if (!validateFile(file)) return;

    const requestId = ++requestIdRef.current;

    setSelectedFile(file);
    updatePreviewUrl(null);
    setOcrText("");
    setProgress(0);

    if (file.type.startsWith("image/")) {
      updatePreviewUrl(URL.createObjectURL(file));
      return;
    }

    try {
      const firstPage = await renderPdfPageToImage(file, 1);

      if (requestIdRef.current !== requestId) {
        return;
      }

      const preview = URL.createObjectURL(firstPage);
      updatePreviewUrl(preview);
    } catch (error) {
      console.error(error);

      if (requestIdRef.current !== requestId) {
        return;
      }

      alert("Unable to render PDF preview.");
      resetState();
    }
  }

  function openFilePicker() {
    if (loading) return;

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

    let reachedComplete = false;

    try {
      if (selectedFile.type.startsWith("image/")) {
        setProcessingStage("analyzing");
        await nextFrame();

        setProcessingStage("optimizing");
        await nextFrame();

        let processedImage: File | Blob;

        try {
          processedImage = await preprocessImage(selectedFile);
        } catch (preprocessError) {
          console.warn(
            "Image preprocessing failed, falling back to original image.",
            preprocessError,
          );
          processedImage = selectedFile;
        }

        setProcessingStage("extracting");
        await nextFrame();
        const text = await recognizeText(processedImage, (value) => {
          setProgress(value);
        });

        setProgress(1);
        reachedComplete = true;

        const classification = classifyOcrText(text);

        if (classification === "empty") {
          setOcrText(EMPTY_RESULT_MESSAGE);
          return;
        }

        if (classification === "failure") {
          alert(OCR_ERROR_MESSAGE);
          return;
        }

        setOcrText(text);
        return;
      }

      setProcessingStage("extracting");
      await nextFrame();

      const pageImages = await renderAllPdfPages(selectedFile);
      const totalPages = pageImages.length;

      let finalText = "";
      let rawText = "";

      for (let i = 0; i < totalPages; i++) {
        const pageText = await recognizeText(pageImages[i], (pageProgress) => {
          setProgress((i + pageProgress) / totalPages);
        });

        rawText += pageText;

        finalText += `\n\n## Page ${i + 1}\n\n`;
        finalText += pageText;
      }

      setProgress(1);
      reachedComplete = true;

      const classification = classifyOcrText(rawText);

      if (classification === "empty") {
        setOcrText(EMPTY_RESULT_MESSAGE);
        return;
      }

      if (classification === "failure") {
        alert(OCR_ERROR_MESSAGE);
        return;
      }

      setOcrText(finalText.trim());
    } catch (error) {
      console.error(error);

      alert(OCR_ERROR_MESSAGE);
    } finally {
      if (reachedComplete) {
        await wait(COMPLETE_HOLD_MS);
      }

      setLoading(false);
      setProcessingStage("idle");
    }
  }

  return (
    <div class="mx-auto w-full max-w-[660px] rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur-xl">

      {/* Upload Area */}

      <div
        class={`group cursor-pointer rounded-xl border-2 border-dashed transition-all duration-300 ${dragActive
            ? "border-[#D4AF37] bg-[#D4AF37]/10 shadow-[0_0_24px_rgba(212,175,55,.15)]"
            : "border-white/15 hover:border-[#D4AF37]/60 hover:bg-white/[0.03]"
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

        <div class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">

          <div class="flex items-center gap-3.5 text-center sm:text-left">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] transition duration-300 group-hover:scale-105">
              <Upload size={17} strokeWidth={2.2} />
            </div>

            <div class="flex flex-col">
              <h2 class="text-[13px] font-semibold tracking-tight text-white">
                Upload your document
              </h2>

              <p class="mt-0.5 text-[11px] leading-5 text-zinc-400">
                Drag &amp; drop your image or PDF or click to browse.
              </p>
            </div>
          </div>

          <div class="flex shrink-0 flex-wrap items-center justify-center gap-1.5 sm:justify-end">
            <span class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-zinc-300">
              JPG
            </span>

            <span class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-zinc-300">
              PNG
            </span>

            <span class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-zinc-300">
              WEBP
            </span>

            <span class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-zinc-300">
              PDF
            </span>
          </div>

        </div>

        <div class="border-t border-white/[0.06] px-5 py-2 text-center">
          <p class="text-[10px] tracking-wide text-zinc-500">
            Images up to 10 MB • PDFs up to 100 MB
          </p>
        </div>

      </div>

      {/* Preview */}

      {previewUrl && (
        <div class="mt-3">
          <ImagePreview src={previewUrl} />
        </div>
      )}

      {/* Action Buttons */}

      {selectedFile && (
        <div class="mt-3 flex flex-wrap items-center justify-center gap-2">

          <button
            type="button"
            onClick={handleOCR}
            disabled={loading}
            class="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#A97A14] px-3.5 py-2 text-[12px] font-medium text-black transition duration-300 hover:scale-[1.02] disabled:opacity-50"
          >

            <FileImage size={14} />

            {loading ? STAGE_LABELS[processingStage] : "Extract Text"}

          </button>

          <button
            type="button"
            onClick={resetState}
            disabled={loading}
            class="rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-[12px] font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            New File
          </button>

        </div>
      )}

      {/* Progress */}

      {loading && (
        <div class="mt-3">
          <ProgressBar progress={progress} />
        </div>
      )}

      {/* OCR Result */}

      {ocrText && (
        <div class="mt-3">
          <OCRResult text={ocrText} />
        </div>
      )}

    </div>
  );
}