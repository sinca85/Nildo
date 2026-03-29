export async function initReelsBlock() {
  const prevBtn = document.getElementById("reels-prev");
  const nextBtn = document.getElementById("reels-next");
  const reelsCard = document.getElementById("reelsCard");
  const reelTitle = document.getElementById("reelTitle");
  const reelText = document.getElementById("reelText");
  const reelCount = document.getElementById("reelCount");
  const reelCode = document.getElementById("reelCode");
  const reelLink = document.getElementById("reelLink");
  const reelImage = document.getElementById("reelImage");
  const reelBadge = document.getElementById("reelBadge");

  if (
    !prevBtn ||
    !nextBtn ||
    !reelsCard ||
    !reelTitle ||
    !reelText ||
    !reelCount ||
    !reelCode ||
    !reelLink ||
    !reelImage
  ) {
    return;
  }

  let reels = [];
  let currentIndex = 0;

  try {
    const response = await fetch(`./data/reels.json?v=${Date.now()}`, {
      cache: "no-cache"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    reels = Array.isArray(json.items)
      ? json.items.filter((item) => item && item.url)
      : [];
  } catch (error) {
    console.error("[reels] No se pudo cargar data/reels.json", error);

    reelTitle.textContent = "No se pudieron cargar los reels";
    reelText.textContent = "Por ahora queda disponible el acceso directo a Instagram.";
    reelCount.textContent = "0 / 0";
    reelCode.textContent = "sin datos";
    reelLink.href = "https://www.instagram.com/soynildo/";
    reelImage.removeAttribute("src");
    reelImage.alt = "Reels de Nildo";
    reelsCard.classList.add("is-empty");
    return;
  }

  if (!reels.length) {
    reelTitle.textContent = "No hay reels cargados";
    reelText.textContent = "Agregá items en data/reels.json para mostrarlos acá.";
    reelCount.textContent = "0 / 0";
    reelCode.textContent = "sin datos";
    reelLink.href = "https://www.instagram.com/soynildo/";
    reelImage.removeAttribute("src");
    reelImage.alt = "Reels de Nildo";
    reelsCard.classList.add("is-empty");
    return;
  }

  currentIndex = Math.floor(Math.random() * reels.length);

  function getFallbackTitle(item, index) {
    if (item.title && String(item.title).trim()) {
      return String(item.title).trim();
    }
    return `Recorte ${String(index + 1).padStart(2, "0")}`;
  }

  function getFallbackText(item) {
    if (item.text && String(item.text).trim()) {
      return String(item.text).trim();
    }
    return "Momentos, cocina y clips rápidos del universo Soy Nildo para ir pasando desde la home.";
  }

  function getFallbackImage(item) {
    if (item.image && String(item.image).trim()) {
      return String(item.image).trim();
    }

    if (item.code) {
      return `./assets/images/reels/${item.code}.webp`;
    }

    return "./assets/images/reels/placeholder.webp";
  }

  function getBadgeLabel(item) {
    if (item.type === "reel") return "Reel";
    if (item.type === "p") return "Instagram";
    return "Instagram";
  }

  function renderReel(index) {
    const item = reels[index];

    const title = getFallbackTitle(item, index);
    const text = getFallbackText(item);
    const image = getFallbackImage(item);
    const badge = getBadgeLabel(item);

    reelTitle.textContent = title;
    reelText.textContent = text;
    reelCount.textContent = `${index + 1} / ${reels.length}`;
    reelCode.textContent = item.code ? `ID ${item.code}` : "Instagram";
    reelLink.href = item.url;
    reelImage.src = image;
    reelImage.alt = title;

    if (reelBadge) {
      reelBadge.textContent = badge;
    }

    reelsCard.classList.remove("is-empty");
    reelsCard.classList.remove("is-switching");
    void reelsCard.offsetWidth;
    reelsCard.classList.add("is-switching");
  }

  function goPrev() {
    currentIndex = (currentIndex - 1 + reels.length) % reels.length;
    renderReel(currentIndex);
  }

  function goNext() {
    currentIndex = (currentIndex + 1) % reels.length;
    renderReel(currentIndex);
  }

  prevBtn.addEventListener("click", goPrev);
  nextBtn.addEventListener("click", goNext);

  renderReel(currentIndex);
}