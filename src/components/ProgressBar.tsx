type ProgressBarProps = {
  progress: number;
};

export default function ProgressBar({
  progress,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, Math.round(progress * 100)));

  return (
    <div className="mt-8 w-full">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-300">
          Processing OCR...
        </span>

        <span className="text-sm font-semibold text-violet-400">
          {percentage}%
        </span>
      </div>

      <div
        className="h-3 w-full overflow-hidden rounded-full bg-zinc-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        aria-label="OCR Progress"
      >
        <div
          className="h-full rounded-full bg-violet-600 transition-all duration-300"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}