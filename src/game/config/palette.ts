/**
 * MOONBOUND — shared pixel-art palette.
 * Every texture in the game draws from these values only.
 */
export const PALETTE = {
  spaceDeep: '#12172F',
  spaceMid: '#1B2145',
  star: '#D6D1E6',
  starDim: '#7F7BA6',

  terrain: '#9995B2',
  terrainLight: '#D6D1E6',
  terrainMid: '#A8A4C0',
  terrainDark: '#8B87A5',
  shadow: '#6E6A8C',
  shadowDeep: '#5A5678',

  outline: '#292740',
  outlineSoft: '#3A3757',

  cyan: '#4EDCE5',
  cyanDim: '#2A9AA6',
  cyanGlow: '#9BF2F7',

  purple: '#8067DA',
  purpleDim: '#5B47A8',
  purpleGlow: '#B9A7F5',

  yellow: '#FFD75E',
  yellowDim: '#C9A233',

  orange: '#FFAD62',
  orangeDim: '#C97C3A',

  coral: '#FF6B81',
  coralDim: '#C24A5C',

  green: '#80E5A0',
  greenDim: '#4FA86C',
  greenDark: '#2E6B45',

  suitWhite: '#E8E4F5',
  suitShadow: '#B9B2D6',
  visor: '#4EDCE5',
  visorDark: '#1E6E7A',
  metal: '#6E6A88',
  metalDark: '#4A4763',
} as const;
