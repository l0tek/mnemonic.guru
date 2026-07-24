import "./styles.scss";
import "./theme-runtime.js";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./nav-dropdowns.js";

const STORAGE_KEY = "theme-preference";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBERS = "0123456789";
const SMARTPHONE_SYMBOLS = "!#$%&*+-=?@_";
const ALL_SYMBOLS = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const themeToggleButton = document.getElementById("theme-toggle");
const form = document.getElementById("pwgen-form");
const lengthInput = document.getElementById("pwgen-length");
const lengthValue = document.getElementById("pwgen-length-value");
const countInput = document.getElementById("pwgen-count");
const lowercaseInput = document.getElementById("pwgen-lowercase");
const uppercaseInput = document.getElementById("pwgen-uppercase");
const numbersInput = document.getElementById("pwgen-numbers");
const specialInput = document.getElementById("pwgen-special");
const specialModeField = document.getElementById("pwgen-special-mode");
const statusElement = document.getElementById("pwgen-status");
const outputElement = document.getElementById("pwgen-output");
const strengthElement = document.getElementById("pwgen-strength");
const copyButton = document.getElementById("pwgen-copy");
const txtButton = document.getElementById("pwgen-download-txt");
const csvButton = document.getElementById("pwgen-download-csv");

let passwords = [];

const getPreferredTheme = () => {
  const storedTheme = localStorage.getItem(STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }
  return prefersDark.matches ? "dark" : "light";
};

const applyTheme = (theme) => {
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

const setStatus = (text, tone = "neutral") => {
  if (!statusElement) {
    return;
  }
  statusElement.textContent = text;
  statusElement.classList.remove(
    "text-success",
    "text-danger",
    "text-warning",
    "text-body-secondary",
  );
  if (tone === "success") {
    statusElement.classList.add("text-success");
    return;
  }
  if (tone === "warning") {
    statusElement.classList.add("text-warning");
    return;
  }
  if (tone === "error") {
    statusElement.classList.add("text-danger");
    return;
  }
  statusElement.classList.add("text-body-secondary");
};

const getRandomInt = (maxExclusive) => {
  if (maxExclusive < 1) {
    throw new Error("Kein gueltiger Zufallsbereich.");
  }
  const maxUint = 0x100000000;
  const limit = maxUint - (maxUint % maxExclusive);
  const value = new Uint32Array(1);
  do {
    crypto.getRandomValues(value);
  } while (value[0] >= limit);
  return value[0] % maxExclusive;
};

const randomChar = (characters) => {
  return characters[getRandomInt(characters.length)];
};

const shuffle = (characters) => {
  const shuffled = [...characters];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = getRandomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled.join("");
};

const getSelectedSets = () => {
  const sets = [];
  if (lowercaseInput?.checked) {
    sets.push(LOWERCASE);
  }
  if (uppercaseInput?.checked) {
    sets.push(UPPERCASE);
  }
  if (numbersInput?.checked) {
    sets.push(NUMBERS);
  }
  if (specialInput?.checked) {
    const mode =
      document.querySelector('input[name="pwgen-symbol-mode"]:checked')?.value ||
      "smartphone";
    sets.push(mode === "all" ? ALL_SYMBOLS : SMARTPHONE_SYMBOLS);
  }
  return sets;
};

const generatePassword = (length, sets) => {
  const allCharacters = sets.join("");
  const requiredCharacters = sets.map((set) => randomChar(set));
  const remainingLength = length - requiredCharacters.length;
  const remainingCharacters = Array.from({ length: remainingLength }, () =>
    randomChar(allCharacters),
  );
  return shuffle([...requiredCharacters, ...remainingCharacters]);
};

const renderPasswords = () => {
  if (!outputElement) {
    return;
  }
  outputElement.replaceChildren(
    ...passwords.map((password) => {
      const item = document.createElement("li");
      item.textContent = password;
      return item;
    }),
  );
};

const updateStrength = (length, sets) => {
  if (!strengthElement) {
    return;
  }
  const characterCount = sets.join("").length;
  const entropy = characterCount > 0 ? length * Math.log2(characterCount) : 0;
  strengthElement.textContent = `${Math.round(entropy)} Bit pro Passwort.`;
};

const updateSpecialMode = () => {
  if (!specialModeField || !specialInput) {
    return;
  }
  specialModeField.toggleAttribute("disabled", !specialInput.checked);
  specialModeField.classList.toggle("opacity-50", !specialInput.checked);
};

const updateLengthValue = () => {
  if (lengthValue && lengthInput) {
    lengthValue.textContent = lengthInput.value;
  }
};

const download = (filename, content, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const generatePasswords = () => {
  const length = Number(lengthInput?.value || 16);
  const count = Math.min(500, Math.max(1, Number(countInput?.value || 1)));
  const sets = getSelectedSets();

  if (countInput) {
    countInput.value = String(count);
  }
  if (sets.length === 0) {
    passwords = [];
    renderPasswords();
    updateStrength(length, sets);
    setStatus("Bitte mindestens einen Zeichensatz auswaehlen.", "error");
    return;
  }
  if (length < sets.length) {
    passwords = [];
    renderPasswords();
    updateStrength(length, sets);
    setStatus(
      "Die Laenge muss mindestens der Anzahl aktiver Zeichensaetze entsprechen.",
      "error",
    );
    return;
  }

  passwords = Array.from({ length: count }, () =>
    generatePassword(length, sets),
  );
  renderPasswords();
  updateStrength(length, sets);
  setStatus(`${count} Passwoerter generiert.`, "success");
};

applyTheme(getPreferredTheme());
updateLengthValue();
updateSpecialMode();
generatePasswords();

if (themeToggleButton) {
  themeToggleButton.addEventListener("click", () => {
    const currentTheme =
      document.documentElement.getAttribute("data-bs-theme") || "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  });
}

prefersDark.addEventListener("change", (event) => {
  if (!localStorage.getItem(STORAGE_KEY)) {
    applyTheme(event.matches ? "dark" : "light");
  }
});

lengthInput?.addEventListener("input", updateLengthValue);
specialInput?.addEventListener("change", updateSpecialMode);

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  generatePasswords();
});

copyButton?.addEventListener("click", async () => {
  if (passwords.length === 0) {
    setStatus("Keine Passwoerter zum Kopieren vorhanden.", "warning");
    return;
  }
  await navigator.clipboard.writeText(passwords.join("\n"));
  setStatus("Passwort-Liste kopiert.", "success");
});

txtButton?.addEventListener("click", () => {
  if (passwords.length === 0) {
    setStatus("Keine Passwoerter zum Exportieren vorhanden.", "warning");
    return;
  }
  download("passwoerter.txt", `${passwords.join("\n")}\n`, "text/plain");
});

csvButton?.addEventListener("click", () => {
  if (passwords.length === 0) {
    setStatus("Keine Passwoerter zum Exportieren vorhanden.", "warning");
    return;
  }
  const rows = ["nr,passwort"].concat(
    passwords.map((password, index) => `${index + 1},"${password.replaceAll('"', '""')}"`),
  );
  download("passwoerter.csv", `${rows.join("\n")}\n`, "text/csv");
});
