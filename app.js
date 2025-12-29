const qs = (s, r = document) => r.querySelector(s);

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "className") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const ch of children.flat()) {
    if (ch == null) continue;
    node.appendChild(typeof ch === "string" ? document.createTextNode(ch) : ch);
  }
  return node;
}

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

const fmtDay = (d) => new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(d);
const todayLabel = (idx, date) => (idx === 0 ? "Сегодня" : idx === 1 ? "Завтра" : fmtDay(date));

const KEY = "wx-state-v1";

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(s) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

const W = {
  0: { i: "☀️", t: "Ясно" },
  1: { i: "🌤️", t: "Преимущественно ясно" },
  2: { i: "⛅", t: "Переменная облачность" },
  3: { i: "☁️", t: "Облачно" },
  45: { i: "🌫️", t: "Туман" },
  48: { i: "🌫️", t: "Иней/туман" },
  51: { i: "🌦️", t: "Морось" },
  53: { i: "🌦️", t: "Морось" },
  55: { i: "🌧️", t: "Сильная морось" },
  56: { i: "🌧️", t: "Ледяная морось" },
  57: { i: "🌧️", t: "Сильная ледяная морось" },
  66: { i: "🌧️", t: "Ледяной дождь" },
  67: { i: "🌧️", t: "Сильный ледяной дождь" },
  73: { i: "🌨️", t: "Снег" },
  77: { i: "🌨️", t: "Снежная крупа" },
  85: { i: "🌨️", t: "Снегопад" },
  86: { i: "❄️", t: "Сильный снегопад" },
  96: { i: "⛈️", t: "Гроза с градом" },
  99: { i: "⛈️", t: "Сильная гроза с градом" },
  61: { i: "🌦️", t: "Слабый дождь" },
  63: { i: "🌧️", t: "Дождь" },
  65: { i: "🌧️", t: "Ливень" },
  71: { i: "🌨️", t: "Снег" },
  75: { i: "❄️", t: "Сильный снег" },
  80: { i: "🌦️", t: "Кратковременные дожди" },
  81: { i: "🌧️", t: "Кратковременные дожди" },
  82: { i: "🌧️", t: "Ливни" },
  95: { i: "⛈️", t: "Гроза" }
};

function wInfo(code) {
  return W[code] || { i: "❔", t: "Погода" };
}

function mountUI() {
  const app = qs("#app");

  const root = el(
    "div",
    { className: "container" },
    el(
      "header",
      { className: "header" },
      el("h1", { text: "Погода" }),
      el("div", { className: "actions" }, el("button", { id: "btn-refresh", className: "btn btn-primary", type: "button", text: "Обновить" }))
    ),
    el(
      "div",
      { className: "layout" },
      el(
        "section",
        { className: "panel" },
        el("div", { className: "title-row" }, el("h2", { id: "loc-title", text: "—" }), el("div", { id: "loc-status", className: "status", text: "—" })),
        el("div", { id: "cards", className: "cards" })
      ),
      el(
        "aside",
        { className: "panel sidebar" },
        el("h3", { text: "Города" }),
        el(
          "div",
          { className: "input-row" },
          el(
            "div",
            { className: "dropdown", style: "flex:1" },
            el("input", { id: "city-input", className: "input", placeholder: "Добавить город" }),
            el("div", { id: "suggest", className: "suggest", style: "display:none" })
          ),
          el("button", { id: "btn-add", className: "btn btn-ghost", type: "button", text: "Добавить" })
        ),
        el("div", { id: "city-error", className: "err", text: "" }),
        el("div", { id: "chips", className: "chips" }),
        el("div", { id: "status", className: "status", text: "Данные сохраняются локально" })
      )
    )
  );

  clearNode(app);
  app.appendChild(root);
}

mountUI();

const dom = {
  title: qs("#loc-title"),
  status: qs("#loc-status"),
  cards: qs("#cards"),
  refresh: qs("#btn-refresh"),
  input: qs("#city-input"),
  suggest: qs("#suggest"),
  addBtn: qs("#btn-add"),
  err: qs("#city-error"),
  chips: qs("#chips")
};

let state = loadState();
if (!state) {
  state = {
    locations: [],
    selectedId: null
  };
}

function setStatus(text) {
  dom.status.textContent = text;
}

async function fetchForecast(lat, lon) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: "weathercode,temperature_2m_max,temperature_2m_min",
    current_weather: "true",
    timezone: "auto",
    forecast_days: "3"
  }).toString();

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Forecast fetch failed");
  return res.json();
}

function renderCards(data) {
  clearNode(dom.cards);

  const days = data.daily.time;
  for (let i = 0; i < days.length; i++) {
    const date = new Date(days[i]);
    const code = data.daily.weathercode[i];
    const info = wInfo(code);
    const max = Math.round(data.daily.temperature_2m_max[i]);
    const min = Math.round(data.daily.temperature_2m_min[i]);

    dom.cards.appendChild(
      el(
        "div",
        { className: "card" },
        el("div", { className: "day", text: todayLabel(i, date) }),
        el("div", { className: "temp", text: `${max}° ${info.i}` }),
        el("div", { className: "sub", text: `мин ${min}°  •  ${info.t}` })
      )
    );
  }
}

async function loadForecastFor(loc) {
  dom.title.textContent = loc.isGeo ? "Текущее местоположение" : loc.name;
  setStatus("Загрузка…");
  dom.refresh.disabled = true;

  try {
    const data = await fetchForecast(loc.lat, loc.lon);
    renderCards(data);
    setStatus("Готово");
  } catch {
    clearNode(dom.cards);
    setStatus("Ошибка загрузки прогноза");
  } finally {
    dom.refresh.disabled = false;
  }
}


function renderChips() {
  clearNode(dom.chips);

  for (const loc of state.locations) {
    const chip = el("div", { className: "chip" + (loc.id === state.selectedId ? " active" : "") });

    if (!loc.isGeo) {
      const rm = el("button", { className: "rm", type: "button", title: "Удалить" }, "✕");
      rm.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeCity(loc.id);
      });
      chip.appendChild(rm);
    } else {
      chip.appendChild(el("span", { className: "rm", text: "📍" }));
    }

    const nameBtn = el("button", { className: "name", type: "button" }, loc.isGeo ? "Текущее местоположение" : loc.name);
    nameBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectCity(loc.id);
    });

    chip.appendChild(nameBtn);
    dom.chips.appendChild(chip);
  }
}

function selectCity(id) {
  const loc = state.locations.find((x) => x.id === id);
  if (!loc) return;
  state.selectedId = id;
  saveState(state);
  renderChips();
  loadForecastFor(loc);
}

function removeCity(id) {
  const loc = state.locations.find((x) => x.id === id);
  if (!loc || loc.isGeo) return;

  state.locations = state.locations.filter((x) => x.id !== id);

  if (state.selectedId === id) {
    state.selectedId = state.locations[0]?.id || null;
  }

  saveState(state);
  renderChips();

  if (state.selectedId) {
    const cur = state.locations.find((x) => x.id === state.selectedId);
    if (cur) loadForecastFor(cur);
  } else {
    dom.title.textContent = "Нет локации";
    clearNode(dom.cards);
    setStatus("—");
  }
}

function upsertGeo(lat, lon) {
  const geo = { id: "geo", isGeo: true, lat, lon, name: "Текущее местоположение" };
  const other = state.locations.filter((x) => !x.isGeo);
  state.locations = [geo, ...other];
  state.selectedId = "geo";
  saveState(state);
  renderChips();
  loadForecastFor(geo);
}

function requestGeo() {
  setStatus("Запрашиваем геолокацию…");

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      upsertGeo(pos.coords.latitude, pos.coords.longitude);
    },
    () => {
      setStatus("Геолокация отклонена — добавьте город");
      dom.title.textContent = "Нет локации";
      clearNode(dom.cards);
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

async function geoSuggest(q) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({
    name: q,
    count: "5",
    language: "ru"
  }).toString();

  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();

  return (data.results || []).map((x) => ({
    id: String(x.id),
    name: x.name + (x.country ? `, ${x.country}` : ""),
    lat: x.latitude,
    lon: x.longitude
  }));
}

function showSuggest(items) {
  clearNode(dom.suggest);

  if (!items.length) {
    dom.suggest.style.display = "none";
    return;
  }

  for (const it of items) {
    const b = el("button", { type: "button" }, it.name);
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dom.input.value = it.name;
      dom.input.dataset.selId = it.id;
      dom.input.dataset.lat = String(it.lat);
      dom.input.dataset.lon = String(it.lon);
      dom.suggest.style.display = "none";
      dom.err.textContent = "";
    });
    dom.suggest.appendChild(b);
  }

  dom.suggest.style.display = "block";
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

const onType = debounce(async () => {
  const q = dom.input.value.trim();
  dom.err.textContent = "";
  dom.input.removeAttribute("data-sel-id");

  if (q.length < 2) {
    dom.suggest.style.display = "none";
    return;
  }

  const list = await geoSuggest(q);
  showSuggest(list);
}, 300);

dom.input.addEventListener("input", onType);

document.addEventListener("pointerdown", (e) => {
  if (!dom.suggest.contains(e.target) && e.target !== dom.input) {
    dom.suggest.style.display = "none";
  }
});

dom.addBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();

  const id = dom.input.dataset.selId;
  const lat = Number(dom.input.dataset.lat);
  const lon = Number(dom.input.dataset.lon);
  const name = dom.input.value.trim();

  if (!id || !name) {
    dom.err.textContent = "Выберите город из выпадающего списка";
    return;
  }

  if (state.locations.some((x) => x.id === id)) {
    dom.err.textContent = "Город уже добавлен";
    return;
  }

  const loc = { id, name, lat, lon, isGeo: false };
  state.locations.push(loc);
  state.selectedId = id;
  saveState(state);

  dom.input.value = "";
  dom.input.removeAttribute("data-sel-id");
  dom.suggest.style.display = "none";
  dom.err.textContent = "";

  renderChips();
  loadForecastFor(loc);
});

dom.refresh.addEventListener("click", async () => {
  const cur = state.locations.find((x) => x.id === state.selectedId);
  if (cur) {
    await loadForecastFor(cur);
  } else {
    requestGeo();
  }
});

renderChips();

if (state.selectedId) {
  const cur = state.locations.find((x) => x.id === state.selectedId);
  if (cur) loadForecastFor(cur);
  else requestGeo();
} else {
  requestGeo();
}