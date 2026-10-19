// Map a flat image rectangle to its four projected corners, including perspective.
export function rectangleToQuad(width, height, points) {
  const [p0, p1, p2, p3] = points;
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x;
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy3 = p0.y - p1.y + p2.y - p3.y;
  const denominator = dx1 * dy2 - dx2 * dy1;
  if (!width || !height || Math.abs(denominator) < 1e-8) return 'none';
  const g = (dx3 * dy2 - dx2 * dy3) / denominator;
  const h = (dx1 * dy3 - dx3 * dy1) / denominator;
  const a = p1.x - p0.x + g * p1.x;
  const b = p3.x - p0.x + h * p3.x;
  const d = p1.y - p0.y + g * p1.y;
  const e = p3.y - p0.y + h * p3.y;
  return `matrix3d(${[a / width, d / width, 0, g / width, b / height, e / height, 0, h / height, 0, 0, 1, 0, p0.x, p0.y, 0, 1].join(',')})`;
}

export function artworkSourceFrame(source, fallback) {
  const room = source?.closest('.gallery-room');
  if (!room || !source.isConnected) return { rect: fallback, transform: 'none' };
  const style = getComputedStyle(room);
  if (style.transform === 'none') return { rect: source.getBoundingClientRect(), transform: 'none' };
  const matrix = new DOMMatrixReadOnly(style.transform);
  const [originX, originY] = style.transformOrigin.split(' ').map(parseFloat);
  const project = (x, y) => {
    const point = new DOMPoint(x - originX, y - originY).matrixTransform(matrix);
    return { x: point.x / point.w + originX, y: point.y / point.w + originY };
  };
  const roomCorners = [[0, 0], [room.offsetWidth, 0], [room.offsetWidth, room.offsetHeight], [0, room.offsetHeight]].map(([x, y]) => project(x, y));
  const roomBounds = room.getBoundingClientRect();
  const roomX = roomBounds.left - Math.min(...roomCorners.map(p => p.x));
  const roomY = roomBounds.top - Math.min(...roomCorners.map(p => p.y));
  let x = 0, y = 0;
  for (let node = source; node && node !== room; node = node.offsetParent) {
    x += node.offsetLeft;
    y += node.offsetTop;
  }
  for (let node = source.parentElement; node && node !== room; node = node.parentElement) {
    x -= node.scrollLeft;
    y -= node.scrollTop;
  }
  const width = source.offsetWidth, height = source.offsetHeight;
  const corners = [[x, y], [x + width, y], [x + width, y + height], [x, y + height]].map(([x, y]) => project(x, y));
  const first = corners[0];
  return {
    rect: { left: roomX + first.x, top: roomY + first.y, width, height },
    transform: rectangleToQuad(width, height, corners.map(p => ({ x: p.x - first.x, y: p.y - first.y }))),
  };
}
