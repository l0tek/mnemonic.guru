class Canvas {
  /**
               * Canvas constructor
               * @param  {Mixed} canvas Canvas element or CSS3 string
               */
  constructor(canvas) {
    this.canvas =
    typeof canvas === "string" ? document.querySelector(canvas) : canvas;
    this.ctx = this.canvas.getContext("2d");
  }

  /**
     * Resize the canvas
     * @param  {Number} w 	Width in px
     * @param  {Number} h 	Height in px
     * @return {Object}   	Instance  reference
     */
  resize(w, h) {
    this.save();

    this.canvas.width = this.width = w;
    this.canvas.height = this.height = h;

    this.rects = this.canvas.getBoundingClientRect();

    this.load();

    return this;
  }

  bg(color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
     * Save the canvas data
     * @param  {Boolean} data
     * @return {Object} image data or instance reference
     */
  save(data) {
    this.data = this.ctx.getImageData(
    0,
    0,
    this.canvas.width,
    this.canvas.height);


    return data ? data : this;
  }

  /**
     * Load the canvas data
     * @param  {Boolean} data
     * @return {Object} image data or instance reference
     */
  load(data) {
    this.ctx.putImageData(this.data, 0, 0);

    return data ? data : this;
  }

  /**
     * Clear the canvas
     * @return {Object} Instance reference
     */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    return this;
  }}


class Starfield {
  constructor(canvas, options) {
    const defaults = {
      starColor: "rgba(255,255,255,1)",
      bgColor: "rgba(0,0,0,1)",
      speed: 3,
      quantity: 1000,
      ratio: 256 };

    this.canvas = canvas;
    this.ctx = canvas.ctx;
    this.options = Object.assign({}, defaults, options);

    this.init();
  }

  // Resize the canvas
  resizer() {

    var oldStar = this.star;
    var initW = this.canvas.width;
    var initH = this.canvas.height;

    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.x = Math.round(this.w / 2);
    this.y = Math.round(this.h / 2);

    // Check if the device is in portrait orientation
    this.portrait = this.w < this.h;

    // Get the ratio of the old height to the new height
    var ratX = this.w / initW;
    var ratY = this.h / initH;

    this.canvas.resize(this.w, this.h);

    // Recalculate the position of each star proportionally to new w and h
    for (var i = 0; i < this.n; i++) {
      this.star[i][0] = oldStar[i][0] * ratX;
      this.star[i][1] = oldStar[i][1] * ratY;

      this.star[i][3] =
      this.x + this.star[i][0] / this.star[i][2] * this.star_ratio;
      this.star[i][4] =
      this.y + this.star[i][1] / this.star[i][2] * this.star_ratio;
    }

  }

  init() {
    this.initialised = false;
    this.running = false;
    this.flag = true;
    this.test = true;
    this.w = 0;
    this.h = 0;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.n = this.options.quantity;
    this.star_color_ratio = 0;
    this.star_x_save = 0;
    this.star_y_save = 0;
    this.star_ratio = this.options.ratio;
    this.star_speed = this.options.speed;
    this.star = new Array(this.n);
    this.color = this.options.starColor;
    this.opacity = 0.1;

    this.cursor_x = 0;
    this.cursor_y = 0;
    this.mouse_x = 0;
    this.mouse_y = 0;

    // Check for device orientation support
    this.desktop = !navigator.userAgent.match(
    /(iPhone|iPod|iPad|Android|BlackBerry|BB10|IEMobile)/);

    this.orientationSupport = window.DeviceOrientationEvent !== undefined;
    this.portrait = null;

    this.canvas.resize(window.innerWidth, window.innerHeight);

    this.w = this.canvas.width;
    this.h = this.canvas.height;

    this.initW = this.w;
    this.initH = this.h;

    this.portrait = this.w < this.h;

    // Create initial star array and canvas context

    this.x = Math.round(this.w / 2);
    this.y = Math.round(this.h / 2);
    this.z = (this.w + this.h) / 2;
    this.star_color_ratio = 1 / this.z;
    this.cursor_x = this.x;
    this.cursor_y = this.y;

    this.initStars();

    // Set the colors
    this.ctx.fillStyle = this.options.bgColor;
    this.ctx.strokeStyle = this.options.starColor;

    this.events = {
      loop: this.loop.bind(this),
      resizer: this.resizer.bind(this) };


    window.addEventListener(
    "resize",
    this.events.resizer,
    false);


    window.addEventListener(
    "orientationchange",
    this.events.resizer,
    false);

  }

  initStars() {
    for (var i = 0; i < this.n; i++) {
      this.star[i] = new Array(5);

      this.star[i][0] = Math.random() * this.w * 2 - this.x * 2;
      this.star[i][1] = Math.random() * this.h * 2 - this.y * 2;
      this.star[i][2] = Math.round(Math.random() * this.z);
      this.star[i][3] = 0;
      this.star[i][4] = 0;
    }
  }

  animate() {
    this.canvas.bg(this.options.bgColor);

    this.ctx.strokeStyle = this.options.starColor;

    this.mouse_x = this.cursor_x - this.x;
    this.mouse_y = this.cursor_y - this.y;


    for (var i = 0; i < this.n; i++) {
      const star = this.star[i];
      this.test = true;
      this.star_x_save = star[3];
      this.star_y_save = star[4];
      // star[0] += this.mouse_x >> 4;

      // X coords
      if (star[0] > this.x << 1) {
        star[0] -= this.w << 1;
        this.test = false;
      }
      if (star[0] < -this.x << 1) {
        star[0] += this.w << 1;
        this.test = false;
      }

      // Y coords
      if (star[1] > this.y << 1) {
        star[1] -= this.h << 1;
        this.test = false;
      }
      if (star[1] < -this.y << 1) {
        star[1] += this.h << 1;
        this.test = false;
      }

      // Z coords
      star[2] -= this.star_speed;
      if (star[2] > this.z) {
        star[2] -= this.z;
        this.test = false;
      }
      if (star[2] < 0) {
        star[2] += this.z;
        this.test = false;
      }

      star[3] =
      this.x + star[0] / star[2] * this.star_ratio;
      star[4] =
      this.y + star[1] / star[2] * this.star_ratio;

      if (
      this.star_x_save > 0 &&
      this.star_x_save < this.w &&
      this.star_y_save > 0 &&
      this.star_y_save < this.h &&
      this.test)
      {
        this.ctx.lineWidth = (1 - this.star_color_ratio * star[2]) * 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.star_x_save, this.star_y_save);
        this.ctx.lineTo(star[3], star[4]);
        this.ctx.stroke();
        this.ctx.closePath();
      }
    }
  }

  loop() {
    this.animate();

    this.tick = window.requestAnimationFrame(this.events.loop);
  }

  stop() {
    window.cancelAnimationFrame(this.tick);

    this.running = false;
  }

  start() {
    if (!this.running) {
      this.running = true;
      this.loop();
    }

    return this;
  }}


/* GENERATES THE DTMF TONES */
class DtmfPlayer {
  constructor(audioContext) {
    this.oscillator1 = null;
    this.oscillator2 = null;
    this.audioContext = null;
    this.audioFile = null;
    this._baseUrl = '';

    if (audioContext) {
      this.audioContext = audioContext;
      return;
    }
    let contextClass =
    window.AudioContext ||
    window.webkitAudioContext ||
    window.mozAudioContext ||
    window.oAudioContext ||
    window.msAudioContext;


    if (contextClass) {
      this.audioContext = new contextClass();
    } else {
      this.audioFile = new Audio();
    }
  }

  set baseUrl(baseUrl) {
    this._baseUrl = baseUrl;
  }

  playTone(freq1, freq2) {
    this.stop();
    let gainNode = this.audioContext.createGain();
    gainNode.gain.value = .1;

    this.oscillator1 = this.audioContext.createOscillator();
    this.oscillator1.type = 'sine';
    this.oscillator1.frequency.value = freq1;
    this.oscillator1.connect(gainNode, 0, 0);
    gainNode.connect(this.audioContext.destination);

    this.oscillator2 = this.audioContext.createOscillator();
    this.oscillator2.type = 'sine';
    this.oscillator2.frequency.value = freq2;
    this.oscillator2.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    this.oscillator1.start(0);
    this.oscillator2.start(0);
  }

  play(key) {
    if (this.audioContext === null) {
      return this.playDtmfFallback(key);
    }
    switch (String(key)) {
      case '1':
        this.playTone(697, 1209);
        break;
      case '2':
        this.playTone(697, 1336);
        break;
      case '3':
        this.playTone(697, 1477);
        break;
      case '4':
        this.playTone(770, 1209);
        break;
      case '5':
        this.playTone(770, 1336);
        break;
      case '6':
        this.playTone(770, 1477);
        break;
      case '7':
        this.playTone(852, 1209);
        break;
      case '8':
        this.playTone(852, 1336);
        break;
      case '9':
        this.playTone(852, 1477);
        break;
      case '*':
        this.playTone(941, 1209);
        break;
      case '0':
        this.playTone(941, 1336);
        break;
      case '#':
        this.playTone(941, 1477);
        break;
      case 'A':
        this.playTone(697, 1633);
        break;
      case 'B':
        this.playTone(770, 1633);
        break;
      case 'C':
        this.playTone(852, 1633);
        break;
      case 'D':
        this.playTone(941, 1633);
        break;}

  }

  stop() {
    if (this.oscillator1 !== null) {
      this.oscillator1.disconnect();
    }
    if (this.oscillator2 !== null) {
      this.oscillator2.disconnect();
    }
    if (this.audioFile !== null) {
      this.stopFallback();
    }
  }

  playDtmfFallback(key) {
    switch (String(key)) {
      case '*':
        key = 'star';
        break;
      case '#':
        key = 'hash';
        break;}

    this.audioFile.removeEventListener('playing', this.onAudioFileplaying);
    this.audioFile.src = `${this._baseUrl}${key}.mp3`;
    this.audioFile.play();
  }

  stopFallback() {
    let audioFile = this.audioFile;
    if (audioFile.duration > 0 && !audioFile.paused) {
      audioFile.pause();
    } else {
      if (this.onAudioFileplaying === undefined) {
        this.onAudioFileplaying = () => {
          audioFile.pause();
        };
      }
      audioFile.addEventListener('playing', this.onAudioFileplaying);
    }
  }

  close() {
    if (this.audioContext !== null) {
      this.audioContext.close();
    }
  }}































































let dtmfPlayer = new DtmfPlayer();
const keypad = document.getElementById("keypad");
let numbers = [];

const audio = new Audio("https://assets.codepen.io/86186/14426_1460034574.mp3");
const excellent = new Audio("https://assets.codepen.io/86186/eaexcellent.mp3");
const secret1 = new Audio("https://assets.codepen.io/86186/sec1.mp3");
const wrong = new Audio("https://assets.codepen.io/86186/dialagain.mp3");
const secret2 = new Audio("https://assets.codepen.io/86186/secret2.mp3");

keypad.addEventListener("mousedown", function (e) {

  const key = e.target.closest("button");

  if (key) {
    const val = key.value;
    stop();

    if (val === "*") {
      keypad.children[11].classList.add("active");
      if (!running) {
        playAudio();
      }
    } else if (val === "∞") {
      keypad.children[9].classList.add("active");
      if (!running) {
        playAudio();
      }
    } else {
      numbers.push(parseInt(val, 10));
    }

    dtmfPlayer.play(val);
  }
});

keypad.addEventListener("mouseup", function (e) {
  dtmfPlayer.stop();

  keypad.children[11].classList.remove("active");
  keypad.children[9].classList.remove("active");
});


// STARFIELD
const CANVAS = new Canvas("#c").resize(window.innerWidth, window.innerHeight);
const FIELD = new Starfield(CANVAS, {
  speed: 2 }).
start();

let tunnel = false;

var c3 = document.getElementById('c'),
ctx3 = c3.getContext('2d'),
stars = [],
m = {},
r = 0;


// ELECTRIC EFFECT
const c = document.getElementById("c2");
c.width = window.innerWidth;
c.height = window.innerHeight;
const ctx = c.getContext("2d");
const center = {
  x: c.width / 2,
  y: -5 };

const minSegmentHeight = 5;
const max = c.width - 20;
const color = "hsl(199, 100%, 63%)";
let run = false,running = false;

ctx.globalCompositeOperation = "lighter";
ctx.lineWidth = 5;
ctx.strokeStyle = color;
ctx.shadowColor = color;
ctx.fillStyle = "hsla(0, 0%, 10%, 1.0)";
ctx.fillRect(0, 0, c.width, c.height);

function render() {
  ctx.shadowBlur = 0, ctx.globalCompositeOperation = "source-over", ctx.fillRect(0, 0, c.width, c.width), ctx.globalCompositeOperation = "lighter", ctx.shadowBlur = 15;
  let a = zap();
  ctx.beginPath();
  for (let b = 0; b < a.length; b++) ctx.lineTo(a[b].x, a[b].y);
  ctx.stroke(), run = requestAnimationFrame(render), running = !0;
}

function zap() {
  let a = max - center.y,
  b = [];
  b.push({
    x: center.x,
    y: center.y }),
  b.push({
    x: Math.random() * (c.width - 100) + 50,
    y: max + 50 * (Math.random() - .9) });

  for (let e = c.width / 5; a > minSegmentHeight;) {
    const c = [];
    for (let a = 0; a < b.length - 1; a++) {
      const d = b[a],
      f = b[a + 1],
      g = (d.x + f.x) / 2,
      h = g + (2 * Math.random() - 1) * e;
      c.push(d, {
        x: h,
        y: (d.y + f.y) / 2 });

    }
    c.push(b.pop()), b = c, e /= 2, a /= 2;
  }
  return b;
}

function stop() {
  audio.pause();
  wrong.pause();
  excellent.pause();
  secret1.pause();
  secret2.pause();
  cancelAnimationFrame(run);
  cancelAnimationFrame(tunnel);

  ctx3.clearRect(0, 0, c3.width, c3.height);


  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillRect(0, 0, c.width, c.width);
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowBlur = 15;

  FIELD.star_speed = 2;
  FIELD.start();

  running = false;
}

function playAudio() {
  if (numbers[0] === 6 && numbers[1] === 6 && numbers[2] === 6) {
    secret2.play();
  } else if (numbers[0] === 6 && numbers[1] === 9) {
    secret1.currentTime = 0;
    secret1.play();
  } else {
    if (numbers.length < 4 || numbers.length > 4) {
      wrong.currentTime = 0;
      wrong.volume = 0.3;
      wrong.play();
    } else {
      excellent.currentTime = 0;
      excellent.play();

      setTimeout(() => {
        FIELD.stop();
        renderTunnel();
        render();
        audio.volume = 0.3;
        audio.currentTime = 0;
        audio.play();
        FIELD.star_speed = 10;
      }, 2000);
    }
  }

  numbers = [];
}



c3.width = window.innerWidth;
c3.height = window.innerHeight;

m.x = null;
m.y = null;

ctx3.strokeStyle = '#fff';
ctx3.translate(0.5, 0.5);

// create stars
function createStars(n) {

  if (m.x == null) return;

  for (var i = 0; i < n; i++) {
    var shape = {
      x: m.x,
      y: m.y,
      r: 1,
      speed: 1,
      accel: 1.01,
      accel2: 0.001,
      angle: Math.random() * 360 };


    var vel = {
      x: 25 * Math.cos(shape.angle * Math.PI / 180),
      y: 25 * Math.sin(shape.angle * Math.PI / 180) };


    shape.x += vel.x;
    shape.y += vel.y;

    stars.push(shape);
  }
}

function renderTunnel() {
  createStars(20);

  var starfield = [];

  ctx3.clearRect(0, 0, c3.width, c3.height);

  r += 1;
  if (r < 360) {
    m = { x: c3.width / 2, y: c3.height / 2, angle: r };

    var targetAngle = m.angle * Math.PI / 180;

    m.x += 200 * Math.cos(targetAngle);
    m.y += 200 * Math.sin(targetAngle);
  } else {
    r = 0;
  }

  while (stars.length) {
    var star = stars.pop();

    var vel = {
      x: star.speed * Math.cos(star.angle * Math.PI / 180),
      y: star.speed * Math.sin(star.angle * Math.PI / 180) };


    ctx3.strokeStyle = `rgba(255,255,255,1.0)`;
    ctx3.beginPath();
    ctx3.moveTo(star.x, star.y);
    ctx3.lineTo(star.x + vel.x, star.y + vel.y);
    ctx3.closePath();
    ctx3.stroke();

    star.x += vel.x;
    star.y += vel.y;

    star.speed *= star.accel;

    star.accel += star.accel2;

    if (star.x < c3.width && star.x > 0 && star.y < c3.height && star.y > 0) {
      starfield.push(star);
    }
  }

  stars = starfield.slice(0).reverse();

  tunnel = requestAnimationFrame(renderTunnel);
}