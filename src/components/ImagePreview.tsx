import { ImageIcon } from "lucide-preact";

type ImagePreviewProps = {
  src: string | null;
};

export default function ImagePreview({
  src,
}: ImagePreviewProps) {
  if (!src) {
    return null;
  }

  return (
    <section class="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-xl backdrop-blur-xl">

      {/* Header */}

      <div class="flex items-center gap-3 border-b border-white/10 p-5">

        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
          <ImageIcon size={20} />
        </div>

        <div>
          <h3 class="text-base font-semibold text-white">
            Document Preview
          </h3>

          <p class="text-sm text-zinc-500">
            Preview of the selected image or first page of your PDF.
          </p>
        </div>

      </div>

      {/* Preview */}

      <div class="flex items-center justify-center bg-[#07070A] p-6">

        <img
          src={src}
          alt="Selected Preview"
          class="max-h-[420px] w-full rounded-2xl border border-white/10 object-contain"
        />

      </div>

    </section>
  );
}