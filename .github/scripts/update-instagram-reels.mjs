import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const OUTPUT_PATH = path.join(ROOT_DIR, "data", "reels.json");

const ACCESS_TOKEN = process.env.IG_TOKEN;

const MIN_VALID_REELS_TO_OVERWRITE = 1;
const COMMENTS_LIMIT = 5;

const LATEST_REELS_COUNT = 2;
const TOP_REELS_COUNT = 20;
const MEDIA_LIMIT = 100;

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

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0"
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body}`);
  }

  return response.json();
}

async function fetchInstagramMedia() {
  const url = new URL("https://graph.instagram.com/me/media");
  url.searchParams.set(
    "fields",
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp"
  );
  url.searchParams.set("limit", String(MEDIA_LIMIT));
  url.searchParams.set("access_token", ACCESS_TOKEN);

  return fetchJson(url);
}

function normalizeComment(comment) {
  return {
    id: String(comment?.id || ""),
    username: String(comment?.username || "Usuario"),
    text: normalizeCaption(comment?.text || ""),
    timestamp: comment?.timestamp || null
  };
}

async function fetchCommentsForMedia(mediaId) {
  const url = new URL(`https://graph.instagram.com/${mediaId}/comments`);
  url.searchParams.set("fields", "id,text,username,timestamp");
  url.searchParams.set("limit", String(COMMENTS_LIMIT));
  url.searchParams.set("access_token", ACCESS_TOKEN);

  try {
    const json = await fetchJson(url);
    const comments = Array.isArray(json?.data) ? json.data : [];
    return comments.map(normalizeComment).filter((comment) => comment.id);
  } catch (error) {
    console.warn(
      `[instagram-reels] No se pudieron cargar comentarios para media ${mediaId}. Se guarda sin comentarios.`
    );
    console.warn(String(error));
    return [];
  }
}

async function fetchInsightsForMedia(mediaId) {
  const url = new URL(`https://graph.instagram.com/${mediaId}/insights`);
  url.searchParams.set("metric", "plays,reach");
  url.searchParams.set("access_token", ACCESS_TOKEN);

  try {
    const json = await fetchJson(url);

    const metrics = {};

    (json?.data || []).forEach((metric) => {
      metrics[metric.name] = Number(metric.values?.[0]?.value || 0);
    });

    return {
      plays: metrics.plays || 0,
      reach: metrics.reach || 0
    };
  } catch (error) {
    console.warn(
      `[instagram-reels] No se pudieron cargar insights para media ${mediaId}. Se usa views = 0.`
    );
    console.warn(String(error));

    return {
      plays: 0,
      reach: 0
    };
  }
}

async function mapReels(apiItems = []) {
  const videoItems = apiItems.filter((item) => item && item.media_type === "VIDEO");

  const mapped = await Promise.all(
    videoItems.map(async (item, index) => {
      const [comments, insights] = await Promise.all([
        fetchCommentsForMedia(item.id),
        fetchInsightsForMedia(item.id)
      ]);

      return {
        id: item.id || "",
        type: "reel",
        code: item.permalink?.split("/").filter(Boolean).pop() || item.id || "",
        title: buildTitle(item, index),
        text: buildText(item),
        caption: normalizeCaption(item.caption || ""),
        url: item.permalink || "",
        image: item.thumbnail_url || "",
        videoUrl: item.media_url || "",
        publishedAt: item.timestamp || null,
        views: insights.plays || 0,
        reach: insights.reach || 0,
        commentsCount: comments.length,
        comments
      };
    })
  );

  return mapped;
}

function selectReels(items = []) {
  const sortedByDate = items
    .slice()
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

  const latest = sortedByDate.slice(0, LATEST_REELS_COUNT);
  const latestIds = new Set(latest.map((item) => item.id));

  const topViewed = items
    .filter((item) => !latestIds.has(item.id))
    .sort((a, b) => {
      const viewsDiff = (b.views || 0) - (a.views || 0);
      if (viewsDiff !== 0) return viewsDiff;

      return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
    })
    .slice(0, TOP_REELS_COUNT);

  return [...latest, ...topViewed];
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
      item.videoUrl.startsWith("http") &&
      typeof item.views === "number" &&
      typeof item.reach === "number" &&
      Array.isArray(item.comments)
    );
  });
}

async function writeJson(data) {
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main() {
  const previousData = await readExistingJson();

  let mediaData;

  try {
    mediaData = await fetchInstagramMedia();
  } catch (error) {
    console.error("[instagram-reels] Falló la API principal. Se conserva el JSON actual.");
    console.error(String(error));
    process.exit(0);
  }

  const allItems = await mapReels(Array.isArray(mediaData?.data) ? mediaData.data : []);
  const items = selectReels(allItems);

  if (!hasEnoughValidItems(items)) {
    console.warn(
      `[instagram-reels] No hay reels válidos suficientes para sobrescribir (${items.length} encontrados). Se conserva el JSON actual.`
    );
    process.exit(0);
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    source: "instagram-graph-api",
    strategy: {
      latestReels: LATEST_REELS_COUNT,
      topViewedReels: TOP_REELS_COUNT,
      mediaLimit: MEDIA_LIMIT
    },
    totalFetched: allItems.length,
    itemCount: items.length,
    items,
    previousUpdatedAt: previousData?.updatedAt || null
  };

  const previousSerialized = previousData ? JSON.stringify(previousData.items || []) : null;
  const nextSerialized = JSON.stringify(payload.items || []);

  if (previousSerialized === nextSerialized) {
    console.log("[instagram-reels] No hubo cambios reales. No se reescribe el JSON.");
    process.exit(0);
  }

  await writeJson(payload);
  console.log(
    `[instagram-reels] OK. Guardados ${items.length} reels en ${OUTPUT_PATH}. Total consultados: ${allItems.length}`
  );
}

main().catch((error) => {
  console.error("[instagram-reels] Error inesperado. Se conserva el JSON actual.");
  console.error(error);
  process.exit(0);
});