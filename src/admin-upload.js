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
const UPLOAD_TYPE_MAP = {
  fraktale: "fractals",
  digital: "digital",
  digitalart: "digital",
  fotos: "fotos",
};

initAdminShell();

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

    if (!file) {
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
      formData.set("action", "upload_p5_file");
      formData.set("project_name", projectName);
      formData.set("file", file);
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
      updateStatus(
        p5UploadStatus,
        `Projekt gespeichert: ${result.project}.`,
        "success",
      );
      p5UploadForm.reset();
    } catch (error) {
      updateStatus(
        p5UploadStatus,
        `p5.js Upload fehlgeschlagen: ${error.message}`,
        "error",
      );
    }
  });
}
