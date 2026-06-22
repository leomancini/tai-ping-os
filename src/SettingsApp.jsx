import React from "react";
import styled from "styled-components";
import { useAuth } from "./auth";

const Screen = styled.div`
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 20px 24px;
  background: #000;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Title = styled.div`
  font-size: 22px;
  font-weight: 700;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #1c1c1e;
  border-radius: 12px;
  padding: 14px 16px;
`;

const Key = styled.span`
  font-size: 13px;
  color: #8e8e93;
`;

const Value = styled.span`
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

function SettingsApp() {
  const auth = useAuth();
  return (
    <Screen>
      <Title>Settings</Title>
      <Row>
        <Key>Signed in as</Key>
        <Value>{auth?.fullName || auth?.label || "—"}</Value>
      </Row>
    </Screen>
  );
}

export default SettingsApp;
