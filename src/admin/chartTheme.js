/**
 * Chart colours for recharts (SVG attributes, so plain hex rather than CSS vars).
 *
 * Categorical order validated with the dataviz palette checker (light surface):
 * adjacent CVD ΔE 9.1, normal-vision ΔE 22.9 - all hard gates pass. Slots 3 and 4
 * (aqua, yellow) sit below 3:1 against white, so every chart that uses them
 * also shows the values as text (legend rows with numbers).
 * Slot order is fixed: colour follows the series, never its rank.
 */
export const SERIES = ['#5a4de6', '#eb6834', '#1baf7a', '#eda100'];

export const CHART = {
  primary: SERIES[0],
  secondary: SERIES[1],
  grid: '#ebe9f5',
  axis: '#6b6888',
  cursor: '#d9d6ea',
  surface: '#ffffff',
};

/** Status colours for CV status split - reserved, and always shown with a label. */
export const CV_STATUS_COLOR = {
  READY: '#1f9d5c',
  DRAFT: '#d98a0b',
};

export const AXIS_TICK = { fill: CHART.axis, fontSize: 12 };
