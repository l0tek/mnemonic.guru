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
      updateStatus(uploadStatus, `Upload fehlgeschlagen: ${error.message}`, "error");
    }
  });
}
