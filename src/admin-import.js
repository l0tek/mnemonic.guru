import "./styles.scss";
import "./howto-markdown.scss";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { API_URL, initAdminShell, parseApiResponse, updateStatus } from "./admin-shared.js";

initAdminShell();

const form = document.getElementById("readme-import-form");
const filesInput = document.getElementById("readme-files");
const baseInput = document.getElementById("readme-base-url");
const preview = document.getElementById("readme-preview");
const status = document.getElementById("readme-status");
const submit = document.getElementById("readme-submit");
let cards = [];
let generation = 0;

async function prepareImport() {
  const current = ++generation;
  cards = [];
  preview.replaceChildren();
  submit.disabled = true;
  const files = Array.from(filesInput.files || []);
  if (!files.length) return;
  updateStatus(status, "Vorschau wird erstellt …");
  try {
    let baseUrl = null;
    if (baseInput.value.trim()) {
      baseUrl = new URL(baseInput.value.trim());
      if (!["https:", "http:"].includes(baseUrl.protocol)) throw new Error("Bitte eine HTTP(S)-Basis-URL eingeben.");
      if (!baseUrl.pathname.endsWith("/")) baseUrl.pathname += "/";
    }
    if (files.some(file => !/\.md$/i.test(file.name) || !file.size || file.size > 2 * 1024 * 1024) ||
        files.reduce((sum, file) => sum + file.size, 0) > 2 * 1024 * 1024) {
      throw new Error("Bitte nicht leere .md-Dateien mit insgesamt maximal 2 MB auswählen.");
    }
    const prepared = [];
    let relativeAssets = false;
    for (const file of files) {
      const markdown = (await file.text()).replace(/^\uFEFF/, "");
      if (!markdown.trim()) throw new Error(`${file.name} enthält keinen Text.`);
      const body = document.createElement("div");
      body.className = "project-section-body";
      body.innerHTML = DOMPurify.sanitize(marked.parse(markdown, { gfm: true }), { USE_PROFILES: { html: true } });
      const heading = body.querySelector("h1");
      const title = heading?.textContent.trim() || file.name.replace(/\.md$/i, "");
      heading?.remove();
      // Keep README anchor links usable in the public detail view.
      const usedIds = new Set();
      body.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach(element => {
        const slug = element.textContent.trim().toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu, "").replace(/\s/g, "-") || "abschnitt";
        let id = slug;
        for (let suffix = 1; usedIds.has(id); suffix++) id = `${slug}-${suffix}`;
        usedIds.add(id);
        element.id = id;
      });
      body.querySelectorAll("a[href],img[src]").forEach(element => {
        const attribute = element.tagName === "IMG" ? "src" : "href";
        const value = element.getAttribute(attribute);
        if (!value || value.startsWith("#") || /^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(value)) return;
        if (baseUrl) element.setAttribute(attribute, new URL(value, baseUrl).href);
        else relativeAssets = true;
      });
      const card = document.createElement("article");
      card.className = "project-section-card";
      const titleElement = document.createElement("h2");
      titleElement.className = "project-section-title h4 fw-bold mb-2";
      titleElement.textContent = title;
      const summary = document.createElement("p");
      summary.className = "project-section-summary text-body-secondary mb-3";
      summary.textContent = (body.querySelector("p")?.textContent || "").trim().slice(0, 220);
      card.append(titleElement, summary, body);
      prepared.push(card);
    }
    if (current !== generation) return;
    const html = prepared.map(card => card.outerHTML).join("\n");
    if (new TextEncoder().encode(html).length > 2 * 1024 * 1024) throw new Error("Der formatierte Inhalt überschreitet 2 MB.");
    cards = prepared;
    prepared.forEach(card => preview.appendChild(card.cloneNode(true)));
    submit.disabled = false;
    updateStatus(status, `${cards.length} Howto(s) bereit.${relativeAssets ? " Relative Links/Bilder gefunden: Bei Bedarf eine Basis-URL angeben; lokale Bilder werden nicht mit hochgeladen." : ""}`);
  } catch (error) {
    if (current === generation) updateStatus(status, error.message, "error");
  }
}

filesInput.addEventListener("change", prepareImport);
baseInput.addEventListener("input", prepareImport);
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!cards.length || submit.disabled) return;
  submit.disabled = true;
  filesInput.disabled = true;
  baseInput.disabled = true;
  updateStatus(status, "Howtos werden importiert …");
  try {
    const data = new FormData();
    data.set("action", "import_howtos");
    data.set("content", cards.map(card => card.outerHTML).join("\n"));
    await parseApiResponse(await fetch(API_URL, { method: "POST", body: data, credentials: "same-origin" }));
    updateStatus(status, `${cards.length} Howto(s) gespeichert und veröffentlicht. Du kannst sie unter „Inhalte → Howtos bearbeiten“ weiterbearbeiten.`, "success");
    cards = [];
    form.reset();
  } catch (error) {
    updateStatus(status, `Import fehlgeschlagen: ${error.message}`, "error");
    submit.disabled = false;
  } finally {
    filesInput.disabled = false;
    baseInput.disabled = false;
  }
});
