import "./styles.scss";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "blueimp-gallery/js/blueimp-helper.js";
import "blueimp-gallery/js/blueimp-gallery.js";
import "blueimp-gallery/css/blueimp-gallery.min.css";

const STORAGE_KEY = "theme-preference";
const API_URL = "https://www.mnemonic.guru/api/index.php";
const IMAGE_PATTERN = /\.(jpg|jpeg|png|gif|webp)$/i;
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const themeToggleButton = document.getElementById("theme-toggle");
const grid = document.getElementById("subgallery-grid");
const status = document.getElementById("subgallery-status");
const openBlueimpGallery = window.blueimp?.Gallery;

const category = document.body.dataset.galleryCategory || "fraktale";

const categoryConfig = {
  fraktale: {
    requestUrl: `${API_URL}?latest=1`,
    imageBase: "https://mnemonic.guru/img/fractals/",
    thumbBase: "https://mnemonic.guru/img/fractals/tn/",
  },
  digitalart: {
    requestUrl: `${API_URL}?digital=1&latest=1`,
    imageBase: "https://mnemonic.guru/img/digital/",
    thumbBase: "https://mnemonic.guru/img/digital/tn/",
  },
  fotos: {
    requestUrl: `${API_URL}?fotos=1&latest=1`,
    imageBase: "https://mnemonic.guru/img/fotos/",
    thumbBase: "https://mnemonic.guru/img/fotos/tn/",
  },
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

const renderImages = (files) => {
  if (!grid || !status) {
    return;
  }
  const config = categoryConfig[category];
  grid.innerHTML = "";
  const imageFiles = files.filter((name) => IMAGE_PATTERN.test(name));

  if (!imageFiles.length) {
    status.textContent = "Keine Bilder gefunden.";
    return;
  }

  status.textContent = `${imageFiles.length} Bilder geladen`;
  imageFiles.forEach((fileName) => {
    const fullImageUrl = buildAssetUrl(config.imageBase, fileName);
    const card = document.createElement("article");
    card.className = "gallery-card card border-0";

    const anchor = document.createElement("a");
    anchor.href = fullImageUrl;
    anchor.dataset.gallery = category;
    anchor.title = toAltText(fileName);

    const image = document.createElement("img");
    image.src = config.thumbBase
      ? buildAssetUrl(config.thumbBase, fileName)
      : fullImageUrl;
    image.alt = toAltText(fileName);
    image.loading = "lazy";
    image.className = "card-img-top gallery-thumb";
    if (config.thumbBase) {
      withThumbFallback(image, fullImageUrl);
    }

    anchor.appendChild(image);
    card.appendChild(anchor);
    grid.appendChild(card);
  });
};

const initLightbox = () => {
  if (!grid) {
    return;
  }
  grid.addEventListener("click", (event) => {
    const link = event.target.closest(`a[data-gallery='${category}']`);
    if (!link) {
      return;
    }
    event.preventDefault();
    const links = Array.from(
      grid.querySelectorAll(`a[data-gallery='${category}']`),
    );
    if (typeof openBlueimpGallery === "function") {
      openBlueimpGallery(links, { index: link, event });
    }
  });
};

const loadImages = async () => {
  const config = categoryConfig[category];
  if (!config || !status) {
    return;
  }

  try {
    const response = await fetch(config.requestUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json = await response.json();
    if (!Array.isArray(json)) {
      throw new Error("Unexpected API payload");
    }
    renderImages(json);
  } catch (error) {
    status.textContent = "Bilder konnten nicht geladen werden.";
    console.error(`Subgallery load failed (${category}):`, error);
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

initLightbox();
loadImages();
