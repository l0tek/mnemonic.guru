const closeNestedDropdowns = (scope) => {
  scope
    .querySelectorAll(
      ".dropdown-submenu.show, .dropdown-submenu .dropdown-menu.show",
    )
    .forEach((element) => element.classList.remove("show"));
};

const initNestedDropdowns = () => {
  const submenuToggles = document.querySelectorAll(
    ".dropdown-submenu > .nav-submenu-toggle",
  );

  if (!submenuToggles.length) {
    return;
  }

  submenuToggles.forEach((toggle) => {
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const submenuItem = toggle.closest(".dropdown-submenu");
      const submenu = submenuItem
        ? Array.from(submenuItem.children).find((child) =>
            child.classList?.contains("dropdown-menu"),
          )
        : null;
      if (!submenuItem || !submenu) {
        return;
      }

      const isOpen = submenu.classList.contains("show");
      const siblings = submenuItem.parentElement?.children
        ? Array.from(submenuItem.parentElement.children)
        : [];
      siblings.forEach((sibling) => {
        if (
          sibling === submenuItem ||
          !sibling.classList?.contains("dropdown-submenu")
        ) {
          return;
        }
        sibling.classList.remove("show");
        sibling.querySelector(".dropdown-menu")?.classList.remove("show");
        sibling
          .querySelector(".nav-submenu-toggle")
          ?.setAttribute("aria-expanded", "false");
      });

      submenuItem.classList.toggle("show", !isOpen);
      submenu.classList.toggle("show", !isOpen);
      toggle.setAttribute("aria-expanded", String(!isOpen));
    });
  });

  document.querySelectorAll(".dropdown").forEach((dropdown) => {
    dropdown.addEventListener("hide.bs.dropdown", () => {
      closeNestedDropdowns(dropdown);
      dropdown
        .querySelectorAll(".dropdown-submenu > .nav-submenu-toggle")
        .forEach((toggle) => toggle.setAttribute("aria-expanded", "false"));
    });
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest(".dropdown-submenu")) {
      return;
    }
    document.querySelectorAll(".dropdown.show").forEach((dropdown) => {
      closeNestedDropdowns(dropdown);
      dropdown
        .querySelectorAll(".dropdown-submenu > .nav-submenu-toggle")
        .forEach((toggle) => toggle.setAttribute("aria-expanded", "false"));
    });
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initNestedDropdowns, {
    once: true,
  });
} else {
  initNestedDropdowns();
}
