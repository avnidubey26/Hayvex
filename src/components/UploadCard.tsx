import { useEffect, useRef, useState } from "preact/hooks";

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/pdf",
];

export default function UploadCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  function processFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Only PNG, JPG, JPEG and PDF files are supported.");
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setError("");
    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }

  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) return;

    processFile(input.files[0]);
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setIsDragging(false);

    if (!event.dataTransfer?.files.length) return;

    processFile(event.dataTransfer.files[0]);
  }

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    const preventWindowDrop = (event: DragEvent) => {
      event.preventDefault();
    };

    window.addEventListener("dragover", preventWindowDrop);
    window.addEventListener("drop", preventWindowDrop);

    return () => {
      window.removeEventListener("dragover", preventWindowDrop);
      window.removeEventListener("drop", preventWindowDrop);
    };
  }, []);

  return (
    <section
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-full max-w-xl rounded-2xl border-2 border-dashed bg-zinc-900/60 p-10 transition
      ${
        isDragging
          ? "border-violet-500 bg-violet-500/10"
          : "border-zinc-700 hover:border-violet-500"
      }`}
    >
      <div className="flex flex-col items-center">
        <div className="text-5xl">📄</div>

        <h3 className="mt-4 text-2xl font-semibold">
          Drag & Drop your file
        </h3>

        <p className="mt-2 text-sm text-zinc-400">
          PNG • JPG • JPEG • PDF
        </p>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-6 rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-500"
        >
          Select Image or PDF
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {error && (
          <p className="mt-5 text-sm text-red-400">
            {error}
          </p>
        )}

        {selectedFile && (
          <p className="mt-6 text-sm text-emerald-400">
            Selected: {selectedFile.name}
          </p>
        )}

        {previewUrl && (
          <img
            src={previewUrl}
            alt="Selected preview"
            className="mt-6 max-h-72 w-full rounded-xl border border-zinc-700 object-contain"
          />
        )}
      </div>
    </section>
  );
}