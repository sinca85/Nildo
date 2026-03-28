
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