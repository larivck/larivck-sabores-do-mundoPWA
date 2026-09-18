const API_BASE = "https://www.themealdb.com/api/json/v1/1";

const els = {
  categoryList: document.getElementById("category-list"),
  grid: document.getElementById("grid"),
  status: document.getElementById("status"),
  searchForm: document.getElementById("search-form"),
  searchInput: document.getElementById("search-input"),
  overlay: document.getElementById("overlay"),
  panel: document.getElementById("panel"),
  panelBody: document.getElementById("panel-body"),
  panelClose: document.getElementById("panel-close"),
  geoButton: document.getElementById("geo-button"),
  installButton: document.getElementById("install-button"),
};

// Cozinhas (strArea) disponíveis na TheMealDB, mapeadas a partir do país
// detectado por geolocalização. A API não cobre todos os países do mundo,
// então quando não há correspondência exata caímos num vizinho próximo.
const COUNTRY_TO_AREA = {
  "united states": "American", "canada": "Canadian", "united kingdom": "British",
  "ireland": "Irish", "france": "French", "italy": "Italian", "spain": "Spanish",
  "portugal": "Portuguese", "greece": "Greek", "netherlands": "Dutch",
  "poland": "Polish", "croatia": "Croatian", "russia": "Russian", "turkey": "Turkish",
  "morocco": "Moroccan", "tunisia": "Tunisian", "egypt": "Egyptian", "kenya": "Kenyan",
  "india": "Indian", "china": "Chinese", "japan": "Japanese", "thailand": "Thai",
  "vietnam": "Vietnamese", "malaysia": "Malaysian", "philippines": "Filipino",
  "jamaica": "Jamaican", "mexico": "Mexican", "uruguay": "Uruguayan",
  "argentina": "Uruguayan", "brazil": "Uruguayan", "paraguay": "Uruguayan",
  "chile": "Uruguayan", "bolivia": "Uruguayan",
};

let activeCategory = "";
let lastFocusedElement = null;
let deferredInstallPrompt = null;

init();

async function init() {
  loadCategories();
  loadMealsByLetter("a");
  registerServiceWorker();

  els.searchForm.addEventListener("submit", onSearchSubmit);
  els.panelClose.addEventListener("click", closePanel);
  els.overlay.addEventListener("click", closePanel);
  els.geoButton.addEventListener("click", onGeoButtonClick);
  els.installButton.addEventListener("click", onInstallButtonClick);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.panel.hidden) closePanel();
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    els.installButton.hidden = false;
  });
  window.addEventListener("appinstalled", () => {
    els.installButton.hidden = true;
    deferredInstallPrompt = null;
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((error) => console.error(error));
  });
}

async function onInstallButtonClick() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  els.installButton.hidden = true;
}

// ---------- recurso de hardware: geolocalização ----------
function onGeoButtonClick() {
  if (!("geolocation" in navigator)) {
    setStatus("Seu navegador não tem suporte a geolocalização.", true);
    return;
  }
  els.geoButton.disabled = true;
  setStatus("Obtendo sua localização…");

  navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoError, {
    enableHighAccuracy: false,
    timeout: 10000,
  });
}

async function onGeoSuccess(position) {
  const { latitude, longitude } = position.coords;
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`
    );
    const data = await response.json();
    const countryNamePt = data.countryName || "sua região";
    const countryKey = (data.countryName || "").toLowerCase();
    const area = COUNTRY_TO_AREA[countryKey];

    for (const chip of els.categoryList.querySelectorAll(".chip")) {
      chip.classList.remove("chip--active");
    }
    els.searchInput.value = "";

    if (area) {
      setStatus(`Localização: ${countryNamePt}. Buscando receitas da cozinha ${area}…`);
      loadMealsByArea(area, countryNamePt);
    } else {
      setStatus(`Não encontramos uma cozinha específica de ${countryNamePt} na base disponível. Mostrando a mais próxima geograficamente.`);
      loadMealsByArea("Uruguayan", countryNamePt);
    }
  } catch (error) {
    setStatus("Não foi possível identificar sua região agora.", true);
    console.error(error);
  } finally {
    els.geoButton.disabled = false;
  }
}

function onGeoError(error) {
  els.geoButton.disabled = false;
  if (error.code === error.PERMISSION_DENIED) {
    setStatus("Permissão de localização negada. Você pode ativá-la nas configurações do navegador.", true);
  } else {
    setStatus("Não foi possível obter sua localização agora.", true);
  }
}

async function loadMealsByArea(area, countryLabel) {
  try {
    const response = await fetch(`${API_BASE}/filter.php?a=${encodeURIComponent(area)}`);
    const data = await response.json();
    renderMeals(data.meals);
    if (data.meals) {
      setStatus(`Cozinha ${area} (a partir de ${countryLabel}) · ${data.meals.length} receitas.`);
    }
  } catch (error) {
    setStatus("Não foi possível carregar receitas dessa cozinha agora.", true);
    console.error(error);
  }
}

async function loadCategories() {
  try {
    const response = await fetch(`${API_BASE}/categories.php`);
    if (!response.ok) throw new Error("Falha ao carregar categorias");
    const data = await response.json();
    renderCategories(data.categories || []);
  } catch (error) {
    console.error(error);
  }
}

function renderCategories(categories) {
  const fragment = document.createDocumentFragment();
  for (const category of categories) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.dataset.category = category.strCategory;
    button.textContent = category.strCategory;
    button.addEventListener("click", () => onCategoryClick(category.strCategory, button));
    li.appendChild(button);
    fragment.appendChild(li);
  }
  els.categoryList.appendChild(fragment);

  els.categoryList.querySelector('[data-category=""]').addEventListener("click", () => {
    onCategoryClick("", els.categoryList.querySelector('[data-category=""]'));
  });
}

function onCategoryClick(category, button) {
  activeCategory = category;
  for (const chip of els.categoryList.querySelectorAll(".chip")) {
    chip.classList.toggle("chip--active", chip === button);
  }
  els.searchInput.value = "";

  if (category === "") {
    loadMealsByLetter("a");
  } else {
    loadMealsByCategory(category);
  }
}

function onSearchSubmit(event) {
  event.preventDefault();
  const term = els.searchInput.value.trim();
  if (!term) {
    loadMealsByLetter("a");
    return;
  }
  activeCategory = "";
  for (const chip of els.categoryList.querySelectorAll(".chip")) {
    chip.classList.toggle("chip--active", chip.dataset.category === "");
  }
  loadMealsBySearch(term);
}

async function loadMealsByLetter(letter) {
  setStatus("Carregando receitas…");
  try {
    const response = await fetch(`${API_BASE}/search.php?f=${letter}`);
    const data = await response.json();
    renderMeals(data.meals);
  } catch (error) {
    setStatus("Não foi possível carregar as receitas agora.", true);
    console.error(error);
  }
}

async function loadMealsByCategory(category) {
  setStatus(`Carregando receitas de ${category}…`);
  try {
    const response = await fetch(`${API_BASE}/filter.php?c=${encodeURIComponent(category)}`);
    const data = await response.json();
    renderMeals(data.meals);
  } catch (error) {
    setStatus("Não foi possível carregar essa categoria agora.", true);
    console.error(error);
  }
}

async function loadMealsBySearch(term) {
  setStatus(`Buscando por "${term}"…`);
  try {
    const response = await fetch(`${API_BASE}/search.php?s=${encodeURIComponent(term)}`);
    const data = await response.json();
    renderMeals(data.meals);
    if (!data.meals) {
      setStatus(`Nenhuma receita encontrada para "${term}". Tente outro termo.`);
    }
  } catch (error) {
    setStatus("A busca falhou. Tente novamente.", true);
    console.error(error);
  }
}

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.classList.toggle("status--error", isError);
}

function renderMeals(meals) {
  els.grid.innerHTML = "";
  if (!meals) {
    setStatus("Nenhuma receita encontrada.");
    return;
  }
  setStatus(`${meals.length} receita${meals.length === 1 ? "" : "s"} encontrada${meals.length === 1 ? "" : "s"}.`);

  const fragment = document.createDocumentFragment();
  for (const meal of meals) {
    const li = document.createElement("li");
    li.className = "card";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "card__button";
    button.setAttribute("aria-label", `Ver receita: ${meal.strMeal}`);
    button.addEventListener("click", () => openMeal(meal.idMeal, button));

    button.innerHTML = `
      <div class="card__image-wrap">
        <img class="card__image" src="${meal.strMealThumb}/medium" alt="" loading="lazy" width="300" height="225">
      </div>
      <div class="card__body">
        ${meal.strCategory ? `<p class="card__category">${escapeHtml(meal.strCategory)}</p>` : ""}
        <h2 class="card__title">${escapeHtml(meal.strMeal)}</h2>
      </div>
    `;

    li.appendChild(button);
    fragment.appendChild(li);
  }
  els.grid.appendChild(fragment);
}

async function openMeal(id, triggerButton) {
  lastFocusedElement = triggerButton;
  try {
    const response = await fetch(`${API_BASE}/lookup.php?i=${id}`);
    const data = await response.json();
    const meal = data.meals && data.meals[0];
    if (!meal) return;
    renderMealDetail(meal);
    showPanel();
  } catch (error) {
    console.error(error);
  }
}

function renderMealDetail(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ingredient && ingredient.trim()) {
      ingredients.push({ ingredient: ingredient.trim(), measure: (measure || "").trim() });
    }
  }

  els.panelBody.innerHTML = `
    <img class="panel__image" src="${meal.strMealThumb}" alt="${escapeHtml(meal.strMeal)}">
    <div class="panel__content">
      <p class="panel__category">${escapeHtml(meal.strCategory || "")}${meal.strArea ? ` · cozinha ${escapeHtml(meal.strArea)}` : ""}</p>
      <h2 class="panel__title" id="panel-title">${escapeHtml(meal.strMeal)}</h2>

      <h3 class="panel__section-title">Ingredientes</h3>
      <ul class="panel__ingredients">
        ${ingredients.map((item) => `<li><span>${escapeHtml(item.ingredient)}</span><span>${escapeHtml(item.measure)}</span></li>`).join("")}
      </ul>

      <h3 class="panel__section-title">Modo de preparo</h3>
      <p class="panel__instructions">${escapeHtml(meal.strInstructions || "")}</p>

      ${meal.strSource ? `<p class="panel__source"><a href="${meal.strSource}" target="_blank" rel="noopener">Fonte original da receita</a></p>` : ""}
    </div>
  `;
}

function showPanel() {
  els.overlay.hidden = false;
  els.panel.hidden = false;
  els.panelClose.focus();
}

function closePanel() {
  els.overlay.hidden = true;
  els.panel.hidden = true;
  if (lastFocusedElement) lastFocusedElement.focus();
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
