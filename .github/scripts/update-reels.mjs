import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const OUTPUT_PATH = path.join(ROOT_DIR, "data", "reels.json");

const ACCESS_TOKEN = process.env.IG_TOKEN;

if (!ACCESS_TOKEN) {
  console.error("[instagram-reels] Falta IG_TOKEN en variables de entorno.");
  process.exit(1);
}

function normalizeCaption(caption = "") {
  return String(caption).replace(/\s+/g, " ").trim();
}

function buildTitle(item, index) {
  const caption = normalizeCaption(item.caption || "");
  if (!caption) return `Reel ${String(index + 1).padStart(2, "0")}`;
  return caption.length > 48 ? `${caption.slice(0, 45)}...` : caption;
}

function buildText(item) {
  const caption = normalizeCaption(item.caption || "");
  if (!caption) return "Recorte de Instagram de Soy Nildo.";
  return caption.length > 140 ? `${caption.slice(0, 137)}...` : caption;
}

async function fetchInstagramMedia() {
  const url = new URL("https://graph.instagram.com/me/media");
  url.searchParams.set(
    "fields",
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp"
  );
  url.searchParams.set("access_token", ACCESS_TOKEN);

  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0"
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Instagram API error ${response.status}: ${body}`);
  }

  return response.json();
}

function mapReels(apiItems = []) {
  return apiItems
    .filter((item) => item && item.media_type === "VIDEO")
    .map((item, index) => ({
      id: item.id,
      type: "reel",
      code: item.permalink?.split("/").filter(Boolean).pop() || item.id,
      title: buildTitle(item, index),
      text: buildText(item),
      caption: normalizeCaption(item.caption || ""),
      url: item.permalink || "",
      image: item.thumbnail_url || "",
      videoUrl: item.media_url || "",
      publishedAt: item.timestamp || null
    }));
}

async function main() {
  const data = await fetchInstagramMedia();
  const items = mapReels(Array.isArray(data.data) ? data.data : []);

  const payload = {
    updatedAt: new Date().toISOString(),
    source: "instagram-graph-api",
    itemCount: items.length,
    items
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(`[instagram-reels] OK. Guardados ${items.length} reels en ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error("[instagram-reels] Error:", error);
  process.exit(1);
});