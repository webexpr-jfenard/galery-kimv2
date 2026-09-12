/**
 * Client-side image helpers: thumbnails generated in the browser at upload time
 * (Supabase image transformations are not available on this project's plan) and the
 * choice of the right source for a given display size.
 */
import type { Photo } from './galleryService';

export const THUMBNAIL_MAX_EDGE = 1000; // px, longest side
export const THUMBNAIL_QUALITY = 0.8;   // JPEG

export interface ThumbnailResult {
  blob: Blob;
  width: number;          // thumbnail size
  height: number;
  originalWidth: number;  // source size
  originalHeight: number;
}

async function decode(source: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(source);
    } catch {
      // fall through to the <img> path (some browsers refuse certain JPEGs here)
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image non décodable')); };
    img.src = url;
  });
}

/** Resizes an image so that its longest side is at most `maxEdge`, as a JPEG blob. */
export async function createThumbnail(source: Blob, maxEdge = THUMBNAIL_MAX_EDGE, quality = THUMBNAIL_QUALITY): Promise<ThumbnailResult> {
  const image = await decode(source);
  const originalWidth = image.width;
  const originalHeight = image.height;
  const scale = Math.min(1, maxEdge / Math.max(originalWidth, originalHeight));
  const width = Math.max(1, Math.round(originalWidth * scale));
  const height = Math.max(1, Math.round(originalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');
  ctx.drawImage(image, 0, 0, width, height);
  if ('close' in image) (image as ImageBitmap).close();

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('Génération de la vignette impossible');
  return { blob, width, height, originalWidth, originalHeight };
}

/** Storage path of the thumbnail matching an original stored at `bucketPath` inside `bucketFolder`. */
export function thumbnailPathFor(bucketFolder: string, bucketPath: string): string {
  const relative = bucketPath.startsWith(`${bucketFolder}/`) ? bucketPath.slice(bucketFolder.length + 1) : bucketPath;
  const withoutExt = relative.replace(/\.[^./]+$/, '');
  return `${bucketFolder}/thumbs/${withoutExt}.jpg`;
}

/** Best source for a display context: grids and lists get the thumbnail when it exists. */
export function photoSrc(photo: Pick<Photo, 'url' | 'thumbnailUrl'>, size: 'grid' | 'full' = 'grid'): string {
  if (size === 'full') return photo.url;
  return photo.thumbnailUrl || photo.url;
}

/** CSS aspect-ratio value from stored dimensions, to reserve space before the image loads. */
export function photoAspectRatio(photo: Pick<Photo, 'width' | 'height'>): string | undefined {
  return photo.width && photo.height ? `${photo.width} / ${photo.height}` : undefined;
}
