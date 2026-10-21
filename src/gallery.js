import "./styles.scss";
import "./theme-runtime.js";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./nav-dropdowns.js";

const STORAGE_KEY = "theme-preference";
const API_URL = new URL("/api/index.php", window.location.origin).toString();
const API_ORIGIN = new URL(API_URL).origin;
const CANONICAL_HOST = "mnemonic.guru";
const IMAGE_PATTERN = /\.(jpg|jpeg|png|gif|webp)$/i;
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const themeToggleButton = document.getElementById("theme-toggle");
const heroGrid = document.getElementById("gallery-hero-grid");

const categories = [
  {
    key: "fraktale",
    title: "Fraktale",
    text: "Generative Muster, Tiefe und Strukturen.",
    pageUrl: "/fraktale.html",
    requestUrl: `${API_URL}?latest=1`,
    imageBase: "https://mnemonic.guru/img/fractals/",
    thumbBase: "https://mnemonic.guru/img/fractals/tn/",
  },
  {
    key: "digitalart",
    title: "Digital Art",
    text: "Digitale Kompositionen und visuelle Experimente.",
    pageUrl: "/digitalart.html",
    requestUrl: `${API_URL}?digital=1&latest=1`,
    imageBase: "https://mnemonic.guru/img/digital/",
    thumbBase: "https://mnemonic.guru/img/digital/tn/",
  },
  {
    key: "fotos",
    title: "Fotos",
    text: "Fotografien und visuelle Momentaufnahmen.",
    pageUrl: "/fotos.html",
    requestUrl: `${API_URL}?fotos=1&latest=1`,
    imageBase: "https://mnemonic.guru/img/fotos/",
    thumbBase: "https://mnemonic.guru/img/fotos/tn/",
  },
];

let previewSelectionsRequest = null;

const fetchPreviewSelections = async () => {
  if (!previewSelectionsRequest) {
    previewSelectionsRequest = fetch(
      `${API_URL}?preview_config=1&_=${Date.now()}`,
      {
      cache: "no-store",
      },
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        if (String(payload?.status || "").toUpperCase() !== "OK") {
          throw new Error(payload?.msg || "Unerwartete API-Antwort");
        }
        return payload?.selections || {};
      })
      .catch((error) => {
        console.warn("Preview-Auswahl nicht verfuegbar:", error);
        return {};
      });
  }
  return previewSelectionsRequest;
};

const getPreferredTheme = () => {
  const storedTheme = localStorage.getItem(STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }
  return prefersDark.matches ? "dark" : "light";
};

const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-bs-theme", theme);
  if (themeToggleButton) {
    const icon = theme === "dark" ? "\u2600\uFE0F" : "\u{1F319}";
    const nextLabel =
      theme === "dark" ? "Zu Lightmode wechseln" : "Zu Darkmode wechseln";
    themeToggleButton.innerHTML = `<span class="theme-icon" aria-hidden="true">${icon}</span>`;
    themeToggleButton.setAttribute("aria-label", nextLabel);
    themeToggleButton.setAttribute("aria-pressed", String(theme === "dark"));
  }
};

const buildAssetUrl = (base, fileName) => {
  return `${base}${encodeURIComponent(fileName)}`;
};

const toAltText = (fileName) => {
  let readableName = fileName;
  try {
    readableName = decodeURIComponent(fileName);
  } catch {
    readableName = fileName;
  }
  return readableName;
};

const withThumbFallback = (imageElement, fallbackUrl) => {
  imageElement.addEventListener(
    "error",
    () => {
      if (imageElement.dataset.fallbackApplied === "1") {
        return;
      }
      imageElement.dataset.fallbackApplied = "1";
      imageElement.src = fallbackUrl;
    },
    { once: true },
  );
};

const loadCategoryImages = async (category) => {
  try {
    const response = await fetch(category.requestUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json = await response.json();
    if (!Array.isArray(json)) {
      throw new Error("Unexpected API payload");
    }
    return json.filter((name) => IMAGE_PATTERN.test(name));
  } catch (error) {
    console.error(`Gallery hub load failed (${category.key}):`, error);
  }
  return [];
};

const createHeroCard = (category, imageName) => {
  const card = document.createElement("article");
  card.className = "gallery-hero-card";

  const media = document.createElement("div");
  media.className = "gallery-hero-media";

  if (imageName) {
    const fullImageUrl = buildAssetUrl(category.imageBase, imageName);
    const image = document.createElement("img");
    image.className = "gallery-hero-image";
    image.loading = "lazy";
    image.alt = toAltText(imageName);
    image.src = category.thumbBase
      ? buildAssetUrl(category.thumbBase, imageName)
      : fullImageUrl;
    if (category.thumbBase) {
      withThumbFallback(image, fullImageUrl);
    }
    media.appendChild(image);
  } else {
    media.classList.add("is-empty");
  }

  const content = document.createElement("div");
  content.className = "gallery-hero-content";

  const title = document.createElement("h2");
  title.className = "h3 fw-bold mb-2";
  title.textContent = category.title;

  const text = document.createElement("p");
  text.className = "text-body-secondary mb-3";
  text.textContent = category.text;

  const button = document.createElement("a");
  button.href = category.pageUrl;
  button.className = "btn btn-primary";
  button.textContent = "Zur Untergalerie";

  content.append(title, text, button);
  card.append(media, content);
  return card;
};

const renderHub = async () => {
  if (!heroGrid) {
    return;
  }
  heroGrid.innerHTML = "";
  for (let i = 0; i < categories.length; i += 1) {
    const category = categories[i];
    const images = await loadCategoryImages(category);
    const preview = images.length ? images[0] : "";
    heroGrid.appendChild(createHeroCard(category, preview));
  }
};

const parseProjectPreviewFromContent = (content, pageKey, selectedArticleId = "") => {
  const html = String(content || "").trim();
  if (!html) {
    return null;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div id="root">${html}</div>`,
    "text/html",
  );
  const cards = Array.from(doc.querySelectorAll(".project-section-card"));
  if (!cards.length) {
    return null;
  }
  const normalizeOwnAssetUrl = (value) => {
    const raw = String(value || "").trim();
    if (!raw) {
      return "";
    }
    try {
      const url = new URL(raw, API_ORIGIN);
      if (url.hostname === `www.${CANONICAL_HOST}`) {
        url.hostname = CANONICAL_HOST;
      }
      return url.toString();
    } catch {
      return raw;
    }
  };
  const getCardImage = (card) =>
    normalizeOwnAssetUrl(
      card.querySelector(".project-section-body img")?.getAttribute("src") || "",
    );
  const getCardPreview = (card, index) => {
    const imageUrl = getCardImage(card);
    if (!imageUrl) {
      return null;
    }
    return {
      id: `${pageKey}-article-${index + 1}`,
      imageUrl,
      title:
        card.querySelector(".project-section-title")?.textContent?.trim() ||
        `${pageKey} - Letzter Artikel`,
    };
  };

  if (selectedArticleId && selectedArticleId.startsWith(`${pageKey}-article-`)) {
    const selectedIndex = Number(
      String(selectedArticleId).replace(`${pageKey}-article-`, ""),
    );
    const selectedCard = Number.isFinite(selectedIndex)
      ? cards[selectedIndex - 1]
      : null;
    const selectedPreview = selectedCard
      ? getCardPreview(selectedCard, selectedIndex - 1)
      : null;
    if (selectedPreview) {
      return selectedPreview;
    }
  }

  for (let i = cards.length - 1; i >= 0; i -= 1) {
    const preview = getCardPreview(cards[i], i);
    if (preview) {
      return preview;
    }
  }
  return null;
};

const renderArticlePreviewIntoLabCard = async ({
  pageKey,
  pageUrl,
  selectionKey = "",
  label,
}) => {
  const pageLink = document.querySelector(`a.btn[href="${pageUrl}"]`);
  const pageCard = pageLink?.closest(".gallery-hero-card");
  const media = pageCard?.querySelector(".gallery-hero-media");
  if (!media) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}?page_content=1&page=${pageKey}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (String(payload?.status || "").toUpperCase() !== "OK") {
      throw new Error(payload?.msg || "Unerwartete API-Antwort");
    }

    const previewSelections = await fetchPreviewSelections();
    const selectedArticleId = String(previewSelections[selectionKey] || "");
    const preview = parseProjectPreviewFromContent(
      payload?.content || "",
      pageKey,
      selectedArticleId,
    );
    if (!preview?.imageUrl) {
      return;
    }

    const image = document.createElement("img");
    image.className = "gallery-hero-image";
    image.loading = "lazy";
    image.alt = `${label} - ${preview.title}`;
    image.src = preview.imageUrl;

    media.classList.remove("is-empty");
    media.innerHTML = "";
    media.appendChild(image);

    if (preview.id && pageLink) {
      pageLink.href = `${pageUrl}?article=${encodeURIComponent(preview.id)}`;
    }
  } catch (error) {
    console.error(`Lab ${pageKey} preview failed:`, error);
  }
};

const renderRaspiPreviewIntoLabCard = async () =>
  renderArticlePreviewIntoLabCard({
    pageKey: "raspi",
    pageUrl: "/raspi.html",
    selectionKey: "lab_raspi_article",
    label: "Raspi",
  });

const renderEsp32PreviewIntoLabCard = async () =>
  renderArticlePreviewIntoLabCard({
    pageKey: "esp32",
    pageUrl: "/esp32.html",
    label: "esp32",
  });

const renderCodePreviewIntoLabCard = async () => {
  const codeLink = document.querySelector('a.btn[href="/code.html"]');
  const codeCard = codeLink?.closest(".gallery-hero-card");
  const media = codeCard?.querySelector(".gallery-hero-media");
  if (!media) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}?p5js_projects=1`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (String(payload?.status || "").toUpperCase() !== "OK") {
      throw new Error(payload?.msg || "Unerwartete API-Antwort");
    }

    const projects = Array.isArray(payload.projects) ? payload.projects : [];
    const previewSelections = await fetchPreviewSelections();
    const selectedSlug = String(previewSelections.lab_code_p5 || "");
    const project =
      projects.find((entry) => entry.slug === selectedSlug) || projects[0];
    if (!project?.entry_url) {
      return;
    }

    const preview = document.createElement("iframe");
    preview.className = "gallery-hero-preview";
    preview.src = new URL(String(project.entry_url), API_ORIGIN).href;
    preview.title = `${project.name || "p5.js"} Vorschau`;
    preview.loading = "lazy";
    preview.setAttribute("aria-hidden", "true");
    preview.tabIndex = -1;

    media.classList.remove("is-empty");
    media.innerHTML = "";
    media.appendChild(preview);

    if (project.slug && codeLink) {
      codeLink.href = `/code.html?p5=${encodeURIComponent(project.slug)}`;
    }
  } catch (error) {
    console.error("Lab code preview failed:", error);
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

renderHub();
renderRaspiPreviewIntoLabCard();
renderEsp32PreviewIntoLabCard();
renderCodePreviewIntoLabCard();
