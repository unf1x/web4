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

  let geoRequestedOnce = false;
  let selectedSuggestion = null;
  let suggestAbort = null;

  function uid() {
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
  }

  function saveState() {
    localStorage.setItem(STORAGE_LOCATIONS, JSON.stringify(state.locations));
    localStorage.setItem(STORAGE_SELECTED, state.selectedId || "");
  }
  function setStatus(message, kind = "info") {
    if (!message) {
      els.statusBar.hidden = true;
      els.statusBar.textContent = "";
      return;
    }
    els.statusBar.hidden = false;
    els.statusBar.textContent = message;

    els.statusBar.style.borderColor =
      kind === "error" ? "rgba(255,107,107,.6)" :
      kind === "ok" ? "rgba(55,214,122,.6)" :
      "rgba(255,255,255,.10)";
  }

  function fmtDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("ru-RU", { weekday: "short", day: "2-digit", month: "2-digit" });
  }

  function weatherCodeToText(code) {
    const map = {
      0: "Ясно",
      1: "В основном ясно",
      2: "Переменная облачность",
      3: "Пасмурно",
      45: "Туман",
      48: "Иней/туман",
      51: "Морось",
      53: "Морось",
      55: "Морось",
      61: "Дождь",
      63: "Дождь",
      65: "Сильный дождь",
      71: "Снег",
      73: "Снег",
      75: "Сильный снег",
      80: "Ливни",
      81: "Ливни",
      82: "Сильные ливни",
      95: "Гроза",
    };
    return map[code] || `Код: ${code}`;
  }

  function weatherCodeToIcon(code) {
    if (code === 0) return "☀️";
    if (code >= 1 && code <= 3) return "⛅";
    if (code === 45 || code === 48) return "🌫️";
    if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "🌧️";
    if (code >= 71 && code <= 77) return "🌨️";
    if (code >= 95) return "⛈️";
    return "🌡️";
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

    const entry = state.weatherById.get(loc.id);

    if (!entry || entry.status === "loading") {
      els.panelBody.innerHTML = `
        <div class="state">
          <p class="state__title">Загрузка прогноза…</p>
          <p class="state__msg">Отправляем HTTP-запрос к погодному API.</p>
        </div>
      `;
      return;
    }

    if (entry.status === "error") {
      els.panelBody.innerHTML = `
        <div class="state state--error">
          <p class="state__title">Ошибка загрузки</p>
          <p class="state__msg">${escapeHtml(entry.message || "Не удалось получить данные.")}</p>
          <div style="margin-top:12px;">
            <button class="btn btn--primary" type="button" id="retryBtn">Повторить</button>
          </div>
        </div>
      `;
      const retryBtn = document.getElementById("retryBtn");
      retryBtn?.addEventListener("click", () => refreshWeatherForLocation(loc));
      return;
    }

    const w = entry.data;
    els.updatedAt.textContent = `Обновлено: ${new Date(entry.updatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;

    const current = typeof w.currentTemp === "number"
      ? `<div class="badge"><span>Сейчас</span><strong>${Math.round(w.currentTemp)}°C</strong></div>`
      : "";

    const cards = w.days.map((d, idx) => {
      const title = idx === 0 ? `Сегодня • ${fmtDate(d.date)}` : fmtDate(d.date);
      const icon = weatherCodeToIcon(d.code);
      const text = weatherCodeToText(d.code);
      return `
        <div class="card">
          <div class="card__date">${escapeHtml(title)}</div>
          <div style="margin-top:10px;" class="badge">
            <span style="font-size:20px">${icon}</span>
            <span>${escapeHtml(text)}</span>
          </div>
          <div class="card__row">
            <span class="muted">Мин</span><strong>${Math.round(d.tmin)}°C</strong>
          </div>
          <div class="card__row">
            <span class="muted">Макс</span><strong>${Math.round(d.tmax)}°C</strong>
          </div>
        </div>
      `;
    }).join("");

    els.panelBody.innerHTML = `
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
        ${current}
        <div class="badge"><span>Дней</span><strong>${w.days.length}</strong></div>
      </div>
      <div class="grid">${cards}</div>
    `;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  async function fetchWeather(latitude, longitude) {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
    url.searchParams.set("current_weather", "true");
    url.searchParams.set("forecast_days", "3");
    url.searchParams.set("timezone", "auto");

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const daily = json?.daily;
    if (!daily?.time?.length) throw new Error("Некорректный ответ API (daily.time пуст).");

    const days = daily.time.slice(0, 3).map((date, i) => ({
      date,
      code: Number(daily.weather_code?.[i]),
      tmax: Number(daily.temperature_2m_max?.[i]),
      tmin: Number(daily.temperature_2m_min?.[i]),
    }));

    const currentTemp = typeof json?.current_weather?.temperature === "number"
      ? json.current_weather.temperature
      : null;

    return { days, currentTemp };
  }

  async function refreshWeatherForLocation(loc) {
    state.weatherById.set(loc.id, { status: "loading" });
    if (loc.id === state.selectedId) renderPanel();

    try {
      const data = await fetchWeather(loc.latitude, loc.longitude);
      state.weatherById.set(loc.id, { status: "success", data, updatedAt: Date.now() });
      if (loc.id === state.selectedId) renderPanel();
    } catch (e) {
      state.weatherById.set(loc.id, { status: "error", message: e?.message || String(e) });
      if (loc.id === state.selectedId) renderPanel();
    }
  }

  async function refreshAllWeather() {
    if (!state.locations.length) return;

    setStatus("Обновляем прогноз по всем локациям…");
    await Promise.allSettled(state.locations.map(refreshWeatherForLocation));
    setStatus("");
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

  function requestGeolocationOnce() {
    if (!navigator.geolocation) {
      setStatus("Геолокация не поддерживается браузером. Добавьте город вручную.", "error");
      openModal(true);
      return;
    }

    if (geoRequestedOnce) return;
    geoRequestedOnce = true;

    setStatus("Запрашиваем геопозицию…");

    navigator.geolocation.getCurrentPosition(
      pos => {
        setStatus("");
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        const geoLoc = {
          id: uid(),
          kind: "geo",
          label: "Текущее местоположение",
          latitude: lat,
          longitude: lon,
        };

        state.locations = [geoLoc];
        state.selectedId = geoLoc.id;
        saveState();
        renderTabs();
        renderPanel();
        refreshAllWeather();
      },
      err => {
        setStatus("Геолокация недоступна. Добавьте город вручную.", "error");
        openModal(true);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  }

  els.refreshBtn.addEventListener("click", () => {
    refreshAllWeather();
  });

  els.addCityBtn.addEventListener("click", () => {
    openModal(false);
  });

  els.closeModalBtn.addEventListener("click", () => closeModal());
  els.cancelBtn.addEventListener("click", () => closeModal());
  els.modalOverlay.addEventListener("click", (e) => {
    if (e.target === els.modalOverlay && els.cancelBtn.style.display !== "none") closeModal();
  });

  function init() {
    renderTabs();
    renderPanel();

    if (!state.locations.length) {
      requestGeolocationOnce();
      return;
    }

    if (!state.selectedId) state.selectedId = state.locations[0].id;
    saveState();
    renderTabs();
    renderPanel();

    refreshAllWeather();
  }

  init();
})();
