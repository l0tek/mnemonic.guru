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

let editorInstance = null;
let projects = [];
let activeProjectIndex = -1;
const apiOrigin = (() => {
  try {
    return new URL(API_URL).origin;
  } catch {
    return window.location.origin;
  }
})();

const createEmptyProject = (index) => {
  return {
    id: `project-${Date.now()}-${index}`,
    title: `Projekt ${index + 1}`,
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
    placeholder: "Projektinhalt eingeben ...",
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
  }
  bindEditorImagePasteAndDrop();
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
  projects[activeProjectIndex].body = editorInstance.root.innerHTML;
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
    button.textContent = project.title || `Projekt ${index + 1}`;
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
        title: "Projekt 1",
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
      title: title || `Projekt ${index + 1}`,
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
    title.textContent = project.title || `Projekt ${index + 1}`;

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

initEditor();
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

    saveActiveProjectFromFields();
    if (!projects.length) {
      updateStatus(
        editorStatus,
        "Keine Projekte zum Speichern vorhanden.",
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
