import "./styles.scss";
import "./theme-runtime.js";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./nav-dropdowns.js";

const STORAGE_KEY = "theme-preference";
const API_URL = "https://mnemonic.guru/api/index.php";
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const themeToggleButton = document.getElementById("theme-toggle");
const whoisForm = document.getElementById("whois-form");
const whoisModeSelect = document.getElementById("whois-mode");
const whoisQueryLabel = document.getElementById("whois-query-label");
const whoisDomainInput = document.getElementById("whois-domain");
const whoisStatus = document.getElementById("whois-status");
const whoisResult = document.getElementById("whois-result");

const getPreferredTheme = () => {
  const storedTheme = localStorage.getItem(STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }
  return prefersDark.matches ? "dark" : "light";
};

const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-bs-theme", theme);
  if (!themeToggleButton) {
    return;
  }
  const icon = theme === "dark" ? "\u2600\uFE0F" : "\u{1F319}";
  const nextLabel =
    theme === "dark" ? "Zu Lightmode wechseln" : "Zu Darkmode wechseln";
  themeToggleButton.innerHTML = `<span class="theme-icon" aria-hidden="true">${icon}</span>`;
  themeToggleButton.setAttribute("aria-label", nextLabel);
  themeToggleButton.setAttribute("aria-pressed", String(theme === "dark"));
};

const setStatus = (text, tone = "neutral") => {
  if (!whoisStatus) {
    return;
  }
  whoisStatus.textContent = text;
  whoisStatus.classList.remove(
    "text-success",
    "text-danger",
    "text-warning",
    "text-body-secondary",
  );
  if (tone === "success") {
    whoisStatus.classList.add("text-success");
    return;
  }
  if (tone === "warning") {
    whoisStatus.classList.add("text-warning");
    return;
  }
  if (tone === "error") {
    whoisStatus.classList.add("text-danger");
    return;
  }
  whoisStatus.classList.add("text-body-secondary");
};

const setResult = (value) => {
  if (!whoisResult) {
    return;
  }
  whoisResult.textContent = value;
};

const normalizeDomain = (value) => {
  let text = String(value || "")
    .trim()
    .toLowerCase();
  text = text.replace(/^https?:\/\//, "");
  text = text.replace(/\/.*$/, "");
  return text;
};

const normalizeIp = (value) => {
  return String(value || "").trim();
};

const isEmptyResult = (value) => {
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (value && typeof value === "object") {
    return Object.keys(value).length === 0;
  }
  return value == null || value === "";
};

const applyWhoisModeUi = () => {
  const mode = String(whoisModeSelect?.value || "whois");
  if (mode === "reverse") {
    if (whoisQueryLabel) {
      whoisQueryLabel.textContent = "IP";
    }
    if (whoisDomainInput) {
      whoisDomainInput.placeholder = "216.58.213.142";
    }
    return;
  }

  if (whoisQueryLabel) {
    whoisQueryLabel.textContent = "Domain";
  }
  if (whoisDomainInput) {
    whoisDomainInput.placeholder = "example.com";
  }
};

applyTheme(getPreferredTheme());

if (themeToggleButton) {
  themeToggleButton.addEventListener("click", () => {
    const currentTheme =
      document.documentElement.getAttribute("data-bs-theme") || "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  });
}

prefersDark.addEventListener("change", (event) => {
  if (!localStorage.getItem(STORAGE_KEY)) {
    applyTheme(event.matches ? "dark" : "light");
  }
});

if (whoisForm && whoisDomainInput) {
  applyWhoisModeUi();
  if (whoisModeSelect) {
    whoisModeSelect.addEventListener("change", () => {
      applyWhoisModeUi();
      setStatus("Bereit.");
      setResult("");
    });
  }

  whoisForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const mode = String(whoisModeSelect?.value || "whois");
    const queryValue =
      mode === "reverse"
        ? normalizeIp(whoisDomainInput.value)
        : normalizeDomain(whoisDomainInput.value);
    if (!queryValue) {
      setStatus(
        mode === "reverse"
          ? "Bitte eine IP eingeben."
          : "Bitte eine Domain eingeben.",
        "error",
      );
      return;
    }

    setStatus(
      mode === "reverse"
        ? "IP-Whois wird geladen ..."
        : "Domain-Whois wird geladen ...",
    );
    setResult("");

    try {
      const queryString =
        mode === "reverse"
          ? `?whois=1&mode=reverse&ip=${encodeURIComponent(queryValue)}`
          : `?whois=1&mode=whois&domain=${encodeURIComponent(queryValue)}`;
      const response = await fetch(`${API_URL}${queryString}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (
        !response.ok ||
        String(payload?.status || "").toUpperCase() !== "OK"
      ) {
        throw new Error(payload?.msg || `HTTP ${response.status}`);
      }

      setResult(JSON.stringify(payload.result, null, 2));
      if (isEmptyResult(payload.result)) {
        if (mode === "reverse") {
          setStatus(
            `Fuer die IP ${queryValue} wurden keine RDAP-Daten gefunden.`,
            "warning",
          );
        } else {
          setStatus(
            `Keine Domain-Whois-Daten fuer ${queryValue} gefunden.`,
            "warning",
          );
        }
        return;
      }

      if (mode === "reverse") {
        setStatus(`IP-Whois fuer ${queryValue} geladen.`, "success");
      } else {
        setStatus(`Domain-Whois fuer ${queryValue} geladen.`, "success");
      }
    } catch (error) {
      setStatus(
        mode === "reverse"
          ? `IP-Whois fehlgeschlagen: ${error.message}`
          : `Domain-Whois fehlgeschlagen: ${error.message}`,
        "error",
      );
      setResult("");
    }
  });
}
