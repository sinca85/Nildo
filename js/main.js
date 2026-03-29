import { initRecipes } from "./recipes.js";
import { initLiveStatus } from "./live-status.js";
import { initLiveEmbedBlock } from "./live-embed.js";
import { initReelsBlock } from "./reels.js";

document.addEventListener("DOMContentLoaded", () => {
  initRecipes();
  initLiveStatus();
  initLiveEmbedBlock();
  initReelsBlock();
});