import "./styles.scss";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./nav-dropdowns.js";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

const pageLoader = document.getElementById("page-loader");
const newsModalLoader = document.getElementById("news-modal-loader");

const revealPage = () => {
  document.body.classList.remove("is-loading");
  if (pageLoader) {
    pageLoader.classList.add("is-hidden");
    pageLoader.setAttribute("aria-hidden", "true");
  }
};

document.body.classList.add("is-loading");
if (document.readyState === "complete") {
  window.requestAnimationFrame(revealPage);
} else {
  window.addEventListener("load", revealPage, { once: true });
}

const STORAGE_KEY = "theme-preference";
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const themeToggleButton = document.getElementById("theme-toggle");

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

const thinkerCanvas = document.getElementById("thinker-wireframe");
if (thinkerCanvas) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({
    canvas: thinkerCanvas,
    antialias: true,
    alpha: true,
  });
  const material = new THREE.MeshStandardMaterial({
    color: 0x9bdcff,
    transparent: true,
    opacity: 0.46,
    roughness: 0.32,
    metalness: 0.18,
  });
  const loader = new STLLoader();
  const baseRotation = new THREE.Euler(-Math.PI / 2, 0, Math.PI);
  let thinkerPivot;
  let thinkerMesh;
  let thinkerRadius = 1;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  const getThinkerLayout = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (width >= 1200 && height <= 980) {
      return {
        cameraY: 12,
        cameraZ: 172,
        pivotX: 30,
        pivotY: 8,
        pivotZ: -24,
        scaleTarget: 47,
      };
    }

    if (width >= 1200 && height <= 1180) {
      return {
        cameraY: 10,
        cameraZ: 164,
        pivotX: 26,
        pivotY: 5,
        pivotZ: -22,
        scaleTarget: 47,
      };
    }

    return {
      cameraY: 8,
      cameraZ: 150,
      pivotX: 30,
      pivotY: -2,
      pivotZ: -20,
      scaleTarget: 48,
    };
  };

  const applyThinkerLayout = () => {
    const layout = getThinkerLayout();
    camera.position.set(0, layout.cameraY, layout.cameraZ);
    if (thinkerPivot) {
      thinkerPivot.position.set(layout.pivotX, layout.pivotY, layout.pivotZ);
    }
    if (thinkerMesh) {
      thinkerMesh.scale.setScalar(layout.scaleTarget / thinkerRadius);
    }
  };

  applyThinkerLayout();

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(80, 120, 140);
  scene.add(ambientLight, keyLight);

  const setWireframeColor = () => {
    const theme =
      document.documentElement.getAttribute("data-bs-theme") || "light";
    const wireColor = theme === "dark" ? 0xc8eeff : 0x0f2f4f;
    material.color.setHex(wireColor);
  };

  const resizeRenderer = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    applyThinkerLayout();
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  loader.load(
    "/Thinker.stl",
    (geometry) => {
      geometry.center();
      geometry.computeBoundingSphere();
      thinkerRadius = geometry.boundingSphere?.radius || 1;
      thinkerPivot = new THREE.Group();
      thinkerMesh = new THREE.Mesh(geometry, material);
      thinkerMesh.rotation.copy(baseRotation);
      thinkerPivot.add(thinkerMesh);
      scene.add(thinkerPivot);
      applyThinkerLayout();
    },
    undefined,
    (error) => {
      console.error("Thinker STL konnte nicht geladen werden:", error);
    },
  );

  const themeObserver = new MutationObserver(() => {
    setWireframeColor();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-bs-theme"],
  });
  setWireframeColor();

  const animateThinker = () => {
    if (thinkerPivot) {
      thinkerPivot.rotation.y += 0.0022;
    }
    renderer.render(scene, camera);
    window.requestAnimationFrame(animateThinker);
  };

  window.addEventListener("resize", resizeRenderer);
  animateThinker();
}

const canvas = document.getElementById("spiders");
if (canvas) {
  let width = 0;
  let height = 0;
  let ctx;
  let points = [];
  let animateHeader = true;
  const target = { x: 0, y: 0 };

  const initHeader = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    target.x = width / 2;
    target.y = height / 3;
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext("2d");
    points = [];

    for (let x = 0; x < width; x += width / 20) {
      for (let y = 0; y < height; y += height / 20) {
        const px = x + (Math.random() * width) / 20;
        const py = y + (Math.random() * height) / 20;
        points.push({
          x: px,
          y: py,
          originX: px,
          originY: py,
          active: 0,
          closest: [],
          circleActive: 0,
          shiftStartX: px,
          shiftStartY: py,
          shiftEndX: px,
          shiftEndY: py,
          shiftStartTime: performance.now(),
          shiftDuration: 1200,
        });
      }
    }

    for (let i = 0; i < points.length; i += 1) {
      const closest = [];
      const p1 = points[i];
      for (let j = 0; j < points.length; j += 1) {
        const p2 = points[j];
        if (p1 === p2) {
          continue;
        }
        if (closest.length < 5) {
          closest.push(p2);
          continue;
        }
        for (let k = 0; k < 5; k += 1) {
          if (getDistance(p1, p2) < getDistance(p1, closest[k])) {
            closest[k] = p2;
            break;
          }
        }
      }
      p1.closest = closest;
      p1.radius = 2 + Math.random() * 2;
    }

    for (let i = 0; i < points.length; i += 1) {
      startShift(points[i], performance.now());
    }
  };

  const addListeners = () => {
    if (!("ontouchstart" in window)) {
      window.addEventListener("mousemove", mouseMove);
    }
    window.addEventListener("scroll", scrollCheck);
    window.addEventListener("resize", resize);
  };

  const mouseMove = (event) => {
    if (event.pageX || event.pageY) {
      target.x = event.pageX;
      target.y = event.pageY;
      return;
    }
    target.x =
      event.clientX +
      document.body.scrollLeft +
      document.documentElement.scrollLeft;
    target.y =
      event.clientY +
      document.body.scrollTop +
      document.documentElement.scrollTop;
  };

  const scrollCheck = () => {
    animateHeader = window.scrollY <= height;
  };

  const resize = () => {
    initHeader();
  };

  const startShift = (point, now) => {
    point.shiftStartX = point.x;
    point.shiftStartY = point.y;
    point.shiftEndX = point.originX - 50 + Math.random() * 100;
    point.shiftEndY = point.originY - 50 + Math.random() * 100;
    point.shiftStartTime = now;
    point.shiftDuration = 1000 + Math.random() * 1000;
  };

  const updateShift = (point, now) => {
    const elapsed = now - point.shiftStartTime;
    let t = elapsed / point.shiftDuration;
    if (t >= 1) {
      point.x = point.shiftEndX;
      point.y = point.shiftEndY;
      startShift(point, now);
      t = 0;
    }
    point.x = point.shiftStartX + (point.shiftEndX - point.shiftStartX) * t;
    point.y = point.shiftStartY + (point.shiftEndY - point.shiftStartY) * t;
  };

  const drawLines = (point) => {
    if (!point.active) {
      return;
    }
    for (let i = 0; i < point.closest.length; i += 1) {
      const connected = point.closest[i];
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(connected.x, connected.y);
      ctx.strokeStyle = `rgba(255,255,255,${point.active})`;
      ctx.stroke();
    }
  };

  const drawCircle = (point) => {
    if (!point.circleActive) {
      return;
    }
    ctx.beginPath();
    ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2, false);
    ctx.fillStyle = `rgba(255,255,255,${point.circleActive})`;
    ctx.fill();
  };

  const animate = () => {
    const now = performance.now();
    if (animateHeader) {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < points.length; i += 1) {
        const point = points[i];
        updateShift(point, now);
        const distance = Math.abs(getDistance(target, point));
        if (distance < 4000) {
          point.active = 0.3;
          point.circleActive = 0.6;
        } else if (distance < 20000) {
          point.active = 0.1;
          point.circleActive = 0.3;
        } else if (distance < 40000) {
          point.active = 0.02;
          point.circleActive = 0.1;
        } else {
          point.active = 0;
          point.circleActive = 0;
        }
        drawLines(point);
        drawCircle(point);
      }
    }
    window.requestAnimationFrame(animate);
  };

  const getDistance = (p1, p2) => {
    return (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
  };

  initHeader();
  addListeners();
  animate();
}

const latestWorksGrid = document.getElementById("latest-works-grid");
const latestNewsGrid = document.getElementById("latest-news-grid");
const latestProjectsGrid = document.getElementById("latest-projects-grid");
const pageEditableContent = document.getElementById("page-editable-content");
const API_URL = "https://www.mnemonic.guru/api/index.php";
const IMAGE_PATTERN = /\.(jpg|jpeg|png|gif|webp)$/i;
const projectPages = [
  { key: "raspi", label: "Raspi", pageUrl: "/raspi.html" },
  { key: "esp32", label: "esp32", pageUrl: "/esp32.html" },
  { key: "code", label: "Code", pageUrl: "/code.html" },
];
const teaserCategories = [
  {
    label: "Fractals",
    requestUrl: `${API_URL}?latest=1`,
    imageBase: "https://mnemonic.guru/img/fractals/",
    pageUrl: "/fraktale.html",
  },
  {
    label: "Digital",
    requestUrl: `${API_URL}?digital=1&latest=1`,
    imageBase: "https://mnemonic.guru/img/digital/",
    pageUrl: "/digitalart.html",
  },
  {
    label: "Fotos",
    requestUrl: `${API_URL}?fotos=1&latest=1`,
    imageBase: "https://mnemonic.guru/img/fotos/",
    pageUrl: "/fotos.html",
  },
];

const newsTeaserFeeds = [
  {
    label: "Security",
    requestUrl: `${API_URL}?rss=security&limit=1`,
  },
  {
    label: "heise online",
    requestUrl: `${API_URL}?rss=heiseonline&limit=1`,
  },
  {
    label: "Telepolis",
    requestUrl: `${API_URL}?rss=telepolis&limit=1`,
  },
];

const toDateTimeLabel = (value) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const showNewsModalLoader = () => {
  if (!newsModalLoader) {
    return;
  }
  newsModalLoader.classList.add("is-active");
  newsModalLoader.setAttribute("aria-hidden", "false");
};

const hideNewsModalLoader = () => {
  if (!newsModalLoader) {
    return;
  }
  newsModalLoader.classList.remove("is-active");
  newsModalLoader.setAttribute("aria-hidden", "true");
};

const renderLatestCard = (category, fileName) => {
  if (!latestWorksGrid) {
    return;
  }
  const card = document.createElement("article");
  card.className = "latest-work-card";

  const link = document.createElement("a");
  link.href = category.pageUrl;
  link.className = "latest-work-link";

  if (fileName) {
    const image = document.createElement("img");
    image.className = "latest-work-image";
    image.src = `${category.imageBase}${encodeURIComponent(fileName)}`;
    image.alt = `${category.label} - ${fileName}`;
    image.loading = "lazy";
    link.appendChild(image);
  }

  const meta = document.createElement("div");
  meta.className = "latest-work-meta";
  meta.innerHTML = `<span>${category.label}</span><strong>${fileName || "Keine Bilder"}</strong>`;

  link.appendChild(meta);
  card.appendChild(link);
  latestWorksGrid.appendChild(card);
};

const loadLatestWorks = async () => {
  if (!latestWorksGrid) {
    return;
  }
  latestWorksGrid.innerHTML = "";
  for (let i = 0; i < teaserCategories.length; i += 1) {
    const category = teaserCategories[i];
    try {
      const response = await fetch(category.requestUrl, { cache: "no-store" });
      const json = await response.json();
      if (!Array.isArray(json)) {
        renderLatestCard(category, "");
        continue;
      }
      const fileName = json.find((entry) => IMAGE_PATTERN.test(entry)) || "";
      renderLatestCard(category, fileName);
    } catch (error) {
      console.error(`Latest works failed (${category.label}):`, error);
      renderLatestCard(category, "");
    }
  }
};

const renderLatestNewsCard = (feed, item) => {
  if (!latestNewsGrid) {
    return;
  }

  const card = document.createElement("article");
  card.className = "latest-news-card";

  if (item.image) {
    const image = document.createElement("img");
    image.className = "latest-news-image";
    image.src = item.image;
    image.alt = item.title || `${feed.label} - Newsbild`;
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";
    card.appendChild(image);
  }

  const body = document.createElement("div");
  body.className = "latest-news-meta";

  const source = document.createElement("span");
  source.textContent = feed.label;

  const title = document.createElement("strong");
  title.textContent = item.title || "Ohne Titel";

  const date = document.createElement("small");
  date.className = "text-body-secondary";
  date.textContent = toDateTimeLabel(item.pubDate);

  const link = document.createElement("a");
  link.className = "btn btn-sm btn-outline-light mt-2 align-self-start";
  link.href = item.link || "/news.html";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Artikel lesen";

  body.append(source, title, date, link);
  card.appendChild(body);
  latestNewsGrid.appendChild(card);
};

const loadLatestNews = async () => {
  if (!latestNewsGrid) {
    return;
  }
  latestNewsGrid.innerHTML = "";

  for (let i = 0; i < newsTeaserFeeds.length; i += 1) {
    const feed = newsTeaserFeeds[i];
    try {
      const response = await fetch(feed.requestUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      const firstItem = Array.isArray(payload.items) ? payload.items[0] : null;
      if (!firstItem) {
        throw new Error("Keine Feed-Eintraege");
      }
      renderLatestNewsCard(feed, firstItem);
    } catch (error) {
      console.error(`Latest news failed (${feed.label}):`, error);
      renderLatestNewsCard(feed, {
        title: "Keine News verfuegbar",
        pubDate: "",
        link: "/news.html",
        image: "",
      });
    }
  }
};

const initLatestNews = async () => {
  if (!latestNewsGrid) {
    hideNewsModalLoader();
    return;
  }
  showNewsModalLoader();
  try {
    await loadLatestNews();
  } finally {
    hideNewsModalLoader();
  }
};

const inferPageKeyFromPath = () => {
  const path = window.location.pathname.toLowerCase();
  if (path.endsWith("/raspi.html")) {
    return "raspi";
  }
  if (path.endsWith("/esp32.html")) {
    return "esp32";
  }
  if (path.endsWith("/code.html")) {
    return "code";
  }
  if (path.endsWith("/howto.html")) {
    return "howto";
  }
  return "";
};

const parseProjectCardsFromContent = (content, pageKey) => {
  const html = String(content || "").trim();
  if (!html) {
    return [];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div id="root">${html}</div>`,
    "text/html",
  );
  const cards = Array.from(doc.querySelectorAll(".project-section-card"));

  if (!cards.length) {
    return [];
  }

  return cards.map((card, index) => {
    const title =
      card.querySelector(".project-section-title")?.textContent?.trim() ||
      `Artikel ${index + 1}`;
    const summary =
      card.querySelector(".project-section-summary")?.textContent?.trim() || "";
    const bodyHtml =
      card.querySelector(".project-section-body")?.innerHTML || "";
    const imageUrl = card.querySelector(".project-section-body img")?.src || "";
    const originalIndex = index + 1;
    return {
      id: `${pageKey}-article-${originalIndex}`,
      pageKey,
      title,
      summary,
      bodyHtml,
      imageUrl,
      originalIndex,
    };
  });
};

const slugifyHowtoValue = (value, fallback = "howto") => {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
};

const getHowtoSlug = (article) => {
  return slugifyHowtoValue(article.title, article.id);
};

const toTimestamp = (value) => {
  const date = new Date(value || "");
  const unix = date.getTime();
  return Number.isNaN(unix) ? 0 : unix;
};

const truncateText = (value, maxLength) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1).trim()}...`;
};

const getPageMetaByKey = (pageKey) => {
  if (pageKey === "p5js") {
    return {
      key: "p5js",
      label: "p5.js",
      pageUrl: "/p5js.html",
    };
  }

  return (
    projectPages.find((entry) => entry.key === pageKey) || {
      key: pageKey,
      label: pageKey,
      pageUrl: `/${pageKey}.html`,
    }
  );
};

const renderProjectArticleCards = (container, pageKey, content) => {
  if (!container) {
    return false;
  }

  const articles = parseProjectCardsFromContent(content, pageKey).sort(
    (a, b) => b.originalIndex - a.originalIndex,
  );
  if (!articles.length) {
    return false;
  }
  const urlArticleId =
    new URLSearchParams(window.location.search).get("article") || "";

  const wrapper = document.createElement("div");
  wrapper.className = "raspi-articles";

  const grid = document.createElement("div");
  grid.className = "raspi-articles-grid";

  const detail = document.createElement("article");
  detail.className = "raspi-article-detail d-none";

  const detailTitle = document.createElement("h2");
  detailTitle.className = "h4 fw-bold mb-3";

  const detailBody = document.createElement("div");
  detailBody.className = "raspi-article-detail-body";

  detail.append(detailTitle, detailBody);

  const setDetail = (article, button, shouldScroll = true) => {
    detailTitle.textContent = article.title;
    detailBody.innerHTML = article.bodyHtml || "<p>Kein Inhalt vorhanden.</p>";
    detail.classList.remove("d-none");

    const buttons = grid.querySelectorAll(".raspi-article-open");
    buttons.forEach((entry) => {
      entry.classList.remove("active");
      entry.setAttribute("aria-expanded", "false");
    });
    button.classList.add("active");
    button.setAttribute("aria-expanded", "true");

    if (shouldScroll) {
      detail.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  let autoOpenButton = null;
  let autoOpenArticle = null;

  for (let i = 0; i < articles.length; i += 1) {
    const article = articles[i];
    const card = document.createElement("article");
    card.className = "raspi-article-card";

    if (article.imageUrl) {
      const image = document.createElement("img");
      image.className = "raspi-article-card-image";
      image.loading = "lazy";
      image.alt = article.title;
      image.src = article.imageUrl;
      card.appendChild(image);
    }

    const body = document.createElement("div");
    body.className = "raspi-article-card-body";

    const title = document.createElement("h3");
    title.className = "h5 fw-bold mb-2";
    title.textContent = article.title;

    const summary = document.createElement("p");
    summary.className = "text-body-secondary mb-3";
    summary.textContent = article.summary || "Kein Kurztext vorhanden.";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-outline-primary raspi-article-open";
    button.textContent = "Artikel lesen";
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("click", () => {
      setDetail(article, button);
    });
    if (urlArticleId && urlArticleId === article.id) {
      autoOpenButton = button;
      autoOpenArticle = article;
    }

    body.append(title, summary, button);
    card.appendChild(body);
    grid.appendChild(card);
  }

  wrapper.append(grid, detail);
  container.innerHTML = "";
  container.appendChild(wrapper);
  if (autoOpenButton && autoOpenArticle) {
    setDetail(autoOpenArticle, autoOpenButton, false);
  }
  return true;
};

const normalizeHowtoCodeBlocks = (root) => {
  if (!root) {
    return;
  }

  const createTerminalCodeBlock = ({ rawCode, lang = "bash", prompt = "$" }) => {
    const normalizedCode = String(rawCode || "").replace(/\s+$/g, "");
    const lines = normalizedCode ? normalizedCode.split("\n") : [""];

    const wrapper = document.createElement("div");
    wrapper.className = "code-block relative my-4 rounded-lg overflow-hidden";
    wrapper.dataset.lang = lang;
    wrapper.dataset.prompt = prompt;
    wrapper.dataset.promptInit = "1";

    const header = document.createElement("div");
    header.className = "code-header";
    header.innerHTML = `
      <div class="code-header-title">
        <svg class="code-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="4 17 10 11 4 5"></polyline>
          <line x1="12" y1="19" x2="20" y2="19"></line>
        </svg>
        <span>Terminal</span>
      </div>
      <button class="code-copy button" type="button" aria-label="Copy code to clipboard">
        <svg class="code-copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
    `;

    const highlight = document.createElement("div");
    highlight.className = "highlight";

    const nextPre = document.createElement("pre");
    nextPre.tabIndex = 0;
    nextPre.className = "chroma howto-code-block";

    const nextCode = document.createElement("code");
    nextCode.className = `language-${lang}`;
    nextCode.dataset.lang = lang;

    lines.forEach((line) => {
      const lineElement = document.createElement("span");
      lineElement.className = "line";
      lineElement.dataset.promptChar = prompt;

      const content = document.createElement("span");
      content.className = "cl";
      content.textContent = line;

      lineElement.appendChild(content);
      nextCode.appendChild(lineElement);
    });

    nextPre.appendChild(nextCode);
    highlight.appendChild(nextPre);
    wrapper.append(header, highlight);
    return wrapper;
  };

  const markPreviousCodeLabel = (element) => {
    const previous = element.previousElementSibling;
    const previousText = previous?.textContent?.trim() || "";
    if (
      previous &&
      previous.tagName.toLowerCase() === "p" &&
      previousText.length > 0 &&
      previousText.length <= 40 &&
      !/[.!?]$/.test(previousText)
    ) {
      previous.classList.add("howto-code-label");
    }
  };

  const quillContainers = Array.from(
    root.querySelectorAll(".ql-code-block-container"),
  );
  quillContainers.forEach((container) => {
    if (container.closest(".code-block")) {
      return;
    }
    markPreviousCodeLabel(container);
    const lines = Array.from(container.querySelectorAll(".ql-code-block")).map(
      (line) => line.textContent || "",
    );
    const wrapper = createTerminalCodeBlock({
      rawCode: lines.join("\n"),
      lang: container.dataset.language || "bash",
      prompt: container.dataset.prompt || "$",
    });
    container.replaceWith(wrapper);
  });

  const orphanQuillLines = Array.from(root.querySelectorAll(".ql-code-block"));
  orphanQuillLines.forEach((line) => {
    if (
      line.closest(".code-block") ||
      line.closest(".ql-code-block-container")
    ) {
      return;
    }
    markPreviousCodeLabel(line);
    const wrapper = createTerminalCodeBlock({
      rawCode: line.textContent || "",
      lang: line.dataset.language || "bash",
      prompt: line.dataset.prompt || "$",
    });
    line.replaceWith(wrapper);
  });

  const blocks = Array.from(root.querySelectorAll("pre"));
  blocks.forEach((pre) => {
    if (pre.closest(".code-block")) {
      return;
    }

    pre.classList.add("howto-code-block");
    let code = pre.querySelector("code");
    if (!code) {
      const code = document.createElement("code");
      code.textContent = pre.textContent || "";
      pre.textContent = "";
      pre.appendChild(code);
    }
    code = pre.querySelector("code");
    markPreviousCodeLabel(pre);

    const languageClass =
      Array.from(code?.classList || []).find((entry) =>
        entry.startsWith("language-"),
      ) || "";
    const lang =
      pre.dataset.lang ||
      code?.dataset.lang ||
      languageClass.replace("language-", "") ||
      "bash";
    const prompt = pre.dataset.prompt || "$";
    const rawCode = code?.textContent || "";

    const wrapper = createTerminalCodeBlock({ rawCode, lang, prompt });
    pre.replaceWith(wrapper);
  });
};

const bindHowtoCodeCopyButtons = (root) => {
  if (!root) {
    return;
  }

  const buttons = Array.from(root.querySelectorAll(".code-copy"));
  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      const block = button.closest(".code-block");
      const codeLines = Array.from(block?.querySelectorAll(".cl") || []).map(
        (line) => line.textContent || "",
      );
      const codeText =
        codeLines.length > 0
          ? codeLines.join("\n")
          : block?.querySelector("code")?.textContent || "";
      if (!codeText) {
        return;
      }
      try {
        await navigator.clipboard.writeText(codeText);
        button.classList.add("is-copied");
        window.setTimeout(() => {
          button.classList.remove("is-copied");
        }, 1200);
      } catch (error) {
        console.error("Copy code failed:", error);
      }
    });
  });
};

const buildHowtoOutline = (contentBody, aside) => {
  if (!contentBody || !aside) {
    return;
  }

  const headings = Array.from(contentBody.querySelectorAll("h2, h3"));
  if (!headings.length) {
    aside.classList.add("d-none");
    return;
  }

  const list = document.createElement("ul");
  list.className = "howto-toc-list";
  const usedIds = new Set();

  headings.forEach((heading, index) => {
    const label = heading.textContent?.trim() || `Abschnitt ${index + 1}`;
    let id = heading.id || slugifyHowtoValue(label, `section-${index + 1}`);
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${id}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);
    heading.id = id;

    const item = document.createElement("li");
    item.className = heading.tagName.toLowerCase() === "h3" ? "is-child" : "";
    const link = document.createElement("a");
    link.href = `#${id}`;
    link.textContent = label;
    item.appendChild(link);
    list.appendChild(item);
  });

  aside.innerHTML = "";
  const title = document.createElement("strong");
  title.textContent = "On this page";
  aside.append(title, list);
};

const renderHowtoIndex = (container, pageKey, content) => {
  if (!container) {
    return false;
  }

  const articles = parseProjectCardsFromContent(content, pageKey).sort(
    (a, b) => b.originalIndex - a.originalIndex,
  );
  if (!articles.length) {
    return false;
  }

  const grid = document.createElement("div");
  grid.className = "howto-index-grid";

  articles.forEach((article) => {
    const card = document.createElement("article");
    card.className = "howto-index-card";

    const title = document.createElement("h2");
    title.className = "h5 fw-bold mb-2";
    title.textContent = article.title;

    const summary = document.createElement("p");
    summary.className = "text-body-secondary mb-3";
    summary.textContent = article.summary || "Schritt-fuer-Schritt Anleitung";

    const link = document.createElement("a");
    link.className = "btn btn-outline-primary";
    link.href = `/howto-detail.html?howto=${encodeURIComponent(getHowtoSlug(article))}`;
    link.textContent = "Howto lesen";

    card.append(title, summary, link);
    grid.appendChild(card);
  });

  container.innerHTML = "";
  container.appendChild(grid);
  return true;
};

const renderHowtoDetail = (container, pageKey, content) => {
  if (!container) {
    return false;
  }

  const articles = parseProjectCardsFromContent(content, pageKey).sort(
    (a, b) => b.originalIndex - a.originalIndex,
  );
  if (!articles.length) {
    return false;
  }

  const requestedSlug =
    String(new URLSearchParams(window.location.search).get("howto") || "")
      .trim()
      .toLowerCase() || getHowtoSlug(articles[0]);
  const article =
    articles.find((entry) => getHowtoSlug(entry) === requestedSlug) ||
    articles[0];

  const layout = document.createElement("div");
  layout.className = "howto-detail-layout";

  const articleElement = document.createElement("article");
  articleElement.className = "howto-article";

  const crumb = document.createElement("nav");
  crumb.className = "howto-breadcrumb";
  crumb.setAttribute("aria-label", "Breadcrumb");
  crumb.innerHTML = `<a href="/howto.html">Howto</a><span>/</span><span></span>`;
  crumb.querySelector("span:last-child").textContent = article.title;

  const title = document.createElement("h1");
  title.className = "howto-article-title";
  title.textContent = article.title;

  const meta = document.createElement("p");
  meta.className = "howto-article-meta";
  meta.textContent = "mnemonic.guru";

  const summary = document.createElement("p");
  summary.className = "howto-article-lead";
  summary.textContent = article.summary || "";

  const body = document.createElement("div");
  body.className = "howto-article-body";
  body.innerHTML = article.bodyHtml || "<p>Kein Inhalt vorhanden.</p>";
  normalizeHowtoCodeBlocks(body);
  bindHowtoCodeCopyButtons(body);

  articleElement.append(crumb, title, meta);
  if (article.summary) {
    articleElement.appendChild(summary);
  }
  articleElement.appendChild(body);

  const aside = document.createElement("aside");
  aside.className = "howto-toc";
  buildHowtoOutline(body, aside);

  layout.append(articleElement, aside);
  container.innerHTML = "";
  container.appendChild(layout);
  return true;
};

const renderHowtoPage = (container, pageKey, content) => {
  const view = String(container?.dataset.howtoView || "index").toLowerCase();
  if (view === "detail") {
    return renderHowtoDetail(container, pageKey, content);
  }
  return renderHowtoIndex(container, pageKey, content);
};

const renderHowtoAccordion = (container, pageKey, content) => {
  if (!container) {
    return false;
  }

  const articles = parseProjectCardsFromContent(content, pageKey).sort(
    (a, b) => b.originalIndex - a.originalIndex,
  );
  if (!articles.length) {
    return false;
  }

  const accordion = document.createElement("div");
  accordion.className = "accordion howto-accordion";
  accordion.id = "howto-accordion";

  articles.forEach((article, index) => {
    const item = document.createElement("article");
    item.className = "accordion-item howto-accordion-item";

    const headerId = `howto-heading-${index + 1}`;
    const panelId = `howto-panel-${index + 1}`;
    const header = document.createElement("h2");
    header.className = "accordion-header";
    header.id = headerId;

    const button = document.createElement("button");
    button.className = `accordion-button${index === 0 ? "" : " collapsed"}`;
    button.type = "button";
    button.setAttribute("data-bs-toggle", "collapse");
    button.setAttribute("data-bs-target", `#${panelId}`);
    button.setAttribute("aria-expanded", index === 0 ? "true" : "false");
    button.setAttribute("aria-controls", panelId);

    const title = document.createElement("span");
    title.className = "howto-accordion-title";
    title.textContent = article.title;

    button.appendChild(title);
    header.appendChild(button);

    const panel = document.createElement("div");
    panel.id = panelId;
    panel.className = `accordion-collapse collapse${index === 0 ? " show" : ""}`;
    panel.setAttribute("aria-labelledby", headerId);
    panel.setAttribute("data-bs-parent", "#howto-accordion");

    const body = document.createElement("div");
    body.className = "accordion-body howto-accordion-body";

    if (article.summary) {
      const summary = document.createElement("p");
      summary.className = "text-body-secondary mb-3";
      summary.textContent = article.summary;
      body.appendChild(summary);
    }

    const contentBody = document.createElement("div");
    contentBody.className = "howto-accordion-content";
    contentBody.innerHTML = article.bodyHtml || "<p>Kein Inhalt vorhanden.</p>";

    body.appendChild(contentBody);
    panel.appendChild(body);
    item.append(header, panel);
    accordion.appendChild(item);
  });

  container.innerHTML = "";
  container.appendChild(accordion);
  return true;
};

const fetchProjectPagePayload = async (pageKey) => {
  const response = await fetch(
    `${API_URL}?page_content=1&page=${encodeURIComponent(pageKey)}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (String(payload?.status || "").toUpperCase() !== "OK") {
    throw new Error(payload?.msg || "Unerwartete API-Antwort");
  }
  return payload;
};

const loadEditablePageContent = async () => {
  if (!pageEditableContent) {
    return;
  }

  const pageKey =
    String(pageEditableContent.dataset.pageKey || "")
      .trim()
      .toLowerCase() || inferPageKeyFromPath();
  if (!pageKey) {
    return;
  }

  try {
    const payload = await fetchProjectPagePayload(pageKey);
    const content = String(payload?.content || "");
    if (pageKey === "howto" && renderHowtoPage(pageEditableContent, pageKey, content)) {
      return;
    }
    if (renderProjectArticleCards(pageEditableContent, pageKey, content)) {
      return;
    }
    pageEditableContent.innerHTML = content;
  } catch (error) {
    console.error(`Page content load failed (${pageKey}):`, error);
  }
};

const renderLatestProjectOverviewCard = (project) => {
  if (!latestProjectsGrid) {
    return;
  }

  const pageMeta = getPageMetaByKey(project.pageKey);
  const card = document.createElement("article");
  card.className = "latest-work-card";

  const link = document.createElement("a");
  link.href =
    project.pageKey === "p5js"
      ? pageMeta.pageUrl
      : `${pageMeta.pageUrl}?article=${encodeURIComponent(project.id)}`;
  link.className = "latest-work-link";

  if (project.imageUrl) {
    const image = document.createElement("img");
    image.className = "latest-work-image";
    image.src = project.imageUrl;
    image.alt = project.title;
    image.loading = "lazy";
    link.appendChild(image);
  }

  const meta = document.createElement("div");
  meta.className = "latest-work-meta";

  const label = document.createElement("span");
  label.textContent = pageMeta.label;

  const title = document.createElement("strong");
  title.textContent = project.title;

  meta.append(label, title);

  if (project.summary) {
    const summary = document.createElement("small");
    summary.className = "text-body-secondary latest-project-summary";
    summary.textContent = truncateText(project.summary, 160);
    meta.appendChild(summary);
  }

  if (project.codeSnippet) {
    const pre = document.createElement("pre");
    pre.className = "latest-project-code";

    const code = document.createElement("code");
    code.textContent = truncateText(project.codeSnippet, 420);

    pre.appendChild(code);
    meta.appendChild(pre);
  }

  link.appendChild(meta);
  card.appendChild(link);
  latestProjectsGrid.appendChild(card);
};

const fetchLatestP5ProjectOverview = async () => {
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
  const latestProject = projects[0];
  if (!latestProject) {
    return null;
  }

  let codeSnippet = "";
  let description = String(latestProject.description || "");
  try {
    const codeResponse = await fetch(
      `${API_URL}?p5js_project_code=1&project=${encodeURIComponent(latestProject.slug)}`,
      { cache: "no-store" },
    );
    if (!codeResponse.ok) {
      throw new Error(`HTTP ${codeResponse.status}`);
    }
    const codePayload = await codeResponse.json();
    if (String(codePayload?.status || "").toUpperCase() !== "OK") {
      throw new Error(codePayload?.msg || "Unerwartete API-Antwort");
    }
    description =
      String(codePayload?.description || "").trim() || description;
    const snippets = Array.isArray(codePayload?.snippets)
      ? codePayload.snippets
      : [];
    const codeFile = snippets[0] || codePayload?.file || null;
    codeSnippet = String(codeFile?.content || "");
  } catch (error) {
    console.error("Latest p5.js code failed:", error);
  }

  return {
    id: `p5js-${latestProject.slug}`,
    pageKey: "p5js",
    title: `${latestProject.name} - Beschreibung und Quelltext`,
    summary: description,
    codeSnippet,
    imageUrl: "",
    originalIndex: 1,
    pageUpdatedAt: toTimestamp(latestProject.updated_at || ""),
    withinPageRank: 0,
  };
};

const loadLatestProjectsOverview = async () => {
  if (!latestProjectsGrid) {
    return;
  }
  latestProjectsGrid.innerHTML = "";

  const allProjects = [];
  for (let i = 0; i < projectPages.length; i += 1) {
    const page = projectPages[i];
    try {
      const payload = await fetchProjectPagePayload(page.key);
      const pageUpdatedAt = toTimestamp(payload?.updated_at || "");
      const projects = parseProjectCardsFromContent(
        payload?.content || "",
        page.key,
      )
        .sort((a, b) => b.originalIndex - a.originalIndex)
        .map((entry, rank) => ({
          ...entry,
          pageUpdatedAt,
          withinPageRank: rank,
        }));
      allProjects.push(...projects);
    } catch (error) {
      console.error(`Latest projects failed (${page.key}):`, error);
    }
  }

  try {
    const p5Project = await fetchLatestP5ProjectOverview();
    if (p5Project) {
      allProjects.push(p5Project);
    }
  } catch (error) {
    console.error("Latest p5.js project failed:", error);
  }

  allProjects
    .sort((a, b) => {
      if (a.pageUpdatedAt !== b.pageUpdatedAt) {
        return b.pageUpdatedAt - a.pageUpdatedAt;
      }
      return a.withinPageRank - b.withinPageRank;
    })
    .slice(0, 6)
    .forEach((entry) => {
      renderLatestProjectOverviewCard(entry);
    });
};

loadEditablePageContent();
initLatestNews();
loadLatestWorks();
loadLatestProjectsOverview();
