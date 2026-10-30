export function socialPreviewSvg(title: string) {
  const escaped = title
    .slice(0, 55)
    .replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
    );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#f5f2ec"/><text x="70" y="105" font-family="sans-serif" font-size="26" fill="#161923">MARTIN SPATOVALIYSKI</text><text x="70" y="310" font-family="sans-serif" font-size="${title.length > 30 ? 48 : 70}" fill="#2445e8">${escaped}</text><text x="70" y="520" font-family="sans-serif" font-size="24" fill="#525866">Engineering · Products · Selected work</text></svg>`;
}
