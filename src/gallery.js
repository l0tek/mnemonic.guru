import "./styles.scss";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "blueimp-gallery/js/blueimp-helper.js";
import "blueimp-gallery/js/blueimp-gallery.js";
import "blueimp-gallery/css/blueimp-gallery.min.css";

const STORAGE_KEY = "theme-preference";
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const themeToggleButton = document.getElementById("theme-toggle");
const galleryGrid = document.getElementById("gallery-grid");
const galleryStatus = document.getElementById("gallery-status");

const API_URL = "https://www.mnemonic.guru/api/index.php";
const IMAGE_BASE = "https://www.mnemonic.guru/img/fractals/";
const THUMB_BASE = "https://www.mnemonic.guru/img/fractals/tn/";
const IMAGE_PATTERN = /\.(jpg|jpeg|png|gif)$/i;
const openBlueimpGallery = window.blueimp?.Gallery;

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

const renderImages = (files) => {
  if (!galleryGrid || !galleryStatus) {
    return;
  }
  galleryGrid.innerHTML = "";
  const imageFiles = files.filter((name) => IMAGE_PATTERN.test(name));

  if (!imageFiles.length) {
    galleryStatus.textContent = "Keine Bilder gefunden.";
    return;
  }

  galleryStatus.textContent = `${imageFiles.length} Bilder geladen`;
  imageFiles.forEach((fileName) => {
    const card = document.createElement("article");
    card.className = "gallery-card card border-0";

    const anchor = document.createElement("a");
    anchor.href = `${IMAGE_BASE}${fileName}`;
    anchor.dataset.gallery = "fractals";
    anchor.title = fileName;

    const image = document.createElement("img");
    image.src = `${THUMB_BASE}${fileName}`;
    image.alt = fileName;
    image.loading = "lazy";
    image.className = "card-img-top gallery-thumb";

    anchor.appendChild(image);
    card.appendChild(anchor);
    galleryGrid.appendChild(card);
  });
};

const initGalleryLightbox = () => {
  if (!galleryGrid) {
    return;
  }
  galleryGrid.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-gallery='fractals']");
    if (!link) {
      return;
    }
    event.preventDefault();
    const links = Array.from(
      galleryGrid.querySelectorAll("a[data-gallery='fractals']"),
    );
    if (typeof openBlueimpGallery === "function") {
      openBlueimpGallery(links, { index: link, event });
    }
  });
};

const loadGallery = async () => {
  if (!galleryStatus) {
    return;
  }
  try {
    const response = await fetch(API_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json = await response.json();
    if (!Array.isArray(json)) {
      throw new Error("Unexpected API payload");
    }
    renderImages(json);
  } catch (error) {
    galleryStatus.textContent = "Bilder konnten nicht geladen werden.";
    console.error("Gallery load failed:", error);
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

initGalleryLightbox();
loadGallery();
