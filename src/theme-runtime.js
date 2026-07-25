import stillRelevantTheme from "../themes/still-relevant.json";

const THEME_API_URL = "https://mnemonic.guru/api/index.php?theme_config=1";
const COLOR_KEYS = {
  background: "--site-theme-background",
  surface: "--site-theme-surface",
  surface_alt: "--site-theme-surface-alt",
  text: "--site-theme-text",
  muted: "--site-theme-muted",
  accent: "--site-theme-accent",
  accent_secondary: "--site-theme-accent-secondary",
};
const SIZE_KEYS = {
  content_width: ["--site-theme-content-width", "px"],
  hero_width: ["--site-theme-hero-width", "px"],
  panel_padding: ["--site-theme-panel-padding", "px"],
  section_gap: ["--site-theme-section-gap", "px"],
  card_radius: ["--site-theme-card-radius", "px"],
  button_radius: ["--site-theme-button-radius", "px"],
  heading_weight: ["--site-theme-heading-weight", ""],
  shadow_strength: ["--site-theme-shadow-strength", "%"],
  header_opacity: ["--site-theme-header-opacity", "%"],
  hero_opacity: ["--site-theme-hero-opacity", "%"],
};

export const applySiteTheme = (theme) => {
  const root = document.documentElement;
  const clearManagedTheme = () => {
    root.removeAttribute("data-site-theme");
    root.removeAttribute("data-color-theme");
    root.removeAttribute("data-theme-slug");
    Object.values(COLOR_KEYS).forEach((property) =>
      root.style.removeProperty(property),
    );
    Object.values(SIZE_KEYS).forEach(([property]) =>
      root.style.removeProperty(property),
    );
    ["font", "nav", "hero", "cards", "effects"].forEach(
      (key) => delete root.dataset[key],
    );
  };

  if (!theme?.active || theme?.original || theme?.slug === "original") {
    clearManagedTheme();
    return;
  }

  clearManagedTheme();
  const isHackMeTheme =
    String(theme.name || "").trim().toLowerCase() === "hackme" ||
    String(theme.slug || "").trim().toLowerCase() === "hackme";
  const isColorOnly = (theme.scope || "colors") === "colors" || isHackMeTheme;
  if (isColorOnly) {
    root.setAttribute("data-color-theme", theme.slug || "theme");
  } else {
    root.setAttribute("data-site-theme", "still-relevant");
  }
  root.setAttribute("data-theme-slug", theme.slug || "theme");
  root.setAttribute("data-bs-theme", "dark");
  Object.entries(COLOR_KEYS).forEach(([key, property]) => {
    if (/^#[0-9a-f]{6}$/i.test(String(theme[key] || ""))) {
      root.style.setProperty(property, theme[key]);
    }
  });
  if (isColorOnly) {
    [
      "heading_weight",
      "card_radius",
      "button_radius",
      "shadow_strength",
      "header_opacity",
      "hero_opacity",
    ].forEach((key) => {
      const [property, unit] = SIZE_KEYS[key];
      if (Number.isFinite(Number(theme[key]))) {
        root.style.setProperty(property, `${Number(theme[key])}${unit}`);
      }
    });
    root.dataset.font = theme.font_family || "rounded";
    root.dataset.nav = theme.nav_style || "minimal";
    root.dataset.cards = theme.card_style || "solid";
    root.dataset.effects = theme.effects || "subtle";
    return;
  }
  Object.entries(SIZE_KEYS).forEach(([key, [property, unit]]) => {
    if (Number.isFinite(Number(theme[key]))) {
      root.style.setProperty(property, `${Number(theme[key])}${unit}`);
    }
  });
  root.dataset.font = theme.font_family || "rounded";
  root.dataset.nav = theme.nav_style || "minimal";
  root.dataset.hero = theme.hero_style || "editorial";
  root.dataset.cards = theme.card_style || "solid";
  root.dataset.effects = theme.effects || "subtle";
};

export const loadSiteTheme = async () => {
  applySiteTheme(stillRelevantTheme);
  try {
    const response = await fetch(THEME_API_URL, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (String(payload?.status || "").toUpperCase() !== "OK") {
      throw new Error(payload?.msg || "Unerwartete Theme-Antwort");
    }
    applySiteTheme(payload.theme);
    return payload.theme;
  } catch (error) {
    console.info(
      "Gespeichertes Site-Theme nicht verfügbar, lokale Bildvorlage wird verwendet:",
      error,
    );
    return stillRelevantTheme;
  }
};

void loadSiteTheme();
