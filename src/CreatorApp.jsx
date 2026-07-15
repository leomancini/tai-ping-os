import React, { useState } from "react";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useApps } from "./apps/AppsContext";
import { useAuth } from "./auth";

const Screen = styled.div`
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 20px 24px;
  background: #000;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: 16px;
  &::-webkit-scrollbar {
    display: none;
  }
  scrollbar-width: none;
`;

const Title = styled.div`
  font-size: 22px;
  font-weight: 700;
`;

const Sub = styled.div`
  font-size: 13px;
  color: #8e8e93;
  margin-top: -10px;
`;

const Field = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  min-height: 72px;
  resize: none;
  border: none;
  border-radius: 14px;
  padding: 14px 16px;
  font: inherit;
  font-size: 15px;
  color: #fff;
  background: #1c1c1e;
  outline: none;
  &:disabled {
    opacity: 0.5;
  }
`;

const Row = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const Button = styled.button`
  border: none;
  border-radius: 12px;
  padding: 12px 18px;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  color: ${(p) => (p.$ghost ? "#fff" : "#fff")};
  background: ${(p) => (p.$ghost ? "#2c2c2e" : "#0a84ff")};
  opacity: ${(p) => (p.disabled ? 0.5 : 1)};
`;

// Named ErrorText (not Error) so it doesn't shadow the global Error
// constructor used by generate() below.
const ErrorText = styled.div`
  font-size: 13px;
  color: #ff453a;
`;

const SectionLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #8e8e93;
  margin-top: 4px;
`;

const AppRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
  border-radius: 12px;
  padding: 10px 12px;
  background: #1c1c1e;
  color: #fff;
`;

const AppName = styled.span`
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Action = styled.button`
  flex: none;
  border: none;
  border-radius: 9px;
  padding: 8px 12px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  background: ${(p) => (p.$danger ? "#3a1411" : "#2c2c2e")};
  color: ${(p) => (p.$danger ? "#ff453a" : "#fff")};
`;

const Swatch = styled.div`
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(p) => p.$color};
`;

// Placeholder ideas for the create field. One is shown at a time, cycling in
// random order (never the same one twice in a row).
const PLACEHOLDER_IDEAS = [
  "a tip calculator that remembers the last bill",
  "a pomodoro timer with a tomato that ripens",
  "a dice roller for board games",
  "a daily water intake tracker",
  "a coin flip with a satisfying animation",
  "current weather with a 5-day forecast",
  "a to-do list that celebrates when you finish",
  "a random dinner idea picker",
  "a unit converter for cooking measurements",
  "a breathing exercise with a pulsing circle",
  "a scoreboard for two players",
  "a countdown to New Year's Eve",
  "a random compliment generator",
  "a metronome with tap tempo",
  "an expense splitter for dinners out",
  "flashcards for learning Spanish basics",
  "a magic 8-ball for tough decisions",
  "a mood journal with one emoji per day",
  "a reaction time tester",
  "a color palette generator",
  "top Hacker News headlines right now",
  "live Bitcoin and Ethereum prices",
  "rock paper scissors against the phone",
  "a random workout with 5 exercises",
  "a sleep calculator for the best bedtime",
  "a trivia quiz about space",
  "a photo booth with a countdown timer",
  "a stopwatch with lap times",
  "a random act of kindness suggester",
  "a plant watering reminder",
  "a memory matching game with emoji",
  "a doodle pad with different brush colors",
];

const randomIdea = () =>
  PLACEHOLDER_IDEAS[Math.floor(Math.random() * PLACEHOLDER_IDEAS.length)];

async function generate(body, key, onStatus) {
  let res;
  try {
    res = await fetch("/api/generate-app", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Opt in to NDJSON progress streaming; an older server ignores this
        // and responds with plain JSON, handled below.
        Accept: "application/x-ndjson",
        ...(key ? { "x-taiping-key": key } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    // Network error — creating apps needs the server (AI generation). Existing
    // apps still work offline; only this one feature requires a connection.
    throw new Error("You're offline. Creating apps needs a connection.");
  }

  const type = res.headers.get("content-type") || "";
  if (!res.ok || !type.includes("application/x-ndjson")) {
    // Error responses and older servers use a single JSON body.
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Generation failed.");
    return data;
  }

  // NDJSON stream: {type:"status"} lines while generating, then one final
  // {type:"result", spec} or {type:"error", error} line.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = null;
  let errorMsg = null;
  const handleLine = (line) => {
    if (!line.trim()) return;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    if (msg.type === "status") onStatus && onStatus(msg.text);
    else if (msg.type === "result") result = msg.spec;
    else if (msg.type === "error") errorMsg = msg.error;
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      handleLine(buffer.slice(0, nl));
      buffer = buffer.slice(nl + 1);
    }
  }
  handleLine(buffer);

  if (errorMsg) throw new Error(errorMsg);
  if (!result) throw new Error("Generation failed.");
  return result;
}

function CreatorApp({ onLaunch }) {
  const { userApps, createApp, updateApp, removeApp } = useApps();
  const auth = useAuth();
  const demo = !!auth?.demo;
  const DEMO_MSG = "App generation is disabled in demo mode.";
  const [prompt, setPrompt] = useState("");
  const [editing, setEditing] = useState(null); // app entry being edited
  const [editPrompt, setEditPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null); // live progress from the server
  const [error, setError] = useState(null);
  const [placeholder, setPlaceholder] = useState(randomIdea);

  // Cycle the create-field placeholder through the ideas in random order,
  // never showing the same one twice in a row.
  React.useEffect(() => {
    const id = setInterval(() => {
      setPlaceholder((prev) => {
        let next;
        do {
          next = randomIdea();
        } while (next === prev);
        return next;
      });
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const handleCreate = async () => {
    if (demo) {
      window.alert(DEMO_MSG);
      return;
    }
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setStatus(null);
    setError(null);
    try {
      const spec = await generate(
        { prompt: prompt.trim() },
        auth?.key,
        setStatus
      );
      const id = createApp(spec);
      setPrompt("");
      onLaunch && onLaunch(id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      setStatus(null);
    }
  };

  // Submit on Enter; Shift+Enter inserts a newline.
  const submitOnEnter = (fn) => (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      fn();
    }
  };

  const handleUpdate = async () => {
    if (demo) {
      window.alert(DEMO_MSG);
      return;
    }
    if (!editPrompt.trim() || busy || !editing) return;
    setBusy(true);
    setStatus(null);
    setError(null);
    try {
      const spec = await generate(
        {
          prompt: editPrompt.trim(),
          current: { id: editing.id, name: editing.name, code: editing.code },
        },
        auth?.key,
        setStatus
      );
      updateApp(editing.id, spec);
      setEditing(null);
      setEditPrompt("");
      onLaunch && onLaunch(editing.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      setStatus(null);
    }
  };

  if (editing) {
    return (
      <Screen>
        <Title>Edit {editing.name}</Title>
        <Sub>Describe the changes — this replaces the app, keeping its data.</Sub>
        <Field
          autoFocus
          disabled={busy}
          placeholder="e.g. add a reset button and make it blue"
          value={editPrompt}
          onChange={(e) => setEditPrompt(e.target.value)}
          onKeyDown={submitOnEnter(handleUpdate)}
        />
        {error && <ErrorText>{error}</ErrorText>}
        <Row>
          <Button
            onClick={handleUpdate}
            disabled={busy || (!demo && !editPrompt.trim())}
          >
            {busy ? status || "Updating…" : "Update app"}
          </Button>
          <Button
            $ghost
            onClick={() => {
              setEditing(null);
              setEditPrompt("");
              setError(null);
            }}
            disabled={busy}
          >
            Cancel
          </Button>
        </Row>
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Create an app</Title>
      <Sub>Describe what you want. AI builds it and adds it to your home screen.</Sub>
      <Field
        autoFocus
        disabled={busy}
        placeholder={placeholder}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={submitOnEnter(handleCreate)}
      />
      {error && <ErrorText>{error}</ErrorText>}
      <Row>
        <Button
          onClick={handleCreate}
          disabled={busy || (!demo && !prompt.trim())}
        >
          {busy ? status || "Creating…" : "Create app"}
        </Button>
      </Row>

      {userApps.length > 0 && (
        <>
          <SectionLabel>Your apps</SectionLabel>
          {userApps.map((app) => (
            <AppRow key={app.id}>
              <Swatch $color={app.color}>
                <FontAwesomeIcon
                  icon={app.icon}
                  color="#fff"
                  style={{ width: 18, height: 18 }}
                />
              </Swatch>
              <AppName>{app.name}</AppName>
              <Action
                onClick={() => {
                  setEditing(app);
                  setEditPrompt("");
                  setError(null);
                }}
              >
                Edit
              </Action>
              <Action
                $danger
                onClick={() => {
                  if (window.confirm(`Delete "${app.name}"? This can't be undone.`)) {
                    removeApp(app.id);
                  }
                }}
              >
                Delete
              </Action>
            </AppRow>
          ))}
        </>
      )}
    </Screen>
  );
}

export default CreatorApp;
