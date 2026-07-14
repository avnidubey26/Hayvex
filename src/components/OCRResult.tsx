import { useState } from "preact/hooks";
import { Copy, Download, FileText, Check } from "lucide-preact";

type OCRResultProps = {
  text: string;
};

export default function OCRResult({ text }: OCRResultProps) {
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
      console.error(error);
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
    <section class="mt-8 w-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-xl backdrop-blur-xl">

      {/* Header */}

      <div class="flex flex-col gap-4 border-b border-white/10 p-6 md:flex-row md:items-center md:justify-between">

        <div class="flex items-center gap-3">

          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">

            <FileText size={22} />

          </div>

          <div>

            <h3 class="text-lg font-semibold text-white">
              Extracted Text
            </h3>

            <p class="text-sm text-zinc-500">
              Review, copy or download your OCR result.
            </p>

          </div>

        </div>

        <div class="flex gap-3">

          <button
            type="button"
            onClick={handleCopy}
            class="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}

            {copied ? "Copied" : "Copy"}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            class="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
          >
            <Download size={18} />

            Download TXT
          </button>

        </div>

      </div>

      {/* Result */}

      <div class="p-6">

        <pre class="max-h-[450px] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-[#07070A] p-5 text-sm leading-7 text-zinc-300">
{text}
        </pre>

      </div>

    </section>
  );
}