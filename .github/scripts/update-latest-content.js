const fs = require("fs");
const path = require("path");
const { XMLParser } = require("fast-xml-parser");
const cheerio = require("cheerio");

const OUTPUT_PATH = path.join(process.cwd(), "data", "latest-content.json");

async function getLatestYouTubeVideo() {
  const channelId = "UCmt8wj7wz8wczYFJz6v3mzA";
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  const res = await fetch(rssUrl);
  if (!res.ok) {
    throw new Error(`YouTube RSS error: ${res.status}`);
  }

  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const data = parser.parse(xml);

  const firstEntry = Array.isArray(data.feed.entry) ? data.feed.entry[0] : data.feed.entry;

  return {
    latestVideoId: firstEntry["yt:videoId"],
    latestTitle: firstEntry.title,
    published: firstEntry.published
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

  return {
    latestVodId: vodId || "2734134378"
  };
}

async function main() {
  const [youtube, twitch] = await Promise.all([
    getLatestYouTubeVideo(),
    getLatestTwitchVod()
  ]);

  const payload = {
    updatedAt: new Date().toISOString(),
    youtube,
    twitch
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2));
  console.log(`${OUTPUT_PATH} updated`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});