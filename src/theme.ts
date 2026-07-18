import { StyleSheet } from 'react-native'

export interface Palette {
  bg: string
  surface: string
  surfaceAlt: string
  border: string
  text: string
  textDim: string
  textFaint: string
  accent: string
  accentText: string
  green: string
  yellow: string
  red: string
  userBubble: string
  assistantBubble: string
}

export const darkColors: Palette = {
  bg: '#0D1117',
  surface: '#161B22',
  surfaceAlt: '#1F2630',
  border: '#2D333B',
  text: '#E6EDF3',
  textDim: '#8B949E',
  textFaint: '#6E7681',
  accent: '#E8A33D',
  accentText: '#0D1117',
  green: '#3FB950',
  yellow: '#D29922',
  red: '#F85149',
  userBubble: '#2F3B4C',
  assistantBubble: '#161B22',
}

// Light mode is deliberately monochrome (OpenAI-style): white surfaces,
// near-black text, black primary actions — color only for status/danger.
export const lightColors: Palette = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F4F4F4',
  border: '#E3E3E3',
  text: '#0D0D0D',
  textDim: '#5D5D5D',
  textFaint: '#9A9A9A',
  accent: '#0D0D0D',
  accentText: '#FFFFFF',
  green: '#0E8345',
  yellow: '#B26A00',
  red: '#D92D20',
  userBubble: '#F2F2F2',
  assistantBubble: '#FFFFFF',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
}

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
}

/**
 * Memoize a palette-dependent stylesheet: there are only two palette
 * objects, so each screen builds at most two stylesheets ever.
 */
export function themedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: Palette) => T
): (colors: Palette) => T {
  const cache = new WeakMap<Palette, T>()
  return (colors: Palette) => {
    let styles = cache.get(colors)
    if (!styles) {
      styles = factory(colors)
      cache.set(colors, styles)
    }
    return styles
  }
}
