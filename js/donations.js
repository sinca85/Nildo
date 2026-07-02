const DATA_URL = "./data/donation-product.json";
const STORAGE_KEY = "soynildo-donation-demo-collected-v2";

const els = {
  eyebrow: document.querySelector("[data-donation-eyebrow]"),
  headline: document.querySelector("[data-donation-headline]"),
  summary: document.querySelector("[data-donation-summary]"),
  image: document.querySelector("[data-product-image]"),
  title: document.querySelector("[data-product-title]"),
  description: document.querySelector("[data-product-description]"),
  price: document.querySelector("[data-product-price]"),
  collected: document.querySelector("[data-collected]"),
  remaining: document.querySelector("[data-remaining]"),
  percent: document.querySelector("[data-percent]"),
  progress: document.querySelector("[data-progress]"),
  minimum: document.querySelector("[data-minimum]"),
  maximum: document.querySelector("[data-maximum]"),
  input: document.querySelector("[data-donation-input]"),
  form: document.querySelector("[data-donation-form]"),
  presets: document.querySelector("[data-donation-presets]"),
  message: document.querySelector("[data-donation-message]"),
};

let state = null;

const formatMoney = (value, currency) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getCollected = (fallback, price) => {
  const savedValue = localStorage.getItem(STORAGE_KEY);
  if (savedValue === null) return fallback;

  const stored = Number(savedValue);
  if (!Number.isFinite(stored)) return fallback;
  return clamp(Math.max(fallback, stored), 0, price);
};

const setMessage = (text, tone = "neutral") => {
  els.message.textContent = text;
  els.message.dataset.tone = tone;
};

const renderProgress = () => {
  const { product, funding } = state;
  const remaining = Math.max(product.price - funding.collected, 0);
  const percent = product.price > 0 ? Math.min((funding.collected / product.price) * 100, 100) : 0;
  const maxDonation = Math.max(remaining, 0);
  const minDonation = Math.min(funding.minimumDonation, maxDonation);

  els.collected.textContent = formatMoney(funding.collected, product.currency);
  els.remaining.textContent = formatMoney(remaining, product.currency);
  els.percent.textContent = `${Math.round(percent)}%`;
  els.progress.style.width = `${percent}%`;
  els.progress.setAttribute("aria-valuenow", String(Math.round(percent)));
  els.maximum.textContent = formatMoney(maxDonation, product.currency);
  els.minimum.textContent = formatMoney(funding.minimumDonation, product.currency);
  els.input.min = String(minDonation);
  els.input.max = String(maxDonation);
  els.input.disabled = remaining === 0;
  els.form.querySelector("button").disabled = remaining === 0;

  if (remaining === 0) {
    els.input.value = "";
    setMessage("Meta completada. Gracias por empujar esta compra.", "success");
  } else if (!els.input.value) {
    els.input.value = String(Math.min(funding.suggestedDonations[1] || funding.minimumDonation, maxDonation));
  }
};

const renderPresets = () => {
  const { product, funding } = state;
  const remaining = Math.max(product.price - funding.collected, 0);
  els.presets.innerHTML = "";

  funding.suggestedDonations.forEach((amount) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "donation-preset";
    button.textContent = formatMoney(amount, product.currency);
    button.disabled = amount > remaining;
    button.addEventListener("click", () => {
      els.input.value = String(Math.min(amount, remaining));
      setMessage("Importe seleccionado.", "neutral");
    });
    els.presets.append(button);
  });
};

const renderCampaign = () => {
  const { campaign, product, funding } = state;

  els.eyebrow.textContent = campaign.eyebrow;
  els.headline.textContent = campaign.headline;
  els.summary.textContent = campaign.summary;
  els.image.src = product.photo;
  els.image.alt = product.title;
  els.title.textContent = product.title;
  els.description.textContent = product.description;
  els.price.textContent = formatMoney(product.price, product.currency);
  els.minimum.textContent = formatMoney(funding.minimumDonation, product.currency);

  renderProgress();
  renderPresets();
};

const handleDonation = (event) => {
  event.preventDefault();

  const { product, funding } = state;
  const remaining = Math.max(product.price - funding.collected, 0);
  const amount = Number(els.input.value);

  if (!Number.isFinite(amount)) {
    setMessage("Ingresá un importe válido.", "error");
    return;
  }

  if (amount < funding.minimumDonation) {
    setMessage(`El mínimo es ${formatMoney(funding.minimumDonation, product.currency)}.`, "error");
    return;
  }

  if (amount > remaining) {
    setMessage(`El máximo disponible es ${formatMoney(remaining, product.currency)}.`, "error");
    return;
  }

  funding.collected = clamp(funding.collected + amount, 0, product.price);
  localStorage.setItem(STORAGE_KEY, String(funding.collected));
  setMessage(`Donación aprobada por ${formatMoney(amount, product.currency)}.`, "success");
  renderProgress();
  renderPresets();
};

const init = async () => {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error("No se pudo cargar la campaña.");

    state = await response.json();
    state.funding.collected = getCollected(state.funding.collected, state.product.price);
    renderCampaign();
    els.form.addEventListener("submit", handleDonation);
  } catch (error) {
    setMessage(error.message, "error");
  }
};

init();
