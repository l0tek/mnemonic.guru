import "./styles.scss";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

const STORAGE_KEY = "theme-preference";
const API_BASE_URL = "https://www.mnemonic.guru/api/index.php?rss=";
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const themeToggleButton = document.getElementById("theme-toggle");
const securityNewsList = document.getElementById("security-news-list");
const heiseOnlineNewsList = document.getElementById("heise-online-news-list");
const telepolisNewsList = document.getElementById("telepolis-news-list");

const NEWS_FEEDS = [
  {
    key: "security",
    container: securityNewsList,
    fallbackUrl: "https://www.heise.de/security/feed.xml",
    emptyText: "Keine Security-News verfuegbar.",
    errorText: "Security-News konnten nicht geladen werden.",
  },
  {
    key: "heiseonline",
    container: heiseOnlineNewsList,
    fallbackUrl: "https://www.heise.de/rss/heise-atom.xml",
    emptyText: "Keine heise-online-News verfuegbar.",
    errorText: "heise-online-News konnten nicht geladen werden.",
  },
  {
    key: "telepolis",
    container: telepolisNewsList,
    fallbackUrl: "https://www.telepolis.de/news-atom.xml",
    emptyText: "Keine Telepolis-News verfuegbar.",
    errorText: "Telepolis-News konnten nicht geladen werden.",
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

const formatDate = (dateString) => {
  if (!dateString) {
    return "";
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const renderNewsList = (container, items, emptyText) => {
  if (!container) {
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = `<p class="text-body-secondary mb-0">${emptyText}</p>`;
    return;
  }

  const grid = document.createElement("div");
  grid.className = "row row-cols-1 row-cols-md-2 g-3";

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const col = document.createElement("div");
    col.className = "col";

    const card = document.createElement("article");
    card.className = "card h-100 shadow-sm";

    if (item.image) {
      const image = document.createElement("img");
      image.className = "card-img-top";
      image.src = item.image;
      image.alt = item.title || "News Bild";
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      image.style.height = "200px";
      image.style.objectFit = "cover";
      card.appendChild(image);
    }

    const body = document.createElement("div");
    body.className = "card-body d-flex flex-column";

    const title = document.createElement("h3");
    title.className = "h5 card-title";
    title.textContent = item.title || "Ohne Titel";

    const date = document.createElement("small");
    date.className = "text-body-secondary d-block mb-2";
    date.textContent = formatDate(item.pubDate);

    const description = document.createElement("p");
    description.className = "card-text text-body-secondary mb-3";
    description.textContent = item.description || "";

    const button = document.createElement("a");
    button.className = "btn btn-outline-primary mt-auto";
    button.href = item.link || "#";
    button.target = "_blank";
    button.rel = "noopener noreferrer";
    button.textContent = "Artikel lesen";

    body.append(title, date, description, button);
    card.appendChild(body);
    col.appendChild(card);
    grid.appendChild(col);
  }

  container.innerHTML = "";
  container.appendChild(grid);
};

const parseRssXml = (xmlText) => {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "application/xml");
  const rssItems = Array.from(xml.querySelectorAll("channel > item"));
  const atomItems = Array.from(xml.querySelectorAll("feed > entry"));
  const items = (rssItems.length ? rssItems : atomItems).slice(0, 20);

  return items.map((item) => {
    const title = item.querySelector("title")?.textContent?.trim() || "";
    const linkNode = item.querySelector("link");
    const link =
      linkNode?.getAttribute("href") || linkNode?.textContent?.trim() || "";
    const pubDate =
      item.querySelector("pubDate")?.textContent?.trim() ||
      item.querySelector("updated")?.textContent?.trim() ||
      item.querySelector("published")?.textContent?.trim() ||
      "";
    const rawDescription =
      item.querySelector("description")?.textContent?.trim() ||
      item.querySelector("summary")?.textContent?.trim() ||
      item.querySelector("content")?.textContent?.trim() ||
      "";
    const imageFromNode =
      item.querySelector("content img")?.getAttribute("src") ||
      item.querySelector("description img")?.getAttribute("src") ||
      "";
    const imageFromTextMatch = rawDescription.match(
      /<img[^>]+src=["']([^"']+)["']/i,
    );
    const image =
      imageFromNode || (imageFromTextMatch ? imageFromTextMatch[1] : "");
    const description = rawDescription
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { title, link, pubDate, description, image };
  });
};

const loadFeedNews = async (feedConfig) => {
  const { key, container, fallbackUrl, emptyText, errorText } = feedConfig;
  if (!container) {
    return;
  }

  const apiUrl = `${API_BASE_URL}${encodeURIComponent(key)}`;
  const fallbackProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fallbackUrl)}`;

  try {
    const response = await fetch(apiUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (
      payload.status === "OK" &&
      Array.isArray(payload.items) &&
      payload.items.length > 0
    ) {
      renderNewsList(container, payload.items, emptyText);
      return;
    }
    throw new Error("API lieferte keine Eintraege");
  } catch (error) {
    console.warn(`Server-API fehlgeschlagen (${key}), nutze Fallback:`, error);
    try {
      const fallbackResponse = await fetch(fallbackProxyUrl, {
        cache: "no-store",
      });
      if (!fallbackResponse.ok) {
        throw new Error(`HTTP ${fallbackResponse.status}`);
      }
      const xmlText = await fallbackResponse.text();
      renderNewsList(container, parseRssXml(xmlText), emptyText);
    } catch (fallbackError) {
      console.error(
        `RSS feed konnte nicht geladen werden (${key}):`,
        fallbackError,
      );
      container.innerHTML = `<p class="text-danger mb-0">${errorText}</p>`;
    }
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

for (let i = 0; i < NEWS_FEEDS.length; i += 1) {
  loadFeedNews(NEWS_FEEDS[i]);
}
