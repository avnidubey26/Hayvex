const MAX_DIMENSION = 2200;

function clamp(
    value: number,
    min: number,
    max: number,
) {
    return Math.min(
        Math.max(value, min),
        max,
    );
}

async function loadImage(
    file: Blob,
): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);

        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };

        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(
                new Error("Unable to load image."),
            );
        };

        image.src = url;
    });
}

function calculateSize(
    width: number,
    height: number,
) {
    if (
        width <= MAX_DIMENSION &&
        height <= MAX_DIMENSION
    ) {
        return {
            width,
            height,
        };
    }

    const ratio = Math.min(
        MAX_DIMENSION / width,
        MAX_DIMENSION / height,
    );

    return {
        width: Math.round(width * ratio),
        height: Math.round(height * ratio),
    };
}

function createCanvas(
    width: number,
    height: number,
) {
    const canvas =
        document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
        throw new Error(
            "Canvas context unavailable.",
        );
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    return {
        canvas,
        ctx,
    };
}

function grayscale(
    pixels: Uint8ClampedArray,
) {
    for (
        let i = 0;
        i < pixels.length;
        i += 4
    ) {
        const gray =
            pixels[i] * 0.299 +
            pixels[i + 1] * 0.587 +
            pixels[i + 2] * 0.114;

        pixels[i] = gray;
        pixels[i + 1] = gray;
        pixels[i + 2] = gray;
    }
}
function autoContrast(
    pixels: Uint8ClampedArray,
) {
    let min = 255;
    let max = 0;

    for (let i = 0; i < pixels.length; i += 4) {
        const value = pixels[i];

        if (value < min) min = value;
        if (value > max) max = value;
    }

    const range = max - min;

    if (range < 8) {
        return;
    }

    for (let i = 0; i < pixels.length; i += 4) {
        const value =
            ((pixels[i] - min) * 255) / range;

        const normalized = clamp(
            value,
            0,
            255,
        );

        pixels[i] = normalized;
        pixels[i + 1] = normalized;
        pixels[i + 2] = normalized;
    }
}

function sharpen(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
) {
    const source = new Uint8ClampedArray(
        pixels,
    );

    const kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0,
    ];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let total = 0;
            let k = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const index =
                        ((y + ky) * width + (x + kx)) * 4;

                    total +=
                        source[index] * kernel[k++];
                }
            }

            const output =
                (y * width + x) * 4;

            const value = clamp(
                total,
                0,
                255,
            );

            pixels[output] = value;
            pixels[output + 1] = value;
            pixels[output + 2] = value;
        }
    }
}

async function canvasToBlob(
    canvas: HTMLCanvasElement,
): Promise<Blob> {
    return new Promise(
        (resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(
                            new Error(
                                "Unable to process image.",
                            ),
                        );
                        return;
                    }

                    resolve(blob);
                },
                "image/png",
                1,
            );
        },
    );
}
export async function preprocessImage(
    file: File,
): Promise<File> {
    const image = await loadImage(file);

    const size = calculateSize(
        image.width,
        image.height,
    );

    const { canvas, ctx } = createCanvas(
        size.width,
        size.height,
    );

    ctx.drawImage(
        image,
        0,
        0,
        size.width,
        size.height,
    );

    const imageData = ctx.getImageData(
        0,
        0,
        size.width,
        size.height,
    );

    const pixels = imageData.data;

    grayscale(pixels);

    let min = 255;
    let max = 0;

    for (let i = 0; i < pixels.length; i += 4) {
        const value = pixels[i];

        if (value < min) min = value;
        if (value > max) max = value;
    }

    const contrast = max - min;

    if (contrast < 120) {
        autoContrast(pixels);
    }

    if (contrast < 90) {
        sharpen(
            pixels,
            size.width,
            size.height,
        );
    }

    ctx.putImageData(
        imageData,
        0,
        0,
    );

    const blob = await canvasToBlob(canvas);

    return new File(
        [blob],
        file.name,
        {
            type: "image/png",
            lastModified: Date.now(),
        },
    );
}