import React, { useState } from "react";
import styled from "styled-components";
import { faCalculator } from "@fortawesome/free-solid-svg-icons";

export const meta = {
  id: "calculator",
  name: "Calculator",
  icon: faCalculator,
  color: "#ff9500",
};

const Wrap = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
`;

const Pad = styled.div`
  width: 360px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Display = styled.div`
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 12px;
  color: #fff;
  font-size: 52px;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
`;

const Key = styled.button`
  height: 56px;
  border: none;
  border-radius: 28px;
  font-size: 22px;
  font-weight: 500;
  cursor: pointer;
  color: ${(p) => (p.$variant === "fn" ? "#000" : "#fff")};
  background: ${(p) =>
    p.$variant === "op"
      ? "#ff9500"
      : p.$variant === "fn"
      ? "#a5a5a5"
      : "#333"};
  grid-column: ${(p) => (p.$wide ? "span 2" : "auto")};

  &:active {
    filter: brightness(1.3);
  }
`;

const compute = (a, b, op) => {
  switch (op) {
    case "+":
      return a + b;
    case "−":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
    default:
      return b;
  }
};

function Calculator() {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState(null);
  const [op, setOp] = useState(null);
  const [fresh, setFresh] = useState(true);

  const inputDigit = (d) => {
    if (fresh) {
      setDisplay(d);
      setFresh(false);
    } else {
      setDisplay(display === "0" ? d : display + d);
    }
  };

  const inputDot = () => {
    if (fresh) {
      setDisplay("0.");
      setFresh(false);
    } else if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const clearAll = () => {
    setDisplay("0");
    setPrev(null);
    setOp(null);
    setFresh(true);
  };

  const applyOp = (nextOp) => {
    const cur = parseFloat(display);
    if (prev == null) {
      setPrev(cur);
    } else if (op) {
      const res = compute(prev, cur, op);
      setPrev(res);
      setDisplay(String(res));
    }
    setOp(nextOp);
    setFresh(true);
  };

  const equals = () => {
    if (op != null && prev != null) {
      const res = compute(prev, parseFloat(display), op);
      setDisplay(String(res));
      setPrev(null);
      setOp(null);
      setFresh(true);
    }
  };

  const toggleSign = () =>
    setDisplay(String(parseFloat(display) * -1));
  const percent = () =>
    setDisplay(String(parseFloat(display) / 100));

  return (
    <Wrap>
      <Pad>
        <Display>{display}</Display>
        <Grid>
          <Key $variant="fn" onClick={clearAll}>
            AC
          </Key>
          <Key $variant="fn" onClick={toggleSign}>
            +/−
          </Key>
          <Key $variant="fn" onClick={percent}>
            %
          </Key>
          <Key $variant="op" onClick={() => applyOp("÷")}>
            ÷
          </Key>

          {["7", "8", "9"].map((d) => (
            <Key key={d} onClick={() => inputDigit(d)}>
              {d}
            </Key>
          ))}
          <Key $variant="op" onClick={() => applyOp("×")}>
            ×
          </Key>

          {["4", "5", "6"].map((d) => (
            <Key key={d} onClick={() => inputDigit(d)}>
              {d}
            </Key>
          ))}
          <Key $variant="op" onClick={() => applyOp("−")}>
            −
          </Key>

          {["1", "2", "3"].map((d) => (
            <Key key={d} onClick={() => inputDigit(d)}>
              {d}
            </Key>
          ))}
          <Key $variant="op" onClick={() => applyOp("+")}>
            +
          </Key>

          <Key $wide onClick={() => inputDigit("0")}>
            0
          </Key>
          <Key onClick={inputDot}>.</Key>
          <Key $variant="op" onClick={equals}>
            =
          </Key>
        </Grid>
      </Pad>
    </Wrap>
  );
}

export default Calculator;
