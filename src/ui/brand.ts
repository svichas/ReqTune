import { createTheme, rem, type CSSVariablesResolver, type MantineColorsTuple } from '@mantine/core';

/**
 * ReqTune brand tokens. Code source of truth for the look; /brand.md documents it and must stay in sync.
 * Use tokens only (color="tune", c="dimmed", var(--mantine-color-...)), never hex values.
 *
 * Wiring (main.tsx): <MantineProvider theme={mergeThemeOverrides(brandTheme, ...)} cssVariablesResolver={brandCssVariables}>
 * The resolver is required for dark-mode error/success text contrast (Mantine hard-codes red.8 / teal.8 there).
 *
 * Quick reference
 *   primary    color="tune" (cobalt blue): fills, switches, links, focus ring. Fill = tune.6 (light) / tune.5 (dark), white text.
 *   accent     color="amber", sparingly (a "modified" dot). It is also the warning hue. Never for errors.
 *   semantic   red = danger and errors, green = success, amber (aliases yellow, orange) = warning,
 *              tune (aliases blue, indigo, teal, cyan) = info. Pair color with an icon or words, never color alone.
 *   neutrals   light: gray.0-9, text = black (ink), c="dimmed" = gray.6, placeholder = gray.5, hairline = gray.4.
 *              dark: dark.0-9, body = dark.7 (ink), surface = dark.6, hover = dark.5, hairline = dark.4, c="dimmed" = dark.2.
 *   type       fontFamily = system UI sans. ff="monospace" for URL patterns, header names and values. Body 14px, controls 13px.
 *   radius     controls and buttons: the default ("md", 6px). Cards, popovers, menus, modals: "lg" (8px). Chips: "sm" (4px).
 *   spacing    4px grid: xs 4, sm 8, md 12, lg 16, xl 24. Mantine parts that pad with xs/sm (Menu items, Table cells) come out
 *              tighter than stock, so give them explicit padding.
 *   elevation  hairline borders (var(--mantine-color-default-border)), no shadow on cards. Shadow only on floating layers (md, lg).
 *   motion     theme.other.motion: 120ms hover and press, 180ms enter and exit, 260ms layout; decelerating ease; reduced motion respected.
 *
 * Shade contract (Mantine applies primaryShade to every color, so every chromatic scale follows it):
 *   6 takes white text at >= 5.5:1 (light-mode fill, and the text/link color in light mode);
 *   5 takes white text at >= 4.5:1 (dark-mode fill);
 *   4 reads >= 5.5:1 on the dark surfaces (Mantine uses it for text and links on ink);
 *   9 is the text on 1-tints (light variant), and the base of the dark-mode tint;
 *   3 is a decorative tone, never a text color. The mark uses tune.6 and white only.
 *
 * Mantine caveats: Menu.Item color="red" hard-codes red.6 in both schemes (about 3:1 on dark surfaces), so use
 * c="var(--mantine-color-red-text)" (red.6 in light, red.4 in dark) for destructive items; variant="outline" turns pale in dark mode.
 */

const ink = '#121923';

const tune: MantineColorsTuple = [
  '#f1f5ff', // 0
  '#e2eaff', // 1
  '#c8d7ff', // 2
  '#a3bdff', // 3
  '#7da2ff', // 4
  '#416ce1', // 5
  '#3358c8', // 6
  '#2949ad', // 7
  '#233e91', // 8
  '#203574', // 9
];

const amber: MantineColorsTuple = [
  '#fff2e4', // 0
  '#fbe4c8', // 1
  '#fbcb8f', // 2
  '#ffa704', // 3
  '#de9200', // 4
  '#9f6703', // 5
  '#915e04', // 6
  '#835401', // 7
  '#794d00', // 8
  '#714700', // 9
];

const green: MantineColorsTuple = [
  '#e9f8ec', // 0
  '#d2eed8', // 1
  '#abdfb8', // 2
  '#71cd8c', // 3
  '#38b868', // 4
  '#018442', // 5
  '#02793c', // 6
  '#036d36', // 7
  '#0a6432', // 8
  '#185c32', // 9
];

const red: MantineColorsTuple = [
  '#fef1f0', // 0
  '#ffe0de', // 1
  '#fec5c0', // 2
  '#fea19b', // 3
  '#fe7974', // 4
  '#d4363c', // 5
  '#c23237', // 6
  '#ac3133', // 7
  '#9b3232', // 8
  '#8a3332', // 9
];

const gray: MantineColorsTuple = [
  '#f6f7f9', // 0
  '#eef0f3', // 1
  '#e4e7ec', // 2
  '#d5dae2', // 3
  '#bdc5d0', // 4
  '#697484', // 5
  '#536071', // 6
  '#3e4a5b', // 7
  '#2b3544', // 8
  '#1b2430', // 9
];

const dark: MantineColorsTuple = [
  '#edf0f5', // 0
  '#d1d7e0', // 1
  '#a8b2c1', // 2
  '#8d99ab', // 3
  '#353f50', // 4
  '#222b38', // 5
  '#1b2330', // 6
  '#121923', // 7
  '#0c121b', // 8
  '#080d14', // 9
];

const fontFamily =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji"';
const fontFamilyMonospace =
  'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "DejaVu Sans Mono", monospace';

const shadowInk = '18 25 35'; // = ink, as rgb()

export const brandTheme = createTheme({
  primaryColor: 'tune',
  primaryShade: { light: 6, dark: 5 },
  colors: {
    tune,
    amber,
    green,
    red,
    gray,
    dark,
    // Mantine's stock names re-pointed at brand scales so a stray color="blue" or "yellow" stays on brand.
    blue: tune,
    indigo: tune,
    teal: tune,
    cyan: tune,
    yellow: amber,
    orange: amber,
  },
  white: '#ffffff',
  black: ink,

  fontFamily,
  fontFamilyMonospace,
  headings: {
    fontFamily,
    fontWeight: '600',
    textWrap: 'balance',
    sizes: {
      h1: { fontSize: rem(22), lineHeight: '1.3' },
      h2: { fontSize: rem(18), lineHeight: '1.35' },
      h3: { fontSize: rem(16), lineHeight: '1.4' },
      h4: { fontSize: rem(14), lineHeight: '1.45' },
      h5: { fontSize: rem(13), lineHeight: '1.45' },
      h6: { fontSize: rem(12), lineHeight: '1.4' },
    },
  },
  fontSizes: { xs: rem(12), sm: rem(13), md: rem(14), lg: rem(16), xl: rem(18) },
  lineHeights: { xs: '1.35', sm: '1.4', md: '1.5', lg: '1.55', xl: '1.6' },
  fontWeights: { regular: '400', medium: '500', bold: '600' },

  radius: { xs: rem(2), sm: rem(4), md: rem(6), lg: rem(8), xl: rem(12) },
  defaultRadius: 'md',
  spacing: { xs: rem(4), sm: rem(8), md: rem(12), lg: rem(16), xl: rem(24) },
  shadows: {
    xs: `0 1px 0 rgb(${shadowInk} / 0.04)`,
    sm: `0 1px 2px rgb(${shadowInk} / 0.06)`,
    md: `0 4px 14px -4px rgb(${shadowInk} / 0.16), 0 1px 2px rgb(${shadowInk} / 0.06)`,
    lg: `0 12px 28px -8px rgb(${shadowInk} / 0.22), 0 1px 2px rgb(${shadowInk} / 0.06)`,
    xl: `0 20px 44px -12px rgb(${shadowInk} / 0.28)`,
  },

  cursorType: 'pointer',
  respectReducedMotion: true,
  focusRing: 'auto',

  // Surfaces get the 8px radius; controls keep the 6px default. The UI layer may override any of these.
  components: {
    Paper: { defaultProps: { radius: 'lg' } },
    Card: { defaultProps: { radius: 'lg' } },
    Popover: { defaultProps: { radius: 'lg', shadow: 'md' } },
    Menu: { defaultProps: { radius: 'lg', shadow: 'md' } },
    Modal: { defaultProps: { radius: 'lg', shadow: 'lg' } },
    Badge: { defaultProps: { tt: 'none' } }, // sentence case; Mantine uppercases badges by default
  },

  other: {
    motion: { fast: 120, base: 180, slow: 260, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  },
});

// Brand-only CSS variables, plus a fix for two colors Mantine hard-codes: error and success text use red.8 and teal.8 in dark mode, too dark on ink.
export const brandCssVariables: CSSVariablesResolver = () => ({
  variables: {
    '--rt-duration-fast': '120ms',
    '--rt-duration-base': '180ms',
    '--rt-duration-slow': '260ms',
    '--rt-ease': 'cubic-bezier(0.2, 0, 0, 1)',
  },
  light: {
    '--mantine-color-error': 'var(--mantine-color-red-6)',
    '--mantine-color-success': 'var(--mantine-color-green-6)',
  },
  dark: {
    '--mantine-color-error': 'var(--mantine-color-red-4)',
    '--mantine-color-success': 'var(--mantine-color-green-4)',
  },
});
