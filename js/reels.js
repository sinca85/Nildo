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
  let modalIndex = 0;

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

  function buildCommentsHtml(item) {
    const comments = Array.isArray(item.comments) ? item.comments.slice(0, 5) : [];

    if (!comments.length) {
      return `
        <div class="video-modal__comments-empty">
          Todavía no hay comentarios cargados para este reel.
        </div>
      `;
    }

    return `
      <div class="video-modal__comments-list">
        ${comments
          .map(
            (comment) => `
              <article class="video-modal__comment">
                <div class="video-modal__comment-head">
                  <strong>${escapeHtml(comment.username || "Usuario")}</strong>
                </div>
                <p>${escapeHtml(comment.text || "")}</p>
              </article>
            `
          )
          .join("")}
      </div>
    `;
  }

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderModalItem(index) {
    if (!videoModal || !videoModalBody || !reels.length) return;

    const item = reels[index];
    modalIndex = index;

    if (!item.videoUrl) {
      window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }

    videoModalBody.innerHTML = `
      <div class="video-modal__layout">
        <div class="video-modal__media">
          <button type="button" class="video-modal__nav video-modal__nav--prev" id="videoModalPrev" aria-label="Reel anterior">‹</button>

          <video
            class="video-modal__player"
            src="${item.videoUrl}"
            poster="${item.image || ""}"
            controls
            autoplay
            playsinline
            preload="metadata"
          ></video>

          <button type="button" class="video-modal__nav video-modal__nav--next" id="videoModalNext" aria-label="Siguiente reel">›</button>
        </div>

        <aside class="video-modal__side">
          <span class="video-modal__badge">${escapeHtml(getBadgeLabel(item))}</span>
          <h3 class="video-modal__title">${escapeHtml(getFallbackTitle(item, index))}</h3>
          <p class="video-modal__text">${escapeHtml(getFallbackText(item))}</p>

          <div class="video-modal__meta">
            <span>${index + 1} / ${reels.length}</span>
            <span>${escapeHtml(item.code || "Instagram")}</span>
          </div>

          <div class="video-modal__actions">
            <a
              class="hero-button hero-button--solid"
              href="${item.url}"
              target="_blank"
              rel="noreferrer"
            >
              Ver en Instagram
            </a>
          </div>

          <div class="video-modal__comments">
            <h4>Últimos comentarios</h4>
            ${buildCommentsHtml(item)}
          </div>
        </aside>
      </div>
    `;

    const modalPrev = document.getElementById("videoModalPrev");
    const modalNext = document.getElementById("videoModalNext");

    if (modalPrev) {
      modalPrev.addEventListener("click", () => {
        const nextIndex = (modalIndex - 1 + reels.length) % reels.length;
        renderModalItem(nextIndex);
      });
    }

    if (modalNext) {
      modalNext.addEventListener("click", () => {
        const nextIndex = (modalIndex + 1) % reels.length;
        renderModalItem(nextIndex);
      });
    }
  }

  function openVideoModal(itemIndex) {
    if (!videoModal || !videoModalBody) {
      const item = reels[itemIndex];
      window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }

    renderModalItem(itemIndex);
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
      return;
    }

    if (!videoModal?.classList.contains("is-open") || !reels.length) return;

    if (event.key === "ArrowLeft") {
      const nextIndex = (modalIndex - 1 + reels.length) % reels.length;
      renderModalItem(nextIndex);
    }

    if (event.key === "ArrowRight") {
      const nextIndex = (modalIndex + 1) % reels.length;
      renderModalItem(nextIndex);
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
      visual.onclick = () => openVideoModal(index);
    }

    const play = reelsCard.querySelector(".reels-card__play");
    if (play) {
      play.style.cursor = "pointer";
      play.onclick = (e) => {
        e.stopPropagation();
        openVideoModal(index);
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