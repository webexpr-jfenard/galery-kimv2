// Small color helpers for the per-gallery accent color.

export const DEFAULT_ACCENT = '#1F2A44'; // navy, the app's primary color

export function normalizeHex(hex?: string | null): string {
  const value = (hex || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : DEFAULT_ACCENT;
}

/** "#RRGGBB" -> "h s% l%" as expected by Tailwind's hsl(var(--primary)) tokens */
export function hexToHslTriplet(hex: string): string {
  const value = normalizeHex(hex);
  const r = parseInt(value.slice(1, 3), 16) / 255;
  const g = parseInt(value.slice(3, 5), 16) / 255;
  const b = parseInt(value.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** True when white text would be unreadable on this color */
export function isLightColor(hex: string): boolean {
  const value = normalizeHex(hex);
  const r = parseInt(value.slice(1, 3), 16);
  const g = parseInt(value.slice(3, 5), 16);
  const b = parseInt(value.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

/** CSS variables to apply on a gallery page so that every primary button follows its accent */
export function accentStyle(hex?: string | null): React.CSSProperties {
  const value = normalizeHex(hex);
  return {
    '--primary': hexToHslTriplet(value),
    '--primary-foreground': isLightColor(value) ? '222 37% 12%' : '0 0% 100%',
    '--ring': hexToHslTriplet(value),
  } as React.CSSProperties;
}
