const twitchConfig = {
  channel: "soynildo",
  latestVodId: null
};

const youtubeConfig = {
  channelId: "UCmt8wj7wz8wczYFJz6v3mzA",
  latestVideoId: null
};

async function getLiveStatusConfig() {
  try {
    const res = await fetch(`./live-status.json?v=${Date.now()}`);
    if (!res.ok) throw new Error("No se pudo cargar live-status.json");
    const data = await res.json();

    return {
      timezone: data.timezone || "America/Montevideo",
      schedule: Array.isArray(data.schedule) ? data.schedule : [],
      platforms: data.platforms || {}
    };
  } catch (error) {
    console.error("No se pudo cargar live-status.json", error);
    return {
      timezone: "America/Montevideo",
      schedule: [],
      platforms: { youtube: true, twitch: true }
    };
  }
}

async function getLatestContent() {
  try {
    const res = await fetch(`./data/latest-content.json?v=${Date.now()}`);
    if (!res.ok) throw new Error("No se pudo cargar latest-content.json");
    return await res.json();
  } catch (error) {
    console.error("No se pudo cargar latest-content.json", error);
    return null;
  }
}

export async function initLiveEmbedBlock() {
  const panel = document.getElementById("liveEmbedPanel");
  const tabs = document.getElementById("streamTabs");
  const embedContainer = document.getElementById("streamEmbed");
  const heroTitle = document.getElementById("heroStreamTitle");

  if (!panel || !tabs || !embedContainer) return;

  const [streamConfig, latestContent] = await Promise.all([
    getLiveStatusConfig(),
    getLatestContent()
  ]);

  if (latestContent?.twitch?.latestVodId) {
    twitchConfig.latestVodId = latestContent.twitch.latestVodId;
  }

  if (latestContent?.youtube?.latestVideoId) {
    youtubeConfig.latestVideoId = latestContent.youtube.latestVideoId;
  }

  const host = window.location.hostname;
  const availablePlatforms = getAvailablePlatforms(streamConfig.platforms);

  let activePlatform = availablePlatforms.includes("twitch")
    ? "twitch"
    : availablePlatforms[0] || null;

  let currentFrame = null;
  let currentRenderedMode = null;
  let isLiveNow = false;

  buildTabs();

  function getAvailablePlatforms(platforms) {
    return Object.entries(platforms || {})
      .filter(([, enabled]) => Boolean(enabled))
      .map(([name]) => name);
  }

  function buildTabs() {
    tabs.innerHTML = "";

    if (!availablePlatforms.length) {
      tabs.hidden = true;
      return;
    }

    availablePlatforms.forEach((platform) => {
      const button = document.createElement("button");
      button.className = `stream-tab${platform === activePlatform ? " is-active" : ""}`;
      button.type = "button";
      button.dataset.platform = platform;
      button.textContent = platform === "youtube" ? "YouTube" : "Twitch";
      tabs.appendChild(button);
    });

    tabs.hidden = false;
  }

  function setHeroTitle(live) {
    if (!heroTitle) return;
    heroTitle.textContent = live ? "Mirá en vivo:" : "Mirá lo último:";
  }

  function setActiveTab(platform) {
    activePlatform = platform;
    tabs.querySelectorAll(".stream-tab").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.platform === platform);
    });
  }

  function toMinutes(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }

  function getNowInTimezone(timezone) {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });

    const parts = formatter.formatToParts(now);
    const weekday = parts.find((p) => p.type === "weekday")?.value;
    const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);

    const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

    return {
      day: weekdayMap[weekday],
      minutes: hour * 60 + minute
    };
  }

  function getCurrentScheduleSlot() {
    const { day, minutes } = getNowInTimezone(streamConfig.timezone || "America/Montevideo");
    const schedule = Array.isArray(streamConfig.schedule) ? streamConfig.schedule : [];

    return (
      schedule.find((slot) => {
        const days = Array.isArray(slot.days) ? slot.days : [];
        const start = toMinutes(slot.start);
        const end = toMinutes(slot.end);
        return days.includes(day) && minutes >= start && minutes < end;
      }) || null
    );
  }

  function clearEmbed() {
    if (currentFrame) {
      currentFrame.remove();
      currentFrame = null;
    }
    embedContainer.innerHTML = "";
    currentRenderedMode = null;
  }

  function createTwitchLiveEmbed() {
    const iframe = document.createElement("iframe");
    iframe.className = "stream-frame";
    iframe.allowFullscreen = true;
    iframe.scrolling = "no";
    iframe.src = `https://player.twitch.tv/?channel=${twitchConfig.channel}&parent=${encodeURIComponent(host)}&autoplay=false`;
    return iframe;
  }

  function createTwitchVodEmbed(videoId) {
    const iframe = document.createElement("iframe");
    iframe.className = "stream-frame";
    iframe.allowFullscreen = true;
    iframe.scrolling = "no";
    iframe.src = `https://player.twitch.tv/?video=${videoId}&parent=${encodeURIComponent(host)}&autoplay=false`;
    return iframe;
  }

  function createYouTubeLiveEmbed() {
    const iframe = document.createElement("iframe");
    iframe.className = "stream-frame";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.src = `https://www.youtube.com/embed/live_stream?channel=${youtubeConfig.channelId}&autoplay=0`;
    return iframe;
  }

  function createYouTubeVideoEmbed(videoId) {
    const iframe = document.createElement("iframe");
    iframe.className = "stream-frame";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=0`;
    return iframe;
  }

  function renderTwitchLive(force = false) {
    if (!force && currentRenderedMode === "twitch-live" && currentFrame) return;
    clearEmbed();
    setActiveTab("twitch");
    currentFrame = createTwitchLiveEmbed();
    embedContainer.appendChild(currentFrame);
    currentRenderedMode = "twitch-live";
  }

  function renderTwitchVod(force = false) {
    if (!force && currentRenderedMode === "twitch-vod" && currentFrame) return;
    clearEmbed();
    setActiveTab("twitch");

    if (!twitchConfig.latestVodId) {
      embedContainer.innerHTML = `
        <div class="stream-placeholder">
          <h3>Último stream</h3>
          <p>No hay un VOD reciente disponible.</p>
        </div>
      `;
      currentRenderedMode = "twitch-vod-empty";
      return;
    }

    currentFrame = createTwitchVodEmbed(twitchConfig.latestVodId);
    embedContainer.appendChild(currentFrame);
    currentRenderedMode = "twitch-vod";
  }

  function renderYouTube(force = false) {
    if (
      !force &&
      ((isLiveNow && currentRenderedMode === "youtube-live") ||
        (!isLiveNow && currentRenderedMode === "youtube-vod")) &&
      currentFrame
    ) {
      return;
    }

    clearEmbed();
    setActiveTab("youtube");

    if (isLiveNow) {
      currentFrame = createYouTubeLiveEmbed();
      embedContainer.appendChild(currentFrame);
      currentRenderedMode = "youtube-live";
      return;
    }

    if (!youtubeConfig.latestVideoId) {
      embedContainer.innerHTML = `
        <div class="stream-placeholder">
          <h3>Último video</h3>
          <p>No hay un video reciente disponible.</p>
        </div>
      `;
      currentRenderedMode = "youtube-empty";
      return;
    }

    currentFrame = createYouTubeVideoEmbed(youtubeConfig.latestVideoId);
    embedContainer.appendChild(currentFrame);
    currentRenderedMode = "youtube-vod";
  }

  function renderCurrentState(force = false) {
    const slot = getCurrentScheduleSlot();
    isLiveNow = !!slot;
    setHeroTitle(isLiveNow);

    if (activePlatform === "youtube") {
      renderYouTube(force);
    } else {
      if (isLiveNow) {
        renderTwitchLive(force);
      } else {
        renderTwitchVod(force);
      }
    }
  }

  tabs.addEventListener("click", (event) => {
    const btn = event.target.closest(".stream-tab");
    if (!btn) return;

    const nextPlatform = btn.dataset.platform;
    if (!nextPlatform) return;

    activePlatform = nextPlatform;
    renderCurrentState(true);
  });

  renderCurrentState(true);
  setInterval(() => renderCurrentState(false), 30000);
}