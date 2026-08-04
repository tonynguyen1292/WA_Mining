# Verifying a WebGL build in the browser

Unity renders into a single `<canvas>`. There is no DOM to read, no
accessibility tree, no element handles — the only way to confirm the app
works is to drive real mouse coordinates and look at pixels. That makes
verification slower than for the React app, and it is why bugs like the
orbit camera spinning under every UI click survived until the WebGL pass.

## Serve the build

Either point at the live URL after deploying, or serve the local output so
you can verify *before* shipping (preferred — it keeps a broken build off
the public link):

```bash
cd "<project>/Builds/WebGL" && python -m http.server 8778
```

Run it in the background and stop it when finished.

## The two-stage coordinate rule

**Never compute click coordinates from the Unity design resolution.** The
canvas letterboxes: a 1280x800 design surface renders into roughly a
960x600 region at about (160, 79) at 0.75 scale, so a button the layout
places at y=615 lands near y=513 on screen. Deriving coordinates from the
design numbers produced clicks that hit empty canvas and looked like dead
buttons.

Instead:

1. **Observe.** Load the page, wait for Unity to finish loading (about 14
   seconds — the loader bar finishing is not the same as the first frame),
   then screenshot and read the button positions off the image.
2. **Script.** Write the click sequence using those observed pixels, then
   re-screenshot after each step to confirm the state actually advanced.

When a click seems ignored, re-screenshot and re-measure before assuming a
logic bug. Every "broken button" in this project so far has been a
coordinate that missed by 30-40 pixels.

## Driving it

Playwright from the scratchpad directory:

```javascript
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto("http://localhost:8778/", { waitUntil: "load" });
  await page.waitForTimeout(14000);          // Unity load, not page load
  await page.screenshot({ path: "step0.png" });
  await page.mouse.click(640, 428);          // observed pixels only
  await page.waitForTimeout(600);
  await page.screenshot({ path: "step1.png" });
  await browser.close();
})();
```

Give each state its own screenshot file and actually read them. The font
in use (`LegacyRuntime.ttf`) has no glyph for em-dash, ellipsis, or
single guillemets — those render as blank gaps, which a pass/fail check
would not catch but a human reading the screenshot will. Keep all runtime
UI strings ASCII for this reason.

## What a full loop verification covers

For the inspection round, a complete pass exercises every state the
scenario machine can reach: briefing, a flagged decision including the
two-step reason row, several plain decisions, the end-of-shift summary,
and the restart returning to briefing. Confirm the summary's verdict line
matches the decisions made — a run where the troubled `Care And Maintenance`
site was waved through must produce the "waved through" verdict, not the
congratulatory one. That check is what proves the pure-C# core is actually
wired to the view, rather than the view showing plausible placeholder text.

Also read the browser console for runtime exceptions; Unity logs them
there, and a NullReferenceException in a listener will otherwise present
as a button that simply does nothing.
