import "./styles.scss";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

const STORAGE_KEY = "theme-preference";
const API_URL = "https://www.mnemonic.guru/api/index.php";
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
