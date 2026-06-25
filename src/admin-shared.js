import "bootstrap/dist/js/bootstrap.bundle.min.js";

export const STORAGE_KEY = "theme-preference";
export const ADMIN_AUTH_KEY = "admin-authenticated";
export const API_URL = new URL("/api/index.php", window.location.origin).toString();

const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

const getPreferredTheme = () => {
  const storedTheme = localStorage.getItem(STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }
  return prefersDark.matches ? "dark" : "light";
};

const applyTheme = (theme, themeToggleButton) => {
  document.documentElement.setAttribute("data-bs-theme", theme);
  if (!themeToggleButton) {
    return;
  }
  const icon = theme === "dark" ? "\u2600\uFE0F" : "\u{1F319}";
  const nextLabel =
    theme === "dark" ? "Zu Lightmode wechseln" : "Zu Darkmode wechseln";
  themeToggleButton.innerHTML = `<span class="theme-icon" aria-hidden="true">${icon}</span>`;
  themeToggleButton.setAttribute("aria-label", nextLabel);
  themeToggleButton.setAttribute("aria-pressed", String(theme === "dark"));
};

export const updateStatus = (element, text, tone = "neutral") => {
  if (!element) {
    return;
  }
  element.textContent = text;
  element.classList.remove(
    "text-success",
    "text-danger",
    "text-body-secondary",
  );
  if (tone === "success") {
    element.classList.add("text-success");
    return;
  }
  if (tone === "error") {
    element.classList.add("text-danger");
    return;
  }
  element.classList.add("text-body-secondary");
};

export const parseApiResponse = async (response) => {
  const raw = await response.text();
  let result = null;
  try {
    result = raw ? JSON.parse(raw) : null;
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(result?.msg || raw || `HTTP ${response.status}`);
  }

  if (String(result?.status || "").toUpperCase() !== "OK") {
    throw new Error(raw || "Unerwartete API-Antwort");
  }
  return result;
};

export const isAuthenticated = () => {
  return sessionStorage.getItem(ADMIN_AUTH_KEY) === "true";
};

export const initAdminShell = ({ onAuthenticated } = {}) => {
  const themeToggleButton = document.getElementById("theme-toggle");
  const loginForm = document.getElementById("admin-login-form");
  const usernameInput = document.getElementById("admin-username");
  const passwordInput = document.getElementById("admin-password");
  const loginError = document.getElementById("admin-login-error");
  const loginStatus = document.getElementById("admin-login-status");
  const adminContent = document.getElementById("admin-content");
  const adminLogoutButton = document.getElementById("admin-logout");
  const adminUserLabel = document.getElementById("admin-user-label");
  let authenticatedCallbackRan = false;

  const setLoginMessage = (message, tone = "neutral") => {
    if (loginStatus) {
      updateStatus(loginStatus, message, tone);
      loginStatus.classList.toggle("d-none", !message);
    }
    if (loginError) {
      loginError.classList.add("d-none");
    }
  };

  const setAuthenticatedState = (authenticated, user = null) => {
    if (authenticated) {
      loginForm?.classList.add("d-none");
      adminContent?.classList.remove("d-none");
      adminLogoutButton?.classList.remove("d-none");
      if (adminUserLabel) {
        adminUserLabel.textContent = user?.username || "admin";
      }
      sessionStorage.setItem(ADMIN_AUTH_KEY, "true");
      if (onAuthenticated && !authenticatedCallbackRan) {
        authenticatedCallbackRan = true;
        onAuthenticated();
      }
      return;
    }

    loginForm?.classList.remove("d-none");
    adminContent?.classList.add("d-none");
    adminLogoutButton?.classList.add("d-none");
    if (adminUserLabel) {
      adminUserLabel.textContent = "";
    }
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
    authenticatedCallbackRan = false;
  };

  const checkSession = async () => {
    setLoginMessage("Session wird geprueft ...");
    try {
      const response = await fetch(`${API_URL}?admin_session=1`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const result = await parseApiResponse(response);
      setAuthenticatedState(Boolean(result.authenticated), result.user || null);
      setLoginMessage("");
    } catch {
      setAuthenticatedState(false);
      setLoginMessage("");
    }
  };

  applyTheme(getPreferredTheme(), themeToggleButton);

  if (themeToggleButton) {
    themeToggleButton.addEventListener("click", () => {
      const currentTheme =
        document.documentElement.getAttribute("data-bs-theme") || "light";
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, nextTheme);
      applyTheme(nextTheme, themeToggleButton);
    });
  }

  prefersDark.addEventListener("change", (event) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      applyTheme(event.matches ? "dark" : "light", themeToggleButton);
    }
  });

  void checkSession();

  if (loginForm && passwordInput) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitButton = loginForm.querySelector('button[type="submit"]');
      submitButton?.setAttribute("disabled", "disabled");
      setLoginMessage("Anmeldung wird geprueft ...");

      try {
        const formData = new FormData();
        formData.set("action", "admin_login");
        formData.set("username", String(usernameInput?.value || "admin").trim());
        formData.set("password", passwordInput.value);

        const response = await fetch(API_URL, {
          method: "POST",
          body: formData,
          credentials: "same-origin",
        });
        const result = await parseApiResponse(response);
        passwordInput.value = "";
        setAuthenticatedState(true, result.user || null);
        setLoginMessage("");
      } catch (error) {
        setAuthenticatedState(false);
        if (loginError) {
          loginError.textContent = error.message || "Login fehlgeschlagen.";
          loginError.classList.remove("d-none");
        }
        setLoginMessage("");
        passwordInput.select();
      } finally {
        submitButton?.removeAttribute("disabled");
      }
    });
  }

  adminLogoutButton?.addEventListener("click", async () => {
    const formData = new FormData();
    formData.set("action", "admin_logout");
    try {
      await fetch(API_URL, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
    } finally {
      setAuthenticatedState(false);
      setLoginMessage("Du wurdest abgemeldet.", "success");
    }
  });

  return {
    setAuthenticatedState,
    checkSession,
  };
};
