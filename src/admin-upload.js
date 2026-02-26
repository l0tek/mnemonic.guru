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
const p5UploadDirectoryInput = document.getElementById("upload-p5-directory");
const p5ProjectNameInput = document.getElementById("upload-p5-project-name");
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

if (
  p5UploadForm &&
  p5UploadStatus &&
  p5UploadDirectoryInput &&
  p5ProjectNameInput
) {
  p5UploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const files = Array.from(p5UploadDirectoryInput.files || []);
    const projectName = String(p5ProjectNameInput.value || "").trim();

    if (!projectName) {
      updateStatus(
        p5UploadStatus,
        "Bitte einen Projektnamen eingeben.",
        "error",
      );
      return;
    }

    if (!files.length) {
      updateStatus(
        p5UploadStatus,
        "Bitte ein komplettes Verzeichnis auswaehlen.",
        "error",
      );
      return;
    }

    updateStatus(p5UploadStatus, `Upload laeuft (${files.length} Dateien)...`);

    try {
      const formData = new FormData();
      formData.set("action", "upload_p5_directory");
      formData.set("project_name", projectName);
      if (p5ReplaceInput?.checked) {
        formData.set("replace", "1");
      }

      const browserPaths = files.map(
        (file) => file.webkitRelativePath || file.name,
      );
      const pathSegments = browserPaths.map((path) =>
        String(path).split("/").filter(Boolean),
      );
      const commonRoot =
        pathSegments.length > 0 ? pathSegments[0]?.[0] || "" : "";
      const shouldStripCommonRoot =
        !!commonRoot &&
        pathSegments.every(
          (segments) => segments.length > 1 && segments[0] === commonRoot,
        );

      files.forEach((file, index) => {
        const segments = pathSegments[index] || [];
        const relativePath = shouldStripCommonRoot
          ? segments.slice(1).join("/")
          : segments.join("/");
        formData.append("files[]", file);
        formData.append("relative_paths[]", relativePath);
      });

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });
      const result = await parseApiResponse(response);
      updateStatus(
        p5UploadStatus,
        `Projekt gespeichert: ${result.project} (${result.files_uploaded} Dateien).`,
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
