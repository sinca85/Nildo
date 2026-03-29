export async function initLiveStatus() {
  const youtubeBadge = document.getElementById("youtubeBadge");
  const twitchBadge = document.getElementById("twitchBadge");
  const liveMessage = document.getElementById("liveMessage");

  if (!youtubeBadge || !twitchBadge || !liveMessage) return;

  async function loadLiveStatus() {
    try {
      const res = await fetch(`./data/live-status.json?v=${Date.now()}`);
      const data = await res.json();

      const timezone = data.timezone || "America/Montevideo";
      const schedule = Array.isArray(data.schedule) ? data.schedule : [];
      const platforms = data.platforms || {};

      const nowParts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).formatToParts(new Date());

      const weekdayMap = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6
      };

      const weekdayShort = nowParts.find((p) => p.type === "weekday")?.value;
      const hour = nowParts.find((p) => p.type === "hour")?.value || "00";
      const minute = nowParts.find((p) => p.type === "minute")?.value || "00";

      const currentDay = weekdayMap[weekdayShort];
      const currentMinutes = parseInt(hour, 10) * 60 + parseInt(minute, 10);

      function toMinutes(timeStr) {
        const [h, m] = timeStr.split(":").map(Number);
        return h * 60 + m;
      }

      const activeSlot = schedule.find((slot) => {
        const validDay = Array.isArray(slot.days) && slot.days.includes(currentDay);
        if (!validDay) return false;

        const startMinutes = toMinutes(slot.start);
        const endMinutes = toMinutes(slot.end);

        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      });

      const isScheduledLive = !!activeSlot;

      const statusText = document.getElementById("streamStatusText");

      if (statusText) {
        if (isScheduledLive) {
          statusText.textContent = "(● en vivo)";
          statusText.classList.add("live");
          statusText.classList.remove("offline");
        } else {
          statusText.textContent = "(● offline)";
          statusText.classList.add("offline");
          statusText.classList.remove("live");
        }
      }

      youtubeBadge.classList.toggle("is-live", isScheduledLive && !!platforms.youtube);
      twitchBadge.classList.toggle("is-live", isScheduledLive && !!platforms.twitch);

      if (isScheduledLive) {
        if (platforms.youtube && platforms.twitch) {
          liveMessage.textContent = "Ahora mismo está en horario de transmisión en YouTube y Twitch.";
        } else if (platforms.youtube) {
          liveMessage.textContent = "Ahora mismo está en horario de transmisión en YouTube.";
        } else if (platforms.twitch) {
          liveMessage.textContent = "Ahora mismo está en horario de transmisión en Twitch.";
        } else {
          liveMessage.textContent = "Ahora mismo está en horario de transmisión.";
        }
      } else {
        const firstLabel = schedule[0]?.label || "Miércoles a sábado · 17:00 a 21:00";
        liveMessage.textContent = `Fuera de horario. Próxima stream: ${firstLabel} (Uruguay GMT-3).`;
      }
    } catch (error) {
      liveMessage.textContent = "No se pudo verificar el horario del stream.";
      console.error("Error loading live schedule:", error);
    }
  }

  loadLiveStatus();
  setInterval(loadLiveStatus, 60000);
}