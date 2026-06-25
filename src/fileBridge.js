// Save a text file to the device. Inside the Android wrapper a native JS
// interface (window.AndroidFile, defined in MainActivity) writes the file to
// the Downloads folder; in a regular browser we fall back to a normal download.
// Either way the bytes are produced locally and never sent anywhere.
export function saveTextFile(filename, text) {
  if (
    typeof window !== "undefined" &&
    window.AndroidFile &&
    typeof window.AndroidFile.saveTextFile === "function"
  ) {
    window.AndroidFile.saveTextFile(filename, text);
    return { native: true };
  }

  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { native: false };
}

// Whether saving/picking backup files actually works in this environment.
// - The new Android wrapper exposes window.AndroidFile -> fully supported.
// - A normal browser supports blob downloads and <input type="file"> -> yes.
// - An Android WebView WITHOUT the bridge is the old wrapper, where neither the
//   download nor the file picker works, so the feature is hidden there.
export function fileFeaturesAvailable() {
  if (
    typeof window !== "undefined" &&
    window.AndroidFile &&
    typeof window.AndroidFile.saveTextFile === "function"
  ) {
    return true;
  }
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  const isAndroidWebView = /\bwv\b/.test(ua); // standard Android WebView marker
  return !isAndroidWebView;
}

// A timestamped, filesystem-safe backup filename, e.g.
// "tai-ping-backup-20260625-1432.json".
export function backupFilename() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `tai-ping-backup-${d.getFullYear()}${p(d.getMonth() + 1)}${p(
    d.getDate()
  )}-${p(d.getHours())}${p(d.getMinutes())}.json`;
}
