export async function initSpotifyBlock() {
  const prevBtn = document.getElementById("spotify-prev");
  const nextBtn = document.getElementById("spotify-next");
  const spotifyEmbed = document.getElementById("spotifyEmbed");

  if (!prevBtn || !nextBtn || !spotifyEmbed) return;

  let playlists = [];
  let currentIndex = 0;

  try {
    const res = await fetch(`./data/spotify-playlists.json?v=${Date.now()}`);
    const json = await res.json();

    playlists = Array.isArray(json.items)
      ? json.items.filter(p => p && (p.embedUrl || p.id))
      : [];
  } catch (err) {
    console.error("[spotify] error", err);
    return;
  }

  if (!playlists.length) return;

  currentIndex = Math.floor(Math.random() * playlists.length);

  function render(index) {
    const item = playlists[index];

    if (item.embedUrl) {
      spotifyEmbed.src = item.embedUrl;
    } else {
      spotifyEmbed.src = `https://open.spotify.com/embed/playlist/${item.id}`;
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