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
        el("div", { className: "title-row" }, el("h2", { id: "loc-title", text: "Демо" }), el("div", { id: "loc-status", className: "status", text: "—" })),
        el("div", { id: "cards", className: "cards" })
      ),
      el(
        "aside",
        { className: "panel sidebar" },
        el("h3", { text: "Города" }),
        el("div", { className: "input-row" }, el("input", { id: "city-input", className: "input", placeholder: "Добавить город" }), el("button", { id: "btn-add", className: "btn btn-ghost", type: "button", text: "Добавить" })),
        el("div", { id: "city-error", className: "err", text: "" }),
        el("div", { id: "chips" }),
        el("div", { id: "status", className: "status", text: "—" })
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
  refresh: qs("#btn-refresh")
};

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

async function loadForecastFor(lat, lon, titleText) {
  dom.title.textContent = titleText;
  setStatus("Загрузка…");

  try {
    const data = await fetchForecast(lat, lon);
    renderCards(data);
    setStatus("Готово");
  } catch {
    clearNode(dom.cards);
    setStatus("Ошибка загрузки прогноза");
  }
}

dom.refresh.addEventListener("click", () => loadForecastFor(59.9386, 30.3141, "Санкт-Петербург"));

loadForecastFor(59.9386, 30.3141, "Санкт-Петербург");
