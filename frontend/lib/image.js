export async function decodeImageFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = url;

  try {
    await image.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error(
      "This image format could not be decoded by your browser. Use JPG, JPEG, PNG, WebP, GIF, BMP, or AVIF."
    );
  }

  return { image, url };
}

export function fitWithin(width, height, maxWidth = 1400, maxHeight = 1000) {
  if (!width || !height) return { width: 960, height: 720 };
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function trimTransparentFrame(file) {
  const { image, url } = await decodeImageFile(file);
  const source = document.createElement("canvas");
  source.width = image.naturalWidth;
  source.height = image.naturalHeight;
  const ctx = source.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);

  let data;
  try {
    data = ctx.getImageData(0, 0, source.width, source.height);
  } catch {
    URL.revokeObjectURL(url);
    return { blob: file, width: image.naturalWidth, height: image.naturalHeight };
  }

  const { width, height } = source;
  const pixels = data.data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    URL.revokeObjectURL(url);
    throw new Error("The uploaded frame image appears to be fully transparent.");
  }

  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  const cropped = document.createElement("canvas");
  cropped.width = cropWidth;
  cropped.height = cropHeight;
  cropped
    .getContext("2d")
    .drawImage(source, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

  URL.revokeObjectURL(url);
  const blob = await new Promise((resolve, reject) => {
    cropped.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("Could not prepare the frame image."))),
      "image/png",
      1
    );
  });

  return { blob, width: cropWidth, height: cropHeight };
}
