const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");
const cheerio = require("cheerio");

const OUTPUT_PATH = path.join(process.cwd(), "data", "latest-content.json");

function readExistingJson() {
  try {
    return JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
  } catch {
    return null;
  }
}

async function getLatestYouTubeVideo() {
  const channelId = "UCmt8wj7wz8wczYFJz6v3mzA";
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  const res = await fetch(rssUrl, {
    headers: {
      "user-agent": "Mozilla/5.0"
    }
  });

  if (!res.ok) {
    throw new Error(`YouTube RSS error: ${res.status}`);
  }

  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const data = parser.parse(xml);

  const firstEntry = Array.isArray(data.feed.entry) ? data.feed.entry[0] : data.feed.entry;

  if (!firstEntry || !firstEntry["yt:videoId"]) {
    throw new Error("YouTube RSS sin entries válidas");
  }

  return {
    latestVideoId: firstEntry["yt:videoId"],
    latestTitle: firstEntry.title || "",
    published: firstEntry.published || null
  };
}

async function getLatestTwitchVod() {
  const url = "https://www.twitch.tv/soynildo/videos?filter=archives&sort=time";

  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0"
    }
  });

  if (!res.ok) {
    throw new Error(`Twitch page error: ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  let vodId = null;

  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const match = href.match(/\/videos\/(\d+)/);
    if (match && !vodId) {
      vodId = match[1];
    }
  });

  if (!vodId) {
    throw new Error("No se encontró VOD en Twitch");
  }

  return {
    latestVodId: vodId
  };
}

function sameData(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

async function main() {
  const previousData = readExistingJson();

  let youtube = previousData?.youtube || null;
  let twitch = previousData?.twitch || null;

  try {
    youtube = await getLatestYouTubeVideo();
    console.log("[latest-content] YouTube actualizado");
  } catch (error) {
    console.warn("[latest-content] Falló YouTube, se conserva el valor anterior.");
    console.warn(String(error));
  }

  try {
    twitch = await getLatestTwitchVod();
    console.log("[latest-content] Twitch actualizado");
  } catch (error) {
    console.warn("[latest-content] Falló Twitch, se conserva el valor anterior.");
    console.warn(String(error));
  }

  if (!youtube && !twitch) {
    console.warn("[latest-content] No hubo datos válidos. No se sobrescribe el JSON.");
    process.exit(0);
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    youtube,
    twitch,
    previousUpdatedAt: previousData?.updatedAt || null
  };

  const previousComparable = previousData
    ? { youtube: previousData.youtube || null, twitch: previousData.twitch || null }
    : null;

  const nextComparable = {
    youtube: payload.youtube || null,
    twitch: payload.twitch || null
  };

  if (previousComparable && sameData(previousComparable, nextComparable)) {
    console.log("[latest-content] Sin cambios reales. No se reescribe el JSON.");
    process.exit(0);
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`${OUTPUT_PATH} updated`);
}

main().catch((err) => {
  console.error("[latest-content] Error inesperado. Se conserva el JSON actual.");
  console.error(err);
  process.exit(0);
});