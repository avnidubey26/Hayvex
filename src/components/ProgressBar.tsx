type ProgressBarProps = {
  progress: number;
};

export default function ProgressBar({
  progress,
}: ProgressBarProps) {
  const percentage = Math.min(
    100,
    Math.max(0, Math.round(progress * 100))
  );

  return (
    <div class="mt-8 w-full">

      {/* Header */}

      <div class="mb-3 flex items-center justify-between">

        <div>

          <p class="text-sm font-medium text-white">
            Processing Document
          </p>

          <p class="text-xs text-zinc-500">
            Please wait while Hayvex extracts text...
          </p>

        </div>

        <span class="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-sm font-semibold text-violet-300">
          {percentage}%
        </span>

      </div>

      {/* Progress */}

      <div
        class="h-3 w-full overflow-hidden rounded-full bg-white/5"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        aria-label="OCR Progress"
      >
        <div
          class="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 transition-all duration-500"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

    </div>
  );
}