// ====================== KONFIGURATION ======================
const SIZE = 960;

// Größen der Blasen
const SMALL_R  = 22;   // Sekunden
const MEDIUM_R = 32;   // Minuten
const LARGE_R  = 64;   // Stunden

// Aufstiegsgeschwindigkeit
const SMALL_SPEED  = 2.2;
const MEDIUM_SPEED = 1.4;
const LARGE_SPEED  = 0.9;

// ====================== ZUSTAND ======================
let risingBubbles = [];   // Blasen, die kontinuierlich aufsteigen
let fillBubbles   = [];   // Blasen im "Zeit anzeigen"-Modus
let popParticles  = [];   // Platz-Effekte

let lastSecond = -1;
let lastMinute = -1;
let lastHour   = -1;

let showTimeMode = false; // false = normaler Aufstiegsmodus, true = Zeit-Anzeige

// ====================== INTERAKTION (Status) ======================
const LONG_PRESS_MS = 450;   // ab dieser Dauer gilt es als Long Press

let pressStartTime = 0;
let isPressing = false;
let longPressTriggered = false;

// ====================== BLASEN-KLASSE ======================
class Bubble {
  constructor(x, y, r, speed, type) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.speed = speed;
    this.type = type; // 'small' | 'medium' | 'large'
    this.wobble = random(TWO_PI);
    this.wobbleSpeed = random(0.02, 0.05);
    this.driftAmp = random(0.5, 1.5);
    this.alpha = 255;
    this.popped = false;
    this.scale = 0;       // Einblend-Animation
    this.targetY = null;  // für Füll-Modus
    this.settled = false;

    // Platz-Animation
    this.popping = false;
    this.popScale = 1;
  }

  // löst das Platzen aus (statt sofort zu verschwinden)
  startPop() {
    if (this.popping) return;
    this.popping = true;
    spawnPop(this.x, this.y, this.r);
  }

  update() {
    if (this.scale < 1) this.scale = min(1, this.scale + 0.08);
    this.wobble += this.wobbleSpeed;

    // Platz-Animation läuft -> ausdehnen, ausblenden, dann tot
    if (this.popping) {
      this.popScale += 0.25;
      this.alpha -= 40;
      if (this.alpha <= 0) {
        this.alpha = 0;
        this.popped = true;
      }
      return;
    }

    if (this.targetY === null) {
      // Normaler Aufstieg
      this.y -= this.speed;
      this.x += sin(this.wobble) * this.driftAmp;

      // Oben angekommen -> Platz-Animation starten
      if (this.y - this.r <= 0) {
        this.startPop();
      }
    } else {
      // Füll-Modus: zur Zielposition steigen
      if (!this.settled) {
        let dy = this.targetY - this.y;
        this.y += dy * 0.08;
        this.x += sin(this.wobble) * this.driftAmp * 0.5;
        if (abs(dy) < 1) this.settled = true;
      } else {
        // sanftes Schweben
        this.x += sin(this.wobble) * 0.4;
        this.y += cos(this.wobble * 0.7) * 0.3;
      }
    }

    // x-Position innerhalb des Canvas halten
    this.x = constrain(this.x, this.r, width - this.r);
  }

  draw() {
    if (this.alpha <= 0) return; // unsichtbar -> gar nicht zeichnen

    push();
    let r = this.r * this.scale * this.popScale;

    // Einfacher weißer, gefüllter Punkt
    noStroke();
    fill(255, this.alpha);
    ellipse(this.x, this.y, r * 2);

    pop();
  }

  isDead() {
    return this.popped;
  }
}

// ====================== PLATZ-EFFEKT ======================
function spawnPop(x, y, r) {
  let count = floor(r / 2);
  for (let i = 0; i < count; i++) {
    let a = random(TWO_PI);
    let sp = random(1, 4);
    popParticles.push({
      x: x, y: y,
      vx: cos(a) * sp,
      vy: sin(a) * sp,
      life: 255,
      size: random(2, 6)
    });
  }
}

function updatePops() {
  for (let p of popParticles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.life -= 8;
  }
  // Partikel entfernen, wenn sie verblasst sind ODER den Canvas verlassen
  popParticles = popParticles.filter(p =>
    p.life > 0 &&
    p.x >= 0 && p.x <= width &&
    p.y >= 0 && p.y <= height
  );
}

function drawPops() {
  noStroke();
  for (let p of popParticles) {
    fill(255, p.life);
    ellipse(p.x, p.y, p.size);
  }
}

// ====================== SETUP ======================
function setup() {
  createCanvas(SIZE, SIZE);

  // Seiten-Hintergrund per JavaScript auf Schwarz setzen
  document.body.style.background = "#000";
  document.body.style.margin = "0";

  let now = new Date();
  lastSecond = now.getSeconds();
  lastMinute = now.getMinutes();
  lastHour   = now.getHours();
}

// ====================== DRAW ======================
function draw() {
  drawBackground();

  let now = new Date();
  let s = now.getSeconds();
  let m = now.getMinutes();
  let h = now.getHours();

  if (!showTimeMode) {
    handleRisingMode(s, m, h);
  } else {
    handleFillMode();
  }

  checkLongPress();   // prüft, ob gerade lang gedrückt wird

  updatePops();
  drawPops();
}

// ====================== HINTERGRUND ======================
function drawBackground() {
  background(0);
}

// ====================== AUFSTIEGSMODUS ======================
function handleRisingMode(s, m, h) {
  if (s !== lastSecond) {
    spawnRising('small');
    lastSecond = s;
  }
  if (m !== lastMinute) {
    spawnRising('medium');
    lastMinute = m;
  }
  if (h !== lastHour) {
    spawnRising('large');
    lastHour = h;
  }

  for (let b of risingBubbles) {
    b.update();
    b.draw();
  }
  risingBubbles = risingBubbles.filter(b => !b.isDead());
}

function spawnRising(type) {
  let r, speed;
  if (type === 'small')  { r = SMALL_R;  speed = SMALL_SPEED; }
  if (type === 'medium') { r = MEDIUM_R; speed = MEDIUM_SPEED; }
  if (type === 'large')  { r = LARGE_R;  speed = LARGE_SPEED; }
  let x = random(r, width - r);
  let y = height + r;
  risingBubbles.push(new Bubble(x, y, r, speed, type));
}

// ====================== FÜLL-/ZEITMODUS ======================
function handleFillMode() {
  for (let b of fillBubbles) {
    b.update();
    b.draw();
  }
}

function buildFillBubbles() {
  fillBubbles = [];
  let now = new Date();

  let h12 = now.getHours() % 12;
  if (h12 === 0) h12 = 12;
  let m = now.getMinutes();
  let s = now.getSeconds();

  placeRow(h12, LARGE_R, height - LARGE_R - 20, 'large');
  placeRow(m, MEDIUM_R, height * 0.45, 'medium');
  placeRow(s, SMALL_R, height * 0.12, 'small');
}

function placeRow(count, r, centerY, type) {
  if (count <= 0) return;
  let speed = type === 'small' ? SMALL_SPEED :
              type === 'medium' ? MEDIUM_SPEED : LARGE_SPEED;

  let perRow = max(1, floor((width - 40) / (r * 2 + 10)));
  let rows = ceil(count / perRow);

  for (let row = 0; row < rows; row++) {
    let inThisRow = min(perRow, count - row * perRow);
    let totalW = inThisRow * (r * 2 + 10);
    let startX = (width - totalW) / 2 + r + 5;
    let y = centerY + row * (r * 2 + 10) - (rows - 1) * (r + 5);

    for (let i = 0; i < inThisRow; i++) {
      let x = startX + i * (r * 2 + 10);
      let b = new Bubble(x, height + r + random(0, 200), r, speed, type);
      b.targetY = y;
      fillBubbles.push(b);
    }
  }
}

// ====================== INTERAKTION ======================

// Long-Press-Erkennung (wird in draw() aufgerufen)
function checkLongPress() {
  if (isPressing && !longPressTriggered) {
    if (millis() - pressStartTime >= LONG_PRESS_MS) {
      longPressTriggered = true;
      toggleMode();
    }
  }
}

// findet die oberste Blase unter dem Finger/Cursor und lässt sie platzen
function popBubbleAt(px, py) {
  let list = showTimeMode ? fillBubbles : risingBubbles;
  for (let i = list.length - 1; i >= 0; i--) {
    let b = list[i];
    if (b.popping) continue;
    let d = dist(px, py, b.x, b.y);
    if (d <= b.r) {
      b.startPop();
      if (showTimeMode) {
        fillBubbles.splice(i, 1);
        risingBubbles.push(b);
      }
      return true;
    }
  }
  return false;
}

function startPress(px, py) {
  isPressing = true;
  longPressTriggered = false;
  pressStartTime = millis();
}

function endPress(px, py) {
  if (!isPressing) return;
  isPressing = false;

  if (longPressTriggered) return; // war Long Press -> Modus schon gewechselt

  popBubbleAt(px, py);            // kurzer Tipp -> einzelne Blase platzen
}

// ---- Maus ----
function mousePressed() {
  startPress(mouseX, mouseY);
}
function mouseReleased() {
  endPress(mouseX, mouseY);
}

// ---- Touch ----
function touchStarted() {
  startPress(mouseX, mouseY);
  return false;
}
function touchEnded() {
  endPress(mouseX, mouseY);
  return false;
}

// ====================== MODUSWECHSEL ======================
function toggleMode() {
  if (!showTimeMode) {
    showTimeMode = true;
    buildFillBubbles();
  } else {
    for (let b of fillBubbles) {
      b.startPop();
      risingBubbles.push(b);
    }
    fillBubbles = [];
    showTimeMode = false;

    let now = new Date();
    lastSecond = now.getSeconds();
    lastMinute = now.getMinutes();
    lastHour   = now.getHours();
  }
}
