
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
