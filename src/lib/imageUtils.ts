/**
 * Client-Side Image Compression Utility
 * Resizes large camera photos (often 5-15MB) into crisp, high-res web-optimized JPEGs (<300KB)
 * matching WhatsApp/Telegram quality for instant delivery and Firestore compatibility.
 */
export async function compressImage(
  source: File | string,
  maxWidth: number = 1080,
  maxHeight: number = 1080,
  quality: number = 0.80
): Promise<string> {
  // Method 1: Modern high-performance createImageBitmap (faster, handles EXIF & avoids crossOrigin pitfalls on Android)
  if (typeof window !== 'undefined' && 'createImageBitmap' in window && source instanceof File) {
    try {
      const bitmap = await createImageBitmap(source);
      let { width, height } = bitmap;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(width, 1);
      canvas.height = Math.max(height, 1);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        return canvas.toDataURL('image/jpeg', quality);
      }
      bitmap.close();
    } catch (bitmapErr) {
      console.warn('createImageBitmap fallback to HTMLImageElement:', bitmapErr);
    }
  }

  // Method 2: Standard HTMLImageElement loader
  return new Promise((resolve, reject) => {
    const img = new Image();

    const handleLoad = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(typeof source === 'string' ? source : '');
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch (e) {
        console.warn('Canvas export fallback:', e);
        if (typeof source === 'string') {
          resolve(source);
        } else {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(e);
          reader.readAsDataURL(source);
        }
      }
    };

    img.onload = handleLoad;
    img.onerror = () => {
      if (typeof source === 'string') {
        resolve(source);
      } else {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(source);
      }
    };

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const objUrl = URL.createObjectURL(source);
      img.onload = () => {
        URL.revokeObjectURL(objUrl);
        handleLoad();
      };
      img.onerror = () => {
        URL.revokeObjectURL(objUrl);
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(source);
      };
      img.src = objUrl;
    }
  });
}
