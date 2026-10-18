import variants from './data/imageVariants.json';

// Keep the full image for detail views; let the browser choose smaller files in lists.
export function responsiveImage(src, sizes) {
  const image = variants[src];
  if (!image) return {};
  return {
    srcSet: image.map(variant => `${encodeURI(variant.src)} ${variant.width}w`).join(', '),
    sizes,
  };
}
