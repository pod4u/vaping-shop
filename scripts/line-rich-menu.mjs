import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const accountArg = process.argv.find((argument) => argument.startsWith("--account="));
const account = accountArg?.split("=")[1] === "secondary" ? "secondary" : "primary";
const assetName = account === "secondary" ? "rich-menu-secondary-v1" : "rich-menu-v6";
const configPath = path.join(projectRoot, `assets/line/${assetName}.json`);
const imagePath = path.join(projectRoot, `assets/line/${assetName}.jpg`);
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
const tokenKey = account === "secondary"
  ? "LINE_SECONDARY_CHANNEL_ACCESS_TOKEN"
  : "LINE_CHANNEL_ACCESS_TOKEN";
const token = process.env[tokenKey] || localEnv[tokenKey];
if (!token) throw new Error(`${tokenKey} is required`);
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
console.log(`Rich menu JSON validation (${account}): PASS`);

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
