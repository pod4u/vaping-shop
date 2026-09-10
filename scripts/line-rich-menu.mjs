import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const configPath = path.join(projectRoot, "assets/line/rich-menu-v6.json");
const imagePath = path.join(projectRoot, "assets/line/rich-menu-v6.jpg");
const shouldPublish = process.argv.includes("--publish");

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const values = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    values[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return values;
}

const localEnv = readEnvFile(path.join(projectRoot, ".env.local"));
const token = process.env.LINE_CHANNEL_ACCESS_TOKEN || localEnv.LINE_CHANNEL_ACCESS_TOKEN;
if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is required");
if (!fs.existsSync(configPath)) throw new Error("Rich menu JSON is missing");
if (!fs.existsSync(imagePath)) throw new Error("Rich menu PNG is missing");

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

async function responseBody(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { message: text }; }
}

async function assertOk(response, operation) {
  const body = await responseBody(response);
  if (!response.ok) {
    throw new Error(`${operation} failed (${response.status}): ${body.message || "unknown error"}`);
  }
  return body;
}

const validateResponse = await fetch("https://api.line.me/v2/bot/richmenu/validate", {
  method: "POST",
  headers,
  body: JSON.stringify(config),
});
await assertOk(validateResponse, "Rich menu validation");
console.log("Rich menu JSON validation: PASS");

if (!shouldPublish) {
  console.log("Dry run only. Use --publish after the supporting webhook code is deployed.");
  process.exit(0);
}

let richMenuId = null;
try {
  const createResponse = await fetch("https://api.line.me/v2/bot/richmenu", {
    method: "POST",
    headers,
    body: JSON.stringify(config),
  });
  const created = await assertOk(createResponse, "Rich menu creation");
  richMenuId = created.richMenuId;
  if (typeof richMenuId !== "string") throw new Error("LINE returned an invalid rich menu ID");

  const image = fs.readFileSync(imagePath);
  const uploadResponse = await fetch(
    `https://api-data.line.me/v2/bot/richmenu/${encodeURIComponent(richMenuId)}/content`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/jpeg" },
      body: image,
    },
  );
  await assertOk(uploadResponse, "Rich menu image upload");

  const defaultResponse = await fetch(
    `https://api.line.me/v2/bot/user/all/richmenu/${encodeURIComponent(richMenuId)}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } },
  );
  await assertOk(defaultResponse, "Set default rich menu");
  console.log(`Published default rich menu: ${richMenuId}`);
  console.log("Previous rich menus were preserved for rollback.");
} catch (error) {
  if (richMenuId) {
    await fetch(`https://api.line.me/v2/bot/richmenu/${encodeURIComponent(richMenuId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  throw error;
}
