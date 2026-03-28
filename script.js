const RECIPES = {
  espejitos: {
    title: "Espejitos",
    category: "Dulce",
    image: "assets/frola.jpeg",
    imagePosition: "left center",
    intro:
      "Masa sable clásica y de cacao, relleno de dulce de leche y jalea de frutilla con tomate.",
    ingredients: [
      "Masa sable: manteca 125 g, harina 300 g, azúcar 125 g, huevos 3",
      "Masa sable de cacao: manteca 125 g, cacao 35 g, azúcar 125 g, harina 240 g, huevos 2",
      "Jalea: frutillas 500 g, tomates 300 g, azúcar 400 g, menta, jengibre rallado 15 g, coriandro 2 g, jugo de limón 20 ml"
    ],
    steps: [
      "Arenar la manteca con harina y sumar azúcar y huevos para la masa sable.",
      "Para la masa de cacao, cremar la manteca con cacao y azúcar; agregar huevos y harina.",
      "Enfriar, estirar, cortar y hornear ambas masas a 160 °C por unos 8 minutos.",
      "Cocinar la jalea a fuego lento, licuar y terminar con menta si se busca un toque más fresco o picante.",
      "Montar con dulce de leche entre tapas y rellenar el centro con la jalea."
    ]
  },
  espuma: {
    title: "Espuma de arroz con leche",
    category: "Postre",
    image: "assets/espuma_de_arroz_con_leche.jpeg",
    imagePosition: "left center",
    intro:
      "Base de arroz con leche licuada y pasada por sifón para lograr una textura aireada y más ligera.",
    ingredients: [
      "Espuma: arroz con leche 350 g, crema de leche 50 g, 1 carga de N2O",
      "Arroz con leche: leche 2 litros, arroz carnaroli 250 g, azúcar 300 g, yemas 2 o 3, esencia de vainilla 1/2 cdta"
    ],
    steps: [
      "Licuar bien el arroz con leche y sumar la crema.",
      "Pasar por colador fino y cargar el sifón sin superar el límite.",
      "Agregar la carga de N2O, agitar varias veces y reservar frío.",
      "Para la base, cocinar lentamente leche, arroz y azúcar; sumar yemas con vainilla al final.",
      "Probar siempre fuera del plato antes de servir para que la espuma salga pareja."
    ]
  }
};

const modal = document.getElementById("recipeModal");
const modalBody = document.getElementById("recipeModalBody");
const closeModal = document.getElementById("closeModal");
const triggers = document.querySelectorAll("[data-recipe]");

function renderRecipe(recipe) {
  return `
    <article class="modal-recipe">
      <div class="modal-recipe__image" style="--recipe-image: url('${recipe.image}'); --recipe-image-position: ${recipe.imagePosition || "left center"};">
        <div class="modal-recipe__image-inner">
          <img src="${recipe.image}" alt="${recipe.title}" />
        </div>
      </div>
      <div class="modal-recipe__paper">
        <small>${recipe.category}</small>
        <h3>${recipe.title}</h3>
        <p>${recipe.intro}</p>
        <h4>Ingredientes</h4>
        <ul>
          ${recipe.ingredients.map((item) => `<li>${item}</li>`).join("")}
        </ul>
        <h4>Paso a paso</h4>
        <ol>
          ${recipe.steps.map((item) => `<li>${item}</li>`).join("")}
        </ol>
      </div>
    </article>
  `;
}

triggers.forEach((button) => {
  button.addEventListener("click", () => {
    const recipeKey = button.dataset.recipe;
    const recipe = RECIPES[recipeKey];
    if (!recipe) return;
    modalBody.innerHTML = renderRecipe(recipe);
    modal.showModal();
  });
});

closeModal.addEventListener("click", () => modal.close());
modal.addEventListener("click", (event) => {
  const rect = modal.getBoundingClientRect();
  const clickedInDialog =
    rect.top <= event.clientY &&
    event.clientY <= rect.top + rect.height &&
    rect.left <= event.clientX &&
    event.clientX <= rect.left + rect.width;

  if (!clickedInDialog) {
    modal.close();
  }
});
