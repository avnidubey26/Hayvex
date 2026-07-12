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
    <div className="mt-6 w-full">
      <img
        src={src}
        alt="Selected preview"
        className="max-h-72 w-full rounded-xl border border-zinc-700 object-contain"
      />
    </div>
  );
}