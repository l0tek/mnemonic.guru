import "./styles.scss";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

const pageLoader = document.getElementById("page-loader");

const revealPage = () => {
  document.body.classList.remove("is-loading");
  if (pageLoader) {
    pageLoader.classList.add("is-hidden");
    pageLoader.setAttribute("aria-hidden", "true");
  }
};

document.body.classList.add("is-loading");
if (document.readyState === "complete") {
  window.requestAnimationFrame(revealPage);
} else {
  window.addEventListener("load", revealPage, { once: true });
}

const STORAGE_KEY = "theme-preference";
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const themeToggleButton = document.getElementById("theme-toggle");

const getPreferredTheme = () => {
  const storedTheme = localStorage.getItem(STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }
  return prefersDark.matches ? "dark" : "light";
};

const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-bs-theme", theme);
  if (themeToggleButton) {
    const icon = theme === "dark" ? "\u2600\uFE0F" : "\u{1F319}";
    const nextLabel =
      theme === "dark" ? "Zu Lightmode wechseln" : "Zu Darkmode wechseln";
    themeToggleButton.innerHTML = `<span class="theme-icon" aria-hidden="true">${icon}</span>`;
    themeToggleButton.setAttribute("aria-label", nextLabel);
    themeToggleButton.setAttribute("aria-pressed", String(theme === "dark"));
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

const thinkerCanvas = document.getElementById("thinker-wireframe");
if (thinkerCanvas) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({
    canvas: thinkerCanvas,
    antialias: true,
    alpha: true,
  });
  const material = new THREE.MeshStandardMaterial({
    color: 0x9bdcff,
    transparent: true,
    opacity: 0.35,
    roughness: 0.45,
    metalness: 0.1,
  });
  const loader = new STLLoader();
  const baseRotation = new THREE.Euler(-Math.PI / 2, 0, Math.PI);
  let thinkerPivot;
  let thinkerMesh;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.position.set(0, 8, 150);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(80, 120, 140);
  scene.add(ambientLight, keyLight);

  const setWireframeColor = () => {
    const theme =
      document.documentElement.getAttribute("data-bs-theme") || "light";
    const wireColor = theme === "dark" ? 0x9bdcff : 0x163a5c;
    material.color.setHex(wireColor);
  };

  const resizeRenderer = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  loader.load(
    "/Thinker.stl",
    (geometry) => {
      geometry.center();
      geometry.computeBoundingSphere();
      const radius = geometry.boundingSphere?.radius || 1;
      const scale = 46 / radius;
      thinkerPivot = new THREE.Group();
      thinkerPivot.position.set(24, -2, -20);
      thinkerMesh = new THREE.Mesh(geometry, material);
      thinkerMesh.scale.setScalar(scale);
      thinkerMesh.rotation.copy(baseRotation);
      thinkerPivot.add(thinkerMesh);
      scene.add(thinkerPivot);
    },
    undefined,
    (error) => {
      console.error("Thinker STL konnte nicht geladen werden:", error);
    },
  );

  const themeObserver = new MutationObserver(() => {
    setWireframeColor();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-bs-theme"],
  });
  setWireframeColor();

  const animateThinker = () => {
    if (thinkerPivot) {
      thinkerPivot.rotation.y -= 0.0022;
    }
    renderer.render(scene, camera);
    window.requestAnimationFrame(animateThinker);
  };

  window.addEventListener("resize", resizeRenderer);
  animateThinker();
}

const canvas = document.getElementById("spiders");
if (canvas) {
  let width = 0;
  let height = 0;
  let ctx;
  let points = [];
  let animateHeader = true;
  const target = { x: 0, y: 0 };

  const initHeader = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    target.x = width / 2;
    target.y = height / 3;
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext("2d");
    points = [];

    for (let x = 0; x < width; x += width / 20) {
      for (let y = 0; y < height; y += height / 20) {
        const px = x + (Math.random() * width) / 20;
        const py = y + (Math.random() * height) / 20;
        points.push({
          x: px,
          y: py,
          originX: px,
          originY: py,
          active: 0,
          closest: [],
          circleActive: 0,
          shiftStartX: px,
          shiftStartY: py,
          shiftEndX: px,
          shiftEndY: py,
          shiftStartTime: performance.now(),
          shiftDuration: 1200,
        });
      }
    }

    for (let i = 0; i < points.length; i += 1) {
      const closest = [];
      const p1 = points[i];
      for (let j = 0; j < points.length; j += 1) {
        const p2 = points[j];
        if (p1 === p2) {
          continue;
        }
        if (closest.length < 5) {
          closest.push(p2);
          continue;
        }
        for (let k = 0; k < 5; k += 1) {
          if (getDistance(p1, p2) < getDistance(p1, closest[k])) {
            closest[k] = p2;
            break;
          }
        }
      }
      p1.closest = closest;
      p1.radius = 2 + Math.random() * 2;
    }

    for (let i = 0; i < points.length; i += 1) {
      startShift(points[i], performance.now());
    }
  };

  const addListeners = () => {
    if (!("ontouchstart" in window)) {
      window.addEventListener("mousemove", mouseMove);
    }
    window.addEventListener("scroll", scrollCheck);
    window.addEventListener("resize", resize);
  };

  const mouseMove = (event) => {
    if (event.pageX || event.pageY) {
      target.x = event.pageX;
      target.y = event.pageY;
      return;
    }
    target.x =
      event.clientX +
      document.body.scrollLeft +
      document.documentElement.scrollLeft;
    target.y =
      event.clientY +
      document.body.scrollTop +
      document.documentElement.scrollTop;
  };

  const scrollCheck = () => {
    animateHeader = window.scrollY <= height;
  };

  const resize = () => {
    initHeader();
  };

  const startShift = (point, now) => {
    point.shiftStartX = point.x;
    point.shiftStartY = point.y;
    point.shiftEndX = point.originX - 50 + Math.random() * 100;
    point.shiftEndY = point.originY - 50 + Math.random() * 100;
    point.shiftStartTime = now;
    point.shiftDuration = 1000 + Math.random() * 1000;
  };

  const updateShift = (point, now) => {
    const elapsed = now - point.shiftStartTime;
    let t = elapsed / point.shiftDuration;
    if (t >= 1) {
      point.x = point.shiftEndX;
      point.y = point.shiftEndY;
      startShift(point, now);
      t = 0;
    }
    point.x = point.shiftStartX + (point.shiftEndX - point.shiftStartX) * t;
    point.y = point.shiftStartY + (point.shiftEndY - point.shiftStartY) * t;
  };

  const drawLines = (point) => {
    if (!point.active) {
      return;
    }
    for (let i = 0; i < point.closest.length; i += 1) {
      const connected = point.closest[i];
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(connected.x, connected.y);
      ctx.strokeStyle = `rgba(255,255,255,${point.active})`;
      ctx.stroke();
    }
  };

  const drawCircle = (point) => {
    if (!point.circleActive) {
      return;
    }
    ctx.beginPath();
    ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2, false);
    ctx.fillStyle = `rgba(255,255,255,${point.circleActive})`;
    ctx.fill();
  };

  const animate = () => {
    const now = performance.now();
    if (animateHeader) {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < points.length; i += 1) {
        const point = points[i];
        updateShift(point, now);
        const distance = Math.abs(getDistance(target, point));
        if (distance < 4000) {
          point.active = 0.3;
          point.circleActive = 0.6;
        } else if (distance < 20000) {
          point.active = 0.1;
          point.circleActive = 0.3;
        } else if (distance < 40000) {
          point.active = 0.02;
          point.circleActive = 0.1;
        } else {
          point.active = 0;
          point.circleActive = 0;
        }
        drawLines(point);
        drawCircle(point);
      }
    }
    window.requestAnimationFrame(animate);
  };

  const getDistance = (p1, p2) => {
    return (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
  };

  initHeader();
  addListeners();
  animate();
}

const latestWorksGrid = document.getElementById("latest-works-grid");
const API_URL = "https://www.mnemonic.guru/api/index.php";
const IMAGE_PATTERN = /\.(jpg|jpeg|png|gif|webp)$/i;
const teaserCategories = [
  {
    label: "Fractals",
    requestUrl: `${API_URL}?latest=1`,
    imageBase: "https://mnemonic.guru/img/fractals/",
    pageUrl: "/fraktale.html",
  },
  {
    label: "Digital",
    requestUrl: `${API_URL}?digital=1&latest=1`,
    imageBase: "https://mnemonic.guru/img/digital/",
    pageUrl: "/digitalart.html",
  },
  {
    label: "Fotos",
    requestUrl: `${API_URL}?fotos=1&latest=1`,
    imageBase: "https://mnemonic.guru/img/fotos/",
    pageUrl: "/fotos.html",
  },
];

const renderLatestCard = (category, fileName) => {
  if (!latestWorksGrid) {
    return;
  }
  const card = document.createElement("article");
  card.className = "latest-work-card";

  const link = document.createElement("a");
  link.href = category.pageUrl;
  link.className = "latest-work-link";

  if (fileName) {
    const image = document.createElement("img");
    image.className = "latest-work-image";
    image.src = `${category.imageBase}${encodeURIComponent(fileName)}`;
    image.alt = `${category.label} - ${fileName}`;
    image.loading = "lazy";
    link.appendChild(image);
  }

  const meta = document.createElement("div");
  meta.className = "latest-work-meta";
  meta.innerHTML = `<span>${category.label}</span><strong>${fileName || "Keine Bilder"}</strong>`;

  link.appendChild(meta);
  card.appendChild(link);
  latestWorksGrid.appendChild(card);
};

const loadLatestWorks = async () => {
  if (!latestWorksGrid) {
    return;
  }
  latestWorksGrid.innerHTML = "";
  for (let i = 0; i < teaserCategories.length; i += 1) {
    const category = teaserCategories[i];
    try {
      const response = await fetch(category.requestUrl, { cache: "no-store" });
      const json = await response.json();
      if (!Array.isArray(json)) {
        renderLatestCard(category, "");
        continue;
      }
      const fileName = json.find((entry) => IMAGE_PATTERN.test(entry)) || "";
      renderLatestCard(category, fileName);
    } catch (error) {
      console.error(`Latest works failed (${category.label}):`, error);
      renderLatestCard(category, "");
    }
  }
};

loadLatestWorks();
