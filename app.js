(() => {
  const STORAGE_LOCATIONS = "weatherapp.locations.v1";
  const STORAGE_SELECTED = "weatherapp.selectedId.v1";

  const els = {
    locationsList: document.getElementById("locationsList"),
    refreshBtn: document.getElementById("refreshBtn"),
    addCityBtn: document.getElementById("addCityBtn"),

    panelTitle: document.getElementById("panelTitle"),
    updatedAt: document.getElementById("updatedAt"),
    panelBody: document.getElementById("panelBody"),
    statusBar: document.getElementById("statusBar"),

    modalOverlay: document.getElementById("modalOverlay"),
    closeModalBtn: document.getElementById("closeModalBtn"),
    cancelBtn: document.getElementById("cancelBtn"),
    cityForm: document.getElementById("cityForm"),
    cityInput: document.getElementById("cityInput"),
    cityError: document.getElementById("cityError"),
    suggestBox: document.getElementById("suggestBox"),
  };

  const state = {
    locations: [],
    selectedId: null,
    weatherById: new Map(),
  };

  function saveState() {
    localStorage.setItem(STORAGE_LOCATIONS, JSON.stringify(state.locations));
    localStorage.setItem(STORAGE_SELECTED, state.selectedId || "");
  }

  function renderTabs() {
    els.locationsList.innerHTML = "";

    state.locations.forEach(loc => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = "tab";
      btn.type = "button";
      btn.textContent = loc.label;
      btn.setAttribute("aria-selected", loc.id === state.selectedId ? "true" : "false");
      btn.addEventListener("click", () => {
        state.selectedId = loc.id;
        saveState();
        renderTabs();
        renderPanel();
      });
      li.appendChild(btn);
      els.locationsList.appendChild(li);
    });

  }

  function renderPanel() {
    const loc = state.locations.find(l => l.id === state.selectedId) || null;
    els.panelTitle.textContent = loc ? loc.label : "—";
    els.updatedAt.textContent = "";

    if (!loc) {
      els.panelBody.innerHTML = `
        <div class="state">
          <p class="state__title">Нет выбранной локации</p>
          <p class="state__msg">Разрешите геолокацию или добавьте город.</p>
        </div>
      `;
      return;
    }
  }

function openModal(force = false) {
  els.modalOverlay.hidden = false;
  els.modalOverlay.style.display = "grid";

  els.cityError.textContent = "";
  els.cityInput.value = "";
  els.suggestBox.hidden = true;
  els.suggestBox.innerHTML = "";
  selectedSuggestion = null;

  els.cancelBtn.style.display = force ? "none" : "inline-flex";
  els.closeModalBtn.style.display = force ? "none" : "inline-flex";

  setTimeout(() => els.cityInput.focus(), 0);
}

function closeModal() {
  els.modalOverlay.hidden = true;
  els.modalOverlay.style.display = "none";

  els.cityError.textContent = "";
  els.suggestBox.hidden = true;
  els.suggestBox.innerHTML = "";
  selectedSuggestion = null;
}

  function init() {
    renderTabs();
    renderPanel();
  }

  init();
})();
