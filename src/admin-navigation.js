import "./admin-navigation.scss";

const sections = [
  { label: "Übersicht", href: "/4meo/index.html" },
  { label: "Inhalte", entries: [
    { label: "Seiten bearbeiten", description: "Raspi, esp32 und Code", href: "/4meo/editor.html" },
    { label: "Howtos bearbeiten", description: "Anleitungen und importierte READMEs", href: "/4meo/editor.html?page=howto" },
    { label: "README importieren", description: "Markdown als neues Howto veröffentlichen", href: "/4meo/import.html" },
  ] },
  { label: "Medien", href: "/4meo/upload.html" },
  { label: "Gestaltung", entries: [
    { label: "Vorschaubilder", description: "Inhalte für Startseite, Galerie und Lab auswählen", href: "/4meo/preview.html" },
    { label: "Themes & Farben", description: "Das Erscheinungsbild der Website anpassen", href: "/4meo/theme.html" },
  ] },
];

export function initAdminNavigation() {
  const root = document.querySelector("[data-admin-navigation]");
  if (!root) return;
  const isCurrent = href => {
    const target = new URL(href, window.location.origin);
    return window.location.pathname === target.pathname &&
      (new URLSearchParams(window.location.search).get("page") === "howto") === (target.searchParams.get("page") === "howto");
  };
  root.replaceChildren();
  for (const section of sections) {
    const item = document.createElement("li");
    item.className = "nav-item";
    if (!section.entries) {
      const link = document.createElement("a");
      link.className = "nav-link";
      link.href = section.href;
      link.textContent = section.label;
      if (isCurrent(section.href)) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      }
      item.append(link);
    } else {
      item.classList.add("dropdown");
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "nav-link dropdown-toggle";
      toggle.textContent = section.label;
      toggle.dataset.bsToggle = "dropdown";
      toggle.setAttribute("aria-expanded", "false");
      toggle.id = `admin-nav-${root.children.length}`;
      if (section.entries.some(entry => isCurrent(entry.href))) toggle.classList.add("active");
      const menu = document.createElement("ul");
      menu.className = "dropdown-menu admin-navigation-menu";
      menu.setAttribute("aria-labelledby", toggle.id);
      for (const entry of section.entries) {
        const row = document.createElement("li");
        const link = document.createElement("a");
        link.className = "dropdown-item";
        link.href = entry.href;
        const label = document.createElement("span");
        label.textContent = entry.label;
        const description = document.createElement("small");
        description.textContent = entry.description;
        link.append(label, description);
        if (isCurrent(entry.href)) {
          link.classList.add("active");
          link.setAttribute("aria-current", "page");
        }
        row.append(link);
        menu.append(row);
      }
      item.append(toggle, menu);
    }
    root.append(item);
  }
}
