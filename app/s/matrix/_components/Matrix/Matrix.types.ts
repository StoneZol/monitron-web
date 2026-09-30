export type HslColor = {
  h: number;
  s: number;
  l: number;
};

export type MatrixControls = {
  twinkle: boolean;
  color: string;
  fallSpeed: number;
  colorSpeed: number;
  /** Multiplies low-slice punches + global fall on reactive */
  drive: number;
  reactive: boolean;
};

export type MatrixProps = Record<string, never>;
