import "bootstrap/dist/js/bootstrap.bundle.min.js";

export const STORAGE_KEY = "theme-preference";
export const ADMIN_AUTH_KEY = "admin-authenticated";
export const ADMIN_PASSWORD_HASH =
  "7da6572f4d3e3ad6f33e4612d9b2b3228936bd4a3d4bae5e4aaa8c17f86588b9";
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

const hashText = async (value) => {
  const textBytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", textBytes);
  const digestBytes = Array.from(new Uint8Array(digest));
  return digestBytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
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
  const passwordInput = document.getElementById("admin-password");
  const loginError = document.getElementById("admin-login-error");
  const adminContent = document.getElementById("admin-content");

  const setAuthenticatedState = (authenticated) => {
    if (authenticated) {
      loginForm?.classList.add("d-none");
      adminContent?.classList.remove("d-none");
      sessionStorage.setItem(ADMIN_AUTH_KEY, "true");
      if (onAuthenticated) {
        onAuthenticated();
      }
      return;
    }

    loginForm?.classList.remove("d-none");
    adminContent?.classList.add("d-none");
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
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

  setAuthenticatedState(isAuthenticated());

  if (loginForm && passwordInput) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const enteredPasswordHash = await hashText(passwordInput.value);
      const valid = enteredPasswordHash === ADMIN_PASSWORD_HASH;

      if (valid) {
        loginError?.classList.add("d-none");
        passwordInput.value = "";
        setAuthenticatedState(true);
        return;
      }

      setAuthenticatedState(false);
      loginError?.classList.remove("d-none");
      passwordInput.select();
    });
  }

  return {
    setAuthenticatedState,
  };
};
