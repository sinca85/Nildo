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
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "es-AR,es;q=0.9,en;q=0.8"
    }
  });

  const html = await res.text();

  fs.writeFileSync(
    path.join(process.cwd(), "data", "twitch-debug.html"),
    html,
    "utf8"
  );

  console.log("[latest-content] Twitch status:", res.status);
  console.log("[latest-content] Twitch HTML length:", html.length);

  if (!res.ok) {
    throw new Error(`Twitch page error: ${res.status}`);
  }

  const $ = cheerio.load(html);

  const links = [];

  $('a[href*="/videos/"]').each((_, el) => {
    const href = $(el).attr("href") || "";
    const match = href.match(/\/videos\/(\d+)/);

    if (match) {
      links.push({
        href,
        vodId: match[1]
      });
    }
  });

  console.log("[latest-content] Twitch video links encontrados:", links);

  const first = links[0];

  if (!first?.vodId) {
    throw new Error("No se encontró VOD en Twitch");
  }

  return {
    latestVodId: first.vodId,
    latestVodUrl: `https://www.twitch.tv/videos/${first.vodId}`
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