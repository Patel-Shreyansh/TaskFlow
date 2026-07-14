/**
 * Lightweight toast notifications so the app never needs to fall
 * back to a blocking `alert()`.
 */
function ensureToastContainer() {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  return container;
}

function toast(message, type = "info", duration = 3500) {
  const container = ensureToastContainer();

  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);

  requestAnimationFrame(() => el.classList.add("toast-visible"));

  setTimeout(() => {
    el.classList.remove("toast-visible");
    setTimeout(() => el.remove(), 250);
  }, duration);
}

const Toast = {
  success: (msg) => toast(msg, "success"),
  error: (msg) => toast(msg, "error"),
  info: (msg) => toast(msg, "info"),
};
