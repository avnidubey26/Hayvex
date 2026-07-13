export async function preprocessImage(
  input: Blob,
): Promise<Blob> {
  const image = new Image();

  image.src = URL.createObjectURL(input);

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Image load failed."));
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas unavailable.");
  }

  canvas.width = image.width;
  canvas.height = image.height;

  ctx.drawImage(image, 0, 0);

  const img = ctx.getImageData(
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const data = img.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray =
      data[i] * 0.299 +
      data[i + 1] * 0.587 +
      data[i + 2] * 0.114;

    const contrast = gray > 150 ? 255 : 0;

    data[i] = contrast;
    data[i + 1] = contrast;
    data[i + 2] = contrast;
  }

  ctx.putImageData(img, 0, 0);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to preprocess image."));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}