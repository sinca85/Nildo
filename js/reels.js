export async function initReelsBlock() {
  const prevBtn = document.getElementById("reels-prev");
  const nextBtn = document.getElementById("reels-next");
  const reelsCard = document.getElementById("reelsCard");
  const reelTitle = document.getElementById("reelTitle");
  const reelText = document.getElementById("reelText");
  const reelCount = document.getElementById("reelCount");
  const reelCode = document.getElementById("reelCode");
  const reelLink = document.getElementById("reelLink");

  if (
    !prevBtn ||
    !nextBtn ||
    !reelsCard ||
    !reelTitle ||
    !reelText ||
    !reelCount ||
    !reelCode ||
    !reelLink
  ) {
    return;
  }

  let reels = [];
  let currentIndex = 0;

  try {
    const response = await fetch("./data/reels.json?v=" + Date.now(), { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    reels = Array.isArray(json.items) ? json.items.filter((item) => item && item.url) : [];
  } catch (error) {
    console.error("[reels] No se pudo cargar data/reels.json", error);
    reelTitle.textContent = "No se pudieron cargar los reels";
    reelText.textContent = "Por ahora queda disponible el acceso directo a Instagram.";
    reelCount.textContent = "0 / 0";
    reelCode.textContent = "sin datos";
    reelLink.href = "https://www.instagram.com/soynildo/";
    return;
  }

  if (!reels.length) {
    reelTitle.textContent = "No hay reels cargados";
    reelText.textContent = "Agregá items en data/reels.json para mostrarlos acá.";
    reelCount.textContent = "0 / 0";
    reelCode.textContent = "sin datos";
    reelLink.href = "https://www.instagram.com/soynildo/";
    return;
  }

  currentIndex = Math.floor(Math.random() * reels.length);

  function getTitle(item, index) {
    if (item.title) return item.title;
    return `Recorte ${String(index + 1).padStart(2, "0")}`;
  }

  function getText(item) {
    if (item.text) return item.text;
    return "Momentos, cocina y clips rápidos del universo Soy Nildo para ir pasando desde la home.";
  }

  function renderReel(index) {
    const item = reels[index];

    reelTitle.textContent = getTitle(item, index);
    reelText.textContent = getText(item);
    reelCount.textContent = `${index + 1} / ${reels.length}`;
    reelCode.textContent = item.code ? `ID ${item.code}` : "Instagram";
    reelLink.href = item.url;

    reelsCard.classList.remove("is-switching");
    void reelsCard.offsetWidth;
    reelsCard.classList.add("is-switching");
  }

  prevBtn.addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + reels.length) % reels.length;
    renderReel(currentIndex);
  });

  nextBtn.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % reels.length;
    renderReel(currentIndex);
  });

  renderReel(currentIndex);
}