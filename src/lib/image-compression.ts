import {
  MAX_COMPRESSED_IMAGE_DIMENSION,
  MAX_IMAGE_UPLOAD_BYTES,
  TARGET_COMPRESSED_IMAGE_BYTES
} from "@/lib/image-constraints";

const supportedInputTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export type CompressedImage = {
  dataUrl: string;
  originalBytes: number;
  compressedBytes: number;
  width: number;
  height: number;
};

export class ImageCompressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageCompressionError";
  }
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new ImageCompressionError("The image could not be read."));
    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result)
      : reject(new ImageCompressionError("The image could not be read."));
    reader.readAsDataURL(blob);
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new ImageCompressionError("The selected image is damaged or unsupported."));
    };
    image.src = objectUrl;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function imageCompressionMessage(image: CompressedImage, label = "Image") {
  if (image.compressedBytes >= image.originalBytes) {
    return `${label} ready (${formatBytes(image.compressedBytes)}).`;
  }
  return `${label} compressed from ${formatBytes(image.originalBytes)} to ${formatBytes(image.compressedBytes)}.`;
}

export async function compressImageToDataUrl(file: File): Promise<CompressedImage> {
  if (!supportedInputTypes.has(file.type)) {
    throw new ImageCompressionError("Choose a PNG, JPEG, WebP, or GIF image.");
  }
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new ImageCompressionError(`Choose an image smaller than ${formatBytes(MAX_IMAGE_UPLOAD_BYTES)}.`);
  }

  const image = await loadImage(file);
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  if (!sourceWidth || !sourceHeight) {
    throw new ImageCompressionError("The selected image has invalid dimensions.");
  }

  const initialScale = Math.min(1, MAX_COMPRESSED_IMAGE_DIMENSION / Math.max(sourceWidth, sourceHeight));
  const initialWidth = Math.max(1, Math.round(sourceWidth * initialScale));
  const initialHeight = Math.max(1, Math.round(sourceHeight * initialScale));

  if (file.size <= TARGET_COMPRESSED_IMAGE_BYTES && initialScale === 1) {
    return {
      dataUrl: await readBlobAsDataUrl(file),
      originalBytes: file.size,
      compressedBytes: file.size,
      width: sourceWidth,
      height: sourceHeight
    };
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new ImageCompressionError("Image compression is not available in this browser.");

  let best: Blob | null = null;
  let outputWidth = initialWidth;
  let outputHeight = initialHeight;
  const qualities = [0.86, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38];

  for (let sizeAttempt = 0; sizeAttempt < 9; sizeAttempt += 1) {
    const scale = 0.82 ** sizeAttempt;
    outputWidth = Math.max(1, Math.round(initialWidth * scale));
    outputHeight = Math.max(1, Math.round(initialHeight * scale));

    canvas.width = outputWidth;
    canvas.height = outputHeight;
    context.clearRect(0, 0, outputWidth, outputHeight);
    context.drawImage(image, 0, 0, outputWidth, outputHeight);

    for (const quality of qualities) {
      const candidate = await canvasBlob(canvas, quality);
      if (!candidate) continue;
      if (!best || candidate.size < best.size) best = candidate;
      if (candidate.size <= TARGET_COMPRESSED_IMAGE_BYTES) {
        best = candidate;
        break;
      }
    }
    if (best && best.size <= TARGET_COMPRESSED_IMAGE_BYTES) break;
  }

  if (!best || best.size > TARGET_COMPRESSED_IMAGE_BYTES) {
    throw new ImageCompressionError("The image could not be compressed enough. Try a less detailed image.");
  }

  return {
    dataUrl: await readBlobAsDataUrl(best),
    originalBytes: file.size,
    compressedBytes: best.size,
    width: outputWidth,
    height: outputHeight
  };
}
