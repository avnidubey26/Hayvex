type OCRResultProps = {
  text: string;
};

export default function OCRResult({
  text,
}: OCRResultProps) {
  if (!text.trim()) {
    return null;
  }

  return (
    <section className="mt-8 w-full rounded-2xl border border-zinc-700 bg-zinc-900/70 p-6">
      <h3 className="mb-4 text-xl font-semibold text-white">
        Extracted Text
      </h3>

      <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-zinc-300">
        {text}
      </pre>
    </section>
  );
}