/** Pointer displacement expressed as a bounded analog movement vector. */
export function joystickVector(clientX: number, clientY: number, left: number, top: number, size: number) {
  if (![clientX, clientY, left, top, size].every(Number.isFinite) || size <= 0) return { x: 0, y: 0 };
  const radius = size * 0.34;
  const rawX = (clientX - left - size / 2) / radius;
  const rawY = (clientY - top - size / 2) / radius;
  const length = Math.max(1, Math.hypot(rawX, rawY));
  return { x: rawX / length, y: rawY / length };
}
