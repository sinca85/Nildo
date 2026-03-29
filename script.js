const recipesFeatured = document.getElementById('recipes-featured');
const recipesCarouselTrack = document.getElementById('recipes-carousel-track');
const recipesPrev = document.getElementById('recipes-prev');
const recipesNext = document.getElementById('recipes-next');

const recipeModal = document.getElementById('recipeModal');
const recipeModalBody = document.getElementById('recipeModalBody');

function bindRecipeButtons(scope = document) {
  scope.querySelectorAll('[data-recipe-file]').forEach(button => {
    button.addEventListener('click', () => openRecipe(button.dataset.recipeFile));
  });
}

function renderFeaturedCard(recipe) {
  return `
    <article class="recipe-card recipe-card--featured">
      <img class="recipe-card__image" src="${recipe.image}" alt="${recipe.title}" />
      <div class="recipe-card__overlay"></div>
      <div class="recipe-card__content">
        <div class="recipe-card__tag">Destacada</div>
        <h3 class="recipe-card__title">${recipe.title}</h3>
        <p class="recipe-card__subtitle">${recipe.subtitle}</p>
        <button class="recipe-card__button" type="button" data-recipe-file="${recipe.file}">
          Ver receta
        </button>
      </div>
    </article>
  `;
}

function renderCompactCard(recipe) {
  return `
    <article class="recipe-card recipe-card--compact">
      <img class="recipe-card__image" src="${recipe.image}" alt="${recipe.title}" />
      <div class="recipe-card__overlay"></div>
      <div class="recipe-card__content">
        <h3 class="recipe-card__title">${recipe.title}</h3>
        <p class="recipe-card__subtitle">${recipe.subtitle}</p>
        <button class="recipe-card__button" type="button" data-recipe-file="${recipe.file}">
          Ver receta
        </button>
      </div>
    </article>
  `;
}

async function loadRecipes() {
  try {
    const response = await fetch('./data/recipes.json');
    const recipes = await response.json();

    const featured = recipes.filter(recipe => recipe.featured).slice(0, 2);
    const carousel = recipes.filter(recipe => !recipe.featured);

    recipesFeatured.innerHTML = featured.map(renderFeaturedCard).join('');
    recipesCarouselTrack.innerHTML = carousel.map(renderCompactCard).join('');

    bindRecipeButtons(recipesFeatured);
    bindRecipeButtons(recipesCarouselTrack);

    if (recipesPrev && recipesNext && recipesCarouselTrack) {
      const getStep = () => {
        const firstCard = recipesCarouselTrack.querySelector('.recipe-card');
        if (!firstCard) return 340;

        const cardWidth = firstCard.getBoundingClientRect().width;
        const trackStyles = window.getComputedStyle(recipesCarouselTrack);
        const gap = parseFloat(trackStyles.columnGap || trackStyles.gap || 0);

        return cardWidth + gap;
      };

      recipesPrev.addEventListener('click', () => {
        recipesCarouselTrack.scrollBy({ left: -getStep(), behavior: 'smooth' });
      });

      recipesNext.addEventListener('click', () => {
        recipesCarouselTrack.scrollBy({ left: getStep(), behavior: 'smooth' });
      });
    }
  } catch (error) {
    if (recipesFeatured) {
      recipesFeatured.innerHTML = '<p class="error">No pudimos cargar las recetas.</p>';
    }
    console.error(error);
  }
}

async function openRecipe(file) {
  recipeModal.classList.add('is-open');
  recipeModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  recipeModalBody.innerHTML = '<div class="loading">Cargando receta...</div>';

  try {
    const response = await fetch(`./${file}`);
    const html = await response.text();
    recipeModalBody.innerHTML = html;
  } catch (error) {
    recipeModalBody.innerHTML = '<div class="error">No pudimos cargar esta receta.</div>';
    console.error(error);
  }
}

function closeModal() {
  recipeModal.classList.remove('is-open');
  recipeModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  recipeModalBody.innerHTML = '';
}

document.addEventListener('click', (event) => {
  if (event.target.matches('[data-close-modal]')) {
    closeModal();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && recipeModal.classList.contains('is-open')) {
    closeModal();
  }
});

loadRecipes();

async function loadLiveStatus() {
  const youtubeBadge = document.getElementById("youtubeBadge");
  const twitchBadge = document.getElementById("twitchBadge");
  const liveMessage = document.getElementById("liveMessage");

  if (!youtubeBadge || !twitchBadge || !liveMessage) return;

  try {
    const res = await fetch("./live-status.json?v=" + Date.now());
    const data = await res.json();

    const timezone = data.timezone || "America/Montevideo";
    const schedule = Array.isArray(data.schedule) ? data.schedule : [];
    const platforms = data.platforms || {};

    const nowParts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(new Date());

    const weekdayMap = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6
    };

    const weekdayShort = nowParts.find(p => p.type === "weekday")?.value;
    const hour = nowParts.find(p => p.type === "hour")?.value || "00";
    const minute = nowParts.find(p => p.type === "minute")?.value || "00";

    const currentDay = weekdayMap[weekdayShort];
    const currentMinutes = parseInt(hour, 10) * 60 + parseInt(minute, 10);

    function toMinutes(timeStr) {
      const [h, m] = timeStr.split(":").map(Number);
      return h * 60 + m;
    }

    const activeSlot = schedule.find(slot => {
      const validDay = Array.isArray(slot.days) && slot.days.includes(currentDay);
      if (!validDay) return false;

      const startMinutes = toMinutes(slot.start);
      const endMinutes = toMinutes(slot.end);

      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    });

    const isScheduledLive = !!activeSlot;

    youtubeBadge.classList.toggle("is-live", isScheduledLive && !!platforms.youtube);
    twitchBadge.classList.toggle("is-live", isScheduledLive && !!platforms.twitch);

    if (isScheduledLive) {
      if (platforms.youtube && platforms.twitch) {
        liveMessage.textContent = `Ahora mismo está en horario de transmisión en YouTube y Twitch.`;
      } else if (platforms.youtube) {
        liveMessage.textContent = `Ahora mismo está en horario de transmisión en YouTube.`;
      } else if (platforms.twitch) {
        liveMessage.textContent = `Ahora mismo está en horario de transmisión en Twitch.`;
      } else {
        liveMessage.textContent = `Ahora mismo está en horario de transmisión.`;
      }
    } else {
      const firstLabel = schedule[0]?.label || "Miércoles a sábado · 17:00 a 21:00";
      liveMessage.textContent = `Fuera de horario. Próxima stream: ${firstLabel} (Uruguay GMT-3).`;
    }
  } catch (error) {
    liveMessage.textContent = "No se pudo verificar el horario del stream.";
    console.error("Error loading live schedule:", error);
  }
}

loadLiveStatus();
setInterval(loadLiveStatus, 60000);

// =========================
// STREAM TABS + HORARIO JSON
// =========================

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
    const res = await fetch("./live-status.json?v=" + Date.now());
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
    const res = await fetch("./latest-content.json?v=" + Date.now());
    if (!res.ok) throw new Error("No se pudo cargar latest-content.json");
    return await res.json();
  } catch (error) {
    console.error("No se pudo cargar latest-content.json", error);
    return null;
  }
}

(async function initLiveEmbedBlock() {
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
    if (!force && ((isLiveNow && currentRenderedMode === "youtube-live") || (!isLiveNow && currentRenderedMode === "youtube-vod")) && currentFrame) {
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
})();