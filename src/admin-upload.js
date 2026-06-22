import "./styles.scss";
import {
  API_URL,
  initAdminShell,
  parseApiResponse,
  updateStatus,
} from "./admin-shared.js";

const uploadForm = document.getElementById("admin-upload-form");
const uploadStatus = document.getElementById("admin-upload-status");
const uploadImageInput = document.getElementById("upload-image");
const p5UploadForm = document.getElementById("admin-p5-upload-form");
const p5UploadStatus = document.getElementById("admin-p5-upload-status");
const p5UploadFileInput = document.getElementById("upload-p5-file");
const p5ProjectNameInput = document.getElementById("upload-p5-project-name");
const p5DescriptionInput = document.getElementById("upload-p5-description");
const p5SnippetsInput = document.getElementById("upload-p5-snippets");
const p5ReplaceInput = document.getElementById("upload-p5-replace");
const p5FormTitle = document.getElementById("admin-p5-form-title");
const p5SubmitButton = document.getElementById("admin-p5-submit");
const p5EditCancelButton = document.getElementById("admin-p5-edit-cancel");
const p5FileOptionalLabel = document.getElementById("upload-p5-file-optional");
const p5ProjectsContainer = document.getElementById("admin-p5-projects");
const p5ProjectsStatus = document.getElementById("admin-p5-projects-status");
const p5ProjectsRefreshButton = document.getElementById(
  "admin-p5-projects-refresh",
);
let editedP5Project = "";
const UPLOAD_TYPE_MAP = {
  fraktale: "fractals",
  digital: "digital",
  digitalart: "digital",
  fotos: "fotos",
};

initAdminShell({
  onAuthenticated: () => {
    window.setTimeout(() => void loadP5Projects(), 0);
  },
});

const setP5EditMode = (project = null) => {
  editedP5Project = String(project?.slug || "");
  const isEditing = Boolean(editedP5Project);
  if (p5ProjectNameInput) {
    p5ProjectNameInput.value = isEditing ? project.name || project.slug : "";
    p5ProjectNameInput.disabled = isEditing;
  }
  if (p5UploadFileInput) {
    p5UploadFileInput.required = !isEditing;
    p5UploadFileInput.value = "";
  }
  p5ReplaceInput?.closest(".form-check")?.classList.toggle("d-none", isEditing);
  p5EditCancelButton?.classList.toggle("d-none", !isEditing);
  p5FileOptionalLabel?.classList.toggle("d-none", !isEditing);
  if (p5FormTitle) {
    p5FormTitle.textContent = isEditing
      ? `p5.js Projekt bearbeiten: ${project.name || project.slug}`
      : "p5.js Datei Upload";
  }
  if (p5SubmitButton) {
    p5SubmitButton.textContent = isEditing
      ? "Änderungen speichern"
      : "Datei hochladen";
  }
};

const loadP5ProjectForEdit = async (project) => {
  updateStatus(p5UploadStatus, `Projekt ${project.name} wird geladen ...`);
  try {
    const response = await fetch(
      `${API_URL}?p5js_project_code=1&project=${encodeURIComponent(project.slug)}`,
      { cache: "no-store" },
    );
    const result = await parseApiResponse(response);
    setP5EditMode(project);
    if (p5DescriptionInput) {
      p5DescriptionInput.value = String(result.description || "");
    }
    if (p5SnippetsInput) {
      const snippets = Array.isArray(result.snippets) ? result.snippets : [];
      p5SnippetsInput.value = snippets
        .map((entry) => String(entry.content || "").trim())
        .filter(Boolean)
        .join("\n---\n");
    }
    updateStatus(
      p5UploadStatus,
      "Projekt geladen. Eine neue HTML-Datei ist optional.",
      "success",
    );
    p5UploadForm?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    updateStatus(
      p5UploadStatus,
      `Projekt konnte nicht geladen werden: ${error.message}`,
      "error",
    );
  }
};

const deleteP5Project = async (project) => {
  if (!window.confirm(`Projekt „${project.name}“ wirklich löschen?`)) {
    return;
  }
  updateStatus(p5ProjectsStatus, `Projekt ${project.name} wird gelöscht ...`);
  try {
    const formData = new FormData();
    formData.set("action", "delete_p5_project");
    formData.set("project", project.slug);
    const response = await fetch(API_URL, { method: "POST", body: formData });
    await parseApiResponse(response);
    if (editedP5Project === project.slug) {
      p5UploadForm?.reset();
      setP5EditMode();
    }
    updateStatus(p5ProjectsStatus, "Projekt wurde gelöscht.", "success");
    await loadP5Projects();
  } catch (error) {
    updateStatus(
      p5ProjectsStatus,
      `Löschen fehlgeschlagen: ${error.message}`,
      "error",
    );
  }
};

const renderP5Projects = (projects) => {
  if (!p5ProjectsContainer) {
    return;
  }
  p5ProjectsContainer.innerHTML = "";
  projects.forEach((project) => {
    const row = document.createElement("div");
    row.className = "admin-p5-project";

    const name = document.createElement("strong");
    name.className = "admin-p5-project-name";
    name.textContent = project.name || project.slug;

    const actions = document.createElement("div");
    actions.className = "d-flex gap-2 flex-wrap";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "btn btn-sm btn-outline-primary";
    editButton.textContent = "Bearbeiten";
    editButton.addEventListener("click", () => void loadP5ProjectForEdit(project));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn btn-sm btn-outline-danger";
    deleteButton.textContent = "Löschen";
    deleteButton.addEventListener("click", () => void deleteP5Project(project));

    actions.append(editButton, deleteButton);
    row.append(name, actions);
    p5ProjectsContainer.appendChild(row);
  });
};

const loadP5Projects = async () => {
  if (!p5ProjectsContainer || !p5ProjectsStatus) {
    return;
  }
  updateStatus(p5ProjectsStatus, "Projekte werden geladen ...");
  try {
    const response = await fetch(`${API_URL}?p5js_projects=1`, {
      cache: "no-store",
    });
    const result = await parseApiResponse(response);
    const projects = Array.isArray(result.projects) ? result.projects : [];
    renderP5Projects(projects);
    updateStatus(
      p5ProjectsStatus,
      projects.length
        ? `${projects.length} Projekt(e) geladen.`
        : "Noch keine Projekte vorhanden.",
      projects.length ? "success" : "neutral",
    );
  } catch (error) {
    updateStatus(
      p5ProjectsStatus,
      `Projekte konnten nicht geladen werden: ${error.message}`,
      "error",
    );
  }
};

p5ProjectsRefreshButton?.addEventListener("click", () => void loadP5Projects());
p5EditCancelButton?.addEventListener("click", () => {
  p5UploadForm?.reset();
  setP5EditMode();
  updateStatus(p5UploadStatus, "Bearbeitung abgebrochen.");
});

if (uploadForm && uploadStatus && uploadImageInput) {
  uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const selectedCategory = String(
      new FormData(uploadForm).get("imgtyp") || "fraktale",
    );
    const uploadType = UPLOAD_TYPE_MAP[selectedCategory] || selectedCategory;
    const selectedFile = uploadImageInput.files?.[0];

    if (!selectedFile) {
      updateStatus(uploadStatus, "Bitte erst ein Bild auswaehlen.", "error");
      return;
    }

    updateStatus(uploadStatus, "Upload laeuft...");

    try {
      const formData = new FormData(uploadForm);
      formData.set("imgtyp", uploadType);
      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });
      await parseApiResponse(response);
      updateStatus(uploadStatus, "Upload erfolgreich gespeichert.", "success");
      uploadForm.reset();
    } catch (error) {
      updateStatus(
        uploadStatus,
        `Upload fehlgeschlagen: ${error.message}`,
        "error",
      );
    }
  });
}

if (p5UploadForm && p5UploadStatus && p5UploadFileInput && p5ProjectNameInput) {
  p5UploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = p5UploadFileInput.files?.[0] || null;
    const projectName = String(p5ProjectNameInput.value || "").trim();
    const description = String(p5DescriptionInput?.value || "").trim();
    const snippetsRaw = String(p5SnippetsInput?.value || "");
    const snippets = snippetsRaw
      .split(/\n-{3,}\n/g)
      .map((chunk) => chunk.trim())
      .filter(Boolean);

    if (!projectName) {
      updateStatus(
        p5UploadStatus,
        "Bitte einen Projektnamen eingeben.",
        "error",
      );
      return;
    }

    if (!file && !editedP5Project) {
      updateStatus(
        p5UploadStatus,
        "Bitte genau eine HTML-Datei auswaehlen.",
        "error",
      );
      return;
    }

    updateStatus(p5UploadStatus, "Upload laeuft...");

    try {
      const formData = new FormData();
      formData.set(
        "action",
        editedP5Project ? "update_p5_project" : "upload_p5_file",
      );
      if (editedP5Project) {
        formData.set("project", editedP5Project);
      } else {
        formData.set("project_name", projectName);
      }
      if (file) {
        formData.set("file", file);
      }
      formData.set("description", description);
      formData.set("snippets", JSON.stringify(snippets));
      if (p5ReplaceInput?.checked) {
        formData.set("replace", "1");
      }

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });
      const result = await parseApiResponse(response);
      const wasEditing = Boolean(editedP5Project);
      updateStatus(
        p5UploadStatus,
        wasEditing
          ? `Änderungen gespeichert: ${result.project}.`
          : `Projekt gespeichert: ${result.project}.`,
        "success",
      );
      p5UploadForm.reset();
      setP5EditMode();
      await loadP5Projects();
    } catch (error) {
      updateStatus(
        p5UploadStatus,
        `p5.js Upload fehlgeschlagen: ${error.message}`,
        "error",
      );
    }
  });
}
