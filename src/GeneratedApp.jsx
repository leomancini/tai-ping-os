import React from "react";
import styled from "styled-components";
import * as Babel from "@babel/standalone";
import { ensureGoogleFonts } from "./fonts";
import { net } from "./apps/net";

// Compile a generated app's source (a `function App() {...}` body) into a React
// component. The code runs with React, styled-components, a per-app storage
// API, and a server-proxied `net.fetch` in scope — no imports, no direct
// network access. Results are cached by source string.
const cache = new Map();

// Code points whose literal form changes syntax when it lands inside a string
// literal: quotes, backslash, backtick, and the JS line separators. Together
// with control chars (< 0x20, e.g. the newline escape) these must stay
// escaped — converting a unicode-escaped newline inside a string to a real
// newline splits the string and Babel fails with "Unterminated string
// constant".
const UNSAFE_CODEPOINTS = new Set([0x22, 0x27, 0x5c, 0x60, 0x2028, 0x2029]);

function unescapeUnicode(match, hex) {
  const cp = parseInt(hex, 16);
  if (cp < 0x20 || UNSAFE_CODEPOINTS.has(cp)) return match;
  return String.fromCodePoint(cp);
}

function sanitize(code) {
  return (
    code
      // Convert unicode escapes to real characters. Models sometimes emit
      // `\u{1F4D6}` as JSX text, which is invalid JSX; the literal character is
      // equivalent inside string literals too (except the unsafe set above,
      // which is left escaped).
      .replace(/\\u\{([0-9a-fA-F]+)\}/g, unescapeUnicode)
      .replace(/\\u([0-9a-fA-F]{4})/g, unescapeUnicode)
      .replace(/^\s*import[^\n;]*;?\s*$/gm, "") // drop any import lines
      .replace(/^\s*export\s+default\s+/gm, "") // `export default function App` -> `function App`
      .replace(/^\s*export\s+/gm, "") // strip other `export ` keywords
  );
}

// Transpile + build the factory. This step is hook-free (just Babel + new
// Function), so it's safe to run during render. Invoking the factory — which
// runs the generated code — is deferred to <Runner> below the error boundary.
function compile(code) {
  if (cache.has(code)) return cache.get(code);
  const transformed = Babel.transform(sanitize(code), {
    presets: ["react"],
  }).code;
  const factory = new Function(
    "React",
    "styled",
    "storage",
    "net",
    `${transformed}\nreturn App;`
  );
  cache.set(code, factory);
  return factory;
}

// Caches the App component produced by invoking a factory, so the component's
// identity stays stable across re-renders (no remount / focus loss).
const appCache = new WeakMap();

// Invokes the factory (running the generated code) and renders the app. This
// lives BELOW the error boundary, so if the generated code is malformed (e.g.
// it calls a hook at the top level), the resulting error is contained here and
// caught by the boundary instead of crashing the OS.
function Runner({ factory, storage }) {
  let App = appCache.get(factory);
  if (!App) {
    App = factory(React, styled, storage, net);
    appCache.set(factory, App);
  }
  return <App />;
}

// Scroll container for a generated app. The main page is scroll-locked, so this
// is where generated apps opt back into scrolling when their content overflows.
const Scroll = styled.div`
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
`;

const ErrorWrap = styled.div`
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  background: #1c1c1e;
  color: #ff453a;
  font-family: -apple-system, sans-serif;
  text-align: center;
`;

// Catches compile/runtime errors so a broken app can't take down the OS.
class Boundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }
  render() {
    if (this.state.error) {
      return (
        <ErrorWrap>
          <div style={{ fontSize: 18, fontWeight: 600 }}>This app crashed</div>
          <div style={{ fontSize: 13, color: "#8e8e93" }}>
            {String(this.state.error.message || this.state.error)}
          </div>
        </ErrorWrap>
      );
    }
    return this.props.children;
  }
}

function GeneratedApp({ code, storage, fonts }) {
  // Load any Google Fonts the app declared.
  React.useEffect(() => {
    ensureGoogleFonts(fonts);
  }, [fonts]);

  // Transpile only (hook-free). The factory is invoked inside <Runner>.
  const { factory, compileError } = React.useMemo(() => {
    try {
      return { factory: compile(code), compileError: null };
    } catch (e) {
      return { factory: null, compileError: e };
    }
  }, [code]);

  if (compileError) {
    return (
      <ErrorWrap>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Couldn't build app</div>
        <div style={{ fontSize: 13, color: "#8e8e93" }}>
          {String(compileError.message || compileError)}
        </div>
      </ErrorWrap>
    );
  }

  return (
    <Scroll>
      <Boundary resetKey={code}>
        <Runner factory={factory} storage={storage} />
      </Boundary>
    </Scroll>
  );
}

export default GeneratedApp;
