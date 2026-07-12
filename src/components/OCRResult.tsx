import { useState } from "preact/hooks";

type OCRResultProps = {
  text: string;
};

export default function OCRResult({
  text,
}: OCRResultProps) {
  const [copied, setCopied] = useState(false);

  if (!text.trim()) {
    return null;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  }

  function handleDownload() {
    const blob = new Blob([text], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "hayvex-ocr-result.txt";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  return (
    <section className="mt-8 w-full rounded-2xl border border-zinc-700 bg-zinc-900/70 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-white">
          Extracted Text
        </h3>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
          >
            {copied ? "Copied!" : "Copy"}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            Download TXT
          </button>
        </div>
      </div>

      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-zinc-950 p-4 text-sm leading-7 text-zinc-300">
        {text}
      </pre>
    </section>
  );
}