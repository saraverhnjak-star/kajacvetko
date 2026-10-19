// Camera movement must start with the selected canvas inside the scrolling window.
export function revealArtworkScroll(viewport, artwork, scrollLeft, gutter = 24) {
  const inset = Math.min(gutter, Math.max(0, (viewport.width - artwork.width) / 2));
  const left = viewport.left + inset;
  const right = viewport.left + viewport.width - inset;
  if (artwork.left >= left && artwork.left + artwork.width <= right) return scrollLeft;
  return scrollLeft + artwork.left + artwork.width / 2 - viewport.left - viewport.width / 2;
}
