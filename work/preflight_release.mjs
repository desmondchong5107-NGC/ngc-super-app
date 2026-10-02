import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "../outputs");
const decoder = new TextDecoder("utf-8", { fatal: true });

function readUtf8(name) {
  const buffer = fs.readFileSync(`${root}/${name}`);
  let text;
  try {
    text = decoder.decode(buffer);
  } catch {
    throw new Error(`${name} is not valid UTF-8`);
  }
  if (text.includes("\uFFFD") || text.includes("\u0000")) throw new Error(`${name} contains corrupted characters`);
  const controls = [...text].filter(character => {
    const code = character.charCodeAt(0);
    return code < 32 && ![9, 10, 13].includes(code);
  });
  if (controls.length) throw new Error(`${name} contains unsafe control characters`);
  return { buffer, text };
}

function requireHtml(name, minimumSize = 1000) {
  const file = readUtf8(name);
  if (file.buffer.length < minimumSize) throw new Error(`${name} is unexpectedly small`);
  if (!file.text.trimStart().toLowerCase().startsWith("<!doctype html>")) throw new Error(`${name} is missing its HTML doctype`);
  if (!file.text.trimEnd().toLowerCase().endsWith("</html>")) throw new Error(`${name} is incomplete`);
  if (!/<meta\s+charset=["']utf-8["']/i.test(file.text)) throw new Error(`${name} is missing UTF-8 metadata`);
  return file;
}

const index = requireHtml("index.html", 500000);
const alias = requireHtml("ngc_super_app.html", 500000);
if (!index.buffer.equals(alias.buffer)) throw new Error("index.html and ngc_super_app.html are not identical");
for (const marker of ["<title>NGC Super App</title>", 'id="notificationButton"', "Notification Centre", 'id="todaySummary"', 'id="nameCardPage"', 'id="nameCardShare"', 'id="nameCardVCard"', "My e-Name Card", 'id="agentPhotoInput"', 'id="agentUtc"', 'id="agentPrsc"', "BEGIN:VCARD", "PRS Tax Relief", 'id="prsFrame"', "A new version is ready.", 'role="dialog" aria-modal="true" aria-labelledby="appUpdateTitle"']) {
  if (!index.text.includes(marker)) throw new Error(`App is missing release marker: ${marker}`);
}

const admin = requireHtml("push-admin.html", 15000);
for (const marker of ["Super App Admin", "iPhone Preview", "Recent Notifications", "Save Draft", "Automatically hide after"]) {
  if (!admin.text.includes(marker)) throw new Error(`Notification Admin is missing release marker: ${marker}`);
}

const worker = readUtf8("service-worker.js");
if (!/CACHE_NAME\s*=\s*"ngc-super-app-v[^"]+"/.test(worker.text) || !worker.text.includes("ngc-skip-waiting")) throw new Error("Service worker cache version or update flow was not updated");

console.log(`Release preflight passed: ${index.buffer.length.toLocaleString()} byte App, ${admin.buffer.length.toLocaleString()} byte Admin, valid UTF-8.`);
