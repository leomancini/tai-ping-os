import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { faStopwatch } from "@fortawesome/free-solid-svg-icons";

export const meta = {
  id: "stopwatch",
  name: "Stopwatch",
  icon: faStopwatch,
  color: "#ff3b30",
};

const Wrap = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  background: #000;
  color: #fff;
`;

const Time = styled.div`
  font-size: 88px;
  font-weight: 200;
  letter-spacing: 2px;
  font-variant-numeric: tabular-nums;
`;

const Row = styled.div`
  display: flex;
  gap: 20px;
`;

const Button = styled.button`
  min-width: 96px;
  padding: 14px 24px;
  border: none;
  border-radius: 28px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  color: ${(p) => p.$color || "#fff"};
  background: ${(p) => p.$bg || "#333"};

  &:active {
    filter: brightness(1.3);
  }
`;

const pad = (n, len = 2) => String(n).padStart(len, "0");

function format(ms) {
  const totalCs = Math.floor(ms / 10);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60);
  return `${pad(min)}:${pad(sec)}.${pad(cs)}`;
}

function Stopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const lastRef = useRef(0);

  useEffect(() => {
    if (!running) return;
    lastRef.current = Date.now();
    const t = setInterval(() => {
      const now = Date.now();
      setElapsed((e) => e + (now - lastRef.current));
      lastRef.current = now;
    }, 31);
    return () => clearInterval(t);
  }, [running]);

  const reset = () => {
    setRunning(false);
    setElapsed(0);
  };

  return (
    <Wrap>
      <Time>{format(elapsed)}</Time>
      <Row>
        <Button onClick={reset} $bg="#a5a5a5" $color="#000">
          Reset
        </Button>
        <Button
          onClick={() => setRunning((r) => !r)}
          $bg={running ? "#3a1411" : "#11331a"}
          $color={running ? "#ff453a" : "#30d158"}
        >
          {running ? "Stop" : "Start"}
        </Button>
      </Row>
    </Wrap>
  );
}

export default Stopwatch;
