import React, { useRef, useState } from "react";
import styled from "styled-components";
import { useAuth } from "./auth";
import { exportData, importData } from "./apps/store";
import {
  saveTextFile,
  backupFilename,
  fileFeaturesAvailable,
} from "./fileBridge";

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

const SectionLabel = styled.div`
  font-size: 13px;
  color: #8e8e93;
  margin: 6px 4px -4px;
`;

const Button = styled.button`
  appearance: none;
  border: none;
  border-radius: 10px;
  padding: 9px 16px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: #0a84ff;
  cursor: pointer;
  &:active {
    opacity: 0.7;
  }
`;

const Hint = styled.div`
  font-size: 12px;
  color: #8e8e93;
  line-height: 1.4;
  padding: 0 4px;
`;

const Status = styled.div`
  font-size: 13px;
  color: ${(p) => (p.$error ? "#ff453a" : "#30d158")};
  padding: 0 4px;
  min-height: 16px;
`;

function SettingsApp() {
  const auth = useAuth();
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState({ text: "", error: false });
  // Hidden in the old Android wrapper, where file save/pick don't work.
  const canBackup = fileFeaturesAvailable();

  const handleBackup = () => {
    try {
      const json = JSON.stringify(exportData(), null, 2);
      const res = saveTextFile(backupFilename(), json);
      setStatus({
        text: res.native
          ? "Backup saved to your Downloads folder."
          : "Backup file downloaded.",
        error: false,
      });
    } catch (e) {
      setStatus({ text: "Backup failed: " + (e.message || e), error: true });
    }
  };

  const handleRestoreClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const { appsImported } = importData(data, { mode: "merge" });
        setStatus({
          text: `Restored ${appsImported} app${
            appsImported === 1 ? "" : "s"
          } from backup.`,
          error: false,
        });
      } catch (err) {
        setStatus({
          text: "Restore failed: " + (err.message || err),
          error: true,
        });
      }
    };
    reader.onerror = () =>
      setStatus({ text: "Couldn't read that file.", error: true });
    reader.readAsText(file);
  };

  return (
    <Screen>
      <Title>Settings</Title>
      <Row>
        <Key>Signed in as</Key>
        <Value>{auth?.fullName || auth?.label || "—"}</Value>
      </Row>

      {canBackup && (
        <>
          <SectionLabel>Backup</SectionLabel>
          <Row>
            <Key>Save all apps &amp; data to a file</Key>
            <Button onClick={handleBackup}>Back up</Button>
          </Row>
          <Row>
            <Key>Restore from a backup file</Key>
            <Button onClick={handleRestoreClick}>Restore</Button>
          </Row>
          <Hint>
            Backups stay on your device — they're never uploaded. Restoring
            merges the backup with what's already here; matching apps are
            updated and missing ones are added back.
          </Hint>
          <Status $error={status.error}>{status.text}</Status>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFile}
            style={{ display: "none" }}
          />
        </>
      )}
    </Screen>
  );
}

export default SettingsApp;
