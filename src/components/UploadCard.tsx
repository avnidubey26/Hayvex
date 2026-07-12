import { useRef, useState } from "preact/hooks";
import ImagePreview from "./ImagePreview";
import ProgressBar from "./ProgressBar";
import OCRResult from "./OCRResult";
import { recognizeText } from "../lib/tesseract";

export default function UploadCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [dragActive, setDragActive] = useState(false);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrText, setOcrText] = useState("");

  const MAX_SIZE = 10 * 1024 * 1024;

  function validateFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return false;
    }

    if (file.size > MAX_SIZE) {
      alert("Image size must be under 10MB.");
      return false;
    }

    return true;
  }

  function handleFile(file: File) {
    if (!validateFile(file)) return;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const url = URL.createObjectURL(file);

    setSelectedFile(file);
    setPreviewUrl(url);

    setOcrText("");
    setProgress(0);
  }

  function handleBrowseClick() {
    fileInputRef.current?.click();
  }

  function handleInputChange(e: Event) {
    const input = e.target as HTMLInputElement;

    if (!input.files?.length) return;

    handleFile(input.files[0]);
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

    if (file) {
      handleFile(file);
    }
  }

  async function handleRecognize() {
    if (!selectedFile || loading) return;

    setLoading(true);
    setProgress(0);
    setOcrText("");

    try {
      const text = await recognizeText(selectedFile, (value) => {
        setProgress(value);
      });

      setOcrText(text);
    } catch (error) {
      console.error(error);
      alert("OCR failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  function handleNewFile() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setOcrText("");
    setProgress(0);
    setLoading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  return (
    <div class="w-full max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
      <div
        class={`cursor-pointer rounded-2xl border-2 border-dashed p-10 transition-all duration-300 ${dragActive
          ? "border-violet-500 bg-violet-500/10"
          : "border-white/20 hover:border-violet-400 hover:bg-white/5"
          }`}
        onClick={handleBrowseClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          class="hidden"
          onChange={handleInputChange}
        />

        <div class="space-y-3 text-center">
          <div class="text-5xl">📄</div>

          <h3 class="text-xl font-semibold text-white">
            Upload an Image
          </h3>

          <p class="text-sm text-zinc-400">
            Drag & Drop or Click to Browse
          </p>

          <p class="text-xs text-zinc-500">
            JPG • PNG • WEBP • Max 10MB
          </p>
        </div>
      </div>

      {previewUrl && (
        <div class="mt-8">
          <ImagePreview src={previewUrl} />
        </div>
      )}

      {selectedFile && (
        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={handleRecognize}
            disabled={loading}
            class="rounded-xl bg-violet-600 px-6 py-3 font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span class="flex items-center gap-2">
              {loading && (
                <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}

              <span>
                {loading ? "Recognizing..." : "Extract Text"}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={handleNewFile}
            disabled={loading}
            class="rounded-xl border border-zinc-700 px-6 py-3 font-medium text-white transition hover:border-violet-500 hover:bg-violet-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            New File
          </button>
        </div>
      )}


      {loading && (
        <div class="mt-6">
          <ProgressBar progress={progress} />
        </div>
      )}

      {ocrText && (
        <div class="mt-8">
          <OCRResult text={ocrText} />
        </div>
      )}
    </div>
  );
}