/**
 * High-Fidelity Image Compression Utility
 * Features:
 * - Stepped downscaling for edge retention
 * - Clarity sharpening pass
 * - Professional bottom-left telemetry watermark burn (white text on dark backdrop)
 */

export interface WatermarkData {
  clientName?: string;
  tagLabel?: string;
  inspectorName?: string;
  timestamp?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: 'image/jpeg' | 'image/webp';
  enableSharpening?: boolean;
  watermark?: WatermarkData;
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: WatermarkData
): void {
  const lines: string[] = [];

  // Line 1: Organization & Premise
  const client = (data.clientName || 'VSF SITE AUDIT').toUpperCase();
  const tag = data.tagLabel ? ` • ${data.tagLabel}` : '';
  lines.push(`${client}${tag}`);

  // Line 2: Auditor
  if (data.inspectorName) {
    lines.push(`Auditor: ${data.inspectorName}`);
  }

  // Line 3: Timestamp & Coordinates
  const timeStr = data.timestamp || new Date().toLocaleString('en-IN');
  let geoStr = '';
  if (data.latitude != null && data.longitude != null) {
    geoStr = ` | GPS: ${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}`;
  }
  lines.push(`${timeStr}${geoStr}`);

  // Responsive font sizing based on target canvas resolution
  const fontSize = Math.max(16, Math.round(width * 0.018));
  const lineHeight = Math.round(fontSize * 1.35);
  const paddingX = Math.round(fontSize * 0.9);
  const paddingY = Math.round(fontSize * 0.7);

  ctx.save();
  ctx.font = `600 ${fontSize}px "Segoe UI", Roboto, -apple-system, sans-serif`;

  let maxTextWidth = 0;
  lines.forEach((line) => {
    const w = ctx.measureText(line).width;
    if (w > maxTextWidth) maxTextWidth = w;
  });

  const boxWidth = maxTextWidth + paddingX * 2;
  const boxHeight = lines.length * lineHeight + paddingY * 2;
  const boxX = Math.round(width * 0.02);
  const boxY = height - boxHeight - Math.round(height * 0.025);

  // Background capsule (subtle blur & high-contrast tint)
  ctx.fillStyle = 'rgba(10, 15, 25, 0.72)';
  ctx.beginPath();
  const radius = 8;
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, radius);
  ctx.fill();

  // Subtle boundary stroke
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Text Rendering
  lines.forEach((line, idx) => {
    const yPos = boxY + paddingY + (idx + 1) * lineHeight - Math.round(fontSize * 0.25);

    // Accent header color for line 1
    if (idx === 0) {
      ctx.fillStyle = '#FDE047'; // Amber yellow for establishment name
      ctx.fillText(line, boxX + paddingX, yPos);
    } else {
      ctx.fillStyle = '#FFFFFF'; // Crisp white for metadata
      ctx.fillText(line, boxX + paddingX, yPos);
    }
  });

  ctx.restore();
}

function applyClarityFilter(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const buffer = new Uint8ClampedArray(data);

    const neighborWeight = 0.25;
    const centerWeight = 1.0 + 4 * neighborWeight;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) {
          const current = buffer[idx + c];
          const up = buffer[((y - 1) * width + x) * 4 + c];
          const down = buffer[((y + 1) * width + x) * 4 + c];
          const left = buffer[(y * width + (x - 1)) * 4 + c];
          const right = buffer[(y * width + (x + 1)) * 4 + c];

          const sharpened = current * centerWeight - (up + down + left + right) * neighborWeight;
          data[idx + c] = Math.min(255, Math.max(0, sharpened));
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  } catch (err) {
    console.warn('[imageCompress] Clarity filter bypassed:', err);
  }
}

function steppedDownscale(
  source: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  targetWidth: number,
  targetHeight: number,
  sharpen: boolean,
  watermark?: WatermarkData
): HTMLCanvasElement {
  let curWidth = srcWidth;
  let curHeight = srcHeight;

  let canvas = document.createElement('canvas');
  canvas.width = curWidth;
  canvas.height = curHeight;

  let ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not initialize canvas rendering context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, curWidth, curHeight);

  while (curWidth * 0.5 > targetWidth && curHeight * 0.5 > targetHeight) {
    const nextWidth = Math.floor(curWidth * 0.5);
    const nextHeight = Math.floor(curHeight * 0.5);

    const stepCanvas = document.createElement('canvas');
    stepCanvas.width = nextWidth;
    stepCanvas.height = nextHeight;
    const stepCtx = stepCanvas.getContext('2d', { alpha: false });

    if (stepCtx) {
      stepCtx.imageSmoothingEnabled = true;
      stepCtx.imageSmoothingQuality = 'high';
      stepCtx.drawImage(canvas, 0, 0, curWidth, curHeight, 0, 0, nextWidth, nextHeight);

      canvas = stepCanvas;
      curWidth = nextWidth;
      curHeight = nextHeight;
    } else {
      break;
    }
  }

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetWidth;
  finalCanvas.height = targetHeight;
  const finalCtx = finalCanvas.getContext('2d', { alpha: false });

  if (!finalCtx) return canvas;

  finalCtx.imageSmoothingEnabled = true;
  finalCtx.imageSmoothingQuality = 'high';
  finalCtx.drawImage(canvas, 0, 0, curWidth, curHeight, 0, 0, targetWidth, targetHeight);

  if (sharpen) {
    applyClarityFilter(finalCtx, targetWidth, targetHeight);
  }

  if (watermark) {
    drawWatermark(finalCtx, targetWidth, targetHeight, watermark);
  }

  return finalCanvas;
}

function calculateTargetSize(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { targetWidth: number; targetHeight: number } {
  let targetWidth = width;
  let targetHeight = height;

  if (width > height) {
    if (width > maxWidth) {
      targetHeight = Math.round((height * maxWidth) / width);
      targetWidth = maxWidth;
    }
  } else {
    if (height > maxHeight) {
      targetWidth = Math.round((width * maxHeight) / height);
      targetHeight = maxHeight;
    }
  }
  return { targetWidth, targetHeight };
}

export async function compressImage(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<Blob> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    mimeType = 'image/jpeg',
    enableSharpening = true,
    watermark
  } = options;

  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file);
      const { targetWidth, targetHeight } = calculateTargetSize(
        bitmap.width,
        bitmap.height,
        maxWidth,
        maxHeight
      );

      const canvas = steppedDownscale(
        bitmap,
        bitmap.width,
        bitmap.height,
        targetWidth,
        targetHeight,
        enableSharpening,
        watermark
      );
      bitmap.close();

      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas blob generation failed'));
          },
          mimeType,
          quality
        );
      });
    } catch {
      // Fall through to HTMLImageElement fallback
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const { targetWidth, targetHeight } = calculateTargetSize(
          img.width,
          img.height,
          maxWidth,
          maxHeight
        );

        try {
          const canvas = steppedDownscale(
            img,
            img.width,
            img.height,
            targetWidth,
            targetHeight,
            enableSharpening,
            watermark
          );

          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Canvas blob generation failed'));
            },
            mimeType,
            quality
          );
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Image failed to load'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

export function canvasToCompressedDataUrl(canvas: HTMLCanvasElement, quality: number = 0.8): string {
  return canvas.toDataURL('image/jpeg', quality);
}

export async function compressToDataUrl(
  file: File | Blob,
  maxWidth: number = 1200,
  quality: number = 0.8
): Promise<string> {
  const blob = await compressImage(file, { maxWidth, maxHeight: maxWidth, quality });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const compressFile = compressImage;

export function blobToFile(blob: Blob, originalFilename = 'photo.jpg'): File {
  const cleanName = originalFilename.replace(/\.[^/.]+$/, '') + '.jpg';
  return new File([blob], cleanName, { type: blob.type || 'image/jpeg', lastModified: Date.now() });
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
