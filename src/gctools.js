import "./styles.scss";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./nav-dropdowns.js";

const STORAGE_KEY = "theme-preference";
const GC_STORAGE_KEY = "gc-tools-state";
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const themeToggleButton = document.getElementById("theme-toggle");
const form = document.getElementById("gc-tools-form");
const inputField = document.getElementById("gc-tools-input");
const outputField = document.getElementById("gc-tools-output");
const methodSelect = document.getElementById("gc-tools-method");
const inputLabel = document.getElementById("gc-tools-input-label");
const outputLabel = document.getElementById("gc-tools-output-label");
const keyWrap = document.getElementById("gc-tools-key-wrap");
const keyLabel = document.getElementById("gc-tools-key-label");
const keyField = document.getElementById("gc-tools-key");
const extraWrap = document.getElementById("gc-tools-extra-wrap");
const helpTitle = document.getElementById("gc-tools-help-title");
const helpText = document.getElementById("gc-tools-help-text");
const messageBox = document.getElementById("gc-tools-message");
const encodeButton = document.getElementById("gc-tools-encode");
const decodeButton = document.getElementById("gc-tools-decode");
const swapButton = document.getElementById("gc-tools-swap");
const methodList = document.getElementById("gc-tools-method-list");

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

const setMessage = (text, tone = "neutral") => {
  if (!messageBox) {
    return;
  }
  messageBox.textContent = text;
  messageBox.classList.remove(
    "text-body-secondary",
    "text-success",
    "text-danger",
    "text-warning",
  );
  if (tone === "success") {
    messageBox.classList.add("text-success");
    return;
  }
  if (tone === "error") {
    messageBox.classList.add("text-danger");
    return;
  }
  if (tone === "warning") {
    messageBox.classList.add("text-warning");
    return;
  }
  messageBox.classList.add("text-body-secondary");
};

const hasUnicode = (value) => /[^\u0000-\u00ff]/.test(value);

const utf8ToBase64 = (value) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const base64ToUtf8 = (value) => {
  const binary = atob(value.replace(/\s+/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const shiftLatin = (text, shift) =>
  Array.from(text, (char) => {
    const code = char.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      return String.fromCharCode(((code - 65 + shift + 26) % 26) + 65);
    }
    if (code >= 97 && code <= 122) {
      return String.fromCharCode(((code - 97 + shift + 26) % 26) + 97);
    }
    return char;
  }).join("");

const rot47 = (text) =>
  Array.from(text, (char) => {
    const code = char.charCodeAt(0);
    if (code >= 33 && code <= 126) {
      return String.fromCharCode(33 + ((code - 33 + 47) % 94));
    }
    return char;
  }).join("");

const MORSE_MAP = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",
  0: "-----",
  1: ".----",
  2: "..---",
  3: "...--",
  4: "....-",
  5: ".....",
  6: "-....",
  7: "--...",
  8: "---..",
  9: "----.",
  ".": ".-.-.-",
  ",": "--..--",
  "?": "..--..",
  "/": "-..-.",
  "-": "-....-",
  "(": "-.--.",
  ")": "-.--.-",
};

const MORSE_REVERSE_MAP = Object.fromEntries(
  Object.entries(MORSE_MAP).map(([key, value]) => [value, key]),
);

const romanEncode = (value) => {
  let number = Number.parseInt(String(value).trim(), 10);
  if (!Number.isInteger(number) || number < 1 || number > 3999) {
    throw new Error("Bitte eine Zahl zwischen 1 und 3999 eingeben.");
  }
  const numerals = [
    ["M", 1000],
    ["CM", 900],
    ["D", 500],
    ["CD", 400],
    ["C", 100],
    ["XC", 90],
    ["L", 50],
    ["XL", 40],
    ["X", 10],
    ["IX", 9],
    ["V", 5],
    ["IV", 4],
    ["I", 1],
  ];
  let result = "";
  numerals.forEach(([symbol, amount]) => {
    while (number >= amount) {
      result += symbol;
      number -= amount;
    }
  });
  return result;
};

const romanDecode = (value) => {
  const text = String(value).trim().toUpperCase();
  if (!/^[MDCLXVI]+$/.test(text)) {
    throw new Error("Bitte eine gueltige roemische Zahl eingeben.");
  }
  const values = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let sum = 0;
  for (let index = 0; index < text.length; index += 1) {
    const current = values[text[index]];
    const next = values[text[index + 1]] || 0;
    sum += current < next ? -current : current;
  }
  if (romanEncode(sum) !== text) {
    throw new Error("Bitte eine normalisierte roemische Zahl eingeben.");
  }
  return String(sum);
};

const parseShift = (value) => {
  const shift = Number.parseInt(String(value).trim() || "13", 10);
  if (!Number.isInteger(shift)) {
    throw new Error("Bitte eine ganze Zahl als Schluessel eingeben.");
  }
  return shift;
};

const requireKey = (value, fallback = "") => {
  const key = String(value || fallback).trim();
  if (!key) {
    throw new Error("Bitte einen Schluessel eingeben.");
  }
  return key;
};

const vigenereTransform = (text, key, direction) => {
  const preparedKey = key.replace(/[^A-Za-z]/g, "").toUpperCase();
  if (!preparedKey) {
    throw new Error("Der Schluessel muss Buchstaben enthalten.");
  }
  let index = 0;
  return Array.from(text, (char) => {
    const code = char.charCodeAt(0);
    const isUpper = code >= 65 && code <= 90;
    const isLower = code >= 97 && code <= 122;
    if (!isUpper && !isLower) {
      return char;
    }
    const keyShift = preparedKey.charCodeAt(index % preparedKey.length) - 65;
    const base = isUpper ? 65 : 97;
    const offset = code - base;
    const shifted =
      direction === "encode"
        ? (offset + keyShift) % 26
        : (offset - keyShift + 26) % 26;
    index += 1;
    return String.fromCharCode(base + shifted);
  }).join("");
};

const normalizeLetters = (value, preserveSpaces = false) =>
  Array.from(String(value).toUpperCase())
    .map((char) => {
      if (char === "Ä") {
        return "AE";
      }
      if (char === "Ö") {
        return "OE";
      }
      if (char === "Ü") {
        return "UE";
      }
      if (char === "ß") {
        return "SS";
      }
      if (preserveSpaces && /\s/.test(char)) {
        return " ";
      }
      return char;
    })
    .join("")
    .replace(preserveSpaces ? /[^A-Z\s]/g : /[^A-Z]/g, "");

const buildPolybiusSquare = (key) => {
  const preparedKey = normalizeLetters(key).replace(/J/g, "I");
  const alphabet = "ABCDEFGHIKLMNOPQRSTUVWXYZ";
  const merged = `${preparedKey}${alphabet}`;
  const unique = [];
  Array.from(merged).forEach((char) => {
    if (!unique.includes(char)) {
      unique.push(char);
    }
  });
  const square = [];
  for (let row = 0; row < 5; row += 1) {
    square.push(unique.slice(row * 5, row * 5 + 5));
  }
  return square;
};

const findInSquare = (square, char) => {
  const needle = char === "J" ? "I" : char;
  for (let row = 0; row < square.length; row += 1) {
    const column = square[row].indexOf(needle);
    if (column >= 0) {
      return { row, column };
    }
  }
  throw new Error(`Zeichen ${char} konnte nicht im Quadrat gefunden werden.`);
};

const prepareDigraphs = (value) => {
  const prepared = normalizeLetters(value).replace(/J/g, "I");
  const digraphs = [];
  for (let index = 0; index < prepared.length; index += 1) {
    const first = prepared[index];
    const second = prepared[index + 1];
    if (!second) {
      digraphs.push([first, "X"]);
      continue;
    }
    if (first === second) {
      digraphs.push([first, "X"]);
      continue;
    }
    digraphs.push([first, second]);
    index += 1;
  }
  return digraphs;
};

const playfairTransform = (value, key, direction) => {
  const square = buildPolybiusSquare(requireKey(key));
  const step = direction === "encode" ? 1 : -1;
  const pairs =
    direction === "encode"
      ? prepareDigraphs(value)
      : String(value)
          .toUpperCase()
          .replace(/[^A-Z]/g, "")
          .replace(/J/g, "I")
          .match(/.{1,2}/g)
          ?.map((pair) => [pair[0], pair[1] || "X"]) || [];
  return pairs
    .map(([first, second]) => {
      const a = findInSquare(square, first);
      const b = findInSquare(square, second);
      if (a.row === b.row) {
        return (
          square[a.row][(a.column + step + 5) % 5] +
          square[b.row][(b.column + step + 5) % 5]
        );
      }
      if (a.column === b.column) {
        return (
          square[(a.row + step + 5) % 5][a.column] +
          square[(b.row + step + 5) % 5][b.column]
        );
      }
      return square[a.row][b.column] + square[b.row][a.column];
    })
    .join(" ");
};

const bifidEncode = (value, key) => {
  const square = buildPolybiusSquare(requireKey(key));
  const prepared = normalizeLetters(value).replace(/J/g, "I");
  const rows = [];
  const columns = [];
  Array.from(prepared).forEach((char) => {
    const position = findInSquare(square, char);
    rows.push(position.row + 1);
    columns.push(position.column + 1);
  });
  const merged = [...rows, ...columns];
  let result = "";
  for (let index = 0; index < merged.length; index += 2) {
    const row = merged[index] - 1;
    const column = merged[index + 1] - 1;
    if (row >= 0 && column >= 0) {
      result += square[row][column];
    }
  }
  return result;
};

const bifidDecode = (value, key) => {
  const square = buildPolybiusSquare(requireKey(key));
  const prepared = normalizeLetters(value).replace(/J/g, "I");
  const coords = [];
  Array.from(prepared).forEach((char) => {
    const position = findInSquare(square, char);
    coords.push(position.row + 1, position.column + 1);
  });
  const half = coords.length / 2;
  const rows = coords.slice(0, half);
  const columns = coords.slice(half);
  let result = "";
  for (let index = 0; index < rows.length; index += 1) {
    result += square[rows[index] - 1][columns[index] - 1];
  }
  return result;
};

const tapMap = {
  A: "11",
  B: "12",
  C: "13",
  D: "14",
  E: "15",
  F: "21",
  G: "22",
  H: "23",
  I: "24",
  J: "24",
  K: "25",
  L: "31",
  M: "32",
  N: "33",
  O: "34",
  P: "35",
  Q: "41",
  R: "42",
  S: "43",
  T: "44",
  U: "45",
  V: "51",
  W: "52",
  X: "53",
  Y: "54",
  Z: "55",
};

const reverseTapMap = Object.fromEntries(
  Object.entries(tapMap).map(([char, code]) => [code, char]),
);

const skytaleEncode = (value, turns) => {
  const rows = Number.parseInt(turns, 10);
  if (!Number.isInteger(rows) || rows < 2) {
    throw new Error("Bitte mindestens 2 Zeilen als Schluessel eingeben.");
  }
  const text = String(value);
  const columns = Math.ceil(text.length / rows);
  const grid = Array.from({ length: rows }, () => Array(columns).fill(""));
  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      grid[row][column] = text[index] || "";
      index += 1;
    }
  }
  let result = "";
  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      result += grid[row][column];
    }
  }
  return result;
};

const skytaleDecode = (value, turns) => {
  const rows = Number.parseInt(turns, 10);
  if (!Number.isInteger(rows) || rows < 2) {
    throw new Error("Bitte mindestens 2 Zeilen als Schluessel eingeben.");
  }
  const text = String(value);
  const columns = Math.ceil(text.length / rows);
  const shortColumns = rows * columns - text.length;
  const columnLengths = Array.from({ length: columns }, (_, index) =>
    index >= columns - shortColumns ? rows - 1 : rows,
  );
  const grid = Array.from({ length: rows }, () => Array(columns).fill(""));
  let cursor = 0;
  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < columnLengths[column]; row += 1) {
      grid[row][column] = text[cursor] || "";
      cursor += 1;
    }
  }
  let result = "";
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      result += grid[row][column] || "";
    }
  }
  return result;
};

const otpTransform = (value, key, direction) => {
  const text = normalizeLetters(value);
  const pad = normalizeLetters(requireKey(key));
  if (!text) {
    return "";
  }
  if (pad.length < text.length) {
    throw new Error(
      "Der Schluessel muss mindestens so lang wie der Text sein.",
    );
  }
  return Array.from(text, (char, index) => {
    const left = char.charCodeAt(0) - 65;
    const right = pad.charCodeAt(index) - 65;
    const next =
      direction === "encode" ? (left + right) % 26 : (left - right + 26) % 26;
    return String.fromCharCode(next + 65);
  }).join("");
};

const buildAlphabetFromKey = (key, alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ") => {
  const prepared = normalizeLetters(key);
  const merged = `${prepared}${alphabet}`;
  const unique = [];
  Array.from(merged).forEach((char) => {
    if (!unique.includes(char)) {
      unique.push(char);
    }
  });
  return unique.join("");
};

const ragbabyTransform = (value, key, direction) => {
  const alphabet = buildAlphabetFromKey(key);
  let wordIndex = 1;
  let letterIndex = 0;
  return Array.from(String(value).toUpperCase(), (char) => {
    if (char === " ") {
      wordIndex += 1;
      letterIndex = 0;
      return char;
    }
    const normalized = normalizeLetters(char);
    if (!normalized) {
      return char;
    }
    const source = normalized[0];
    const position = alphabet.indexOf(source);
    if (position < 0) {
      return char;
    }
    const shift = wordIndex + letterIndex;
    letterIndex += 1;
    const nextIndex =
      direction === "encode"
        ? (position + shift) % alphabet.length
        : (position - shift + alphabet.length * 4) % alphabet.length;
    return alphabet[nextIndex];
  }).join("");
};

const primeAlphabet = [
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71,
  73, 79, 83, 89, 97, 101,
];

const tapirEncodeMap = {
  A: "!",
  B: "@",
  C: "#",
  D: "$",
  E: "%",
  F: "^",
  G: "&",
  H: "*",
  I: "(",
  J: ")",
  K: "-",
  L: "_",
  M: "=",
  N: "+",
  O: "[",
  P: "]",
  Q: "{",
  R: "}",
  S: ";",
  T: ":",
  U: ",",
  V: ".",
  W: "<",
  X: ">",
  Y: "/",
  Z: "?",
};

const tapirDecodeMap = Object.fromEntries(
  Object.entries(tapirEncodeMap).map(([key, value]) => [value, key]),
);

const pocketDecode = (value) => {
  const binary = String(value)
    .replace(/[.\-_]/g, "0")
    .replace(/[xX#*]/g, "1")
    .replace(/[^01]/g, "");
  if (!binary) {
    throw new Error("Pocket-Decoder erwartet Muster aus . - _ x # *.");
  }
  return binary.match(/.{1,8}/g)?.join(" ") || "";
};

const fourSquareTransform = (value, keyA, keyB, direction) => {
  const plainSquare = buildPolybiusSquare("");
  const squareA = buildPolybiusSquare(keyA);
  const squareB = buildPolybiusSquare(keyB);
  const pairs =
    direction === "encode"
      ? prepareDigraphs(value)
      : String(value)
          .toUpperCase()
          .replace(/[^A-Z]/g, "")
          .replace(/J/g, "I")
          .match(/.{1,2}/g)
          ?.map((pair) => [pair[0], pair[1] || "X"]) || [];
  return pairs
    .map(([first, second]) => {
      if (direction === "encode") {
        const a = findInSquare(plainSquare, first);
        const b = findInSquare(plainSquare, second);
        return squareA[a.row][b.column] + squareB[b.row][a.column];
      }
      const a = findInSquare(squareA, first);
      const b = findInSquare(squareB, second);
      return plainSquare[a.row][b.column] + plainSquare[b.row][a.column];
    })
    .join(" ");
};

const runBrainfuck = (program, input = "") => {
  const memory = new Uint8Array(30000);
  let pointer = 0;
  let inputIndex = 0;
  let output = "";
  const code = Array.from(program).filter((char) => "><+-.,[]".includes(char));
  const jumpTable = new Map();
  const stack = [];
  code.forEach((char, index) => {
    if (char === "[") {
      stack.push(index);
    }
    if (char === "]") {
      const openIndex = stack.pop();
      if (openIndex == null) {
        throw new Error("Brainfuck-Klammern sind nicht ausgeglichen.");
      }
      jumpTable.set(openIndex, index);
      jumpTable.set(index, openIndex);
    }
  });
  if (stack.length > 0) {
    throw new Error("Brainfuck-Klammern sind nicht ausgeglichen.");
  }
  for (let instruction = 0; instruction < code.length; instruction += 1) {
    switch (code[instruction]) {
      case ">":
        pointer = (pointer + 1) % memory.length;
        break;
      case "<":
        pointer = (pointer - 1 + memory.length) % memory.length;
        break;
      case "+":
        memory[pointer] = (memory[pointer] + 1) & 255;
        break;
      case "-":
        memory[pointer] = (memory[pointer] - 1 + 256) & 255;
        break;
      case ".":
        output += String.fromCharCode(memory[pointer]);
        break;
      case ",":
        memory[pointer] =
          inputIndex < input.length ? input.charCodeAt(inputIndex) & 255 : 0;
        inputIndex += 1;
        break;
      case "[":
        if (memory[pointer] === 0) {
          instruction = jumpTable.get(instruction);
        }
        break;
      case "]":
        if (memory[pointer] !== 0) {
          instruction = jumpTable.get(instruction);
        }
        break;
      default:
        break;
    }
  }
  return output;
};

const ookToBrainfuck = (value) => {
  const tokens = String(value).match(/Ook[.!?]/g);
  if (!tokens || tokens.length % 2 !== 0) {
    throw new Error("Ook! erwartet gueltige Token-Paare wie 'Ook. Ook?'.");
  }
  const map = {
    "Ook. Ook?": ">",
    "Ook? Ook.": "<",
    "Ook. Ook.": "+",
    "Ook! Ook!": "-",
    "Ook! Ook.": ".",
    "Ook. Ook!": ",",
    "Ook! Ook?": "[",
    "Ook? Ook!": "]",
  };
  let result = "";
  for (let index = 0; index < tokens.length; index += 2) {
    const pair = `${tokens[index]} ${tokens[index + 1]}`;
    if (!map[pair]) {
      throw new Error(`Unbekanntes Ook!-Paar: ${pair}`);
    }
    result += map[pair];
  }
  return result;
};

const baudotLetters = {
  A: "00011",
  B: "11001",
  C: "01110",
  D: "01001",
  E: "00001",
  F: "01101",
  G: "11010",
  H: "10100",
  I: "00110",
  J: "01011",
  K: "01111",
  L: "10010",
  M: "11100",
  N: "01100",
  O: "11000",
  P: "10110",
  Q: "10111",
  R: "01010",
  S: "00101",
  T: "10000",
  U: "00111",
  V: "11110",
  W: "10011",
  X: "11101",
  Y: "10101",
  Z: "10001",
  " ": "00100",
};

const reverseBaudotLetters = Object.fromEntries(
  Object.entries(baudotLetters).map(([key, value]) => [value, key]),
);

const murrayLetters = {
  A: "00011",
  B: "11001",
  C: "01110",
  D: "01001",
  E: "00001",
  F: "01101",
  G: "11010",
  H: "10100",
  I: "00110",
  J: "01011",
  K: "01111",
  L: "10010",
  M: "11100",
  N: "01100",
  O: "11000",
  P: "10110",
  Q: "10111",
  R: "01010",
  S: "00101",
  T: "10000",
  U: "00111",
  V: "11110",
  W: "10011",
  X: "11101",
  Y: "10101",
  Z: "10001",
  " ": "00100",
};

const reverseMurrayLetters = Object.fromEntries(
  Object.entries(murrayLetters).map(([key, value]) => [value, key]),
);

const okto3Encode = (value) =>
  Array.from(String(value), (char) =>
    char.charCodeAt(0).toString(8).padStart(3, "0"),
  ).join(" ");

const okto3Decode = (value) =>
  String(value)
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map((chunk) => {
      if (!/^[0-7]{3}$/.test(chunk)) {
        throw new Error("Okto3-Decode erwartet 3-stellige Oktalgruppen.");
      }
      return String.fromCharCode(Number.parseInt(chunk, 8));
    })
    .join("");

const decabitEncode = (value) =>
  String(value)
    .replace(/\s+/g, "")
    .split("")
    .map((char) => {
      if (!/\d/.test(char)) {
        throw new Error("Decabit erwartet nur Ziffern 0-9.");
      }
      const index = Number.parseInt(char, 10);
      return Array.from({ length: 10 }, (_, bit) =>
        bit === index ? "1" : "0",
      ).join("");
    })
    .join(" ");

const decabitDecode = (value) =>
  String(value)
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map((chunk) => {
      if (!/^[01]{10}$/.test(chunk)) {
        throw new Error("Decabit-Decode erwartet 10-Bit-Gruppen.");
      }
      const ones = chunk.split("").filter((bit) => bit === "1").length;
      if (ones !== 1) {
        throw new Error("Jede Decabit-Gruppe muss genau eine 1 enthalten.");
      }
      return String(chunk.indexOf("1"));
    })
    .join("");

const parseCoordinateLine = (line) => {
  const match = String(line)
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)$/);
  if (!match) {
    throw new Error(
      "Koordinatenschnitt erwartet zwei Zeilen im Format: x,y winkel",
    );
  }
  return {
    x: Number.parseFloat(match[1]),
    y: Number.parseFloat(match[2]),
    angle: (Number.parseFloat(match[3]) * Math.PI) / 180,
  };
};

const coordinateIntersection = (value) => {
  const lines = String(value).trim().split(/\r?\n/).filter(Boolean);
  if (lines.length !== 2) {
    throw new Error("Bitte genau zwei Peillinien eingeben.");
  }
  const first = parseCoordinateLine(lines[0]);
  const second = parseCoordinateLine(lines[1]);
  const d1x = Math.cos(first.angle);
  const d1y = Math.sin(first.angle);
  const d2x = Math.cos(second.angle);
  const d2y = Math.sin(second.angle);
  const determinant = d1x * d2y - d1y * d2x;
  if (Math.abs(determinant) < 1e-9) {
    throw new Error("Die Peillinien sind parallel oder fast parallel.");
  }
  const dx = second.x - first.x;
  const dy = second.y - first.y;
  const t = (dx * d2y - dy * d2x) / determinant;
  const x = first.x + t * d1x;
  const y = first.y + t * d1y;
  return `Schnittpunkt: ${x.toFixed(6)}, ${y.toFixed(6)}`;
};

const pixelEncode = (value, widthValue) => {
  const width = Number.parseInt(String(widthValue || "8").trim(), 10);
  if (!Number.isInteger(width) || width < 1) {
    throw new Error("Bitte eine gueltige Bildbreite eingeben.");
  }
  const bits = String(value).replace(/[^01]/g, "");
  if (!bits) {
    throw new Error("Pixelbild erwartet eine Folge aus 0 und 1.");
  }
  const rows = bits.match(new RegExp(`.{1,${width}}`, "g")) || [];
  return rows
    .map((row) =>
      row
        .split("")
        .map((bit) => (bit === "1" ? "##" : ".."))
        .join(""),
    )
    .join("\n");
};

const atomtomEncodeMap = {
  A: "/",
  B: "//",
  C: "///",
  D: "////",
  E: "/\\",
  F: "//\\",
  G: "///\\",
  H: "/\\\\",
  I: "/\\\\\\",
  J: "\\/",
  K: "\\\\/",
  L: "\\\\\\/",
  M: "\\\\//",
  N: "\\\\///",
  O: "/\\/",
  P: "//\\/",
  Q: "/\\\\/",
  R: "/\\//",
  S: "\\/\\",
  T: "\\\\\\/\\",
  U: "\\\\//\\",
  V: "\\/\\\\",
  W: "//\\\\",
  X: "\\\\\\\\//",
  Y: "\\/\\/",
  Z: "/\\/\\",
};

const atomtomDecodeMap = Object.fromEntries(
  Object.entries(atomtomEncodeMap).map(([key, value]) => [value, key]),
);

const germanScrabbleScores = {
  A: 1,
  B: 3,
  C: 4,
  D: 1,
  E: 1,
  F: 4,
  G: 2,
  H: 2,
  I: 1,
  J: 6,
  K: 4,
  L: 2,
  M: 3,
  N: 1,
  O: 2,
  P: 4,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 6,
  W: 3,
  X: 8,
  Y: 10,
  Z: 3,
  Ä: 6,
  Ö: 8,
  Ü: 6,
};

const englishScrabbleScores = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 4,
  G: 2,
  H: 4,
  I: 1,
  J: 8,
  K: 5,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 3,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 8,
  Y: 4,
  Z: 10,
};

const clampByte = (value) => ((Number(value) % 256) + 256) % 256;

const scoreScrabbleWord = (word, language = "de") => {
  const table =
    language === "en" ? englishScrabbleScores : germanScrabbleScores;
  return Array.from(String(word).toUpperCase()).reduce(
    (total, char) => total + (table[char] || 0),
    0,
  );
};

const tokenizeWords = (value) => String(value).match(/[A-Za-zÄÖÜäöüß]+/g) || [];

const runBeatnik = (program, input = "", language = "de") => {
  const words = tokenizeWords(program);
  if (words.length === 0) {
    return "";
  }
  const scores = words.map((word) => scoreScrabbleWord(word, language));
  const stack = [];
  let inputIndex = 0;
  let output = "";
  let instruction = 0;
  let steps = 0;

  const pop = () => (stack.length > 0 ? Number(stack.pop()) : 0);
  const nextValue = () => {
    if (instruction + 1 >= scores.length) {
      throw new Error(
        "Beatnik erwartet nach diesem Befehl noch ein weiteres Wort.",
      );
    }
    return scores[instruction + 1];
  };

  while (instruction < scores.length) {
    steps += 1;
    if (steps > 200000) {
      throw new Error("Beatnik wurde nach 200000 Schritten abgebrochen.");
    }
    const opcode = scores[instruction];
    switch (opcode) {
      case 5:
        stack.push(nextValue());
        instruction += 2;
        break;
      case 6:
        pop();
        instruction += 1;
        break;
      case 7: {
        const right = pop();
        const left = pop();
        stack.push(left + right);
        instruction += 1;
        break;
      }
      case 8:
        stack.push(
          inputIndex < input.length ? input.charCodeAt(inputIndex) : 0,
        );
        inputIndex += 1;
        instruction += 1;
        break;
      case 9:
        output += String.fromCharCode(clampByte(pop()));
        instruction += 1;
        break;
      case 10: {
        const right = pop();
        const left = pop();
        stack.push(left - right);
        instruction += 1;
        break;
      }
      case 11: {
        const right = pop();
        const left = pop();
        stack.push(right, left);
        instruction += 1;
        break;
      }
      case 12: {
        const value = pop();
        stack.push(value, value);
        instruction += 1;
        break;
      }
      case 13: {
        const offset = nextValue();
        const value = pop();
        instruction += value === 0 ? offset + 2 : 2;
        break;
      }
      case 14: {
        const offset = nextValue();
        const value = pop();
        instruction += value !== 0 ? offset + 2 : 2;
        break;
      }
      case 15: {
        const offset = nextValue();
        const value = pop();
        instruction =
          value === 0 ? Math.max(0, instruction - offset) : instruction + 2;
        break;
      }
      case 16: {
        const offset = nextValue();
        const value = pop();
        instruction =
          value !== 0 ? Math.max(0, instruction - offset) : instruction + 2;
        break;
      }
      case 17:
        return output;
      default:
        instruction += 1;
        break;
    }
  }

  return output;
};

const cowInstructionMap = [
  "moo",
  "mOo",
  "moO",
  null,
  "Moo",
  "MOo",
  "MoO",
  "MOO",
  "OOO",
  "MMM",
  "OOM",
  "oom",
];

const tokenizeCow = (value) =>
  String(value).match(/moo|mOo|moO|mOO|Moo|MOo|MoO|MOO|OOO|MMM|OOM|oom/g) || [];

const runCow = (program, input = "") => {
  const code = tokenizeCow(program);
  if (code.length === 0) {
    return "";
  }

  const jumpTable = new Map();
  const stack = [];
  code.forEach((token, index) => {
    if (token === "MOO") {
      stack.push(index);
    }
    if (token === "moo") {
      const openIndex = stack.pop();
      if (openIndex == null) {
        throw new Error("COW-Schleifen sind nicht ausgeglichen.");
      }
      jumpTable.set(openIndex, index);
      jumpTable.set(index, openIndex);
    }
  });
  if (stack.length > 0) {
    throw new Error("COW-Schleifen sind nicht ausgeglichen.");
  }

  const memory = new Map();
  const integerInput = (String(input).match(/-?\d+/g) || []).map((value) =>
    Number.parseInt(value, 10),
  );
  let integerIndex = 0;
  let characterIndex = 0;
  let pointer = 0;
  let register = null;
  let output = "";
  let instruction = 0;
  let steps = 0;

  const getCell = () => memory.get(pointer) || 0;
  const setCell = (value) => {
    memory.set(pointer, clampByte(value));
  };
  const appendInteger = (value) => {
    output += `${output && !output.endsWith("\n") ? " " : ""}${value}`;
  };

  const executeToken = (token, allowIndirect = true) => {
    switch (token) {
      case "moo":
        if (getCell() !== 0) {
          instruction = jumpTable.get(instruction);
        }
        return;
      case "mOo":
        pointer = Math.max(0, pointer - 1);
        return;
      case "moO":
        pointer += 1;
        return;
      case "mOO": {
        if (!allowIndirect) {
          return;
        }
        const indirect = cowInstructionMap[getCell()];
        if (
          !indirect ||
          indirect === "mOO" ||
          indirect === "moo" ||
          indirect === "MOO"
        ) {
          instruction = code.length;
          return;
        }
        executeToken(indirect, false);
        return;
      }
      case "Moo":
        if (getCell() === 0) {
          setCell(
            characterIndex < input.length
              ? input.charCodeAt(characterIndex)
              : 0,
          );
          characterIndex += 1;
        } else {
          output += String.fromCharCode(getCell());
        }
        return;
      case "MOo":
        setCell(getCell() - 1);
        return;
      case "MoO":
        setCell(getCell() + 1);
        return;
      case "MOO":
        if (getCell() === 0) {
          instruction = jumpTable.get(instruction);
        }
        return;
      case "OOO":
        setCell(0);
        return;
      case "MMM":
        if (register == null) {
          register = getCell();
        } else {
          setCell(register);
          register = null;
        }
        return;
      case "OOM":
        appendInteger(getCell());
        return;
      case "oom":
        setCell(
          integerIndex < integerInput.length ? integerInput[integerIndex] : 0,
        );
        integerIndex += 1;
        return;
      default:
        return;
    }
  };

  while (instruction < code.length) {
    steps += 1;
    if (steps > 200000) {
      throw new Error("COW wurde nach 200000 Schritten abgebrochen.");
    }
    executeToken(code[instruction]);
    instruction += 1;
  }

  return output;
};

const methods = {
  ascii: {
    label: "ASCII Code",
    help: "Text in dezimale ASCII-Werte und wieder zurueck umwandeln.",
    dirs: 3,
    encode: ({ input }) =>
      Array.from(input, (char) => char.charCodeAt(0)).join(" "),
    decode: ({ input }) =>
      input
        .trim()
        .split(/[\s,;]+/)
        .filter(Boolean)
        .map((chunk) => {
          const code = Number.parseInt(chunk, 10);
          if (!Number.isInteger(code)) {
            throw new Error("ASCII-Decode erwartet Zahlen mit Leerzeichen.");
          }
          return String.fromCharCode(code);
        })
        .join(""),
  },
  atomtom: {
    label: "A-tom-tom",
    help: "Slash- und Backslash-Code fuer A-Z. Buchstaben werden mit Leerzeichen, Worte mit drei Leerzeichen getrennt.",
    dirs: 3,
    inputLabel: "Klartext",
    outputLabel: "A-tom-tom Text",
    encode: ({ input }) =>
      normalizeLetters(input, true)
        .split(" ")
        .filter(Boolean)
        .map((word) =>
          word
            .split("")
            .map((char) => atomtomEncodeMap[char] || char)
            .join(" "),
        )
        .join("   "),
    decode: ({ input }) =>
      String(input)
        .trim()
        .split(/\s{3,}/)
        .map((word) =>
          word
            .split(/\s+/)
            .filter(Boolean)
            .map((chunk) => {
              const value = atomtomDecodeMap[chunk];
              if (!value) {
                throw new Error(`Unbekannter A-tom-tom-Code: ${chunk}`);
              }
              return value;
            })
            .join(""),
        )
        .join(" "),
  },
  baudot: {
    label: "Baudot-Code (CCITT-1)",
    help: "5-Bit-Baudot fuer Buchstaben und Leerzeichen.",
    dirs: 3,
    encode: ({ input }) =>
      Array.from(normalizeLetters(input, true))
        .map((char) => baudotLetters[char] || "")
        .filter(Boolean)
        .join(" "),
    decode: ({ input }) =>
      String(input)
        .trim()
        .split(/[\s,;]+/)
        .filter(Boolean)
        .map((chunk) => {
          const value = reverseBaudotLetters[chunk];
          if (!value) {
            throw new Error(`Unbekannter Baudot-Code: ${chunk}`);
          }
          return value;
        })
        .join(""),
  },
  base64: {
    label: "Base64",
    help: "UTF-8-faehiger Base64-Encoder und -Decoder.",
    dirs: 3,
    encode: ({ input }) => utf8ToBase64(input),
    decode: ({ input }) => base64ToUtf8(input),
  },
  beatnik: {
    label: "Beatnik",
    help: "Interpreter fuer Beatnik. Die Worte werden per Scrabble-Wert in Befehle umgerechnet.",
    dirs: 2,
    inputLabel: "Ausgabe",
    outputLabel: "Beatnik Programmcode",
    keyLabel: "Programminput",
    extraOptions: [
      {
        name: "lang",
        label: "Scrabble Regeln",
        defaultValue: "de",
        choices: [
          { value: "de", label: "Deutsch" },
          { value: "en", label: "Englisch" },
        ],
      },
    ],
    decode: ({ input, key, extras }) => runBeatnik(input, key, extras.lang),
  },
  binaer: {
    label: "Binaer-Code",
    help: "Text in 8-Bit-Binaerwerte umwandeln und wieder zurueck lesen.",
    dirs: 3,
    encode: ({ input }) =>
      Array.from(input, (char) =>
        char.charCodeAt(0).toString(2).padStart(8, "0"),
      ).join(" "),
    decode: ({ input }) =>
      input
        .trim()
        .split(/[\s,;]+/)
        .filter(Boolean)
        .map((chunk) => {
          if (!/^[01]{1,16}$/.test(chunk)) {
            throw new Error("Binaer-Decode erwartet Gruppen aus 0 und 1.");
          }
          return String.fromCharCode(Number.parseInt(chunk, 2));
        })
        .join(""),
  },
  bcd: {
    label: "BCD-Code",
    help: "Binary Coded Decimal fuer Ziffern 0-9.",
    dirs: 3,
    encode: ({ input }) =>
      String(input)
        .replace(/\s+/g, "")
        .split("")
        .map((char) => {
          if (!/\d/.test(char)) {
            throw new Error("BCD erwartet nur Ziffern 0-9.");
          }
          return Number.parseInt(char, 10).toString(2).padStart(4, "0");
        })
        .join(" "),
    decode: ({ input }) =>
      String(input)
        .trim()
        .split(/[\s,;]+/)
        .filter(Boolean)
        .map((chunk) => {
          if (!/^[01]{4}$/.test(chunk)) {
            throw new Error("BCD-Decode erwartet 4-Bit-Gruppen.");
          }
          return String(Number.parseInt(chunk, 2));
        })
        .join(""),
  },
  brainfuck: {
    label: "Brainfuck Interpreter",
    help: "Fuehrt Brainfuck-Code aus. Optionales Programminput kommt aus dem Schluesselfeld.",
    dirs: 2,
    keyLabel: "Programminput",
    decode: ({ input, key }) => runBrainfuck(input, key),
  },
  buchstabenhaeufigkeit: {
    label: "Buchstabenhaeufigkeit",
    help: "Zaehlt Vorkommen von Buchstaben A-Z und sortiert absteigend nach Trefferzahl.",
    dirs: 1,
    encode: ({ input }) => {
      const counts = new Map();
      Array.from(normalizeLetters(input)).forEach((char) => {
        counts.set(char, (counts.get(char) || 0) + 1);
      });
      return Array.from(counts.entries())
        .sort(
          (left, right) =>
            right[1] - left[1] || left[0].localeCompare(right[0]),
        )
        .map(([char, count]) => `${char}: ${count}`)
        .join("\n");
    },
  },
  buchstabenwert: {
    label: "Buchstabenwert",
    help: "A=1 bis Z=26. Beim Decodieren werden Zahlen wieder in Buchstaben umgesetzt.",
    dirs: 3,
    encode: ({ input }) =>
      Array.from(input.toUpperCase())
        .map((char) => {
          if (char >= "A" && char <= "Z") {
            return String(char.charCodeAt(0) - 64);
          }
          return char === " " ? "/" : char;
        })
        .join(" "),
    decode: ({ input }) =>
      input
        .trim()
        .split(/\s+/)
        .map((chunk) => {
          if (chunk === "/") {
            return " ";
          }
          const value = Number.parseInt(chunk, 10);
          if (Number.isInteger(value) && value >= 1 && value <= 26) {
            return String.fromCharCode(64 + value);
          }
          return chunk;
        })
        .join(""),
  },
  caesar: {
    label: "Caesar",
    help: "Klassische Verschiebechiffre mit frei waehlbarer Verschiebung.",
    dirs: 3,
    keyLabel: "Verschiebung",
    keyDefault: "3",
    encode: ({ input, key }) => shiftLatin(input, parseShift(key)),
    decode: ({ input, key }) => shiftLatin(input, -parseShift(key)),
  },
  cow: {
    label: "COW Interpreter",
    help: "Interpreter fuer die esoterische Sprache COW inklusive Register, Integer-I/O und Schleifen.",
    dirs: 2,
    inputLabel: "Ausgabe",
    outputLabel: "COW Programm-Code",
    keyLabel: "Eingabe (falls notwendig)",
    decode: ({ input, key }) => runCow(input, key),
  },
  bifid: {
    label: "Bifid",
    help: "Bifid-Chiffre auf Basis eines Polybius-Quadrats mit Schluesselwort.",
    dirs: 3,
    keyLabel: "Schluesselwort",
    keyDefault: "CRYPTO",
    encode: ({ input, key }) => bifidEncode(input, key),
    decode: ({ input, key }) => bifidDecode(input, key),
  },
  foursquare: {
    label: "Four-Square",
    help: "Four-Square-Chiffre mit zwei Schluesselwoertern, getrennt durch Komma.",
    dirs: 3,
    keyLabel: "Schluessel A, Schluessel B",
    keyDefault: "EXAMPLE,KEYWORD",
    encode: ({ input, key }) => {
      const [keyA, keyB] = requireKey(key)
        .split(",")
        .map((part) => part.trim());
      if (!keyA || !keyB) {
        throw new Error("Bitte zwei Schluesselwoerter mit Komma angeben.");
      }
      return fourSquareTransform(input, keyA, keyB, "encode");
    },
    decode: ({ input, key }) => {
      const [keyA, keyB] = requireKey(key)
        .split(",")
        .map((part) => part.trim());
      if (!keyA || !keyB) {
        throw new Error("Bitte zwei Schluesselwoerter mit Komma angeben.");
      }
      return fourSquareTransform(input, keyA, keyB, "decode");
    },
  },
  handy: {
    label: "Handy",
    help: "Buchstaben in klassische Mehrfach-Tastendruecke auf dem 9er-Block umwandeln.",
    dirs: 1,
    encode: ({ input }) => {
      const map = {
        A: "2",
        B: "22",
        C: "222",
        D: "3",
        E: "33",
        F: "333",
        G: "4",
        H: "44",
        I: "444",
        J: "5",
        K: "55",
        L: "555",
        M: "6",
        N: "66",
        O: "666",
        P: "7",
        Q: "77",
        R: "777",
        S: "7777",
        T: "8",
        U: "88",
        V: "888",
        W: "9",
        X: "99",
        Y: "999",
        Z: "9999",
      };
      return Array.from(input.toUpperCase())
        .map((char) => (char === " " ? "0" : map[char] || char))
        .join(" ");
    },
  },
  koordschnitt: {
    label: "Koordinatenschnitt",
    help: "Zwei Peillinien schneiden. Format je Zeile: x,y winkel",
    dirs: 1,
    encode: ({ input }) => coordinateIntersection(input),
  },
  morse: {
    label: "Morse-Code",
    help: "Punkte und Striche fuer Buchstaben, Zahlen und einige Satzzeichen.",
    dirs: 3,
    encode: ({ input }) =>
      input
        .toUpperCase()
        .split(" ")
        .map((word) =>
          Array.from(word)
            .map((char) => MORSE_MAP[char] || char)
            .join(" "),
        )
        .join(" / "),
    decode: ({ input }) =>
      input
        .trim()
        .split(/\s*\/\s*/)
        .map((word) =>
          word
            .split(/\s+/)
            .filter(Boolean)
            .map((char) => MORSE_REVERSE_MAP[char] || char)
            .join(""),
        )
        .join(" "),
  },
  murray: {
    label: "Murray-Code (CCITT-2)",
    help: "5-Bit-Murray fuer Buchstaben und Leerzeichen.",
    dirs: 3,
    encode: ({ input }) =>
      Array.from(normalizeLetters(input, true))
        .map((char) => murrayLetters[char] || "")
        .filter(Boolean)
        .join(" "),
    decode: ({ input }) =>
      String(input)
        .trim()
        .split(/[\s,;]+/)
        .filter(Boolean)
        .map((chunk) => {
          const value = reverseMurrayLetters[chunk];
          if (!value) {
            throw new Error(`Unbekannter Murray-Code: ${chunk}`);
          }
          return value;
        })
        .join(""),
  },
  okto3: {
    label: "Okto3",
    help: "ASCII in 3-stellige Oktalgruppen und wieder zurueck.",
    dirs: 3,
    encode: ({ input }) => okto3Encode(input),
    decode: ({ input }) => okto3Decode(input),
  },
  klopfcode: {
    label: "Klopfcode",
    help: "Polybius-Tap-Code mit Zweiergruppen von 1 bis 5.",
    dirs: 3,
    encode: ({ input }) =>
      normalizeLetters(input)
        .split("")
        .map((char) => tapMap[char === "J" ? "I" : char] || char)
        .join(" "),
    decode: ({ input }) =>
      String(input)
        .trim()
        .split(/[\s,;/]+/)
        .filter(Boolean)
        .map((chunk) => reverseTapMap[chunk] || chunk)
        .join(""),
  },
  otp: {
    label: "One-Time-Pad",
    help: "Buchstabenweises Addieren oder Subtrahieren mit einem gleich langen Schluessel.",
    dirs: 3,
    keyLabel: "Pad / Schluessel",
    keyDefault: "SECRETKEY",
    encode: ({ input, key }) => otpTransform(input, key, "encode"),
    decode: ({ input, key }) => otpTransform(input, key, "decode"),
  },
  ook: {
    label: "Ook! Interpreter",
    help: "Uebersetzt Ook!-Paare nach Brainfuck und fuehrt das Ergebnis aus.",
    dirs: 2,
    keyLabel: "Programminput",
    decode: ({ input, key }) => runBrainfuck(ookToBrainfuck(input), key),
  },
  playfair: {
    label: "Playfair",
    help: "Digraphen-Chiffre mit 5x5-Quadrat und Schluesselwort.",
    dirs: 3,
    keyLabel: "Schluesselwort",
    keyDefault: "MONARCHY",
    encode: ({ input, key }) => playfairTransform(input, key, "encode"),
    decode: ({ input, key }) => playfairTransform(input, key, "decode"),
  },
  pocket: {
    label: "Pocket-Decoder",
    help: "Einfache Uebersetzung von Taschenrechner- oder Pixelmustern in Binaergruppen.",
    dirs: 2,
    decode: ({ input }) => pocketDecode(input),
  },
  pixel: {
    label: "Pixelbild",
    help: "Darstellung einer 0/1-Folge als simples Pixelraster. Breite ueber Schluesselfeld.",
    dirs: 1,
    keyLabel: "Breite",
    keyDefault: "8",
    encode: ({ input, key }) => pixelEncode(input, key),
  },
  primzahlenalphabet: {
    label: "Primzahlen-Alphabet",
    help: "A=2, B=3, C=5 ... Z=101.",
    dirs: 3,
    encode: ({ input }) =>
      normalizeLetters(input)
        .split("")
        .map((char) => primeAlphabet[char.charCodeAt(0) - 65])
        .join(" "),
    decode: ({ input }) =>
      String(input)
        .trim()
        .split(/[\s,;]+/)
        .filter(Boolean)
        .map((chunk) => {
          const value = Number.parseInt(chunk, 10);
          const index = primeAlphabet.indexOf(value);
          if (index < 0) {
            throw new Error(`Unbekannte Primzahl im Alphabet: ${chunk}`);
          }
          return String.fromCharCode(65 + index);
        })
        .join(""),
  },
  ragbaby: {
    label: "Ragbaby",
    help: "Schluesselalphabet plus Wortpositionen fuer eine fortlaufende Substitution.",
    dirs: 3,
    keyLabel: "Schluesselwort",
    keyDefault: "RAGBABY",
    encode: ({ input, key }) =>
      ragbabyTransform(input, requireKey(key), "encode"),
    decode: ({ input, key }) =>
      ragbabyTransform(input, requireKey(key), "decode"),
  },
  roman: {
    label: "Roemische Zahl",
    help: "Zwischen ganzen Zahlen und roemischen Zahlen umwandeln.",
    dirs: 3,
    encode: ({ input }) => romanEncode(input),
    decode: ({ input }) => romanDecode(input),
  },
  rot13: {
    label: "ROT13",
    help: "Klassische ROT13-Substitution fuer Buchstaben.",
    dirs: 3,
    encode: ({ input }) => shiftLatin(input, 13),
    decode: ({ input }) => shiftLatin(input, 13),
  },
  rot5: {
    label: "ROT5",
    help: "ROT fuer Ziffern 0 bis 9.",
    dirs: 3,
    encode: ({ input }) =>
      input.replace(/\d/g, (digit) => String((Number(digit) + 5) % 10)),
    decode: ({ input }) =>
      input.replace(/\d/g, (digit) => String((Number(digit) + 5) % 10)),
  },
  rot18: {
    label: "ROT18",
    help: "Kombination aus ROT13 fuer Buchstaben und ROT5 fuer Ziffern.",
    dirs: 3,
    encode: ({ input }) =>
      shiftLatin(input, 13).replace(/\d/g, (digit) =>
        String((Number(digit) + 5) % 10),
      ),
    decode: ({ input }) =>
      shiftLatin(input, 13).replace(/\d/g, (digit) =>
        String((Number(digit) + 5) % 10),
      ),
  },
  rot47: {
    label: "ROT47",
    help: "ROT47 fuer das druckbare ASCII-Spektrum.",
    dirs: 3,
    encode: ({ input }) => rot47(input),
    decode: ({ input }) => rot47(input),
  },
  scrabble: {
    label: "Scrabble-Wert",
    help: "Gesamtwert des Textes nach deutscher Scrabble-Wertung.",
    dirs: 1,
    encode: ({ input }) => {
      const scores = {
        A: 1,
        B: 3,
        C: 4,
        D: 1,
        E: 1,
        F: 4,
        G: 2,
        H: 2,
        I: 1,
        J: 6,
        K: 4,
        L: 2,
        M: 3,
        N: 1,
        O: 2,
        P: 4,
        Q: 10,
        R: 1,
        S: 1,
        T: 1,
        U: 1,
        V: 6,
        W: 3,
        X: 8,
        Y: 10,
        Z: 3,
        Ä: 6,
        Ö: 8,
        Ü: 6,
      };
      const parts = [];
      let total = 0;
      Array.from(input.toUpperCase()).forEach((char) => {
        const score = scores[char] || 0;
        if (score > 0) {
          parts.push(`${char}:${score}`);
          total += score;
        }
      });
      return `${parts.join("  ")}\n\nGesamt: ${total}`;
    },
  },
  decabit: {
    label: "Decabit Impulsraster",
    help: "Ziffern in 10-Bit-One-Hot-Muster und wieder zurueck.",
    dirs: 3,
    encode: ({ input }) => decabitEncode(input),
    decode: ({ input }) => decabitDecode(input),
  },
  skytale: {
    label: "Skytale",
    help: "Transposition mit Zeilenzahl als Schluessel.",
    dirs: 3,
    keyLabel: "Zeilen",
    keyDefault: "3",
    encode: ({ input, key }) => skytaleEncode(input, key),
    decode: ({ input, key }) => skytaleDecode(input, key),
  },
  tapir: {
    label: "TAPIR Substitution",
    help: "Feste Symbolsubstitution fuer das Alphabet A-Z.",
    dirs: 3,
    encode: ({ input }) =>
      normalizeLetters(input)
        .split("")
        .map((char) => tapirEncodeMap[char] || char)
        .join(" "),
    decode: ({ input }) =>
      String(input)
        .split(/\s+/)
        .filter(Boolean)
        .map((chunk) => tapirDecodeMap[chunk] || chunk)
        .join(""),
  },
  vigenere: {
    label: "Vigenere",
    help: "Polyalphabetische Verschluesselung mit Buchstaben-Schluessel.",
    dirs: 3,
    keyLabel: "Schluessel",
    keyDefault: "CACHE",
    encode: ({ input, key }) =>
      vigenereTransform(input, requireKey(key), "encode"),
    decode: ({ input, key }) =>
      vigenereTransform(input, requireKey(key), "decode"),
  },
};

const unsupportedMethods = [];

const methodOrder = [
  "ascii",
  "atomtom",
  "baudot",
  "base64",
  "beatnik",
  "bcd",
  "bifid",
  "binaer",
  "brainfuck",
  "buchstabenhaeufigkeit",
  "buchstabenwert",
  "caesar",
  "cow",
  "decabit",
  "foursquare",
  "handy",
  "klopfcode",
  "koordschnitt",
  "morse",
  "murray",
  "okto3",
  "ook",
  "otp",
  "pocket",
  "pixel",
  "playfair",
  "primzahlenalphabet",
  "ragbaby",
  "roman",
  "rot13",
  "rot18",
  "rot47",
  "rot5",
  "scrabble",
  "skytale",
  "tapir",
  "vigenere",
];

const populateMethodSelect = () => {
  if (!methodSelect) {
    return;
  }
  methodSelect.innerHTML = '<option value="">- bitte waehlen -</option>';
  methodOrder.forEach((methodKey) => {
    const option = document.createElement("option");
    option.value = methodKey;
    option.textContent = methods[methodKey].label;
    methodSelect.append(option);
  });
};

const renderMethodList = () => {
  if (!methodList) {
    return;
  }
  const items = [
    ...methodOrder.map((methodKey) => ({
      label: methods[methodKey].label,
      available: true,
      key: methodKey,
    })),
    ...unsupportedMethods.map((label) => ({
      label,
      available: false,
    })),
  ];
  methodList.innerHTML = items
    .map(
      (item) => `
        <button
          type="button"
          class="gc-tools-method-chip${item.available ? "" : " is-muted"}"
          ${item.available ? `data-method="${item.key}"` : "disabled"}
        >
          ${item.label}
        </button>
      `,
    )
    .join("");
};

let restoredExtraValues = null;

const readExtraValues = () => {
  if (!extraWrap || extraWrap.classList.contains("hidden")) {
    return {};
  }
  const values = {};
  extraWrap.querySelectorAll("[name]").forEach((field) => {
    if (
      !(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)
    ) {
      return;
    }
    if (
      field instanceof HTMLInputElement &&
      (field.type === "radio" || field.type === "checkbox") &&
      !field.checked
    ) {
      return;
    }
    values[field.name] = field.value;
  });
  return values;
};

const renderExtraOptions = (method, values = {}) => {
  if (!method.extraOptions?.length) {
    extraWrap.classList.add("hidden");
    extraWrap.innerHTML = "";
    return;
  }

  extraWrap.classList.remove("hidden");
  extraWrap.innerHTML = method.extraOptions
    .map((option) => {
      const currentValue =
        values[option.name] ??
        option.defaultValue ??
        option.choices[0]?.value ??
        "";
      const inputs = option.choices
        .map((choice, index) => {
          const id = `gc-tools-extra-${option.name}-${choice.value}-${index}`;
          return `
            <label class="form-check form-check-inline gc-tools-extra-choice" for="${id}">
              <input
                class="form-check-input"
                type="radio"
                name="${option.name}"
                id="${id}"
                value="${choice.value}"
                ${choice.value === currentValue ? "checked" : ""}
              />
              <span class="form-check-label">${choice.label}</span>
            </label>
          `;
        })
        .join("");
      return `
        <div class="gc-tools-extra-group">
          <span class="gc-tools-extra-label">${option.label}</span>
          <div class="gc-tools-extra-options">${inputs}</div>
        </div>
      `;
    })
    .join("");
};

const saveState = () => {
  const payload = {
    method: methodSelect?.value || "",
    input: inputField?.value || "",
    output: outputField?.value || "",
    key: keyField?.value || "",
    extras: readExtraValues(),
  };
  localStorage.setItem(GC_STORAGE_KEY, JSON.stringify(payload));
};

const restoreState = () => {
  const raw = localStorage.getItem(GC_STORAGE_KEY);
  if (!raw) {
    return;
  }
  try {
    const payload = JSON.parse(raw);
    if (methodSelect && typeof payload.method === "string") {
      methodSelect.value = payload.method;
    }
    if (inputField && typeof payload.input === "string") {
      inputField.value = payload.input;
    }
    if (outputField && typeof payload.output === "string") {
      outputField.value = payload.output;
    }
    if (keyField && typeof payload.key === "string") {
      keyField.value = payload.key;
    }
    if (payload.extras && typeof payload.extras === "object") {
      restoredExtraValues = payload.extras;
    }
  } catch (error) {
    localStorage.removeItem(GC_STORAGE_KEY);
  }
};

const getSelectedMethod = () => methods[methodSelect?.value || ""] || null;

const updateMethodUi = () => {
  const method = getSelectedMethod();
  if (!method) {
    inputLabel.textContent = "Eingabe";
    outputLabel.textContent = "Ausgabe";
    helpTitle.textContent = "Hilfe";
    helpText.textContent =
      "Eine Sammlung von Encodern, Decodern und Umwandlungstools fuer Geocacher.";
    keyWrap.classList.add("hidden");
    extraWrap.classList.add("hidden");
    extraWrap.innerHTML = "";
    encodeButton.classList.add("hidden");
    decodeButton.classList.add("hidden");
    setMessage("Methode auswaehlen.", "neutral");
    return;
  }

  inputLabel.textContent = method.inputLabel || "Eingabe";
  outputLabel.textContent = method.outputLabel || "Ausgabe";
  helpTitle.textContent = method.label;
  helpText.textContent = method.help;

  if (method.keyLabel) {
    keyWrap.classList.remove("hidden");
    keyLabel.textContent = method.keyLabel;
    if (!keyField.value && method.keyDefault) {
      keyField.value = method.keyDefault;
    }
  } else {
    keyWrap.classList.add("hidden");
    keyField.value = "";
  }

  renderExtraOptions(method, restoredExtraValues || readExtraValues());
  restoredExtraValues = null;

  encodeButton.classList.toggle(
    "hidden",
    method.dirs !== 1 && method.dirs !== 3,
  );
  decodeButton.classList.toggle(
    "hidden",
    method.dirs !== 2 && method.dirs !== 3,
  );
  setMessage(`${method.label} bereit.`, "neutral");
};

const execute = async (direction) => {
  const method = getSelectedMethod();
  if (!method) {
    setMessage("Bitte zuerst eine Methode waehlen.", "warning");
    return;
  }
  const handler = method[direction];
  if (typeof handler !== "function") {
    setMessage(
      `Fuer ${method.label} ist ${direction} nicht verfuegbar.`,
      "warning",
    );
    return;
  }
  try {
    const sourceValue =
      direction === "encode" ? inputField.value : outputField.value;
    const result = await handler({
      input: sourceValue,
      key: keyField.value,
      output: direction === "encode" ? outputField.value : inputField.value,
      extras: readExtraValues(),
    });
    const payload =
      result && typeof result === "object" && "value" in result
        ? result
        : { value: result, message: "" };
    if (direction === "encode") {
      outputField.value = String(payload.value ?? "");
    } else {
      inputField.value = String(payload.value ?? "");
    }
    saveState();
    if (payload.message) {
      setMessage(payload.message, "warning");
    } else {
      setMessage(
        `${method.label} erfolgreich ${direction === "encode" ? "encodiert" : "decodiert"}.`,
        "success",
      );
    }
  } catch (error) {
    setMessage(
      error instanceof Error ? error.message : "Unbekannter Fehler.",
      "error",
    );
  }
};

applyTheme(getPreferredTheme());

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

populateMethodSelect();
renderMethodList();
restoreState();
updateMethodUi();

if (methodSelect) {
  methodSelect.addEventListener("change", () => {
    updateMethodUi();
    saveState();
  });
}

[inputField, outputField, keyField].forEach((field) => {
  field?.addEventListener("input", saveState);
});

extraWrap?.addEventListener("change", saveState);

encodeButton?.addEventListener("click", () => {
  void execute("encode");
});
decodeButton?.addEventListener("click", () => {
  void execute("decode");
});

swapButton?.addEventListener("click", () => {
  const input = inputField.value;
  inputField.value = outputField.value;
  outputField.value = input;
  saveState();
  setMessage("Eingabe und Ausgabe wurden vertauscht.", "neutral");
});

methodList?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const nextMethod = target.dataset.method;
  if (!nextMethod || !methods[nextMethod]) {
    return;
  }
  methodSelect.value = nextMethod;
  updateMethodUi();
  saveState();
});

form?.addEventListener("submit", (event) => {
  event.preventDefault();
});
