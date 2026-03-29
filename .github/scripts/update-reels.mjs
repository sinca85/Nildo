import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cheerio from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "../..");
const OUTPUT_PATH = path.join(ROOT_DIR, "data", "reels.json");
const DEBUG_HTML_PATH = path.join(ROOT_DIR, "data", "reels-debug.html");

const INSTAGRAM_REELS_URL = "https://www.instagram.com/soynildo/reels/";
const SITE_BASE = "https://www.instagram.com";

const MAX_ITEMS = 24;
const MIN_VALID_ITEMS_TO_OVERWRITE = 1;
const FETCH_TIMEOUT_MS = 15000;

function log(...args) {
  console.log("[update-reels]", ...args);
}

function normalizeInstagramUrl(url) {
  if (!url) return null;

  let cleaned = String(url).trim();

  cleaned = cleaned
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/")
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "");

  if (cleaned.startsWith("//")) {
    cleaned = `https:${cleaned}`;
  }

  if (cleaned.startsWith("/")) {
    cleaned = `${SITE_BASE}${cleaned}`;
  }

  if (!/^https?:\/\//i.test(cleaned)) {
    return null;
  }

  try {
    const parsed = new URL(cleaned);

    if (!/(\.|^)instagram\.com$/i.test(parsed.hostname)) {
      return null;
    }

    const pathname = parsed.pathname.replace(/\/+$/, "");
    const match = pathname.match(/^\/(reel|p)\/([A-Za-z0-9_-]+)$/i);

    if (!match) return null;

    const type = match[1].toLowerCase();
    const code = match[2];

    return {
      url: `https://www.instagram.com/${type}/${code}/`,
      code,
      type,
    };
  } catch {
    return null;
  }
}

function addFound(found, raw) {
  const normalized = normalizeInstagramUrl(raw);
  if (!normalized) return;

  if (!found.has(normalized.url)) {
    found.set(normalized.url, normalized);
  }
}

function extractItemsFromHtml(html) {
  const found = new Map();

  // 1) Intentar anchors reales
  try {
    const $ = cheerio.load(html);
    $("a").each((_, el) => {
      const href = $(el).attr("href");
      if (href) addFound(found, href);
    });
  } catch (error) {
    log("Cheerio parsing failed:", String(error));
  }

  // 2) Regex para URLs normales
  const directPatterns = [
    /https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p)\/[A-Za-z0-9_-]+\/?/gi,
    /href=(?:"|')?(\/(?:reel|p)\/[A-Za-z0-9_-]+\/?)(?:"|')?/gi,
    /"(\/(?:reel|p)\/[A-Za-z0-9_-]+\/?)"/gi,
    /'(\/(?:reel|p)\/[A-Za-z0-9_-]+\/?)'/gi,
  ];

  for (const pattern of directPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const raw = match[1] || match[0].replace(/^href=(?:"|')?/, "").replace(/(?:"|')$/, "");
      addFound(found, raw);
    }
  }

  // 3) Regex para URLs escapadas dentro de JSON/scripts
  const escapedPatterns = [
    /\\\/(?:reel|p)\\\/[A-Za-z0-9_-]+\\\//gi,
    /\/(?:reel|p)\/[A-Za-z0-9_-]+\//gi,
    /"\\\\\/(?:reel|p)\\\\\/[A-Za-z0-9_-]+\\\\\/"/gi,
  ];

  for (const pattern of escapedPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      addFound(found, match[0]);
    }
  }

  return Array.from(found.values()).slice(0, MAX_ITEMS);
}

async function readExistingJson() {
  try {
    const raw = await fs.readFile(OUTPUT_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9,es;q=0.8",
        "cache-control": "no-cache",
        pragma: "no-cache",
        referer: "https://www.instagram.com/",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function buildOutput(items, previousData) {
  return {
    updatedAt: new Date().toISOString(),
    source: INSTAGRAM_REELS_URL,
    itemCount: items.length,
    items,
    previousUpdatedAt: previousData?.updatedAt || null,
  };
}

async function ensureOutputDirectory() {
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
}

async function writeJson(data) {
  await ensureOutputDirectory();
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function hasEnoughValidItems(items) {
  if (!Array.isArray(items)) return false;
  if (items.length < MIN_VALID_ITEMS_TO_OVERWRITE) return false;

  return items.every((item) => {
    return (
      item &&
      typeof item.url === "string" &&
      /^https:\/\/www\.instagram\.com\/(?:reel|p)\/[A-Za-z0-9_-]+\/$/.test(item.url) &&
      typeof item.code === "string" &&
      item.code.length > 0 &&
      (item.type === "reel" || item.type === "p")
    );
  });
}

async function main() {
  const previousData = await readExistingJson();

  log("Script dirname:", __dirname);
  log("Root dir:", ROOT_DIR);
  log("Output path:", OUTPUT_PATH);
  log("Fetching Instagram public reels page:", INSTAGRAM_REELS_URL);

  let html;
  try {
    html = await fetchHtml(INSTAGRAM_REELS_URL);
  } catch (error) {
    log("Fetch failed. Keeping existing JSON untouched.");
    log(String(error));
    process.exit(0);
  }

  log("Fetched HTML length:", html.length);
  log("HTML preview:", html.slice(0, 500));

  await ensureOutputDirectory();
  await fs.writeFile(DEBUG_HTML_PATH, html, "utf8");
  log("Saved debug HTML to:", DEBUG_HTML_PATH);

  const items = extractItemsFromHtml(html);

  log(`Found ${items.length} candidate items.`);
  log("Extracted items:", JSON.stringify(items, null, 2));

  if (!hasEnoughValidItems(items)) {
    log(
      `Validation failed. Need at least ${MIN_VALID_ITEMS_TO_OVERWRITE} valid items to overwrite. Existing JSON will be preserved.`
    );
    process.exit(0);
  }

  const nextData = buildOutput(items, previousData);

  const previousSerialized = previousData ? JSON.stringify(previousData.items || []) : null;
  const nextSerialized = JSON.stringify(nextData.items || []);

  if (previousSerialized === nextSerialized) {
    log("No changes detected in items. Refreshing updatedAt is intentionally skipped.");
    process.exit(0);
  }

  await writeJson(nextData);
  log(`Wrote ${items.length} items to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error("[update-reels] Unexpected error:", error);
  process.exit(1);
});