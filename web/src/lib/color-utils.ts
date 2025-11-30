export interface ColorTheme {
  primary: string
  secondary: string
  accent: string
  text: string
  textMuted: string
  background: string
  highlight: string
  shadow: string
  buttonBg: string
  buttonText: string
  buttonBorder: string
}

const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!match) return { h: 0, s: 0, l: 0 }

  const r = parseInt(match[1], 16) / 255
  const g = parseInt(match[2], 16) / 255
  const b = parseInt(match[3], 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      default:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}

const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0")
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

const isColorDark = (hex: string): boolean => {
  const { l } = hexToHsl(hex)
  return l < 50
}

export function generateThemeFromColor(baseColor: string): ColorTheme {
  const { h, s, l } = hexToHsl(baseColor)
  const dark = isColorDark(baseColor)

  if (dark) {
    return {
      primary: baseColor,
      secondary: hslToHex(h, Math.min(s + 10, 100), Math.min(l + 15, 40)),
      accent: hslToHex(h, Math.min(s + 20, 100), Math.min(l + 25, 50)),
      text: hslToHex(h, Math.max(s - 50, 10), 90),
      textMuted: hslToHex(h, Math.max(s - 60, 5), 60),
      background: hslToHex(h, Math.max(s - 30, 20), Math.max(l - 10, 10)),
      highlight: `rgba(255, 255, 255, 0.15)`,
      shadow: `rgba(0, 0, 0, 0.5)`,
      buttonBg: hslToHex(h, Math.max(s - 20, 30), Math.min(l + 20, 35)),
      buttonText: hslToHex(h, Math.max(s - 50, 10), 85),
      buttonBorder: hslToHex(h, Math.max(s - 20, 30), Math.min(l + 30, 45)),
    }
  }

  return {
    primary: baseColor,
    secondary: hslToHex(h, Math.min(s + 5, 100), Math.max(l - 15, 60)),
    accent: hslToHex(h, Math.min(s + 15, 100), Math.max(l - 25, 45)),
    text: hslToHex(h, Math.min(s + 30, 100), Math.max(l - 50, 20)),
    textMuted: hslToHex(h, Math.min(s + 10, 80), Math.max(l - 30, 40)),
    background: hslToHex(h, Math.max(s - 20, 30), Math.min(l + 8, 95)),
    highlight: `rgba(255, 255, 255, 0.7)`,
    shadow: hslToHex(h, Math.min(s + 20, 100), Math.max(l - 40, 30)),
    buttonBg: hslToHex(h, Math.max(s - 30, 30), Math.min(l + 5, 92)),
    buttonText: hslToHex(h, Math.min(s + 30, 100), Math.max(l - 45, 25)),
    buttonBorder: hslToHex(h, Math.max(s - 20, 40), Math.max(l - 20, 60)),
  }
}

export function generateMetalGradient(theme: ColorTheme, isDark: boolean): string {
  const { h, s, l } = hexToHsl(theme.primary)

  if (isDark) {
    return `linear-gradient(155deg,
      ${hslToHex(h, Math.max(s - 10, 20), Math.min(l + 15, 35))} 0%,
      ${hslToHex(h, s, l)} 20%,
      ${hslToHex(h, Math.max(s - 5, 25), Math.min(l + 20, 40))} 40%,
      ${hslToHex(h, Math.min(s + 5, 100), Math.max(l - 8, 10))} 60%,
      ${hslToHex(h, s, l)} 80%,
      ${hslToHex(h, Math.max(s - 10, 20), Math.min(l + 15, 35))} 100%)`
  }

  return `linear-gradient(155deg,
    ${hslToHex(h, Math.max(s - 15, 30), Math.min(l + 8, 95))} 0%,
    ${hslToHex(h, s, l)} 15%,
    ${hslToHex(h, Math.max(s - 20, 25), Math.min(l + 10, 97))} 30%,
    ${hslToHex(h, s, l)} 50%,
    ${hslToHex(h, Math.max(s - 15, 30), Math.min(l + 8, 95))} 70%,
    ${hslToHex(h, Math.max(s - 20, 25), Math.min(l + 10, 97))} 85%,
    ${hslToHex(h, Math.max(s - 15, 30), Math.min(l + 8, 95))} 100%)`
}

export const generateBrushedMetal = (isDark: boolean): string =>
  isDark
    ? `repeating-linear-gradient(90deg, transparent 0px, rgba(255,255,255,0.03) 1px, transparent 2px)`
    : `repeating-linear-gradient(90deg, transparent 0px, rgba(255,255,255,0.4) 1px, transparent 2px)`

export const generateSharpHighlight = (isDark: boolean): string =>
  isDark
    ? `linear-gradient(120deg, transparent 0%, transparent 42%, rgba(255,255,255,0.12) 49%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.12) 51%, transparent 58%, transparent 100%)`
    : `linear-gradient(120deg, transparent 0%, transparent 35%, rgba(255,255,255,0.6) 48%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.6) 52%, transparent 65%, transparent 100%)`

export const generateEdgeHighlight = (isDark: boolean): string =>
  isDark
    ? `inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.5)`
    : `inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(200,150,170,0.3)`

export const generateCardShadow = (theme: ColorTheme, isDark: boolean): string => {
  const { h, s, l } = hexToHsl(theme.primary)

  if (isDark) {
    return `
      0 1px 0 0 ${hslToHex(h, Math.max(s - 10, 20), Math.min(l + 10, 30))},
      0 2px 0 0 ${hslToHex(h, s, l)},
      0 3px 0 0 ${hslToHex(h, Math.min(s + 10, 100), Math.max(l - 10, 5))},
      0 8px 16px -4px rgba(0,0,0,0.5),
      0 16px 32px -8px ${theme.shadow}
    `
  }

  return `
    0 1px 0 0 ${hslToHex(h, Math.max(s - 10, 40), l)},
    0 2px 0 0 ${hslToHex(h, s, Math.max(l - 10, 60))},
    0 3px 0 0 ${hslToHex(h, Math.min(s + 10, 100), Math.max(l - 20, 50))},
    0 8px 16px -4px ${theme.shadow}40,
    0 16px 32px -8px ${theme.shadow}25
  `
}

export const presetColors = [
  { name: "Rose Gold", color: "#f8bbd9", isDark: false },
  { name: "Onyx Blue", color: "#1a2538", isDark: true },
  { name: "Silver", color: "#e0e0e0", isDark: false },
  { name: "Gold", color: "#ffd700", isDark: false },
  { name: "Emerald", color: "#50c878", isDark: false },
  { name: "Royal Purple", color: "#2a1a4a", isDark: true },
  { name: "Copper", color: "#b87333", isDark: false },
  { name: "Obsidian", color: "#0a0a0a", isDark: true },
]
