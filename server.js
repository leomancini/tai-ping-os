import "dotenv/config";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";
import { APP_ICON_RADIUS } from "./src/screenMetrics.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3137;

app.use(express.json({ limit: "1mb" }));

// Access control. keys.json (git-ignored) maps each user label to an access key
// (the TAI_PING_OS_API_KEY passed as ?key=) and that user's private secrets
// (their own ANTHROPIC_API_KEY, FULL_NAME, ...). See keys.example.json.
function loadKeys() {
  try {
    const cfg = JSON.parse(readFileSync(join(__dirname, "keys.json"), "utf8"));
    const byKey = new Map();
    for (const [label, entry] of Object.entries(cfg)) {
      if (label.startsWith("_") || !entry || !entry.key) continue;
      byKey.set(entry.key, { label, secrets: entry.secrets || {} });
    }
    return byKey;
  } catch (e) {
    console.warn("Could not load keys.json:", e.message);
    return new Map();
  }
}
const KEYS = loadKeys();

// Special public key: authenticates but disables anything needing secrets.
const DEMO_KEY = "DEMO";

// Resolve the user from the access key (header, query, or body). Null if unknown.
function authUser(req) {
  const key =
    req.get("x-taiping-key") ||
    (req.query && req.query.key) ||
    (req.body && req.body.key);
  if (!key) return null;
  if (key === DEMO_KEY) return { label: "DEMO", demo: true, secrets: {} };
  return KEYS.get(key) || null;
}

// Validate a key and return its public-facing identity.
app.post("/api/validate-key", (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ valid: false });
  res.json({
    valid: true,
    label: user.label,
    fullName: user.demo ? null : user.secrets.FULL_NAME || user.label,
    demo: !!user.demo,
  });
});

// Serve the built frontend.
app.use(express.static(join(__dirname, "dist")));

// Curated Font Awesome (free, solid) icon keywords the model may choose from.
// Keep in sync with ICONS in src/CreatorApp.jsx.
const ICON_KEYWORDS = [
  "calculator",
  "clock",
  "note",
  "list",
  "dice",
  "timer",
  "chart",
  "money",
  "calendar",
  "music",
  "camera",
  "heart",
  "star",
  "bolt",
  "gamepad",
  "palette",
  "globe",
  "book",
  "flask",
  "compass",
];

const SYSTEM_PROMPT = `You generate small, self-contained apps for a phone-like OS. Each app is a single React component rendered full-screen inside a 360x720-ish (logical) area.

Return ONLY the structured fields. The "code" field is JavaScript (JSX allowed) that MUST follow these rules exactly:

- Define exactly one component: \`function App() { ... }\`. Do NOT use \`import\`, \`export\`, \`require\`, or \`module\`.
- Structure rules (important):
  - At the TOP LEVEL (outside function App) put ONLY styled components and plain constants/helper functions. NEVER call a React hook at the top level.
  - ALL React hooks — \`React.useState\`, \`React.useEffect\`, \`React.useRef\`, \`React.useMemo\`, etc. — and all app state/logic go INSIDE function App. Calling a hook outside App breaks the app.
- These globals are already in scope — use them, never import them:
  - \`React\` — use hooks as \`React.useState\`, \`React.useEffect\`, \`React.useRef\`, etc.
  - \`styled\` — styled-components. **Define every styled component at the TOP LEVEL, outside \`function App\` — NEVER inside the component body.** Defining styled components inside App recreates them on every render, which remounts inputs and breaks typing (typed text can even appear reversed). Define hooks/state inside App; define styled components above it.
  - \`storage\` — persist any user data so it survives reloads:
      \`storage.get(key)\` returns the stored value (or undefined),
      \`storage.set(key, value)\` stores JSON-serializable values,
      \`storage.remove(key)\`, \`storage.keys()\`.
    ALWAYS load initial state from storage and save on change. Do NOT use localStorage directly.
    \`storage\` values must be SMALL JSON (settings, lists, text). NEVER store
    images or other large data as base64 strings in \`storage.set\`.
  - \`storage\` also has an async blob store (IndexedDB-backed) for photos,
    audio, and other binary data:
      \`await storage.putBlob(key, blob)\`, \`await storage.getBlob(key)\` (Blob or
      undefined), \`await storage.removeBlob(key)\`, \`await storage.blobKeys()\`.
    Display a stored Blob with \`URL.createObjectURL(blob)\` and revoke object
    URLs when they're no longer needed.
  - \`net\` — server-proxied network access for LIVE data:
      \`await net.fetch(url)\` returns \`{ ok, status, contentType, text, json }\`
      (\`json\` is the parsed body, or null if the response isn't JSON).
    It proxies through the OS server, so CORS never blocks it. Use it ONLY for
    public, keyless HTTP(S) APIs (no auth headers, no API keys). Always handle
    loading and error states, and cache results in \`storage\` when it makes the
    app feel faster or work offline.
- The root element must fill its container: width: 100%; height: 100%; box-sizing: border-box.
- Design for a dark phone screen by default unless the app implies otherwise. Make it look nice and be genuinely functional.
- Visual design — follow these for a clean, native-feeling look:
  - Lay things out on a consistent spacing grid: use one base unit (e.g. 8px) and make all padding, gaps, and margins multiples of it. Keep equal gutters between repeated items, and equal outer padding on all sides of the screen.
  - Prefer grid/flex layouts with evenly spaced, equally sized tiles or rows (like a home screen of app icons) over ad-hoc positioning.
  - Use rounded corners consistently. Default to a ${APP_ICON_RADIUS}px corner radius — matching the OS app icons — for buttons, cards, inputs, tiles, and other elements UNLESS the app's style clearly dictates otherwise (e.g. fully round pills, or sharp corners for a deliberately blocky look). Make nested corners CONCENTRIC: an inner element's corner radius should equal its parent's radius minus the padding between them (innerRadius = outerRadius − padding). This keeps the rounded edges parallel, like a rounded button centered inside a rounded card. Don't mix many different radii.
  - Center content within its container; align related elements to shared edges/baselines. Aim for balanced, symmetric padding so elements look concentric and intentional.
  - Typography: you may use ANY Google Font to fit the app's character — a clean sans (e.g. Inter, Manrope) for utilities, an elegant serif (e.g. Playfair Display, Fraunces) for editorial/journaling, a monospace (e.g. Space Mono, JetBrains Mono) for numbers/code. List every Google Font family you use, by its exact name, in the "fonts" field; they are loaded automatically. Reference them in CSS with a fallback, e.g. font-family: 'Playfair Display', serif. Use at most 1-2 fonts. Leave "fonts" empty to use the default system font.
- Network: NEVER use fetch, XMLHttpRequest, WebSocket, or external URLs/scripts directly — the ONLY allowed network access is the \`net.fetch\` helper described above.
- Camera IS available when the app calls for it (photo booth, mirror, scanner, timelapse...):
  - Open it with \`navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false })\` — \`facingMode: "user"\` is the front camera, \`"environment"\` the back. Offer a flip button when both make sense.
  - Render the stream into a \`<video autoPlay playsInline muted>\` element via \`videoRef.current.srcObject = stream\`. Mirror the front camera preview with \`transform: scaleX(-1)\`.
  - ALWAYS stop the stream on unmount and before switching cameras: \`stream.getTracks().forEach(t => t.stop())\`.
  - Handle the no-camera/permission-denied case with a friendly message.
  - To take a photo: draw the video onto a \`<canvas>\` (\`ctx.drawImage(video, ...)\`), then \`canvas.toBlob(...)\` and save it with \`storage.putBlob\`. Un-mirror front-camera captures (flip the canvas) so saved photos read correctly.
- Plain JavaScript only (no TypeScript types). Keep it self-contained.
- If you use emoji or special characters, write the actual character directly. NEVER use unicode escape sequences like \\u{1F4D6} or \\uXXXX (they are invalid in JSX text).

Worked example of a valid "code" value (a counter that persists) — note the
styled components are declared at the top level, OUTSIDE function App:

const Wrap = styled.div\`
  width: 100%; height: 100%; box-sizing: border-box;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 24px; background: #000; color: #fff; font-family: -apple-system, sans-serif;
\`;
const Num = styled.div\` font-size: 96px; font-weight: 200; \`;
const Btn = styled.button\`
  border: none; border-radius: ${APP_ICON_RADIUS}px; padding: 14px 28px; font-size: 20px;
  background: #0a84ff; color: #fff; cursor: pointer;
\`;

function App() {
  const [count, setCount] = React.useState(() => storage.get("count") || 0);
  React.useEffect(() => { storage.set("count", count); }, [count]);
  return (
    <Wrap>
      <Num>{count}</Num>
      <Btn onClick={() => setCount(count + 1)}>Increment</Btn>
    </Wrap>
  );
}

(You may use JSX instead of React.createElement — it is transpiled before running.)

Live data from the web — you have a web_search tool. Decide on your own to use
it whenever real data would make the app meaningfully better; the user should
NOT have to ask for it. Choose the right strategy per app:
- Mostly-static data (trivia questions, country facts, workout lists, recipes,
  historical events): search the web, then bake the real data into the app as
  plain constants. No runtime fetching needed.
- Data that must be CURRENT (weather, prices, scores, news, transit): search
  the web to find a public, keyless JSON API (and to verify its response
  shape), then build the app to call it at runtime with \`net.fetch\`, with
  loading/error states and sensible caching in \`storage\`.
- Apps with no real-data angle (calculators, timers, games): don't search.

Also choose:
- "name": a short app name (1-2 words).
- "color": a hex color for the home-screen tile (e.g. "#0a84ff").
- "icon": one keyword from this list that best fits the app: ${ICON_KEYWORDS.join(", ")}.`;

const APP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string", description: "Short app name (1-2 words)." },
    color: { type: "string", description: "Hex tile color, e.g. #0a84ff." },
    icon: { type: "string", enum: ICON_KEYWORDS },
    code: {
      type: "string",
      description: "The app's source: a single function App() {...} component.",
    },
    fonts: {
      type: "array",
      items: { type: "string" },
      description:
        "Exact Google Font family names used by the app (e.g. ['Playfair Display']). Empty for system font.",
    },
  },
  required: ["name", "color", "icon", "code", "fonts"],
};

app.post("/api/generate-app", async (req, res) => {
  try {
    const user = authUser(req);
    if (!user) {
      return res.status(401).json({ error: "Invalid or missing key." });
    }
    if (user.demo) {
      return res
        .status(403)
        .json({ error: "App generation is disabled in demo mode." });
    }
    const apiKey = user.secrets && user.secrets.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: `No ANTHROPIC_API_KEY configured for ${user.label}.` });
    }
    const anthropic = new Anthropic({ apiKey });

    const { prompt, current } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing 'prompt'." });
    }

    const userText = current
      ? `Here is the current app "${current.name}". Modify it according to this request and return the FULL updated app.\n\nRequest: ${prompt}\n\nCurrent code:\n${current.code}`
      : `Create an app: ${prompt}`;

    const params = {
      model: "claude-opus-4-8",
      max_tokens: 32000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      // Let the model search the web on its own when live/real data would
      // improve the app (it decides — see the system prompt).
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 8 }],
      output_config: { format: { type: "json_schema", schema: APP_SCHEMA } },
    };

    // Server-side tools can pause the turn (stop_reason "pause_turn") when the
    // internal tool loop hits its iteration limit; re-send to resume.
    let messages = [{ role: "user", content: userText }];
    let message;
    for (let attempt = 0; attempt < 5; attempt++) {
      const stream = anthropic.messages.stream({ ...params, messages });
      message = await stream.finalMessage();
      if (message.stop_reason !== "pause_turn") break;
      messages = [...messages, { role: "assistant", content: message.content }];
    }

    if (message.stop_reason === "refusal") {
      return res
        .status(422)
        .json({ error: "The request was declined. Try a different idea." });
    }

    // With web search in play the content can contain tool-use blocks and the
    // final JSON may span multiple text blocks — join them all.
    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    if (!text) {
      return res.status(502).json({ error: "No app was generated." });
    }

    let spec;
    try {
      spec = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: "Generated app was malformed." });
    }

    res.json(spec);
  } catch (error) {
    console.error("generate-app error:", error);
    res.status(500).json({ error: error.message || "Generation failed." });
  }
});

// Network proxy for generated apps' `net.fetch` helper: server-side fetch of
// public HTTP(S) URLs so apps get live data without CORS issues. No secrets
// are involved, so demo users may use it too.
const PROXY_MAX_BYTES = 2 * 1024 * 1024;
const PRIVATE_HOST = /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)|\.local$/i;

app.post("/api/fetch", async (req, res) => {
  const user = authUser(req);
  if (!user) return res.status(401).json({ error: "Invalid or missing key." });

  const { url } = req.body || {};
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL." });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return res.status(400).json({ error: "Only http(s) URLs are allowed." });
  }
  if (PRIVATE_HOST.test(parsed.hostname)) {
    return res.status(400).json({ error: "That host is not allowed." });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const upstream = await fetch(parsed.href, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "TaiPingOS/1.0", Accept: "*/*" },
    });
    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.byteLength > PROXY_MAX_BYTES) {
      return res.status(413).json({ error: "Response too large (2MB max)." });
    }
    const contentType = upstream.headers.get("content-type") || "";
    const text = buf.toString("utf8");
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    res.json({ ok: upstream.ok, status: upstream.status, contentType, text, json });
  } catch (e) {
    const aborted = e && e.name === "AbortError";
    res.status(502).json({
      error: aborted ? "Upstream request timed out." : "Couldn't reach that URL.",
    });
  } finally {
    clearTimeout(timer);
  }
});

// SPA fallback.
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
