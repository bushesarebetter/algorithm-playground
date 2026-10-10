# Algorithm playground

A project collection with three experiments you can use in the browser: compare maze searches, steer a flock and play Connect Four against two AI algorithms. Static HTML, CSS and JavaScript modules; no application server or runtime dependencies.

[Project collection](https://bushesarebetter.github.io/algorithm-playground/) · [Open the playground](https://bushesarebetter.github.io/algorithm-playground/playground/) · [Run locally](#run-locally) · [Tests](#tests) · [Build and deployment](#build-and-deployment)

## Experiments

| Experiment | Controls and behavior | Original implementation |
|---|---|---|
| Maze | Seeded DFS/Kruskal generation, optional extra passages, BFS/Dijkstra/A* comparison and explored-cell playback | [maze-solver](https://github.com/bushesarebetter/maze-solver) |
| Boids | Separation/alignment/cohesion sliders, seeded resets, predator pursuit, pause and single step | [boids](https://github.com/bushesarebetter/boids) |
| Connect Four | Alpha-beta or MCTS, difficulty and first-player controls, keyboard/touch moves and restart | [connect-four-ai](https://github.com/bushesarebetter/connect-four-ai) |

The JavaScript engines are ports of these Python projects. Seeded browser runs are repeatable within the browser implementation; the RNG differs from Python's, so matching seed labels do not imply matching trajectories or mazes across languages.

Maze animation replays actual explored-cell order. Every passage costs one step; playback speed is not an algorithm runtime measurement. Boids advance in fixed 0.04-second steps, with an O(n²) pairwise calculation capped at 300 boids. Switching tabs or hiding the page pauses animations. Reduced motion starts paused.

Connect Four uses BigInt for its 49-bit sentinel-row board. Alpha-beta uses iterative deepening and a transposition table; MCTS uses seeded rollouts. AI search runs in a background Worker with bounded effort. Restarting or leaving the game cancels its outstanding worker, and request IDs keep stale replies from changing the board. These AIs are heuristic opponents, not a claim of perfect play.

## Run locally

Use Node.js 22+ for tests/build and Python 3.12+ for the preview server and its checks. There are no packages to install and no lockfile is needed.

```bash
npm run serve
```

Open [the local site](http://127.0.0.1:8000/) or [the local playground](http://127.0.0.1:8000/playground/). To choose a different port:

```bash
npm run serve -- --port 8080
```

The preview binds to this computer at `127.0.0.1` and serves only this site's runtime paths. It sets `.mjs` to `text/javascript`, including on Windows. Opening HTML directly through `file://` will not reliably support module workers or fetched data.

## Tests

```bash
npm test
```

The built-in Node test runner checks deterministic generation, maze connectivity and shortest paths, flock invariants and numerical edge cases, BigInt win detection, legal AI choices, search time limits and worker message transport. Supporting tests check build exclusions, incomplete-source behavior and local-server MIME/access rules. No testing library is installed.

Engine checks do not replace browser checks for rendering, keyboard access, mobile layout, reduced motion and restarting during an AI search.

## Build and deployment

```bash
npm run build
npm run serve -- --dist
```

The build packages an explicit allowlist into `dist/`: root runtime HTML/CSS/modules, the playground modules and runtime images/fonts/data. It preserves the bundled font license. Git metadata, sibling projects, test scripts, mockups, private/report folders and image-generation records are excluded. Missing required runtime files fail the build before an existing `dist/` is replaced; symlinked sources are rejected.

The [site workflow](.github/workflows/site.yml) runs tests and builds for pushes to `main`, pull requests and manual runs. A separate, permission-scoped job deploys the built artifact from `main` to GitHub Pages. Repository Pages settings must select GitHub Actions as the deployment source.

Actions are pinned to verified release commits: [checkout v4.2.2](https://github.com/actions/checkout/releases/tag/v4.2.2), [setup-node v4.4.0](https://github.com/actions/setup-node/releases/tag/v4.4.0), [upload-pages-artifact v3.0.1](https://github.com/actions/upload-pages-artifact/releases/tag/v3.0.1) and [deploy-pages v4.0.5](https://github.com/actions/deploy-pages/releases/tag/v4.0.5).

## Gallery images and credits

The large fluid cover in `assets/plates/fluid-preview.png` is an AI-generated illustration made with OpenAI's image-generation tool from the approved gallery reference. It is presentation artwork, not output from the numerical solver. Its generation record is retained with the source assets and excluded from the deployed runtime.

The Fourier drawing uses actual coefficients supplied in `assets/fourier.json`, computed by the handwritten DFT in [fourier-epicycles](https://github.com/bushesarebetter/fourier-epicycles). Maze and board graphics use their real algorithm state. The lower ray-tracing and fluid figures are outputs from the original numerical projects, rather than benchmark or accuracy evidence. Asset sources and preparation details are recorded in [assets/provenance.json](assets/provenance.json).

Typography uses [Manrope](https://github.com/google/fonts/tree/main/ofl/manrope), distributed under the bundled [SIL Open Font License](assets/fonts/OFL.txt).
