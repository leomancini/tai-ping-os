import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { faNoteSticky } from "@fortawesome/free-solid-svg-icons";

const STORAGE_KEY = "taiping.notes";

export const meta = {
  id: "notes",
  name: "Notes",
  icon: faNoteSticky,
  color: "#ffcc00",
};

const Wrap = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fffdf5;
`;

const Header = styled.div`
  padding: 14px 20px;
  font-size: 18px;
  font-weight: 600;
  color: #1c1c1e;
  background: #fff7d6;
  border-bottom: 1px solid #eee3b8;
`;

const Area = styled.textarea`
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  padding: 18px 20px;
  font-size: 16px;
  line-height: 1.5;
  color: #1c1c1e;
  background: transparent;
  font-family: inherit;
`;

function Notes() {
  const [text, setText] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved !== null ? saved : "Tap to edit…\n";
  });

  // Persist locally on every change so notes survive reloads.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, text);
  }, [text]);

  return (
    <Wrap>
      <Header>Notes</Header>
      <Area value={text} onChange={(e) => setText(e.target.value)} />
    </Wrap>
  );
}

export default Notes;
