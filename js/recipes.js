const recipesFeatured = document.getElementById("recipes-featured");
const recipesCarouselTrack = document.getElementById("recipes-carousel-track");
const recipesPrev = document.getElementById("recipes-prev");
const recipesNext = document.getElementById("recipes-next");

const recipeModal = document.getElementById("recipeModal");
const recipeModalBody = document.getElementById("recipeModalBody");

function getOptimizedImage(path = "", variant = "360") {
  const filename = path.split("/").pop() || "";
  const baseName = filename.replace(/\.[^.]+$/, "");
  const optimizedFilename = `${baseName}.jpg`;

  if (variant === "420") {
    return `./assets/images/420/${optimizedFilename}`;
  }

  return `./assets/images/360/${optimizedFilename}`;
}

function bindRecipeButtons(scope = document) {
  scope.querySelectorAll("[data-recipe-file]").forEach((button) => {
    button.addEventListener("click", () => openRecipe(button.dataset.recipeFile));
  });
}

function renderFeaturedCard(recipe) {
  const imageSrc = getOptimizedImage(recipe.image, "420");
  const extraClass = recipe.type === "b" ? " recipe-card__image--type-b" : "";

  return `
    <article class="recipe-card recipe-card--featured">
      <img
        class="recipe-card__image${extraClass}"
        src="${imageSrc}"
        alt="${recipe.title}"
        loading="lazy"
        decoding="async"
      />
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
  const imageSrc = getOptimizedImage(recipe.image, "360");
  const extraClass = recipe.type === "b" ? " recipe-card__image--type-b" : "";

  return `
    <article class="recipe-card recipe-card--compact">
      <img
        class="recipe-card__image${extraClass}"
        src="${imageSrc}"
        alt="${recipe.title}"
        loading="lazy"
        decoding="async"
      />
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
    const response = await fetch("./data/recipes.json");
    const recipes = await response.json();

    const featured = recipes.filter((recipe) => recipe.featured).slice(0, 2);
    const carousel = recipes.filter((recipe) => !recipe.featured);

    if (recipesFeatured) {
      recipesFeatured.innerHTML = featured.map(renderFeaturedCard).join("");
      bindRecipeButtons(recipesFeatured);
    }

    if (recipesCarouselTrack) {
      recipesCarouselTrack.innerHTML = carousel.map(renderCompactCard).join("");
      bindRecipeButtons(recipesCarouselTrack);
    }

    if (recipesPrev && recipesNext && recipesCarouselTrack) {
      const getStep = () => {
        const firstCard = recipesCarouselTrack.querySelector(".recipe-card");
        if (!firstCard) return 340;

        const cardWidth = firstCard.getBoundingClientRect().width;
        const trackStyles = window.getComputedStyle(recipesCarouselTrack);
        const gap = parseFloat(trackStyles.columnGap || trackStyles.gap || 0);

        return cardWidth + gap;
      };

      recipesPrev.addEventListener("click", () => {
        recipesCarouselTrack.scrollBy({ left: -getStep(), behavior: "smooth" });
      });

      recipesNext.addEventListener("click", () => {
        recipesCarouselTrack.scrollBy({ left: getStep(), behavior: "smooth" });
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
  if (!recipeModal || !recipeModalBody) return;

  recipeModal.classList.add("is-open");
  recipeModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
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
  if (!recipeModal || !recipeModalBody) return;

  recipeModal.classList.remove("is-open");
  recipeModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  recipeModalBody.innerHTML = "";
}

function bindModalEvents() {
  document.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-modal]")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && recipeModal?.classList.contains("is-open")) {
      closeModal();
    }
  });
}

export function initRecipes() {
  bindModalEvents();
  loadRecipes();
}