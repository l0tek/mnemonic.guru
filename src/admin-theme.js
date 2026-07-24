import "./styles.scss";
import {
  API_URL,
  initAdminShell,
  parseApiResponse,
  updateStatus,
} from "./admin-shared.js";

const form = document.getElementById("admin-theme-form");
const status = document.getElementById("admin-theme-status");
const updatedAt = document.getElementById("admin-theme-updated");
const preview = document.getElementById("admin-theme-preview");
const resetButton = document.getElementById("admin-theme-reset");
const jsonEditor = document.getElementById("admin-theme-json");
const jsonFileInput = document.getElementById("admin-theme-json-file");
const jsonApplyButton = document.getElementById("admin-theme-json-apply");
const jsonDownloadButton = document.getElementById("admin-theme-json-download");
const jsonCopyButton = document.getElementById("admin-theme-json-copy");
const themeSelect = document.getElementById("admin-theme-select");
const newThemeButton = document.getElementById("admin-theme-new");
const activateThemeButton = document.getElementById("admin-theme-activate");
const sliderOutputs = document.querySelectorAll("[data-theme-output]");
const fields = [
  "name",
  "background",
  "surface",
  "surface_alt",
  "text",
  "muted",
  "accent",
  "accent_secondary",
  "font_family",
  "heading_weight",
  "content_width",
  "hero_width",
  "panel_padding",
  "section_gap",
  "card_radius",
  "button_radius",
  "shadow_strength",
  "header_opacity",
  "hero_opacity",
  "nav_style",
  "hero_style",
  "card_style",
  "effects",
  "scope",
];

const preset = {
  name: "Still Relevant",
  slug: "still-relevant",
  active: true,
  background: "#131c2c",
  surface: "#1c283d",
  surface_alt: "#101827",
  text: "#f8fafc",
  muted: "#cbd5e1",
  accent: "#9bea00",
  accent_secondary: "#f04a62",
  font_family: "rounded",
  heading_weight: 800,
  content_width: 900,
  hero_width: 600,
  panel_padding: 40,
  section_gap: 16,
  card_radius: 14,
  button_radius: 7,
  shadow_strength: 12,
  header_opacity: 72,
  hero_opacity: 100,
  nav_style: "minimal",
  hero_style: "editorial",
  card_style: "solid",
  effects: "subtle",
  scope: "colors",
};
let currentSlug = preset.slug;

const readForm = () => {
  const theme = { slug: currentSlug };
  fields.forEach((key) => {
    const input = form?.elements.namedItem(key);
    theme[key] = input?.type === "range" || input?.type === "number"
      ? Number(input.value)
      : String(input?.value || preset[key]);
  });
  theme.active = Boolean(form?.elements.namedItem("active")?.checked);
  return theme;
};

const writeJson = (theme = readForm()) => {
  if (jsonEditor) {
    jsonEditor.value = JSON.stringify(theme, null, 2);
    jsonEditor.classList.remove("is-invalid");
  }
};

const parseThemeJson = () => {
  const decoded = JSON.parse(String(jsonEditor?.value || "{}"));
  if (!decoded || Array.isArray(decoded) || typeof decoded !== "object") {
    throw new Error("Das JSON muss ein Theme-Objekt enthalten.");
  }
  const name = String(decoded.name || "Neues Theme").trim();
  const generatedSlug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return {
    ...preset,
    ...decoded,
    name,
    slug: String(decoded.slug || generatedSlug || "theme"),
  };
};

const renderPreview = () => {
  if (!preview) {
    return;
  }
  const theme = readForm();
  sliderOutputs.forEach((output) => {
    const key = output.dataset.themeOutput;
    const value = theme[key];
    const unit = ["shadow_strength", "header_opacity", "hero_opacity"].includes(key)
      ? "%"
      : key === "heading_weight"
        ? ""
        : " px";
    output.value = `${value}${unit}`;
    output.textContent = `${value}${unit}`;
  });
  preview.style.setProperty("--preview-bg", theme.background);
  preview.style.setProperty("--preview-surface", theme.surface);
  preview.style.setProperty("--preview-surface-alt", theme.surface_alt);
  preview.style.setProperty("--preview-text", theme.text);
  preview.style.setProperty("--preview-muted", theme.muted);
  preview.style.setProperty("--preview-accent", theme.accent);
  preview.style.setProperty("--preview-accent-secondary", theme.accent_secondary);
  preview.style.setProperty("--preview-radius", `${theme.card_radius}px`);
  preview.style.setProperty("--preview-padding", `${theme.panel_padding}px`);
  preview.style.setProperty("--preview-shadow", `0 18px 44px rgb(0 0 0 / ${theme.shadow_strength}%)`);
  preview.style.setProperty("--preview-header-opacity", `${theme.header_opacity}%`);
  preview.style.setProperty("--preview-hero-opacity", `${theme.hero_opacity}%`);
  preview.dataset.font = theme.font_family;
  preview.dataset.cards = theme.card_style;
  preview.dataset.effects = theme.effects;
  preview.classList.toggle("is-disabled", !theme.active);
};

const writeForm = (theme = preset, { syncJson = true } = {}) => {
  currentSlug = String(theme.slug || currentSlug || preset.slug);
  fields.forEach((key) => {
    const input = form?.elements.namedItem(key);
    if (input) {
      input.value = theme[key] || preset[key];
    }
  });
  const activeInput = form?.elements.namedItem("active");
  if (activeInput) {
    activeInput.checked = Boolean(theme.active);
  }
  renderPreview();
  if (syncJson) {
    writeJson(readForm());
  }
};

const renderThemeLibrary = (themes = [], selectedSlug = currentSlug) => {
  if (!themeSelect) {
    return;
  }
  themeSelect.innerHTML = "";
  themes.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.slug;
    option.textContent = `${entry.active ? "✓ " : ""}${entry.name}${entry.active ? " (aktiv)" : ""}`;
    option.selected = entry.slug === selectedSlug;
    themeSelect.appendChild(option);
  });
  const selectedTheme = themes.find((entry) => entry.slug === selectedSlug);
  if (activateThemeButton) {
    activateThemeButton.disabled = Boolean(selectedTheme?.active);
    activateThemeButton.textContent = selectedTheme?.active
      ? "Ist aktiv"
      : "Aktivieren";
  }
};

const loadThemeBySlug = async (slug, activateOnSave = false) => {
  updateStatus(status, "Theme wird geladen ...");
  try {
    const response = await fetch(
      `${API_URL}?theme_config=1&slug=${encodeURIComponent(slug)}`,
      {
        cache: "no-store",
        credentials: "same-origin",
      },
    );
    const result = await parseApiResponse(response);
    writeForm(result.theme || preset);
    renderThemeLibrary(result.themes || [], result.theme?.slug);
    updatedAt.textContent = result.updated_at
      ? `Zuletzt gespeichert: ${result.updated_at}`
      : "";
    updateStatus(status, "Theme geladen.", "success");
    if (activateOnSave && !result.theme?.active) {
      const activeInput = form?.elements.namedItem("active");
      if (activeInput) {
        activeInput.checked = true;
      }
      renderPreview();
      writeJson();
      updateStatus(
        status,
        "Theme ausgewählt. Mit „Theme speichern“ wird es aktiviert.",
      );
    }
  } catch (error) {
    updateStatus(status, error.message || "Theme konnte nicht geladen werden.", "error");
  }
};

const loadTheme = async () => {
  updateStatus(status, "Theme wird geladen ...");
  try {
    const response = await fetch(`${API_URL}?theme_config=1`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    const result = await parseApiResponse(response);
    writeForm(result.theme || preset);
    renderThemeLibrary(result.themes || [], result.theme?.slug);
    updatedAt.textContent = result.updated_at
      ? `Zuletzt gespeichert: ${result.updated_at}`
      : "Noch nicht gespeichert – Vorlage ist aktiv.";
    updateStatus(status, "Theme bereit.", "success");
  } catch (error) {
    writeForm(preset);
    updateStatus(status, error.message || "Theme konnte nicht geladen werden.", "error");
  }
};

themeSelect?.addEventListener("change", () => {
  if (themeSelect.value) {
    void loadThemeBySlug(themeSelect.value, true);
  }
});

newThemeButton?.addEventListener("click", () => {
  const newTheme = {
    ...preset,
    name: "Neues Theme",
    slug: `theme-${Date.now()}`,
    active: false,
  };
  writeForm(newTheme);
  themeSelect.value = "";
  updateStatus(status, "Neues Theme angelegt. Passe es an und speichere es.");
});

activateThemeButton?.addEventListener("click", () => {
  const activeInput = form?.elements.namedItem("active");
  if (activeInput) {
    activeInput.checked = true;
  }
  renderPreview();
  writeJson();
  form?.requestSubmit();
});

form?.addEventListener("input", (event) => {
  if (event.target === jsonEditor) {
    return;
  }
  renderPreview();
  writeJson();
});
form?.addEventListener("change", (event) => {
  if (event.target === jsonEditor || event.target === jsonFileInput) {
    return;
  }
  renderPreview();
  writeJson();
});
resetButton?.addEventListener("click", () => {
  writeForm(preset);
  updateStatus(status, "Bildvorlage wiederhergestellt.");
});

jsonApplyButton?.addEventListener("click", () => {
  try {
    writeForm(parseThemeJson());
    updateStatus(status, "JSON wurde in die Farbauswahl übernommen.", "success");
  } catch (error) {
    jsonEditor?.classList.add("is-invalid");
    updateStatus(status, error.message || "Ungültiges JSON.", "error");
  }
});

jsonFileInput?.addEventListener("change", async () => {
  const file = jsonFileInput.files?.[0];
  if (!file) {
    return;
  }
  try {
    jsonEditor.value = await file.text();
    writeForm(parseThemeJson());
    updateStatus(status, `${file.name} wurde geladen.`, "success");
  } catch (error) {
    jsonEditor?.classList.add("is-invalid");
    updateStatus(status, error.message || "JSON-Datei konnte nicht geladen werden.", "error");
  } finally {
    jsonFileInput.value = "";
  }
});

jsonDownloadButton?.addEventListener("click", () => {
  const theme = readForm();
  const blob = new Blob([`${JSON.stringify(theme, null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${theme.slug || "theme"}.json`;
  link.click();
  URL.revokeObjectURL(url);
  updateStatus(status, "Theme wurde als JSON heruntergeladen.", "success");
});

jsonCopyButton?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(readForm(), null, 2));
    updateStatus(status, "Theme-JSON wurde kopiert.", "success");
  } catch {
    jsonEditor?.select();
    updateStatus(status, "JSON ist markiert und kann kopiert werden.");
  }
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton?.setAttribute("disabled", "disabled");
  updateStatus(status, "Theme wird gespeichert ...");
  try {
    const formData = new FormData();
    formData.set("action", "save_theme_config");
    formData.set("theme", JSON.stringify(readForm()));
    const response = await fetch(API_URL, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    });
    const result = await parseApiResponse(response);
    writeForm(result.theme);
    renderThemeLibrary(result.themes || [], result.theme?.slug);
    updatedAt.textContent = result.updated_at
      ? `Zuletzt gespeichert: ${result.updated_at}`
      : "";
    updateStatus(status, "Theme wurde gespeichert und ist auf der Website verfügbar.", "success");
  } catch (error) {
    updateStatus(status, error.message || "Speichern fehlgeschlagen.", "error");
  } finally {
    submitButton?.removeAttribute("disabled");
  }
});

initAdminShell({ onAuthenticated: loadTheme });
