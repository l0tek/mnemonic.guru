import "./styles.scss";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./nav-dropdowns.js";
import { js as beautifyJs } from "js-beautify";

const STORAGE_KEY = "theme-preference";
const API_URL = "https://www.mnemonic.guru/api/index.php";
const API_ORIGIN = new URL(API_URL).origin;
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const themeToggleButton = document.getElementById("theme-toggle");
const projectList = document.getElementById("p5js-project-list");
const projectStatus = document.getElementById("p5js-project-status");
const previewFrame = document.getElementById("p5js-preview-frame");
const previewTitle = document.getElementById("p5js-preview-title");
const openInTabLink = document.getElementById("p5js-open-in-tab");
const openFullscreenButton = document.getElementById("p5js-open-fullscreen");
const codeTitle = document.getElementById("p5js-code-title");
const codeStatus = document.getElementById("p5js-code-status");
const codeContent = document.getElementById("p5js-code-content");
const projectDescription = document.getElementById("p5js-project-description");

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

const setStatus = (message, tone = "neutral") => {
  if (!projectStatus) {
    return;
  }
  projectStatus.textContent = message;
  projectStatus.classList.remove(
    "text-success",
    "text-danger",
    "text-body-secondary",
  );
  if (tone === "error") {
    projectStatus.classList.add("text-danger");
    return;
  }
  if (tone === "success") {
    projectStatus.classList.add("text-success");
    return;
  }
  projectStatus.classList.add("text-body-secondary");
};

const setCodeStatus = (message, tone = "neutral") => {
  if (!codeStatus) {
    return;
  }
  codeStatus.textContent = message;
  codeStatus.classList.remove(
    "text-success",
    "text-danger",
    "text-body-secondary",
  );
  if (tone === "error") {
    codeStatus.classList.add("text-danger");
    return;
  }
  if (tone === "success") {
    codeStatus.classList.add("text-success");
    return;
  }
  codeStatus.classList.add("text-body-secondary");
};

const escapeHtml = (value) => {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
};

const formatJavaScript = (source) => {
  return beautifyJs(String(source || ""), {
    indent_size: 2,
    indent_char: " ",
    preserve_newlines: true,
    max_preserve_newlines: 2,
    end_with_newline: true,
    space_in_empty_paren: false,
    space_after_anon_function: true,
  });
};

const highlightJavaScript = (source) => {
  const keywords = new Set([
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "default",
    "delete",
    "do",
    "else",
    "export",
    "extends",
    "finally",
    "for",
    "function",
    "if",
    "import",
    "in",
    "instanceof",
    "let",
    "new",
    "return",
    "super",
    "switch",
    "this",
    "throw",
    "try",
    "typeof",
    "var",
    "void",
    "while",
    "with",
    "yield",
    "await",
    "async",
    "of",
    "true",
    "false",
    "null",
    "undefined",
  ]);
  const builtins = new Set([
    "Math",
    "Date",
    "Array",
    "Object",
    "Number",
    "String",
    "Boolean",
    "console",
    "window",
    "document",
    "p5",
    "setup",
    "draw",
    "createCanvas",
    "background",
    "stroke",
    "fill",
    "line",
    "rect",
    "ellipse",
    "circle",
    "noise",
    "random",
  ]);

  const text = String(source || "");
  let index = 0;
  let html = "";

  const read = (regex) => {
    regex.lastIndex = index;
    const match = regex.exec(text);
    return match?.index === index ? match[0] : "";
  };

  const rxLineComment = /\/\/[^\n]*/y;
  const rxBlockComment = /\/\*[\s\S]*?\*\//y;
  const rxDouble = /"(?:\\.|[^"\\])*"/y;
  const rxSingle = /'(?:\\.|[^'\\])*'/y;
  const rxTemplate = /`(?:\\.|[^`\\])*`/y;
  const rxNumber = /\b\d+(?:\.\d+)?\b/y;
  const rxIdentifier = /[A-Za-z_$][A-Za-z0-9_$]*/y;

  while (index < text.length) {
    const chunk =
      read(rxLineComment) ||
      read(rxBlockComment) ||
      read(rxDouble) ||
      read(rxSingle) ||
      read(rxTemplate) ||
      read(rxNumber) ||
      read(rxIdentifier);

    if (!chunk) {
      html += escapeHtml(text[index]);
      index += 1;
      continue;
    }

    if (chunk.startsWith("//") || chunk.startsWith("/*")) {
      html += `<span class="tok-comment">${escapeHtml(chunk)}</span>`;
    } else if (
      chunk.startsWith('"') ||
      chunk.startsWith("'") ||
      chunk.startsWith("`")
    ) {
      html += `<span class="tok-string">${escapeHtml(chunk)}</span>`;
    } else if (/^\d/.test(chunk)) {
      html += `<span class="tok-number">${escapeHtml(chunk)}</span>`;
    } else if (keywords.has(chunk)) {
      html += `<span class="tok-keyword">${escapeHtml(chunk)}</span>`;
    } else if (builtins.has(chunk)) {
      html += `<span class="tok-builtin">${escapeHtml(chunk)}</span>`;
    } else {
      html += escapeHtml(chunk);
    }
    index += chunk.length;
  }
  return html;
};

const renderCodeFile = (file) => {
  if (!codeContent) {
    return;
  }
  const wrapper = document.createElement("article");
  wrapper.className = "p5js-code-block";

  const title = document.createElement("p");
  title.className = "small fw-semibold mb-2";
  title.textContent = file.path || "sketch.js";

  const pre = document.createElement("pre");
  pre.className = "p5js-code-pre";

  const code = document.createElement("code");
  code.className = file.language || "javascript";
  const formatted = formatJavaScript(String(file.content || ""));
  code.innerHTML = highlightJavaScript(formatted);

  pre.appendChild(code);
  wrapper.append(title, pre);
  codeContent.appendChild(wrapper);
};

const renderDescription = (text) => {
  if (!projectDescription) {
    return;
  }
  const value = String(text || "").trim();
  if (!value) {
    projectDescription.classList.add("d-none");
    projectDescription.textContent = "";
    return;
  }
  projectDescription.classList.remove("d-none");
  projectDescription.textContent = value;
};

const loadProjectCode = async (entry) => {
  if (!codeContent || !codeTitle) {
    return;
  }
  codeTitle.textContent = `${entry.name} - Beschreibung und Quelltext`;
  setCodeStatus("Lade Quelltext...");
  codeContent.innerHTML = "";
  renderDescription("");
  try {
    const response = await fetch(
      `${API_URL}?p5js_project_code=1&project=${encodeURIComponent(entry.slug)}`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (String(payload?.status || "").toUpperCase() !== "OK") {
      throw new Error(payload?.msg || "Unerwartete API-Antwort");
    }
    renderDescription(payload?.description || entry?.description || "");

    const snippets = Array.isArray(payload?.snippets) ? payload.snippets : [];
    const files = snippets.length
      ? snippets
      : payload?.file
        ? [payload.file]
        : [];

    if (!files.length) {
      setCodeStatus("Keine Codeabschnitte vorhanden.");
      return;
    }

    files.forEach((file) => {
      renderCodeFile(file);
    });
    setCodeStatus(`${files.length} Codeabschnitt(e) geladen.`, "success");
  } catch (error) {
    console.error("p5.js Quelltext konnte nicht geladen werden:", error);
    setCodeStatus(`Fehler beim Laden: ${error.message}`, "error");
  }
};

const selectProject = async (entry, button, buttons) => {
  if (!previewFrame || !previewTitle || !openInTabLink) {
    return;
  }
  const entryUrl = new URL(String(entry.entry_url || "/"), API_ORIGIN).href;
  buttons.forEach((item) => {
    item.classList.remove("active");
    item.setAttribute("aria-pressed", "false");
  });
  button.classList.add("active");
  button.setAttribute("aria-pressed", "true");
  previewTitle.textContent = entry.name;
  previewFrame.src = entryUrl;
  openInTabLink.href = entryUrl;
  openInTabLink.classList.remove("d-none");
  if (openFullscreenButton) {
    openFullscreenButton.classList.remove("d-none");
  }
  await loadProjectCode(entry);
};

const renderProjects = (projects) => {
  if (!projectList) {
    return;
  }
  projectList.innerHTML = "";
  if (!projects.length) {
    setStatus("Noch keine p5.js-Projekte vorhanden.");
    return;
  }

  const buttons = [];
  projects.forEach((entry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "list-group-item list-group-item-action";
    button.textContent = entry.name;
    button.dataset.project = entry.slug;
    button.addEventListener("click", () => {
      void selectProject(entry, button, buttons);
    });
    projectList.appendChild(button);
    buttons.push(button);
  });

  void selectProject(projects[0], buttons[0], buttons);
  setStatus(`${projects.length} p5.js-Projekte geladen.`, "success");
};

const loadProjects = async () => {
  setStatus("Lade p5.js-Projekte...");
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
    renderProjects(projects);
  } catch (error) {
    console.error("p5.js Projekte konnten nicht geladen werden:", error);
    setStatus(`Fehler beim Laden: ${error.message}`, "error");
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

loadProjects();

if (openFullscreenButton && previewFrame) {
  openFullscreenButton.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      if (typeof previewFrame.requestFullscreen === "function") {
        await previewFrame.requestFullscreen();
        return;
      }
      if (typeof previewFrame.webkitRequestFullscreen === "function") {
        previewFrame.webkitRequestFullscreen();
      }
    } catch (error) {
      console.error("Vollbildmodus fehlgeschlagen:", error);
    }
  });
}
