export const colors = {
  bg: '#1A0B3B',
  bgDeep: '#12062B',
  surface: '#2A1462',
  surfaceHi: '#3B1E86',
  primary: '#8B5CF6',
  primaryDark: '#6D28D9',
  deep: '#4C1D95',
  lavender: '#C4B5FD',
  lilac: '#DDD6FE',
  white: '#FFFFFF',
  outline: '#0B0420',
  danger: '#F472B6',
  gold: '#FACC15',
} as const;

export const fonts = {
  /** Chunky 8-bit display face. Keep it small (8-20px); it runs wide. */
  display: 'PressStart2P_400Regular',
  /** Readable pixel body face. Runs small, so use 20px+. */
  body: 'VT323_400Regular',
} as const;

/** Pixel grid unit. Borders, gaps and paddings are multiples of this. */
export const px = 4;

export const links = {
  website: 'https://dgcaddy.hyzer.xyz',
  privacy: 'https://dgcaddy.hyzer.xyz/privacy.html',
  terms: 'https://dgcaddy.hyzer.xyz/terms.html',
  support: 'mailto:support@hyzer.xyz',
} as const;
