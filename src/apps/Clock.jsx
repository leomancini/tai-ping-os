import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { faClock } from "@fortawesome/free-solid-svg-icons";

// Metadata used by the home screen / app registry.
export const meta = {
  id: "clock",
  name: "Clock",
  icon: faClock,
  color: "#1c1c1e",
};

const Wrap = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #000;
  color: #fff;
`;

const Time = styled.div`
  font-size: 96px;
  font-weight: 200;
  letter-spacing: 2px;
  font-variant-numeric: tabular-nums;
`;

const DateLine = styled.div`
  margin-top: 8px;
  font-size: 20px;
  color: #8e8e93;
`;

function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const date = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Wrap>
      <Time>{time}</Time>
      <DateLine>{date}</DateLine>
    </Wrap>
  );
}

export default Clock;
