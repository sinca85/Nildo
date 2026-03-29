export async function initSpotifyBlock() {
  const prevBtn = document.getElementById("spotify-prev");
  const nextBtn = document.getElementById("spotify-next");
  const spotifyTitle = document.getElementById("spotifyTitle");
  const spotifyText = document.getElementById("spotifyText");
  const spotifyTracks = document.getElementById("spotifyTracks");
  const spotifySaves = document.getElementById("spotifySaves");
  const spotifyCount = document.getElementById("spotifyCount");
  const spotifyLink = document.getElementById("spotifyLink");
  const spotifyEmbed = document.getElementById("spotifyEmbed");

  if (
    !prevBtn ||
    !nextBtn ||
    !spotifyTitle ||
    !spotifyText ||
    !spotifyTracks ||
    !spotifySaves ||
    !spotifyCount ||
    !spotifyLink ||
    !spotifyEmbed
  ) {
    return;
  }

  let playlists = [];
  let currentIndex = 0;

  try {
    const response = await fetch(`./data/spotify-playlists.json?v=${Date.now()}`, {
      cache: "no-cache"
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    playlists = Array.isArray(json.items) ? json.items.filter((item) => item && item.url) : [];
  } catch (error) {
    console.error("[spotify] No se pudo cargar data/spotify-playlists.json", error);
    spotifyTitle.textContent = "No se pudieron cargar las playlists";
    spotifyText.textContent = "Por ahora queda disponible el perfil público de Spotify.";
    spotifyTracks.textContent = "— temas";
    spotifySaves.textContent = "— guardados";
    spotifyCount.textContent = "0 / 0";
    spotifyLink.href = "https://open.spotify.com/user/12125089526";
    spotifyEmbed.removeAttribute("src");
    return;
  }

  if (!playlists.length) {
    spotifyTitle.textContent = "No hay playlists cargadas";
    spotifyText.textContent = "Agregá items en data/spotify-playlists.json para mostrarlas acá.";
    spotifyTracks.textContent = "— temas";
    spotifySaves.textContent = "— guardados";
    spotifyCount.textContent = "0 / 0";
    spotifyLink.href = "https://open.spotify.com/user/12125089526";
    spotifyEmbed.removeAttribute("src");
    return;
  }

  currentIndex = Math.floor(Math.random() * playlists.length);

  function formatTracks(item) {
    if (typeof item.tracksCount === "number") {
      return `${item.tracksCount} temas`;
    }
    return "— temas";
  }

  function formatSaves(item) {
    if (typeof item.saves === "number") {
      return `${item.saves} guardados`;
    }
    return "— guardados";
  }

  function getDescription(item) {
    if (item.description && String(item.description).trim()) {
      return String(item.description).trim();
    }
    return "Playlist pública de Soy Nildo para acompañar cocina, stream y comunidad.";
  }

  function renderPlaylist(index) {
    const item = playlists[index];

    spotifyTitle.textContent = item.title || "Playlist";
    spotifyText.textContent = getDescription(item);
    spotifyTracks.textContent = formatTracks(item);
    spotifySaves.textContent = formatSaves(item);
    spotifyCount.textContent = `${index + 1} / ${playlists.length}`;
    spotifyLink.href = item.url || "https://open.spotify.com/user/12125089526";

    if (item.embedUrl) {
      spotifyEmbed.src = item.embedUrl;
    } else if (item.id) {
      spotifyEmbed.src = `https://open.spotify.com/embed/playlist/${item.id}?utm_source=generator&theme=0`;
    } else {
      spotifyEmbed.removeAttribute("src");
    }
  }

  prevBtn.addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + playlists.length) % playlists.length;
    renderPlaylist(currentIndex);
  });

  nextBtn.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % playlists.length;
    renderPlaylist(currentIndex);
  });

  renderPlaylist(currentIndex);
}