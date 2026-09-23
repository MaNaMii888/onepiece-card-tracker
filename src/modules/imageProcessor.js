/**
 * Image Processing Module (HEIC Conversion, Resizing, Base64 Normalization)
 */

export async function processCardImageFile(file) {
  let targetFile = file;

  const isHeic = file.type === 'image/heic' || 
                 file.type === 'image/heif' || 
                 file.name?.toLowerCase().endsWith('.heic') || 
                 file.name?.toLowerCase().endsWith('.heif');

  if (isHeic && window.heic2any) {
    try {
      const conversionResult = await window.heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.88
      });
      targetFile = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
    } catch (heicErr) {
      console.warn('HEIC conversion warning:', heicErr);
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (evt) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image data'));
      img.onload = () => {
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

        resolve({
          base64: compressedBase64,
          name: file.name || 'image.jpg',
          sizeKb: Math.round(compressedBase64.length / 1024)
        });
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(targetFile);
  });
}
