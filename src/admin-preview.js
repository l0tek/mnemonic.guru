import "./styles.scss";
import {
  API_URL,
  initAdminShell,
  parseApiResponse,
  updateStatus,
} from "./admin-shared.js";

const previewForm = document.getElementById("admin-preview-form");
const previewStatus = document.getElementById("admin-preview-status");
const refreshButton = document.getElementById("admin-preview-refresh");
const previewSelects = Array.from(
  document.querySelectorAll("[data-preview-key]"),
);

const gallerySources = [
  {
    key: "gallery_fractals",
    url: `${API_URL}?latest=1`,
  },
  {
    key: "gallery_digital",
    url: `${API_URL}?digital=1&latest=1`,
  },
  {
    key: "gallery_fotos",
    url: `${API_URL}?fotos=1&latest=1`,
  },
];
const projectPages = [
  { key: "raspi", label: "Raspi" },
  { key: "esp32", label: "esp32" },
  { key: "code", label: "Code" },
];
const IMAGE_PATTERN = /\.(jpg|jpeg|png|gif|webp)$/i;

let currentSelections = {};

const addOption = (select, value, label) => {
  if (!select) {
    return;
  }
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.appendChild(option);
};

const setSelectOptions = (key, options) => {
  const select = previewSelects.find((entry) => entry.dataset.previewKey === key);
  if (!select) {
    return;
  }
  const selectedValue = String(currentSelections[key] || "");
  select.innerHTML = "";
  addOption(select, "", "Automatisch");
  options.forEach((option) => {
    addOption(select, option.value, option.label);
  });
  select.value = options.some((option) => option.value === selectedValue)
    ? selectedValue
    : "";
};

const fetchPreviewSelections = async () => {
  const response = await fetch(`${API_URL}?preview_config=1`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = await parseApiResponse(response);
  return payload?.selections || {};
};

const fetchJson = async (url) => {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
};

const parseProjectCardsFromContent = (content, pageKey, pageLabel) => {
  const html = String(content || "").trim();
  if (!html) {
    return [];
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div id="root">${html}</div>`,
    "text/html",
  );
  return Array.from(doc.querySelectorAll(".project-section-card")).map(
    (card, index) => {
      const originalIndex = index + 1;
      const title =
        card.querySelector(".project-section-title")?.textContent?.trim() ||
        `${pageLabel} ${originalIndex}`;
      return {
        id: `${pageKey}-article-${originalIndex}`,
        pageKey,
        title,
        label: `${pageLabel}: ${title}`,
      };
    },
  );
};

const loadGalleryOptions = async () => {
  await Promise.all(
    gallerySources.map(async (source) => {
      const payload = await fetchJson(source.url);
      const files = Array.isArray(payload)
        ? payload.filter((entry) => IMAGE_PATTERN.test(entry))
        : [];
      setSelectOptions(
        source.key,
        files.map((fileName) => ({
          value: fileName,
          label: fileName,
        })),
      );
    }),
  );
};

const loadProjectOptions = async () => {
  const articleGroups = await Promise.all(
    projectPages.map(async (page) => {
      const payload = await fetchJson(
        `${API_URL}?page_content=1&page=${encodeURIComponent(page.key)}`,
      );
      return parseProjectCardsFromContent(
        payload?.content || "",
        page.key,
        page.label,
      );
    }),
  );
  const articles = articleGroups.flat();
  const raspiArticles = articles.filter((entry) => entry.pageKey === "raspi");

  const p5Payload = await fetchJson(`${API_URL}?p5js_projects=1`);
  const p5Projects = Array.isArray(p5Payload?.projects)
    ? p5Payload.projects
    : [];

  setSelectOptions(
    "home_project",
    [
      ...articles.map((article) => ({
        value: `${article.pageKey}:${article.id}`,
        label: article.label,
      })),
      ...p5Projects.map((project) => ({
        value: `p5js:${project.slug}`,
        label: `p5.js: ${project.name || project.slug}`,
      })),
    ],
  );
  setSelectOptions(
    "lab_raspi_article",
    raspiArticles.map((article) => ({
      value: article.id,
      label: article.title,
    })),
  );
  setSelectOptions(
    "lab_code_p5",
    p5Projects.map((project) => ({
      value: project.slug,
      label: project.name || project.slug,
    })),
  );
};

const loadPreviewForm = async () => {
  if (!previewForm) {
    return;
  }
  updateStatus(previewStatus, "Auswahl wird geladen ...");
  try {
    currentSelections = await fetchPreviewSelections();
    await Promise.all([loadGalleryOptions(), loadProjectOptions()]);
    updateStatus(previewStatus, "Auswahl geladen.", "success");
  } catch (error) {
    updateStatus(
      previewStatus,
      `Laden fehlgeschlagen: ${error.message}`,
      "error",
    );
  }
};

const collectSelections = () => {
  const selections = {};
  previewSelects.forEach((select) => {
    selections[select.dataset.previewKey] = select.value;
  });
  return selections;
};

initAdminShell({
  onAuthenticated: () => {
    loadPreviewForm();
  },
});

refreshButton?.addEventListener("click", () => {
  loadPreviewForm();
});

previewForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = previewForm.querySelector('button[type="submit"]');
  submitButton?.setAttribute("disabled", "disabled");
  updateStatus(previewStatus, "Voransicht wird gespeichert ...");
  try {
    const formData = new FormData();
    formData.set("action", "save_preview_config");
    formData.set("selections", JSON.stringify(collectSelections()));
    const response = await fetch(API_URL, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    });
    const payload = await parseApiResponse(response);
    currentSelections = payload?.selections || {};
    previewSelects.forEach((select) => {
      select.value = String(currentSelections[select.dataset.previewKey] || "");
    });
    updateStatus(previewStatus, "Voransicht gespeichert.", "success");
  } catch (error) {
    updateStatus(
      previewStatus,
      `Speichern fehlgeschlagen: ${error.message}`,
      "error",
    );
  } finally {
    submitButton?.removeAttribute("disabled");
  }
});
