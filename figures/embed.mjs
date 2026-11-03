#!/usr/bin/env node
/**
 * Makes the deck's copy of a built Hairline page: `node embed.mjs <name> [...]`
 * reads hairline-<name>.html (built by the skill's build.mjs / look.mjs, never
 * edited) and writes ../app/public/figures/<name>.html with one extra <style>
 * before </head>. CSS only: the kernel, the bench script and the figure are
 * byte-for-byte what the validator passed.
 *
 * The style: transparent page, light palette forced (the deck is a light
 * keynote), plates filled with the deck's paper #F4F1EA and warm strokes, the
 * plate border, name tag, slider/theme/play row, the means line and the rules
 * line hidden; the stage fills the iframe (5:4, fitted to its height); the
 * read-out stays, top right, muted.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "app", "public", "figures");

const STYLE = `<style id="deck-embed">
  :root, :root[data-theme], :root:not([data-theme="light"]) {
    color-scheme: light !important; --ground: transparent !important; --ink: #141414 !important;
    --muted: #8C8A84 !important; --line: transparent !important;
  }
  html, body { background: transparent !important; }
  body { padding: 0 !important; min-height: 100vh; overflow: hidden; }
  main { max-width: none !important; width: min(100vw, calc(100vh * 1.25)); }
  .plate { border: 0 !important; border-radius: 0 !important; overflow: visible !important; }
  #name, .controls, #means, #rules { display: none !important; }
  #read {
    top: 16px !important; right: 20px !important; color: #5B5B57 !important;
    font: 500 20px/1 "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace !important; letter-spacing: 0 !important;
  }
  [data-hairline] {
    color-scheme: light;
    --hairline-plate: #F4F1EA; --hairline-hi: #141414; --hairline-edge: #8F8A80;
    --hairline-mid: #B9B3A7; --hairline-lo: #D6CFC1; --hairline-stroke: 1.2;
  }
</style>
`;

const names = process.argv.slice(2);
if (!names.length) { console.error("usage: node embed.mjs <name> [...]"); process.exit(2); }
for (const name of names) {
  const html = readFileSync(join(here, `hairline-${name}.html`), "utf8");
  if (!html.includes("</head>")) throw new Error(`${name}: no </head>`);
  const file = join(out, `${name}.html`);
  writeFileSync(file, html.replace("</head>", () => STYLE + "</head>"));
  console.log(file);
}
