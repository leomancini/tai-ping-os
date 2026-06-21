import "dotenv/config";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3137;

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env

app.use(express.json({ limit: "1mb" }));

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
- The root element must fill its container: width: 100%; height: 100%; box-sizing: border-box.
- Design for a dark phone screen by default unless the app implies otherwise. Make it look nice and be genuinely functional.
- Visual design — follow these for a clean, native-feeling look:
  - Lay things out on a consistent spacing grid: use one base unit (e.g. 8px) and make all padding, gaps, and margins multiples of it. Keep equal gutters between repeated items, and equal outer padding on all sides of the screen.
  - Prefer grid/flex layouts with evenly spaced, equally sized tiles or rows (like a home screen of app icons) over ad-hoc positioning.
  - Use rounded corners consistently, and make nested corners CONCENTRIC: an inner element's corner radius should equal its parent's radius minus the padding between them (innerRadius = outerRadius − padding). This keeps the rounded edges parallel, like a rounded button centered inside a rounded card. Don't mix many different radii.
  - Center content within its container; align related elements to shared edges/baselines. Aim for balanced, symmetric padding so elements look concentric and intentional.
  - Typography: you may use ANY Google Font to fit the app's character — a clean sans (e.g. Inter, Manrope) for utilities, an elegant serif (e.g. Playfair Display, Fraunces) for editorial/journaling, a monospace (e.g. Space Mono, JetBrains Mono) for numbers/code. List every Google Font family you use, by its exact name, in the "fonts" field; they are loaded automatically. Reference them in CSS with a fallback, e.g. font-family: 'Playfair Display', serif. Use at most 1-2 fonts. Leave "fonts" empty to use the default system font.
- NO network access: no fetch, XMLHttpRequest, WebSocket, or external URLs/scripts.
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
  border: none; border-radius: 24px; padding: 14px 28px; font-size: 20px;
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
    if (!process.env.ANTHROPIC_API_KEY) {
      return res
        .status(500)
        .json({ error: "ANTHROPIC_API_KEY is not set on the server." });
    }

    const { prompt, current } = req.body || {};
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing 'prompt'." });
    }

    const userText = current
      ? `Here is the current app "${current.name}". Modify it according to this request and return the FULL updated app.\n\nRequest: ${prompt}\n\nCurrent code:\n${current.code}`
      : `Create an app: ${prompt}`;

    const stream = anthropic.messages.stream({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userText }],
      output_config: { format: { type: "json_schema", schema: APP_SCHEMA } },
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return res
        .status(422)
        .json({ error: "The request was declined. Try a different idea." });
    }

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock) {
      return res.status(502).json({ error: "No app was generated." });
    }

    let spec;
    try {
      spec = JSON.parse(textBlock.text);
    } catch {
      return res.status(502).json({ error: "Generated app was malformed." });
    }

    res.json(spec);
  } catch (error) {
    console.error("generate-app error:", error);
    res.status(500).json({ error: error.message || "Generation failed." });
  }
});

// SPA fallback.
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
