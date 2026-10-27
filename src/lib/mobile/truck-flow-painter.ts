export function floodFill(image: ImageData, startX: number, startY: number, fill: [number, number, number, number]) {
  const output = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
  if (startX < 0 || startY < 0 || startX >= image.width || startY >= image.height) return { image: output, changed: false };
  const start = (startY * image.width + startX) * 4;
  const target = image.data.slice(start, start + 4);
  if (isContour(target[0], target[1], target[2])) return { image: output, changed: false };
  const stack = [[startX, startY]];
  const seen = new Uint8Array(image.width * image.height);
  let changed = 0;
  let touchesEdge = false;
  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < 0 || y < 0 || x >= image.width || y >= image.height) continue;
    const index = y * image.width + x;
    if (seen[index]) continue;
    seen[index] = 1;
    const offset = index * 4;
    const r = image.data[offset]; const g = image.data[offset + 1]; const b = image.data[offset + 2];
    if (isContour(r, g, b)) continue;
    if (x === 0 || y === 0 || x === image.width - 1 || y === image.height - 1) touchesEdge = true;
    output.data[offset] = fill[0]; output.data[offset + 1] = fill[1]; output.data[offset + 2] = fill[2]; output.data[offset + 3] = 255;
    changed += 1;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return touchesEdge ? { image, changed: false } : { image: output, changed: changed > 0 };
}

function isContour(r: number, g: number, b: number) {
  return r < 180 && g < 180 && b < 180;
}
