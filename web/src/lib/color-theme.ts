import { useMemo } from "react";

export interface ColorTheme {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textMuted: string;
  background: string;
  backface: string;
  highlight: string;
  brushed: string;
  border: string;
  panel: string;
  panelBorder: string;
  chipBackground: string;
  chipBorder: string;
  chipText: string;
  chipMuted: string;
  glow: string;
  shadow: string;
  controlBackground: string;
  controlBorder: string;
  controlText: string;
  controlHover: string;
}

export const PRESET_COLORS: Record<string, string> = {
  "rose-gold": "#ec407a",
  "onyx-blue": "#1e2a44",
  silver: "#c0c9d6",
  gold: "#f5c452",
  emerald: "#1fa37b",
  royal: "#4338ca",
  copper: "#c76c32",
  obsidian: "#050b16",
}

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max)

const normalizeHex = (value: string) => {
  if (!value) return "#ec407a"
  let hex = value.trim()
  if (!hex.startsWith("#")) {
    hex = `#${hex}`
  }
  if (hex.length === 4) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
  }
  return hex.slice(0, 7)
}

const hexToRgb = (hex: string) => {
  const value = normalizeHex(hex)
  const bigint = parseInt(value.slice(1), 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return { r, g, b }
}

const rgbToHex = (r: number, g: number, b: number) => {
  const toHex = (value: number) => {
    const clamped = Math.round(clamp(value / 255) * 255)
    const hex = clamped.toString(16)
    return hex.length === 1 ? `0${hex}` : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const hexToHsl = (hex: string) => {
  const { r, g, b } = hexToRgb(hex)
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255
  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)
        break
      case gNorm:
        h = (bNorm - rNorm) / d + 2
        break
      default:
        h = (rNorm - gNorm) / d + 4
        break
    }
    h /= 6
  }

  return { h, s, l }
}

const hslToHex = ({ h, s, l }: { h: number; s: number; l: number }) => {
  const hueToRgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  let r: number
  let g: number
  let b: number

  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hueToRgb(p, q, h + 1 / 3)
    g = hueToRgb(p, q, h)
    b = hueToRgb(p, q, h - 1 / 3)
  }

  return rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255))
}

const adjustColor = (hex: string, { l = 0, s = 0, h = 0 }: { l?: number; s?: number; h?: number }) => {
  const hsl = hexToHsl(hex)
  const next = {
    h: (hsl.h + h + 1) % 1,
    s: clamp(hsl.s + s, 0, 1),
    l: clamp(hsl.l + l, 0, 1),
  }
  return hslToHex(next)
}

export const withAlpha = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha)})`
}

const getReadableTextColor = (hex: string) => {
  const { r, g, b } = hexToRgb(hex)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? "#0f172a" : "#f8fafc"
}

export const generateThemeFromColor = (color: string): ColorTheme => {
  const base = normalizeHex(color || "#ec407a")
  const lighter = adjustColor(base, { l: 0.18 })
  const lightest = adjustColor(base, { l: 0.32 })
  const darker = adjustColor(base, { l: -0.15 })
  const darkest = adjustColor(base, { l: -0.3 })
  const accent = adjustColor(base, { s: 0.05, l: 0.06 })
  const secondary = adjustColor(base, { h: 0.03, l: 0.12 })
  const panel = withAlpha(getReadableTextColor(base) === "#f8fafc" ? "#ffffff" : "#0f172a", 0.18)
  const text = getReadableTextColor(lightest)
  const textMuted = withAlpha(text === "#f8fafc" ? "#ffffff" : "#0f172a", 0.7)

  return {
    primary: base,
    secondary,
    accent,
    text,
    textMuted,
    background: `linear-gradient(155deg, ${lightest} 0%, ${lighter} 20%, ${base} 45%, ${darker} 70%, ${lightest} 100%)`,
    backface: `linear-gradient(155deg, ${lighter} 0%, ${base} 60%, ${darkest} 100%)`,
    highlight: `linear-gradient(120deg, transparent 0%, transparent 35%, ${withAlpha("#ffffff", 0.65)} 48%, ${withAlpha(
      "#ffffff",
      0.9,
    )} 50%, ${withAlpha("#ffffff", 0.65)} 52%, transparent 65%, transparent 100%)`,
    brushed: `repeating-linear-gradient(90deg, transparent 0px, ${withAlpha("#ffffff", 0.18)} 1px, transparent 2px)`,
    border: `1.5px solid ${withAlpha(accent, 0.4)}`,
    panel,
    panelBorder: `1px solid ${withAlpha(text, 0.2)}`,
    chipBackground: withAlpha(base, 0.15),
    chipBorder: `1px solid ${withAlpha(base, 0.4)}`,
    chipText: text,
    chipMuted: withAlpha(text, 0.7),
    glow: `0 1px 0 0 ${lightest}, 0 2px 0 0 ${lighter}, 0 3px 0 0 ${base}, 0 8px 16px -4px ${withAlpha(
      base,
      0.35,
    )}, 0 16px 32px -8px ${withAlpha(base, 0.25)}`,
    shadow: `0 8px 24px ${withAlpha(darkest, 0.35)}`,
    controlBackground: `linear-gradient(120deg, ${withAlpha(lighter, 0.4)}, ${withAlpha(base, 0.25)})`,
    controlBorder: withAlpha(base, 0.45),
    controlText: text,
    controlHover: `linear-gradient(120deg, ${withAlpha(lightest, 0.5)}, ${withAlpha(base, 0.35)})`,
  }
}

export const useGeneratedTheme = (color: string) => useMemo(() => generateThemeFromColor(color), [color])
