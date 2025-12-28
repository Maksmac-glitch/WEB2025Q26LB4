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
        el("div", { className: "title-row" }, el("h2", { id: "loc-title", text: "Нет локации" }), el("div", { id: "loc-status", className: "status", text: "—" })),
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
