export async function uploadProductImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{
  url: string;
  compressed: boolean;
  originalSize: number;
  finalSize: number;
}> {
  return new Promise((resolve, reject) => {
    const originalSize = file.size;

    if (onProgress) onProgress(20);

    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.min(80, Math.round((e.loaded / e.total) * 60) + 20);
        onProgress(percent);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read image file'));

    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        if (onProgress) onProgress(90);

        // Compress image using Canvas
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 800;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (onProgress) onProgress(100);
          resolve({
            url: reader.result as string,
            compressed: false,
            originalSize,
            finalSize: originalSize,
          });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Quality 0.8
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        const finalSize = Math.round((dataUrl.length * 3) / 4);

        if (onProgress) onProgress(100);

        resolve({
          url: dataUrl,
          compressed: finalSize < originalSize,
          originalSize,
          finalSize,
        });
      };

      img.onerror = () => reject(new Error('Failed to parse image for compression'));
      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

export async function deleteProductImage(_url: string): Promise<void> {
  // Client-side image storage clean-up (no-op for base64 / external URLs)
  return Promise.resolve();
}
