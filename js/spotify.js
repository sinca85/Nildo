export async function initSpotifyBlock() {
  const prevBtn = document.getElementById("spotify-prev");
  const nextBtn = document.getElementById("spotify-next");
  const spotifyEmbed = document.getElementById("spotifyEmbed");
  const spotifyCount = document.getElementById("spotifyCount");

  if (!prevBtn || !nextBtn || !spotifyEmbed) return;

  let playlists = [];
  let currentIndex = 0;

  try {
    const res = await fetch(`./data/spotify-playlists.json?v=${Date.now()}`, {
      cache: "no-cache"
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();

    playlists = Array.isArray(json.items)
      ? json.items.filter((item) => item && (item.embedUrl || item.id))
      : [];
  } catch (err) {
    console.error("[spotify] error", err);

    if (spotifyCount) {
      spotifyCount.textContent = "0 / 0";
    }

    return;
  }

  if (!playlists.length) {
    if (spotifyCount) {
      spotifyCount.textContent = "0 / 0";
    }
    return;
  }

  currentIndex = Math.floor(Math.random() * playlists.length);

  function render(index) {
    const item = playlists[index];

    if (item.embedUrl) {
      spotifyEmbed.src = item.embedUrl;
    } else {
      spotifyEmbed.src = `https://open.spotify.com/embed/playlist/${item.id}?utm_source=generator&theme=0`;
    }

    if (spotifyCount) {
      spotifyCount.textContent = `${index + 1} / ${playlists.length}`;
    }
  }

  prevBtn.addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + playlists.length) % playlists.length;
    render(currentIndex);
  });

  nextBtn.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % playlists.length;
    render(currentIndex);
  });

  render(currentIndex);
}