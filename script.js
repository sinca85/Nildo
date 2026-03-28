const recipesGrid = document.getElementById('recipes-grid');
const recipeModal = document.getElementById('recipeModal');
const recipeModalBody = document.getElementById('recipeModalBody');

async function loadRecipes() {
  try {
    const response = await fetch('./data/recipes.json');
    const recipes = await response.json();

    recipesGrid.innerHTML = recipes.map(recipe => `
      <article class="recipe-card">
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
    `).join('');

    recipesGrid.querySelectorAll('[data-recipe-file]').forEach(button => {
      button.addEventListener('click', () => openRecipe(button.dataset.recipeFile));
    });
  } catch (error) {
    recipesGrid.innerHTML = '<p class="error">No pudimos cargar las recetas.</p>';
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
      liveMessage.textContent = `Fuera de horario. Próxima ventana habitual: ${firstLabel} (Uruguay GMT-3).`;
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

const streamConfig = {
  timezone: "America/Montevideo",
  schedule: [
    {
      days: [3, 4, 5, 6],
      start: "17:00",
      end: "21:00",
      label: "Miércoles a sábado · 17:00 a 21:00"
    }
  ],
  platforms: {
    youtube: true,
    twitch: true
  }
};

(function initLiveEmbedBlock() {
  const panel = document.getElementById("liveEmbedPanel");
  const tabs = document.getElementById("streamTabs");
  const embedContainer = document.getElementById("streamEmbed");
  const statusChip = document.getElementById("streamStatusChip");

  if (!panel || !tabs || !embedContainer || !statusChip) return;

  const host = window.location.hostname;
  const availablePlatforms = getAvailablePlatforms(streamConfig.platforms);

  let activePlatform = availablePlatforms.includes("twitch")
    ? "twitch"
    : availablePlatforms[0] || null;

  let currentFrame = null;
  let isLiveNow = false;
  let currentSlotKey = null;
  let currentRenderedPlatform = null;
  let hasOfflinePlaceholder = false;

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

    const weekdayMap = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6
    };

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

  function getSlotKey(slot) {
    if (!slot) return null;
    const days = Array.isArray(slot.days) ? slot.days.join(",") : "";
    return `${days}|${slot.start}|${slot.end}|${slot.label || ""}`;
  }

  function setActiveTab(platform) {
    activePlatform = platform;

    tabs.querySelectorAll(".stream-tab").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.platform === platform);
    });
  }

  function clearEmbed() {
    if (currentFrame) {
      currentFrame.remove();
      currentFrame = null;
    }
    currentRenderedPlatform = null;
  }

  function createTwitchEmbed() {
    const iframe = document.createElement("iframe");
    iframe.className = "stream-frame";
    iframe.allowFullscreen = true;
    iframe.scrolling = "no";
    iframe.src = `https://player.twitch.tv/?channel=soynildo&parent=${encodeURIComponent(host)}&autoplay=false`;
    return iframe;
  }

  function createYouTubeEmbed() {
    const iframe = document.createElement("iframe");
    iframe.className = "stream-frame";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.src = "https://www.youtube.com/embed/live_stream?channel=UCmt8wj7wz8wczYFJz6v3mzA&autoplay=0";
    return iframe;
  }

  function renderPlatform(platform, force = false) {
    if (!platform) return;

    if (!force && currentRenderedPlatform === platform && currentFrame) {
      setActiveTab(platform);
      return;
    }

    clearEmbed();
    setActiveTab(platform);

    const placeholder = embedContainer.querySelector(".stream-placeholder");
    if (placeholder) {
      placeholder.remove();
    }

    const frame = platform === "youtube" ? createYouTubeEmbed() : createTwitchEmbed();
    currentFrame = frame;
    currentRenderedPlatform = platform;
    hasOfflinePlaceholder = false;
    embedContainer.appendChild(frame);
  }

  function renderOffline(force = false) {
    if (!force && !isLiveNow && hasOfflinePlaceholder) {
      statusChip.textContent = "OFFLINE";
      tabs.hidden = true;
      return;
    }

    clearEmbed();
    tabs.hidden = true;
    statusChip.textContent = "OFFLINE";

    embedContainer.innerHTML = `
      <div class="stream-placeholder">
        <h3>Bloque pensado para stream</h3>
        <p>
          Ahora mismo está fuera del horario definido. Cuando entre en la franja del vivo,
          acá se activa automáticamente el player.
        </p>
      </div>
    `;

    isLiveNow = false;
    currentSlotKey = null;
    hasOfflinePlaceholder = true;
  }

  function renderOnline(slot, force = false) {
    if (!availablePlatforms.length) {
      renderOffline(force);
      return;
    }

    const nextSlotKey = getSlotKey(slot);

    tabs.hidden = false;
    statusChip.textContent = slot?.label ? slot.label : "EN VIVO";

    if (!activePlatform || !availablePlatforms.includes(activePlatform)) {
      activePlatform = availablePlatforms.includes("twitch")
        ? "twitch"
        : availablePlatforms[0];
    }

    if (!force && isLiveNow && currentSlotKey === nextSlotKey && currentRenderedPlatform === activePlatform && currentFrame) {
      setActiveTab(activePlatform);
      hasOfflinePlaceholder = false;
      return;
    }

    renderPlatform(activePlatform, force);
    isLiveNow = true;
    currentSlotKey = nextSlotKey;
    hasOfflinePlaceholder = false;
  }

  function evaluateSchedule() {
    const slot = getCurrentScheduleSlot();
    const nextSlotKey = getSlotKey(slot);

    if (!slot) {
      if (isLiveNow || !hasOfflinePlaceholder) {
        renderOffline(true);
      } else {
        statusChip.textContent = "OFFLINE";
        tabs.hidden = true;
      }
      return;
    }

    if (!isLiveNow) {
      renderOnline(slot, true);
      return;
    }

    if (currentSlotKey !== nextSlotKey) {
      renderOnline(slot, true);
      return;
    }

    statusChip.textContent = slot?.label ? slot.label : "EN VIVO";
    tabs.hidden = false;
    setActiveTab(activePlatform);
  }

  tabs.addEventListener("click", (event) => {
    const btn = event.target.closest(".stream-tab");
    if (!btn) return;

    const slot = getCurrentScheduleSlot();
    if (!slot) return;

    const nextPlatform = btn.dataset.platform;

    if (!nextPlatform || nextPlatform === currentRenderedPlatform) {
      setActiveTab(activePlatform);
      return;
    }

    renderPlatform(nextPlatform, true);
    isLiveNow = true;
    currentSlotKey = getSlotKey(slot);
    statusChip.textContent = slot?.label ? slot.label : "EN VIVO";
    tabs.hidden = false;
  });

  evaluateSchedule();
  setInterval(evaluateSchedule, 30000);
})();