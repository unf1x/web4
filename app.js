(() => {
  const STORAGE_LOCATIONS = "weatherapp.locations.v1";
  const STORAGE_SELECTED = "weatherapp.selectedId.v1";

  const els = {
    panelTitle: document.getElementById("panelTitle"),
    updatedAt: document.getElementById("updatedAt"),
    panelBody: document.getElementById("panelBody"),
    statusBar: document.getElementById("statusBar"),
  };

  const state = {
    locations: [],
    selectedId: null,
    weatherById: new Map(),
  };

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

  function init() {
    renderPanel();
  }

  init();
})();
