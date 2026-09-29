// Pixel-art sprites. Each character is one pixel; '.' is transparent.
// Keys map to PALETTE below. Every row in a sprite must be the same width
// (checked by scripts/check-sprites.mjs).

export const PALETTE: Record<string, string> = {
  k: '#0B0420', // outline
  d: '#4C1D95', // deep purple
  p: '#7C3AED', // purple
  l: '#A78BFA', // light purple
  L: '#DDD6FE', // lilac
  w: '#FFFFFF', // white
  g: '#C4B5FD', // chains
  y: '#FACC15', // gold (stars and crown only)
};

export type Sprite = readonly string[];

/** "Chip", the DG Caddy mascot: a putter with a face. */
export const caddy: Sprite = [
  '.....kkkkkk.....',
  '...kkppppppkk...',
  '..kppllllllppk..',
  '.kpllllllllllpk.',
  'kpllwwllllwwllpk',
  'kpllwkllllwkllpk',
  'kpllllllllllllpk',
  'kplLllllllllLlpk',
  'kplllkllllklllpk',
  'kpllllkkkkllllpk',
  '.kpllllllllllpk.',
  '.kdpllllllllpdk.',
  '..kddppppppddk..',
  '...kkddddddkk...',
  '.....kkkkkk.....',
  '...kppk..kppk...',
];

export const disc: Sprite = [
  '....kkkk....',
  '..kkppppkk..',
  '.kppllllppk.',
  '.kpllLLllpk.',
  'kpllLwwLllpk',
  'kplLwddwLlpk',
  'kplLwddwLlpk',
  'kpllLwwLllpk',
  '.kpllLLllpk.',
  '.kdpllllpdk.',
  '..kkddddkk..',
  '....kkkk....',
];

/** Side view of a disc in flight. */
export const flyingDisc: Sprite = [
  '...kppk..kppk...',
  '..kkwwwwwwwwkk..',
  '.kllllllllllllk.',
  'kppppppppppppppk',
  '.kkddddddddddkk.',
  '...kppk..kppk...',
];

export const basket: Sprite = [
  '...kppk..kppk...',
  '...kLLLLLLLLk...',
  '...kppk..kppk...',
  '...g.g.gg.g.g...',
  '...g.g.gg.g.g...',
  '....g.gggg.g....',
  '....g.gggg.g....',
  '.....gggggg.....',
  '...kppk..kppk...',
  '..kwwwwwwwwwwk..',
  '..kppppppppppk..',
  '...kplplplplk...',
  '....kppppppk....',
  '.......kk.......',
  '.......kk.......',
  '.......kk.......',
  '.......kk.......',
  '.......kk.......',
  '.......kk.......',
  '.....kkkkkk.....',
];

export const tree: Sprite = [
  '.....kk.....',
  '....kppk....',
  '...kpllpk...',
  '..kpllllpk..',
  '...kpllpk...',
  '..kpllllpk..',
  '.kpllllllpk.',
  '..kpllllpk..',
  '.kpllllllpk.',
  'kpllllllllpk',
  'kppppppppppk',
  '.kkkkkkkkkk.',
  '.....kk.....',
  '.....kk.....',
  '.....kk.....',
  '....kkkk....',
];

export const cloud: Sprite = [
  '.....kkkk.......',
  '...kkwwwwk.kk...',
  '..kwwwwwwwkwwk..',
  '.kwwwwwwwwwwwwk.',
  'kwwwwwwwwwwwwwwk',
  '...kppk..kppk...',
];

export const camera: Sprite = [
  '....kkkk......',
  '...kppppk.....',
  'kkkkkkkkkkkkkk',
  'kppppkkkkppppk',
  'kpppkwwllkpppk',
  'kppkwllllldkpk',
  'kppkllllddkppk',
  'kpppkllddkpppk',
  'kppppkkkkppppk',
  'kddddddddddddk',
  'kkkkkkkkkkkkkk',
];

export const star: Sprite = [
  '....k....',
  '...kyk...',
  '...kyk...',
  'kkkyyykkk',
  '.kyyyyyk.',
  '..kyyyk..',
  '.kyykyyk.',
  '.kyk.kyk.',
  '.kk...kk.',
];

export const crown: Sprite = [
  'k....kk....k',
  'kk..kyyk..kk',
  'kyk.kyyk.kyk',
  'kyykyyyykyyk',
  'kyyyyyyyyyyk',
  'kyywyyyywyyk',
  'kyyyyyyyyyyk',
  'kkkkkkkkkkkk',
];

export const flame: Sprite = [
  '....k.....',
  '...kpk....',
  '...kppk...',
  '..kpppk.k.',
  '..kppppkpk',
  '.kpplppppk',
  '.kplllpppk',
  'kpllwllppk',
  'kpllwwllpk',
  'kpllwwllpk',
  '.kpllllpk.',
  '..kkkkkk..',
];

export const lock: Sprite = [
  '..kkkkkk..',
  '.kwwwwwwk.',
  '.kwk..kwk.',
  '.kwk..kwk.',
  'kkkkkkkkkk',
  'kLLLLLLLLk',
  'kLLLkkLLLk',
  'kLLLkkLLLk',
  'kLLLkkLLLk',
  'kLLLLLLLLk',
  'kddddddddk',
  'kkkkkkkkkk',
];

export const check: Sprite = [
  '......kk',
  '.....kwk',
  'k...kwk.',
  'kk.kwk..',
  'kwkwk...',
  '.kwk....',
  '..k.....',
];

// Monochrome tab icons: 'w' is recolored with the `tint` prop.
export const iconHome: Sprite = [
  '..kkkkkkkk..',
  '..kwwwwwwk..',
  '..kkkkkkkk..',
  '...w.ww.w...',
  '...w.ww.w...',
  '....wwww....',
  '.kkkkkkkkkk.',
  '.kwwwwwwwwk.',
  '..kwwwwwwk..',
  '.....ww.....',
  '.....ww.....',
  '...wwwwww...',
];

export const iconRecord: Sprite = [
  '............',
  '...kkkk.....',
  'kkkwwwwkkkkk',
  'kwwwkkkkwwwk',
  'kwwk....kwwk',
  'kwwk....kwwk',
  'kwwk....kwwk',
  'kwwwkkkkwwwk',
  'kwwwwwwwwwwk',
  'kkkkkkkkkkkk',
  '............',
  '............',
];

export const iconChart: Sprite = [
  '........kkk.',
  '........kwk.',
  '....kkk.kwk.',
  '....kwk.kwk.',
  '....kwk.kwk.',
  'kkk.kwk.kwk.',
  'kwk.kwk.kwk.',
  'kwk.kwk.kwk.',
  'kwk.kwk.kwk.',
  'kwk.kwk.kwk.',
  'kkkkkkkkkkkk',
  '............',
];

export const iconGear: Sprite = [
  '.....kk.....',
  '..k.kwwk.k..',
  '.kwkwwwwkwk.',
  '..kwwkkwwk..',
  '.kwwk..kwwk.',
  'kwwk....kwwk',
  'kwwk....kwwk',
  '.kwwk..kwwk.',
  '..kwwkkwwk..',
  '.kwkwwwwkwk.',
  '..k.kwwk.k..',
  '.....kk.....',
];
