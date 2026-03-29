export async function initReelsBlock() {
  const prevBtn = document.getElementById("reels-prev");
  const nextBtn = document.getElementById("reels-next");
  const reelsEmbed = document.getElementById("reelsEmbed");
  const reelCount = document.getElementById("reelCount");
  const reelLink = document.getElementById("reelLink");

  if (!prevBtn || !nextBtn || !reelsEmbed || !reelCount || !reelLink) {
    return;
  }

  let reels = [];
  let currentIndex = 0;

  try {
    const response = await fetch("./data/reels.json", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    reels = Array.isArray(json.items) ? json.items.filter((item) => item && item.url) : [];
  } catch (error) {
    console.error("[reels] No se pudo cargar data/reels.json", error);
    reelsEmbed.innerHTML = `
      <div class="stream-placeholder">
        <h3>No se pudieron cargar los reels</h3>
        <p>Por ahora queda disponible el acceso directo a Instagram.</p>
      </div>
    `;
    reelCount.textContent = "0 / 0";
    reelLink.href = "https://www.instagram.com/soynildo/";
    return;
  }

  if (!reels.length) {
    reelsEmbed.innerHTML = `
      <div class="stream-placeholder">
        <h3>No hay reels cargados</h3>
        <p>Agregá items en data/reels.json para mostrarlos acá.</p>
      </div>
    `;
    reelCount.textContent = "0 / 0";
    reelLink.href = "https://www.instagram.com/soynildo/";
    return;
  }

  currentIndex = Math.floor(Math.random() * reels.length);

  function renderReel(index) {
    const item = reels[index];
    const permalink = item.url;

    reelCount.textContent = `${index + 1} / ${reels.length}`;
    reelLink.href = permalink;

    reelsEmbed.innerHTML = `
      <blockquote
        class="instagram-media"
        data-instgrm-permalink="${permalink}"
        data-instgrm-version="14"
        style="background:#111; border:0; border-radius:18px; margin:0 auto; max-width:540px; min-width:280px; width:100%;"
      ></blockquote>
    `;

    if (
      window.instgrm &&
      window.instgrm.Embeds &&
      typeof window.instgrm.Embeds.process === "function"
    ) {
      window.instgrm.Embeds.process();
    }
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