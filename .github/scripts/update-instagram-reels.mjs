import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const OUTPUT_PATH = path.join(ROOT_DIR, "data", "reels.json");

const ACCESS_TOKEN = process.env.IG_TOKEN;
const MIN_VALID_REELS_TO_OVERWRITE = 1;

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

async function readExistingJson() {
  try {
    const raw = await fs.readFile(OUTPUT_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
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
      id: item.id || "",
      type: "reel",
      code: item.permalink?.split("/").filter(Boolean).pop() || item.id || "",
      title: buildTitle(item, index),
      text: buildText(item),
      caption: normalizeCaption(item.caption || ""),
      url: item.permalink || "",
      image: item.thumbnail_url || "",
      videoUrl: item.media_url || "",
      publishedAt: item.timestamp || null
    }));
}

function hasEnoughValidItems(items) {
  if (!Array.isArray(items)) return false;
  if (items.length < MIN_VALID_REELS_TO_OVERWRITE) return false;

  return items.every((item) => {
    return (
      item &&
      typeof item.id === "string" &&
      item.id.length > 0 &&
      item.type === "reel" &&
      typeof item.code === "string" &&
      item.code.length > 0 &&
      typeof item.title === "string" &&
      item.title.length > 0 &&
      typeof item.url === "string" &&
      item.url.startsWith("https://www.instagram.com/") &&
      typeof item.image === "string" &&
      item.image.startsWith("http") &&
      typeof item.videoUrl === "string" &&
      item.videoUrl.startsWith("http")
    );
  });
}

async function writeJson(data) {
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main() {
  const previousData = await readExistingJson();

  let data;
  try {
    data = await fetchInstagramMedia();
  } catch (error) {
    console.error("[instagram-reels] Falló la API. Se conserva el JSON actual.");
    console.error(String(error));
    process.exit(0);
  }

  const items = mapReels(Array.isArray(data.data) ? data.data : []);

  if (!hasEnoughValidItems(items)) {
    console.warn(
      `[instagram-reels] No hay reels válidos suficientes para sobrescribir (${items.length} encontrados). Se conserva el JSON actual.`
    );
    process.exit(0);
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    source: "instagram-graph-api",
    itemCount: items.length,
    items,
    previousUpdatedAt: previousData?.updatedAt || null
  };

  const previousSerialized = previousData ? JSON.stringify(previousData.items || []) : null;
  const nextSerialized = JSON.stringify(payload.items || []);

  if (previousSerialized === nextSerialized) {
    console.log("[instagram-reels] No hubo cambios en los reels. No se sobrescribe el JSON.");
    process.exit(0);
  }

  await writeJson(payload);
  console.log(`[instagram-reels] OK. Guardados ${items.length} reels en ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error("[instagram-reels] Error inesperado. Se conserva el JSON actual.");
  console.error(error);
  process.exit(0);
});