import { API_URL, parseApiResponse, updateStatus } from "./admin-shared.js";

const category = document.getElementById("admin-image-category");
const search = document.getElementById("admin-images-search");
const container = document.getElementById("admin-images");
const status = document.getElementById("admin-images-status");
let images = [];
let requestId = 0;

async function imageRequest(action, selectedCategory, filename = "") {
  const data = new FormData();
  data.set("action", action);
  data.set("category", selectedCategory);
  if (filename) data.set("filename", filename);
  return parseApiResponse(await fetch(API_URL, {
    method: "POST", body: data, credentials: "same-origin", cache: "no-store",
  }));
}

function renderImages() {
  container.replaceChildren();
  const filter = search.value.trim().toLocaleLowerCase();
  const filtered = images.filter(image => image.name.toLocaleLowerCase().includes(filter));
  updateStatus(status, images.length ? `${filtered.length} von ${images.length} Bildern angezeigt.` : "In dieser Kategorie sind keine Bilder vorhanden.");
  const selectedCategory = category.value;
  for (const image of filtered) {
    const column = document.createElement("div");
    column.className = "col-12 col-sm-6 col-xl-4";
    const card = document.createElement("article");
    card.className = "border rounded p-3 h-100 d-flex flex-column gap-2";
    const link = document.createElement("a");
    link.href = image.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `${image.name} öffnen`);
    const thumbnail = document.createElement("img");
    thumbnail.src = image.thumbnail;
    thumbnail.alt = image.name;
    thumbnail.loading = "lazy";
    thumbnail.className = "w-100 rounded";
    thumbnail.style.height = "140px";
    thumbnail.style.objectFit = "contain";
    link.appendChild(thumbnail);
    const name = document.createElement("span");
    name.className = "small text-break";
    name.textContent = image.name;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-sm btn-outline-danger mt-auto align-self-start";
    button.textContent = "Bild löschen";
    button.setAttribute("aria-label", `${image.name} löschen`);
    button.addEventListener("click", async () => {
      if (!window.confirm(`„${image.name}“ dauerhaft löschen? Auch das Vorschaubild wird entfernt. Verweise in Anleitungen bleiben bestehen.`)) return;
      button.disabled = true;
      updateStatus(status, `„${image.name}“ wird gelöscht …`);
      try {
        const result = await imageRequest("delete_image", selectedCategory, image.name);
        if (category.value === selectedCategory) {
          await loadImages();
          if (category.value === selectedCategory) updateStatus(status, result.warning || `„${image.name}“ wurde gelöscht.`, result.warning ? "error" : "success");
        }
      } catch (error) {
        if (category.value === selectedCategory) updateStatus(status, `Löschen fehlgeschlagen: ${error.message}`, "error");
        button.disabled = false;
      }
    });
    card.append(link, name, button);
    column.appendChild(card);
    container.appendChild(column);
  }
}

export async function loadImages(selectedCategory) {
  if (!category || !container) return;
  if (selectedCategory) category.value = selectedCategory;
  const currentRequest = ++requestId;
  images = [];
  container.replaceChildren();
  updateStatus(status, "Bilder werden geladen …");
  try {
    const result = await imageRequest("list_images", category.value);
    if (currentRequest !== requestId) return;
    images = Array.isArray(result.images) ? result.images : [];
    renderImages();
  } catch (error) {
    if (currentRequest === requestId) updateStatus(status, `Bilder konnten nicht geladen werden: ${error.message}`, "error");
  }
}

category?.addEventListener("change", () => { search.value = ""; void loadImages(); });
search?.addEventListener("input", renderImages);
document.getElementById("admin-images-refresh")?.addEventListener("click", () => void loadImages());
