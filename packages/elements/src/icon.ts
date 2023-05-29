// Wraps a path from @mdi/js into an svg, to be used inside an <sl-icon src=""></sl-icon>
export function wrapPathInSvg(path: string): string {
  return `data:image/svg+xml;utf8,${wrapPathInSvgWithoutPrefix(path)}`;
}

// Wraps a path from @mdi/js into an svg, to be used inside an <sl-icon src=""></sl-icon>
export function wrapPathInSvgWithoutPrefix(path: string): string {
  return `<svg style='fill: currentColor' viewBox='0 0 24 24'><path d='${path}'></path></svg>`;
}
