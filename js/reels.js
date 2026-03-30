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

  const videoModal = document.getElementById("videoModal");
  const videoModalBody = document.getElementById("videoModalBody");

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

  function openVideoModal(item) {
    if (!videoModal || !videoModalBody) {
      window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }

    if (!item.videoUrl) {
      window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }

    videoModalBody.innerHTML = `
      <video
        class="video-modal__player"
        src="${item.videoUrl}"
        poster="${item.image || ""}"
        controls
        autoplay
        playsinline
        preload="metadata"
      ></video>
    `;

    videoModal.classList.add("is-open");
    videoModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeVideoModal() {
    if (!videoModal || !videoModalBody) return;

    const video = videoModalBody.querySelector("video");
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }

    videoModalBody.innerHTML = "";
    videoModal.classList.remove("is-open");
    videoModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  document.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-video-modal]")) {
      closeVideoModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && videoModal?.classList.contains("is-open")) {
      closeVideoModal();
    }
  });

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

    const visual = reelsCard.querySelector(".reels-card__visual");
    if (visual) {
      visual.style.cursor = "pointer";
      visual.onclick = () => openVideoModal(item);
    }

    const play = reelsCard.querySelector(".reels-card__play");
    if (play) {
      play.style.cursor = "pointer";
      play.onclick = (e) => {
        e.stopPropagation();
        openVideoModal(item);
      };
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