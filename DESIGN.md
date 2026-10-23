---
name: Algorithm playground
description: A gallery of visible mechanisms with three working browser experiments.
colors:
  paper: "#fff"
  surface: "#f5f5f7"
  ink: "#1d1d1f"
  muted: "#626674"
  blue: "#0066cc"
  blue-hover: "#005bb7"
  secondary-hover: "#f1f7ff"
  divider: "#e7e8eb"
  field-border: "#cbd0d5"
  field-ink: "#1e252c"
  label-ink: "#444b54"
  tab-ink: "#16191d"
  tab-muted: "#6a6f77"
  tab-line: "#d9dce0"
  canvas: "#121820"
  maze-canvas: "#14171d"
  game-canvas: "#151d27"
  explored: "#3d9cda"
  route: "#efc879"
  human: "#7ac6f1"
  ai: "#fba472"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "59px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-.04em"
  playground-display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(3.4rem, 7vw, 6rem)"
    fontWeight: 600
    lineHeight: 1.03
    letterSpacing: "-.04em"
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(32px, 3vw, 44px)"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-.04em"
  title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1.12
    letterSpacing: "-.035em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
    lineHeight: 1.55
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: ".82rem"
    fontWeight: 600
  annotation:
    fontFamily: "Manrope, sans-serif"
    fontSize: "12px"
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "15px"
    lineHeight: 1.9
rounded:
  field: "7px"
  notice: "8px"
  project: "10px"
  canvas: "12px"
  stage: "14px"
  button: "24px"
spacing:
  compact: "8px"
  control: "12px"
  row: "18px"
  gallery: "20px"
  section: "24px"
  group: "32px"
  intro: "36px"
components:
  button-primary:
    backgroundColor: "{colors.blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.button}"
    padding: "11px 20px"
  button-primary-hover:
    backgroundColor: "{colors.blue-hover}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.blue}"
    rounded: "{rounded.button}"
    padding: "11px 20px"
  button-secondary-hover:
    backgroundColor: "{colors.secondary-hover}"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.field-ink}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
  project:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.project}"
  filter-selected:
    textColor: "{colors.blue}"
  experiment-tab-selected:
    textColor: "{colors.tab-ink}"
---

# Design System: Algorithm playground

## Overview

**Creative North Star: "A gallery of visible mechanisms"**

The approved Apple-inspired world uses white and cool light-gray fields, precise grotesk typography, measured whitespace and blue actions. Subject color belongs to the algorithms and their imagery. The build translates the approved modern collection into substantial, unequal exhibits with quiet captions, followed by working experiments, engineering notes, measured research and a source-linked collection.

The gallery makes the work visible immediately. The playground keeps the same neutral chrome while dark canvas fields give simulations and game state their own space. The fluid cover is credited illustration; algorithm drawings use project state and research figures retain their measured provenance. No borrowed Apple identity, products, affiliation or marketing claims belong to this system.

**Key Characteristics:**
- Substantial project imagery with restrained navigation and captions.
- White page fields, cool secondary surfaces and clear blue actions.
- Working mechanisms and readable controls carry the visual interest.

## Colors

The frontmatter records reused colors from `styles.css` and `playground/playground.css`; these are the normative primitives.

### Primary
- **Action Blue**: links, primary buttons, selected gallery filters and visible keyboard focus. Hover uses the source's deeper blue.

### Secondary
- **Mechanism Colors**: explored blue and route gold distinguish maze results; pale blue and orange identify the two players. They carry subject meaning rather than global decoration.

### Neutral
- **White Paper**, **Cool Surface**, **Near-black Ink** and **Muted Gray** define the gallery.
- Fine dividers, pale field borders and separate label ink organize controls.
- Dark canvas fields belong to the experiments and previews; they do not replace the white page ground.

**The Subject Color Rule.** Keep interface chrome neutral with blue actions; let algorithm state and source-grounded imagery provide subject color.

## Typography

Manrope variable is self-hosted from `assets/fonts/Manrope.ttf`, with weights 200–800 and `font-display: swap`. Its bundled SIL Open Font License stays beside it. The primary family is Manrope with a sans-serif fallback; the synthetic log example uses the source monospace stack.

- **Display**: compact gallery introduction. The 1280–1599px fidelity range scales it to 3.84114583vw; at 1100px it uses a clamp, and at 700px it becomes `clamp(32px, 6.5vw, 46px)`.
- **Playground display**: the larger experiment-page heading with tighter leading and medium-heavy weight.
- **Headline**: section introductions; experiment titles use `clamp(1.7rem, 3vw, 2.5rem)`, weight 600 and line-height 1.2.
- **Title**: project captions; responsive values reduce to 19px and 18px at the corresponding gallery breakpoints.
- **Body**: a 16px base with larger introductory copy; collection descriptions use 14px. Keep new body prose at 14px or above.
- **Label / Annotation**: compact controls, values and provenance are subordinate to content. The final explicit 12px overrides govern art credits, benchmark caption, flock caption and boids Order/time. Do not copy their earlier smaller overrides.
- **Numbers**: experiment outputs, search readings and receipt amounts use tabular numerals.

## Layout

The shared shell is centered, capped at 1440px and normally uses `calc(100% - 96px)`. It changes to 64px total gutter at 1100px, 40px at 700px and 32px at 380px. Between 1280px and 1599px, the shell uses 93.75% width and the first gallery's sizes scale with the viewport to preserve the approved composition.

Desktop gallery topology starts with a broad fluid exhibit beside a narrow Fourier exhibit (1.892:1 column ratio), followed by equal paired exhibits. The gallery gap is 20px with 18px inner row gaps. At 700px the rows become one column, retaining the same subject order. The filter strip scrolls independently; the document does not acquire horizontal scrolling.

Supporting sections use generous vertical space and paired copy/visual columns. Notes are full-width divided rows. Benchmark content uses a cool rounded field. The project collection moves from three columns to two at 1000px and one at 700px.

The playground has its own spacious introduction, followed by tabs, experiment explanation, controls and canvas/results. Desktop maze comparison has three equal columns; at 760px each becomes a canvas with a compact side caption. Boids/game pair a large visual with settings; at 760px they stack, with two-column settings where useful. At 420px game settings become one column. Controls remain visible and touchable rather than being hidden behind a mobile settings drawer.

## Elevation & Depth

Depth is restrained. Gallery cards use `0 1px 3px #0000000c, 0 0 0 1px #e9eaed80`; most other sections rely on white space, fine dividers and tonal contrast. Dark simulation fields contain the subject rather than casting decorative shadows.

Motion belongs to the mechanisms. Image hover uses a small 1.025 scale over 0.65 seconds with `cubic-bezier(.16,1,.3,1)`. Interactive column choices transition background and color over 0.15 seconds. Fourier construction responds to hover/focus, flocking has a visible pause control, hidden-page/tab behavior pauses running experiments, and reduced-motion preferences disable CSS transitions and start relevant animation paused.

**The Mechanism Motion Rule.** Preserve purposeful animation and explicit playback controls; respect reduced motion instead of adding ambient page motion.

## Shapes

Gallery cards have soft 10px corners with clipped media. Canvas and demonstration fields use the existing 12px or 14px corner treatments. Standard fields and game column controls use 7px corners. Primary and secondary action buttons are pills with 24px radii. Divided note and collection rows stay flat. Avoid applying the pill shape to entire content regions.

## Components

### Buttons
Primary actions are filled blue with white text; secondary actions use a white field, pale border and blue text. Both use the frontmatter's pill form and padding, 15px type and 44px minimum height. Hover darkens the primary and lightly tints the secondary. Disabled controls fade. Keyboard focus is a blue 3px outline with a 5px offset.

### Inputs / Fields
Playground labels sit above persistent controls. Text fields and selects have white fill, a fine border, 7px corners and 44px minimum height. Range fields align their value with the label, followed by the slider and explanatory annotation. Native range accents are dark, keeping blue available for actions.

### Navigation
The wordmark uses the supplied GitHub handle. Navigation is compact and quiet; current/hover links darken. Notes navigation drops at 700px; the header GitHub link drops at 380px and remains available in the footer. Experiment tabs use a dark active underline and hover treatment. Gallery category filters use a blue selected underline and pressed state. Filters are controls, not decorative chips.

### Cards / Containers
Project media and caption form one clipped, subtly lifted card. Captions keep a visible title and direct project action. The benchmark field uses cool tone and modest rounding. Notes and full collection entries use dividers instead of a grid of elevated cards.

### Experiment surfaces
Maze comparison keeps the canvas, method name and explored/route results together. Boids inset Order/time readings within the dark stage without blocking interaction. Connect Four pairs seven visible column controls with a board, labeled player legend, current status and restart. Preserve keyboard, pointer and touch routes to play.

### Evidence and sample material
Retain the distinction between the illustrated fluid cover, numerical project output, live algorithm state and measured benchmark figure. The log output is synthetic and the receipt is fictional; their visible labels are part of a truthful presentation. The isolated receipt application's detailed visual system remains in its own DESIGN.md.

## Do's and Don'ts

### Do:
- **Do** show substantial project previews immediately after the compact introduction and filters.
- **Do** preserve real algorithm state, measured-result provenance and visible synthetic-sample labels.
- **Do** retain readable mobile controls, keyboard focus, status feedback and playback controls.
- **Do** use the current final annotation overrides and keep new body prose at 14px or above.

### Don't:
- **Don't** replace source-grounded algorithm state with invented benchmark or performance claims.
- **Don't** turn dark simulation fields into a dark page theme.
- **Don't** add decorative eyebrows or heavy shadows to the restrained gallery.
- **Don't** reproduce Apple logos, products, affiliation claims or marketing copy.
