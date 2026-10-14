# ReqTune brand

> ReqTune is a precise, calm instrument for tuning the request headers your browser sends, one URL pattern at a time.

Personality: precise, calm, technical, friendly. A well-made instrument: one knob, one scale, nothing decorative. Dark mode is designed, not inverted: ink on paper in light, paper on ink in dark.

**Source of truth.** The tokens live in `src/ui/brand.ts` (`brandTheme` and `brandCssVariables`). This file documents them. Change both in the same commit, and use tokens in UI code (`color="tune"`, `c="dimmed"`, `var(--mantine-color-gray-0)`), never hex values.

## Logo

| File | Use |
|---|---|
| `public/brand/logo.svg` | Mark and wordmark on light backgrounds |
| `public/brand/logo-dark.svg` | Mark and wordmark on dark backgrounds |
| `public/icons/icon.svg` | The mark alone: in-app mark, avatars, anything square |

**Concept.** A request arrow threaded through an amber tuning knob: the knob is the tuning, the arrow is the request. A teal tile carries a white arrow, an amber knob and an ink pointer.

**Wordmark.** "ReqTune" in Manrope Bold, outlined to paths, so the SVGs have no font dependency. "Req" is ink (`dark.7` on light, `dark.0` on dark), "Tune" is teal (`tune.6` on light, `tune.4` on dark). Tracking +1%. The cap height is half the tile height.

**Clear space.** Keep free space equal to the knob's radius (a quarter of the tile height) on every side.

**Minimum size.** Lockup: 20px tall. Mark alone: 16px, using the 16px drawing (`icon-16.png`); below 24px prefer a PNG over the SVG.

**Don't**
- Recolor, outline, or add shadows, glows or extra gradients.
- Stretch, rotate, skew or crop the tile, or round it differently.
- Re-set the wordmark in another font, change the two-tone split, or add a tagline lockup.
- Use `logo.svg` on dark or `logo-dark.svg` on light.
- Place it on photos, patterns or busy fills.
- Redraw the arrow or knob, add a second knob, or use the amber anywhere else in the mark.
- Use the mark as a UI glyph or spinner.

**Mark construction** (128 grid, so the files can be rebuilt)

| Part | Spec |
|---|---|
| Tile | x 4, y 4, 120 x 120, radius 28; vertical gradient `tune.4` #1ab3b5 to `tune.7` #02696a; 2px inner highlight, white at 18% |
| Arrow | white, stroke 10, round caps and joins; shaft (17,64) to (109,64); head (88,43), (109,64), (88,85) |
| Knob | circle at (54,64), r 28, `amber.3` #ffa704; sheen overlay white 34% to 0% at 55% to black 10%; ring r 26.5, white 45%, stroke 2.5 |
| Pointer | capsule, stroke 8, `tune.9` #0a595a, from (54,54) to (54,43), rotated 38 degrees about the knob centre |
| Lockup | tile, 28 gap, wordmark with 60 cap height centred on the tile's mid-line |

## Icon files

All are transparent PNGs, referenced by `public/manifest.json`. The tile carries its own background, so the icon reads on light and dark toolbars.

| File | Size | Notes |
|---|---|---|
| `public/icons/icon-16.png` | 16 | Simplified drawing on a pixel-snapped 14px tile: no ring, no pointer (a dark dot reads as an eye at this size), bolder strokes, knob r 3.7 |
| `public/icons/icon-32.png` | 32 | The full mark. Chrome uses it for the toolbar on 2x displays |
| `public/icons/icon-48.png` | 48 | The full mark (extensions page) |
| `public/icons/icon-128.png` | 128 | The full mark with 16px transparent padding (96px artwork), per the Chrome Web Store guideline |
| `public/icons/icon.svg` | vector | The full mark with a 4px margin on a 128 grid |

## Color

Deep teal is the one brand color. Amber is the single warm accent. Neutrals are tinted with the ink hue (228 degrees), never pure gray. Scales are 10 shades, built on one luminance ladder so the same shade number does the same job in every scale.

| Scale | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
|---|---|---|---|---|---|---|---|---|---|---|
| tune | `#e8f7f7` | `#d0eded` | `#a7dddd` | `#68c9ca` | `#1ab3b5` | `#068081` | `#067576` | `#02696a` | `#056162` | `#0a595a` |
| amber | `#fff2e4` | `#fbe4c8` | `#fbcb8f` | `#ffa704` | `#de9200` | `#9f6703` | `#915e04` | `#835401` | `#794d00` | `#714700` |
| green | `#e9f8ec` | `#d2eed8` | `#abdfb8` | `#71cd8c` | `#38b868` | `#018442` | `#02793c` | `#036d36` | `#0a6432` | `#185c32` |
| red | `#fef1f0` | `#ffe0de` | `#fec5c0` | `#fea19b` | `#fe7974` | `#d4363c` | `#c23237` | `#ac3133` | `#9b3232` | `#8a3332` |
| gray | `#f4f7f9` | `#eef2f4` | `#e4e9eb` | `#d6dcdf` | `#c1cbcf` | `#68777f` | `#55666e` | `#40525a` | `#2a3b43` | `#14242b` |
| dark | `#e6eef2` | `#cad5da` | `#9eaeb5` | `#85959d` | `#2c3c43` | `#1f2c33` | `#162228` | `#0e191e` | `#081115` | `#040a0e` |

| Scale | Use |
|---|---|
| `tune` | **Primary** (`primaryColor`). Filled buttons, switches, checkboxes, links, the focus ring, selected states, info notices. Stock names `blue`, `indigo`, `teal`, `cyan` alias to it. |
| `amber` | **Accent and warning.** The mark's knob (`amber.3`), "modified" dots, warning notices. Sparingly: never errors, never a primary action, never a filled button. `yellow` and `orange` alias to it. |
| `green` | Success only: saved, active, applied. |
| `red` | Danger only: errors and destructive actions. |
| `gray` | Light-mode neutrals. |
| `dark` | Dark-mode surfaces and text. `dark.7` is the ink background (#0e191e); it is also the light-mode text color (`black`). |

**Shade roles** (Mantine applies `primaryShade` to every color, so each chromatic scale follows this)

| Shade | Role |
|---|---|
| 0, 1, 2 | Washes and tints: hover wash, light-variant fills (1), tint hover (2) |
| 3 | Brightest decorative tone (`amber.3` is the knob). Not for text |
| 4 | Text and links on dark surfaces (Mantine's `-text` in dark mode) |
| 5 | Filled in dark mode, with white text. Focus ring in dark mode |
| 6 | Filled in light mode, with white text. Text and links in light mode. Focus ring in light mode. Hover of the dark-mode fill |
| 7, 8 | Hover (7) and pressed fills in light mode |
| 9 | Text on 1-tints in light mode. Base of the dark-mode tint (darkened 50%) |

`gray` and `dark` follow Mantine's neutral roles instead: `gray.0` subtle fill, `gray.2` disabled fill and inner dividers, `gray.4` hairline border, `gray.5` placeholder, `gray.6` dimmed text, `gray.9` tooltip. `dark.0` text, `dark.1` secondary text, `dark.2` dimmed, `dark.3` placeholder, `dark.4` border, `dark.5` hover, `dark.6` surface, `dark.7` background, `dark.8` and `dark.9` sunken wells.

### Roles

| Role | Light | Dark |
|---|---|---|
| Background (page) | `white` #ffffff | `dark.7` #0e191e |
| Surface (cards, inputs, popovers) | `white` with a hairline | `dark.6` #162228 |
| Subtle fill (hover rows, code, grouped fields) | `gray.0` #f4f7f9 | `dark.5` #1f2c33 |
| Border (hairline) | `gray.4` #c1cbcf | `dark.4` #2c3c43 |
| Text | `black` #0e191e | `dark.0` #e6eef2 |
| Dimmed text (`c="dimmed"`) | `gray.6` #55666e | `dark.2` #9eaeb5 |
| Placeholder | `gray.5` #68777f | `dark.3` #85959d |
| Primary fill (white text) | `tune.6` #067576 | `tune.5` #068081 |
| Primary fill hover | `tune.7` #02696a | `tune.6` #067576 |
| Primary text and links | `tune.6` #067576 | `tune.4` #1ab3b5 |
| Focus ring (2px, 2px offset) | `tune.6` #067576 | `tune.5` #068081 |
| Tint (badges, notices) | `tune.1` bg, `tune.9` text | `tune.9` at 50% bg, `tune.0` text |
| Accent | `amber.3` #ffa704 | `amber.3` #ffa704 |

### Semantic colors

Always pair color with an icon or words; never color alone. Notices use the light variant: tint background, shade 9 text (shade 0 text on dark).

| Meaning | Scale | Light: fill, text | Dark: fill, text | Use |
|---|---|---|---|---|
| Success | `green` | `green.6` #02793c | `green.5` #018442, `green.4` #38b868 | Saved, active, applied |
| Warning | `amber` | `amber.6` #915e04 | `amber.5` #9f6703, `amber.4` #de9200 | Modified, conflicts, heads-up |
| Danger | `red` | `red.6` #c23237 | `red.5` #d4363c, `red.4` #fe7974 | Errors, destructive actions |
| Info | `tune` | `tune.6` #067576 | `tune.5` #068081, `tune.4` #1ab3b5 | Neutral notices |

### Contrast (WCAG 2.x, computed from the hexes above)

Targets: body text 7:1, dimmed text and other text 4.5:1, white on a fill 4.5:1, focus ring 3:1. Everything passes. In light mode the lowest text contrast is 4.63:1.

**Light**

| Pair | Ratio | Needs |
|---|---|---|
| Body text: `black (ink)` on `white` | 17.85:1 | 7:1 |
| Body text on subtle: `black (ink)` on `gray.0` | 16.59:1 | 7:1 |
| Dimmed text: `gray.6` on `white` | 5.98:1 | 4.5:1 |
| Dimmed text on subtle: `gray.6` on `gray.0` | 5.56:1 | 4.5:1 |
| Placeholder: `gray.5` on `white` | 4.63:1 | 4.5:1 |
| White on primary fill: `white` on `tune.6` | 5.51:1 | 4.5:1 |
| Primary as text/link: `tune.6` on `white` | 5.51:1 | 4.5:1 |
| Primary as text on subtle: `tune.6` on `gray.0` | 5.12:1 | 4.5:1 |
| Focus ring vs page: `tune.6` on `white` | 5.51:1 | 3:1 |
| Tint badge text: `tune.9` on `tune.1` | 6.57:1 | 4.5:1 |
| Error text: `red.6` on `white` | 5.52:1 | 4.5:1 |
| Success text: `green.6` on `white` | 5.52:1 | 4.5:1 |
| Warning text: `amber.6` on `white` | 5.52:1 | 4.5:1 |
| Hairline border vs page: `gray.4` on `white` | 1.65:1 | 1.5:1 |

**Dark**

| Pair | Ratio | Needs |
|---|---|---|
| Body text: `dark.0` on `dark.7` | 15.20:1 | 7:1 |
| Body text on surface: `dark.0` on `dark.6` | 13.82:1 | 7:1 |
| Dimmed text: `dark.2` on `dark.7` | 7.80:1 | 4.5:1 |
| Dimmed text on surface: `dark.2` on `dark.6` | 7.09:1 | 4.5:1 |
| Dimmed text on hover: `dark.2` on `dark.5` | 6.26:1 | 4.5:1 |
| Placeholder on input: `dark.3` on `dark.6` | 5.24:1 | 4.5:1 |
| White on primary fill: `white` on `tune.5` | 4.76:1 | 4.5:1 |
| Primary as text/link: `tune.4` on `dark.7` | 6.94:1 | 4.5:1 |
| Primary as text on surface: `tune.4` on `dark.6` | 6.31:1 | 4.5:1 |
| Primary as text on hover: `tune.4` on `dark.5` | 5.56:1 | 4.5:1 |
| Focus ring vs page: `tune.5` on `dark.7` | 3.75:1 | 3:1 |
| Tint badge text: `tune.0` on `tune.9 at 50%` | 13.44:1 | 4.5:1 |
| Error text: `red.4` on `dark.7` | 6.97:1 | 4.5:1 |
| Success text: `green.4` on `dark.7` | 6.99:1 | 4.5:1 |
| Warning text: `amber.4` on `dark.7` | 6.98:1 | 4.5:1 |
| Hairline border vs page: `dark.4` on `dark.7` | 1.56:1 | 1.4:1 |

**Known Mantine exceptions.** Mantine hard-codes `red.6` for `Menu.Item color="red"` in both schemes, which is 2.94:1 on `dark.6`. For destructive items use `c="var(--mantine-color-red-text)"` (`red.6` in light, `red.4` in dark). `variant="outline"` turns pale in dark mode. `brandCssVariables` fixes error and success text, which Mantine hard-codes to shades that are too dark on ink.

## Typography

| Stack | Value |
|---|---|
| Interface (`fontFamily`) | `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji"` |
| Technical (`fontFamilyMonospace`) | `ui-monospace, "SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "DejaVu Sans Mono", monospace` |

Use monospace (`ff="monospace"`) for URL patterns, header names and values, and status codes. Never for labels, buttons, headings or prose.

**Wordmark font.** Manrope Bold (700), SIL Open Font License 1.1, copyright 2019 The Manrope Project Authors (https://github.com/sharanda/manrope). It is used only to draw the logo; the glyphs are outlined, so no font file ships with the extension and nothing is loaded at runtime.

| Token | Size | Line height | Use |
|---|---|---|---|
| `xs` | 12px | 1.35 | Captions, helper text, dense mono values |
| `sm` | 13px | 1.4 | Controls (inputs, buttons), secondary text |
| `md` | 14px | 1.5 | Body text |
| `lg` | 16px | 1.55 | Subheads |
| `xl` | 18px | 1.6 | Panel titles |

Headings are semibold: h1 22px, h2 18px, h3 16px, h4 14px, h5 13px, h6 12px. Weights: 400 regular, 500 medium (labels), 600 bold (headings, buttons). Never heavier than 600 in the UI. Badge text is 11px, fixed by Mantine; keep badge labels to one or two words.

## Shape, spacing and elevation

| Radius | Value | Use |
|---|---|---|
| `xs` | 2px | Tiny marks, scrollbar thumbs |
| `sm` | 4px | Badges, chips, kbd |
| `md` (default) | 6px | Inputs, buttons, switches, tabs |
| `lg` | 8px | Cards, popovers, menus, modals |
| `xl` | 12px | Reserved for large panels |

- **Borders.** 1px hairlines in `default-border` (`gray.4` light, `dark.4` dark) on cards and inputs. Dividers inside grouped fields are quieter (`gray.2` light, `dark.7` dark). No border thicker than 1px except the focus ring.
- **Spacing** is a 4px grid: `xs` 4, `sm` 8, `md` 12, `lg` 16, `xl` 24. Panel gutter `md`; gap between controls `sm`; tight inline `xs`. Mantine parts that pad with `xs` and `sm` (menu items, table cells) come out tighter than stock, so give them explicit padding.
- **Control heights.** Button and input: 30px (`xs`, dense rows), 36px (`sm`, default), 42px (`md`). ActionIcon: 22, 28 (default), 34px. Minimum hit target 28px.
- **Elevation.** Level 0, the page: nothing. Level 1, cards and inputs: surface plus hairline, no shadow. Level 2, menus and popovers: hairline plus shadow `md`. Level 3, modals: shadow `lg` over an overlay. In dark mode the lighter surface and the hairline do the work; shadows are barely visible.

## Iconography

Tabler Icons (`@tabler/icons-react`), outline style only, `stroke={1.75}`. That ratio echoes the arrow in the mark. Sizes: 14 (inside small text), 16 (default, inline), 18 (ActionIcon), 20 (header). Icons inherit `currentColor`; use `c="dimmed"` for quiet ones. No filled icons, no emoji. Icon-only buttons need an `aria-label` and a tooltip.

## Motion

| Token | Duration | Use |
|---|---|---|
| fast | 120ms | Hover, press, color and opacity changes; exits |
| base | 180ms | Menus, popovers, rows appearing, collapse and expand |
| slow | 260ms | Layout shifts, the undo bar sliding in |

Easing is `cubic-bezier(0.2, 0, 0, 1)` (decelerate), as `--rt-ease`; durations are `--rt-duration-fast|base|slow` and `theme.other.motion`. Animate opacity, transform and color only. No bounce, overshoot or looping decoration; the only continuous motion is a loader. Reduced motion: `respectReducedMotion` is on in the theme, and any CSS animation must sit behind `@media (prefers-reduced-motion: no-preference)` or be disabled under `reduce`.

## Voice and copy

Calm and exact. Say what happened, then what to do next. One sentence where one will do.

- Sentence case everywhere: buttons, titles, badges, menu items. Product name: "ReqTune", never "Reqtune", "Req Tune" or "REQTUNE".
- Use the product's three nouns consistently: **group** (a named set with an on/off switch), **pattern** (a URL with `*` wildcards), **header** (a name and a value set on matching requests).
- Buttons are verb and object: "Add header", "Save", "Delete group". No exclamation marks, no emoji, no "Oops", no "Please".
- Errors name the problem and the fix, in the field it belongs to. Contractions are fine.
- Keep tuning wordplay out of functional UI; it belongs in the name and the mark.

| Place | Write | Not |
|---|---|---|
| Button | Add header | Create new header now! |
| Field error | Header names can't contain spaces. | Invalid input! |
| Empty state | No groups yet. Add a group to start setting headers. | Nothing to see here |
| Confirmation | Saved. | Success! Your changes have been saved! |
| Destructive | Delete "Staging API"? Its 3 headers and 2 patterns will be removed. | Are you sure? |
