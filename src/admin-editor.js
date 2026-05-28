import Quill from "quill";
import "quill/dist/quill.snow.css";
import "./styles.scss";
import {
  API_URL,
  initAdminShell,
  isAuthenticated,
  parseApiResponse,
  updateStatus,
} from "./admin-shared.js";

const editorForm = document.getElementById("admin-editor-form");
const editorPageSelect = document.getElementById("editor-page");
const editorLoadButton = document.getElementById("editor-load");
const editorStatus = document.getElementById("admin-editor-status");
const editorRoot = document.getElementById("admin-editor");
const projectList = document.getElementById("admin-project-list");
const projectNewButton = document.getElementById("project-new");
const projectTitleInput = document.getElementById("project-title");
const projectSummaryInput = document.getElementById("project-summary");
const projectListLabel = document.querySelector('label[for="admin-project-list"]');
const projectTitleLabel = document.querySelector('label[for="project-title"]');
const projectSummaryLabel = document.querySelector('label[for="project-summary"]');

let editorInstance = null;
let projects = [];
let activeProjectIndex = -1;
let sourceModeActive = false;
let sourceEditor = null;
const requestedEditorPage = String(
  new URLSearchParams(window.location.search).get("page") || "",
)
  .trim()
  .toLowerCase();
const apiOrigin = (() => {
  try {
    return new URL(API_URL).origin;
  } catch {
    return window.location.origin;
  }
})();

const getCurrentEntryLabel = () => {
  return String(editorPageSelect?.value || "").toLowerCase() === "howto"
    ? "Howto"
    : "Projekt";
};

const getCurrentEntryPlural = () => {
  return String(editorPageSelect?.value || "").toLowerCase() === "howto"
    ? "Howtos"
    : "Projekte";
};

const updateEditorCopy = () => {
  const isHowto = String(editorPageSelect?.value || "").toLowerCase() === "howto";
  if (projectListLabel) {
    projectListLabel.textContent = isHowto ? "Howtos" : "Projekte";
  }
  if (projectNewButton) {
    projectNewButton.textContent = isHowto ? "Neues Howto" : "Neues Projekt";
  }
  if (projectTitleLabel) {
    projectTitleLabel.textContent = isHowto ? "Howto Titel" : "Titel";
  }
  if (projectSummaryLabel) {
    projectSummaryLabel.textContent = isHowto ? "Kurzbeschreibung" : "Kurztext";
  }
  if (projectTitleInput) {
    projectTitleInput.placeholder = isHowto ? "Titel der Anleitung" : "Projektname";
  }
  if (projectSummaryInput) {
    projectSummaryInput.placeholder = isHowto
      ? "Kurze Einordnung fuer die Uebersicht"
      : "Kurze Beschreibung";
  }
};

const createEmptyProject = (index) => {
  return {
    id: `project-${Date.now()}-${index}`,
    title: `${getCurrentEntryLabel()} ${index + 1}`,
    summary: "",
    body: "<p><br></p>",
  };
};

const initEditor = () => {
  if (!editorRoot || editorInstance) {
    return;
  }
  editorInstance = new Quill(editorRoot, {
    theme: "snow",
    placeholder: "Inhalt eingeben ...",
    modules: {
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["blockquote", "code-block", "link", "image"],
          ["clean"],
        ],
      },
    },
  });
  const toolbar = editorInstance.getModule("toolbar");
  if (toolbar && typeof toolbar.addHandler === "function") {
    toolbar.addHandler("image", () => {
      pickAndInsertImage();
    });
    toolbar.addHandler("code-block", () => {
      toggleEditorCodeBlock();
    });
  }
  bindEditorImagePasteAndDrop();
  enhanceEditorToolbar();
  initSourceEditor();
};

const initSourceEditor = () => {
  if (!editorRoot || sourceEditor) {
    return;
  }
  sourceEditor = document.createElement("textarea");
  sourceEditor.className = "admin-editor-source form-control";
  sourceEditor.setAttribute("aria-label", "HTML Source bearbeiten");
  sourceEditor.spellcheck = false;
  sourceEditor.hidden = true;
  editorRoot.insertAdjacentElement("afterend", sourceEditor);
};

const formatHtmlSource = (html) => {
  const raw = String(html || "").trim();
  if (!raw) {
    return "";
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${raw}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) {
    return raw;
  }

  const voidTags = new Set(["BR", "HR", "IMG", "INPUT", "META", "LINK"]);
  const inlineTags = new Set([
    "A",
    "B",
    "BR",
    "CODE",
    "EM",
    "I",
    "S",
    "SPAN",
    "STRONG",
    "U",
  ]);

  const escapeText = (value) => {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  const serializeAttributes = (node) => {
    return Array.from(node.attributes || [])
      .map((attribute) => {
        return ` ${attribute.name}="${String(attribute.value)
          .replace(/&/g, "&amp;")
          .replace(/"/g, "&quot;")}"`;
      })
      .join("");
  };

  const serializeInline = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeText(node.textContent);
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }
    const attrs = serializeAttributes(node);
    if (voidTags.has(node.tagName)) {
      return `<${node.tagName.toLowerCase()}${attrs}>`;
    }
    const children = Array.from(node.childNodes).map(serializeInline).join("");
    return `<${node.tagName.toLowerCase()}${attrs}>${children}</${node.tagName.toLowerCase()}>`;
  };

  const serializeNode = (node, depth = 0) => {
    const indent = "  ".repeat(depth);
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      return text ? `${indent}${escapeText(text)}` : "";
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const tag = node.tagName.toLowerCase();
    const attrs = serializeAttributes(node);
    if (voidTags.has(node.tagName)) {
      return `${indent}<${tag}${attrs}>`;
    }

    if (node.tagName === "PRE") {
      return `${indent}<${tag}${attrs}>${node.textContent}</${tag}>`;
    }

    const children = Array.from(node.childNodes);
    const inlineOnly = children.every((child) => {
      return (
        child.nodeType === Node.TEXT_NODE ||
        (child.nodeType === Node.ELEMENT_NODE && inlineTags.has(child.tagName))
      );
    });

    if (inlineOnly) {
      return `${indent}<${tag}${attrs}>${children.map(serializeInline).join("")}</${tag}>`;
    }

    const childHtml = children
      .map((child) => serializeNode(child, depth + 1))
      .filter(Boolean)
      .join("\n");
    return `${indent}<${tag}${attrs}>\n${childHtml}\n${indent}</${tag}>`;
  };

  return Array.from(root.childNodes)
    .map((node) => serializeNode(node, 0))
    .filter(Boolean)
    .join("\n");
};

const syncSourceFromEditor = () => {
  if (!sourceEditor || !editorInstance) {
    return;
  }
  sourceEditor.value = formatHtmlSource(editorInstance.root.innerHTML);
};

const syncEditorFromSource = () => {
  if (!sourceEditor || !editorInstance) {
    return;
  }
  editorInstance.root.innerHTML = sourceEditor.value || "<p><br></p>";
};

const setSourceMode = (active) => {
  if (!editorRoot || !sourceEditor || !editorInstance) {
    return;
  }

  sourceModeActive = Boolean(active);
  const toolbar = document.querySelector(".admin-editor-form .ql-toolbar");
  const sourceButton = toolbar?.querySelector(".admin-editor-source-button");

  if (sourceModeActive) {
    syncSourceFromEditor();
    editorRoot.classList.add("d-none");
    sourceEditor.hidden = false;
    sourceEditor.focus();
    sourceButton?.classList.add("ql-active");
    sourceButton?.setAttribute("aria-pressed", "true");
    return;
  }

  syncEditorFromSource();
  sourceEditor.hidden = true;
  editorRoot.classList.remove("d-none");
  editorInstance.focus();
  sourceButton?.classList.remove("ql-active");
  sourceButton?.setAttribute("aria-pressed", "false");
};

const toggleSourceMode = () => {
  setSourceMode(!sourceModeActive);
};

const toggleEditorCodeBlock = () => {
  if (!editorInstance) {
    return;
  }

  const range = editorInstance.getSelection(true);
  if (!range) {
    editorInstance.focus();
    return;
  }

  const formats = editorInstance.getFormat(range);
  const isCodeBlock = Boolean(formats["code-block"]);
  const length = Math.max(range.length, 1);
  editorInstance.formatLine(
    range.index,
    length,
    "code-block",
    isCodeBlock ? false : true,
    "user",
  );
  editorInstance.focus();
};

const resolveUploadedImageUrl = (path) => {
  const value = String(path || "").trim();
  if (!value) {
    return "";
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  try {
    return new URL(value, apiOrigin).toString();
  } catch {
    return value;
  }
};

const uploadImageForEditor = async (file) => {
  if (!file) {
    return "";
  }
  if (!isAuthenticated()) {
    throw new Error("Bitte zuerst anmelden.");
  }
  const page = String(editorPageSelect?.value || "code");
  const formData = new FormData();
  formData.set("imgtyp", page);
  formData.set("image", file);
  const response = await fetch(API_URL, {
    method: "POST",
    body: formData,
  });
  const result = await parseApiResponse(response);
  return resolveUploadedImageUrl(result?.img || "");
};

const insertImageIntoEditor = (url) => {
  if (!editorInstance || !url) {
    return;
  }
  const range = editorInstance.getSelection(true);
  const index = range?.index ?? editorInstance.getLength();
  editorInstance.insertEmbed(index, "image", url, "user");
  editorInstance.setSelection(index + 1, 0, "user");
};

const handleImageInsert = async (file) => {
  if (!file || !editorInstance) {
    return;
  }
  updateStatus(editorStatus, "Bild wird hochgeladen ...");
  try {
    const imageUrl = await uploadImageForEditor(file);
    if (!imageUrl) {
      throw new Error("Keine Bild-URL erhalten");
    }
    insertImageIntoEditor(imageUrl);
    updateStatus(editorStatus, "Bild eingefuegt.", "success");
  } catch (error) {
    updateStatus(
      editorStatus,
      `Bild-Upload fehlgeschlagen: ${error.message}`,
      "error",
    );
  }
};

const pickAndInsertImage = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/webp";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) {
      handleImageInsert(file);
    }
  });
  input.click();
};

const bindEditorImagePasteAndDrop = () => {
  if (!editorRoot) {
    return;
  }
  editorRoot.addEventListener("paste", (event) => {
    const items = event.clipboardData?.items || [];
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          handleImageInsert(file);
        }
        break;
      }
    }
  });

  editorRoot.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type.startsWith("image/")) {
      event.preventDefault();
      handleImageInsert(file);
    }
  });
  editorRoot.addEventListener("dragover", (event) => {
    if (event.dataTransfer?.types?.includes("Files")) {
      event.preventDefault();
    }
  });
};

const enhanceEditorToolbar = () => {
  const toolbar = document.querySelector(".admin-editor-form .ql-toolbar");
  if (!toolbar) {
    return;
  }

  const setButtonTitle = (selector, title) => {
    const button = toolbar.querySelector(selector);
    if (!button) {
      return;
    }
    button.type = "button";
    button.title = title;
    button.setAttribute("aria-label", title);
  };

  setButtonTitle(".ql-bold", "Fett");
  setButtonTitle(".ql-italic", "Kursiv");
  setButtonTitle(".ql-underline", "Unterstreichen");
  setButtonTitle(".ql-strike", "Durchstreichen");
  setButtonTitle('.ql-list[value="ordered"]', "Nummerierte Liste");
  setButtonTitle('.ql-list[value="bullet"]', "Liste");
  setButtonTitle(".ql-blockquote", "Zitat");
  setButtonTitle(".ql-link", "Link");
  setButtonTitle(".ql-image", "Bild");
  setButtonTitle(".ql-clean", "Formatierung entfernen");

  const codeBlockButton = toolbar.querySelector(".ql-code-block");
  if (codeBlockButton) {
    codeBlockButton.type = "button";
    codeBlockButton.classList.add("admin-editor-code-button");
    codeBlockButton.title = "Codeblock";
    codeBlockButton.setAttribute("aria-label", "Codeblock");
    codeBlockButton.setAttribute("data-editor-tool", "code-block");
    codeBlockButton.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="4 17 10 11 4 5"></polyline>
        <line x1="12" y1="19" x2="20" y2="19"></line>
      </svg>
      <span>Code</span>
    `;
  }

  if (!toolbar.querySelector(".admin-editor-source-button")) {
    const sourceButton = document.createElement("button");
    sourceButton.type = "button";
    sourceButton.className = "admin-editor-source-button";
    sourceButton.title = "HTML Source";
    sourceButton.setAttribute("aria-label", "HTML Source");
    sourceButton.setAttribute("aria-pressed", "false");
    sourceButton.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
      </svg>
      <span>HTML</span>
    `;
    sourceButton.addEventListener("click", () => {
      toggleSourceMode();
    });
    toolbar.appendChild(sourceButton);
  }
};

const saveActiveProjectFromFields = () => {
  if (
    activeProjectIndex < 0 ||
    !projects[activeProjectIndex] ||
    !editorInstance
  ) {
    return;
  }
  projects[activeProjectIndex].title = String(
    projectTitleInput?.value || "",
  ).trim();
  projects[activeProjectIndex].summary = String(
    projectSummaryInput?.value || "",
  ).trim();
  projects[activeProjectIndex].body = sourceModeActive && sourceEditor
    ? sourceEditor.value
    : editorInstance.root.innerHTML;
};

const loadActiveProjectIntoFields = () => {
  if (
    activeProjectIndex < 0 ||
    !projects[activeProjectIndex] ||
    !editorInstance
  ) {
    return;
  }
  const project = projects[activeProjectIndex];
  if (projectTitleInput) {
    projectTitleInput.value = project.title || "";
  }
  if (projectSummaryInput) {
    projectSummaryInput.value = project.summary || "";
  }
  if (sourceModeActive) {
    setSourceMode(false);
  }
  editorInstance.root.innerHTML = project.body || "<p><br></p>";
};

const setActiveProject = (index) => {
  if (index < 0 || index >= projects.length) {
    return;
  }
  saveActiveProjectFromFields();
  activeProjectIndex = index;
  renderProjectList();
  loadActiveProjectIntoFields();
};

const renderProjectList = () => {
  if (!projectList) {
    return;
  }
  projectList.innerHTML = "";
  projects.forEach((project, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `list-group-item list-group-item-action admin-project-item${
      index === activeProjectIndex ? " active" : ""
    }`;
    button.textContent = project.title || `${getCurrentEntryLabel()} ${index + 1}`;
    button.addEventListener("click", () => {
      setActiveProject(index);
    });
    projectList.appendChild(button);
  });
};

const parseProjectsFromHtml = (content) => {
  const trimmed = String(content || "").trim();
  if (!trimmed) {
    return [createEmptyProject(0)];
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(
    `<div id="root">${trimmed}</div>`,
    "text/html",
  );
  const cards = Array.from(doc.querySelectorAll(".project-section-card"));

  if (!cards.length) {
    return [
      {
        id: `project-${Date.now()}-0`,
        title: `${getCurrentEntryLabel()} 1`,
        summary: "",
        body: trimmed,
      },
    ];
  }

  return cards.map((card, index) => {
    const title =
      card.querySelector(".project-section-title")?.textContent?.trim() || "";
    const summary =
      card.querySelector(".project-section-summary")?.textContent?.trim() || "";
    const body =
      card.querySelector(".project-section-body")?.innerHTML || "<p><br></p>";
    return {
      id: `project-${Date.now()}-${index}`,
      title: title || `${getCurrentEntryLabel()} ${index + 1}`,
      summary,
      body,
    };
  });
};

const buildProjectsHtml = () => {
  const wrapper = document.createElement("div");
  wrapper.className = "project-sections-grid";

  projects.forEach((project, index) => {
    const card = document.createElement("article");
    card.className = "project-section-card";

    const title = document.createElement("h2");
    title.className = "project-section-title h4 fw-bold mb-2";
    title.textContent = project.title || `${getCurrentEntryLabel()} ${index + 1}`;

    const summary = document.createElement("p");
    summary.className = "project-section-summary text-body-secondary mb-3";
    summary.textContent = project.summary || "";

    const body = document.createElement("div");
    body.className = "project-section-body";
    body.innerHTML = project.body || "<p><br></p>";

    card.append(title, summary, body);
    wrapper.appendChild(card);
  });

  return wrapper.innerHTML;
};

const loadEditablePage = async () => {
  if (!editorPageSelect || !editorInstance) {
    return;
  }
  if (!isAuthenticated()) {
    updateStatus(editorStatus, "Bitte zuerst anmelden.", "error");
    return;
  }

  const page = String(editorPageSelect.value || "raspi");
  updateStatus(editorStatus, "Seiteninhalt wird geladen ...");

  try {
    const response = await fetch(
      `${API_URL}?page_content=1&page=${encodeURIComponent(page)}`,
      { cache: "no-store" },
    );
    const result = await parseApiResponse(response);
    projects = parseProjectsFromHtml(result.content || "");
    activeProjectIndex = 0;
    renderProjectList();
    loadActiveProjectIntoFields();
    updateStatus(editorStatus, `Seite ${page} geladen.`, "success");
  } catch (error) {
    updateStatus(
      editorStatus,
      `Laden fehlgeschlagen: ${error.message}`,
      "error",
    );
  }
};

if (
  editorPageSelect &&
  ["raspi", "esp32", "code", "howto"].includes(requestedEditorPage)
) {
  editorPageSelect.value = requestedEditorPage;
}

initEditor();
updateEditorCopy();
initAdminShell({
  onAuthenticated: () => {
    loadEditablePage();
  },
});

if (projectNewButton) {
  projectNewButton.addEventListener("click", () => {
    saveActiveProjectFromFields();
    const nextIndex = projects.length;
    projects.push(createEmptyProject(nextIndex));
    activeProjectIndex = nextIndex;
    renderProjectList();
    loadActiveProjectIntoFields();
  });
}

if (projectTitleInput) {
  projectTitleInput.addEventListener("input", () => {
    saveActiveProjectFromFields();
    renderProjectList();
  });
}

if (projectSummaryInput) {
  projectSummaryInput.addEventListener("input", () => {
    saveActiveProjectFromFields();
  });
}

if (editorForm && editorPageSelect && editorLoadButton) {
  editorLoadButton.addEventListener("click", () => {
    loadEditablePage();
  });
  editorPageSelect.addEventListener("change", () => {
    updateEditorCopy();
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set(
      "page",
      String(editorPageSelect.value || "").trim().toLowerCase(),
    );
    window.history.replaceState({}, "", nextUrl);
    loadEditablePage();
  });
  editorForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!editorInstance) {
      return;
    }
    if (!isAuthenticated()) {
      updateStatus(editorStatus, "Bitte zuerst anmelden.", "error");
      return;
    }

    if (sourceModeActive) {
      syncEditorFromSource();
    }
    saveActiveProjectFromFields();
    if (!projects.length) {
      updateStatus(
        editorStatus,
        `Keine ${getCurrentEntryPlural()} zum Speichern vorhanden.`,
        "error",
      );
      return;
    }

    const page = String(editorPageSelect.value || "raspi");
    const content = buildProjectsHtml();
    updateStatus(editorStatus, "Speichern laeuft ...");

    try {
      const formData = new FormData();
      formData.set("action", "save_page");
      formData.set("page", page);
      formData.set("content", content);
      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });
      await parseApiResponse(response);
      renderProjectList();
      updateStatus(editorStatus, `Seite ${page} gespeichert.`, "success");
    } catch (error) {
      updateStatus(
        editorStatus,
        `Speichern fehlgeschlagen: ${error.message}`,
        "error",
      );
    }
  });
}
