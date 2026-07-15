/* =========================================================
   Smartwatch Watchface
   Runde offene Becher mit indigo/weißen Kugeln

   p5.js:
   - Canvas
   - Zeichnung
   - Animation

   Matter.js:
   - Physik
   - Gravitation
   - Kollisionen
   - Kugeln
   - Behälterwände
========================================================= */


/* =========================================================
   Matter.js Kurzschreibweisen
========================================================= */

const Engine = Matter.Engine;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Composite = Matter.Composite;


/* =========================================================
   Farbpalette

   Verwendet werden:
   - Schwarz
   - Dunkelgrau
   - Warmgrau
   - Indigo
   - Weiß
========================================================= */

const COLOR_BLACK = "#000000";
const COLOR_DARK_GRAY = "#1A1A1A";

// Sanduhr-Gefäß: warmes Grau RGB [184, 179, 176]
const COLOR_WARM_GRAY = "rgb(184, 179, 176)";

// Kugelfarben
const COLOR_INDIGO = "rgb(110, 115, 255)";
const COLOR_WHITE = "#FFFFFF";


/* =========================================================
   Globale Variablen
========================================================= */

let engine;
let world;

const WATCH_SIZE = 960;
const CENTER_X = WATCH_SIZE / 2;
const CENTER_Y = WATCH_SIZE / 2;

/*
  Skalierungsfaktor
  ------------------
  Der Sketch wurde ursprünglich für einen 420px-Canvas gebaut.
  Alle festen Pixelwerte (Radien, Abstände, Wandstärken, ...)
  sind auf diese 420px kalibriert. Damit sie mit dem jetzt
  größeren Canvas (WATCH_SIZE) mitwachsen, werden sie mit SCALE
  multipliziert statt weiter feste Pixelzahlen zu benutzen.

  Willst du den Sketch nochmal auf eine andere Canvas-Größe
  anpassen: nur WATCH_SIZE ändern, SCALE passt sich automatisch an.
*/
const ORIGINAL_SIZE = 420;
const SCALE = WATCH_SIZE / ORIGINAL_SIZE;

let particles = [];

// zählt die Kugeln für den Farbwechsel
let colorCounter = 0;

let containerWalls = [];
let wallSegments = [];

let currentAngle = 0;
let startAngle = 0;
let targetAngle = 0;

let rotating = false;
let rotationStartTime = 0;
let rotationDuration = 1700;

let lastSpawnTime = 0;
let spawnInterval = 1000;

let particleCounter = 0;

// 10 Kugeln pro Zyklus
// 2 Kugeln pro Sekunde × 5 Sekunden = 10 Kugeln
let maxParticles = 10;

// Pro Sekunde fallen 2 Kugeln
let particlesPerSecond = 2;

let cycle = 0;

let ground;
let leftBound;
let rightBound;


/* =========================================================
   p5.js Setup
========================================================= */

function setup() {
  createCanvas(WATCH_SIZE, WATCH_SIZE);
  pixelDensity(2);

  engine = Engine.create();
  world = engine.world;

  world.gravity.x = 0;
  // Gravitation ebenfalls skaliert, damit die Kugeln im größeren
  // Canvas relativ genauso schnell fallen wie ursprünglich bei 420px.
  world.gravity.y = 1.25 * SCALE;

  createSmartwatchBounds();
  createRoundedHourglassContainer();

  lastSpawnTime = millis();
}


/* =========================================================
   p5.js Draw Loop
========================================================= */

function draw() {
  background(COLOR_BLACK);

  updateRotation();
  updateContainerWalls();

  spawnParticlesEverySecond();

  Engine.update(engine, 1000 / 60);

  updateParticles();

  drawContainerWalls();
  drawParticles();
}


/* =========================================================
   Unsichtbare physikalische Smartwatch-Grenzen
========================================================= */

function createSmartwatchBounds() {
  // Dicke der unsichtbaren Wände. Die Körper selbst liegen zur Hälfte
  // außerhalb des Canvas – wichtig ist nur, dass ihre Kollisionsfläche
  // (die "Innenseite") exakt an der echten Canvas-Kante liegt, statt
  // wie vorher mit 24px Abstand nach innen versetzt zu sein.
  const wallThickness = 20 * SCALE;
  const halfWall = wallThickness / 2;

  // Boden: Oberkante genau bei y = height (untere Canvas-Kante)
  ground = Bodies.rectangle(
    width / 2,
    height + halfWall,
    width,
    wallThickness,
    {
      isStatic: true,
      friction: 0.8,
      restitution: 0.05
    }
  );

  // linke unsichtbare Wand: Innenkante genau bei x = 0
  leftBound = Bodies.rectangle(
    -halfWall,
    height / 2,
    wallThickness,
    height,
    {
      isStatic: true
    }
  );

  // rechte unsichtbare Wand: Innenkante genau bei x = width
  rightBound = Bodies.rectangle(
    width + halfWall,
    height / 2,
    wallThickness,
    height,
    {
      isStatic: true
    }
  );

  World.add(world, [ground, leftBound, rightBound]);
}


/* =========================================================
   Runde offene Becher

   Die Gefäße sind kleiner,
   die Kugeln sind größer,
   dadurch wirken die Becher voller.

   Matter.js kann keine echte gekrümmte Wand simulieren.
   Deshalb bestehen die runden Becher aus vielen kleinen
   geraden Rechtecksegmenten.
========================================================= */

function createRoundedHourglassContainer() {
  wallSegments = [];

  // kleiner Gefäßradius
  const radius = 72 * SCALE;

  // Abstand zwischen oberem und unterem Becher
  const gap = 22 * SCALE;

  // Position des oberen Bechers
  const cupCenterY = -radius - gap / 2;

  /*
    Winkelbereich:
    225° bis -45° erzeugt eine runde Schale,
    die nach oben geöffnet ist.
  */
  const startDeg = 225;
  const endDeg = -45;
  const segmentCount = 30;

  let topPoints = [];

  for (let i = 0; i <= segmentCount; i++) {
    let t = i / segmentCount;

    let deg = lerp(startDeg, endDeg, t);
    let angle = radians(deg);

    let x = cos(angle) * radius;
    let y = cupCenterY + sin(angle) * radius;

    topPoints.push({ x: x, y: y });
  }

  // Oberen und gespiegelten unteren Becher erzeugen
  for (let i = 0; i < topPoints.length - 1; i++) {
    let a = topPoints[i];
    let b = topPoints[i + 1];

    // oberes Gefäß
    addWallSegment(a, b);

    // unteres gespiegeltes Gefäß
    addWallSegment(
      { x: a.x, y: -a.y },
      { x: b.x, y: -b.y }
    );
  }

  // Matter.js-Körper aus den Wandsegmenten machen
  for (let seg of wallSegments) {
    let length = dist(seg.a.x, seg.a.y, seg.b.x, seg.b.y);

    let wall = Bodies.rectangle(
      CENTER_X,
      CENTER_Y,
      length + 2 * SCALE,
      10 * SCALE,
      {
        isStatic: true,
        friction: 0.35,
        restitution: 0.03
      }
    );

    containerWalls.push({
      body: wall,
      a: seg.a,
      b: seg.b
    });

    World.add(world, wall);
  }

  updateContainerWalls();
}


function addWallSegment(a, b) {
  wallSegments.push({
    a: { x: a.x, y: a.y },
    b: { x: b.x, y: b.y }
  });
}


/* =========================================================
   Wände rotieren und Matter.js-Körper aktualisieren
========================================================= */

function updateContainerWalls() {
  for (let wall of containerWalls) {
    let p1 = transformPoint(wall.a, currentAngle);
    let p2 = transformPoint(wall.b, currentAngle);

    let midX = (p1.x + p2.x) / 2;
    let midY = (p1.y + p2.y) / 2;

    let angle = atan2(p2.y - p1.y, p2.x - p1.x);

    Body.setPosition(wall.body, {
      x: midX,
      y: midY
    });

    Body.setAngle(wall.body, angle);
  }
}


function transformPoint(p, angle) {
  let c = cos(angle);
  let s = sin(angle);

  return {
    x: CENTER_X + p.x * c - p.y * s,
    y: CENTER_Y + p.x * s + p.y * c
  };
}


/* =========================================================
   Jede Sekunde zwei Kugeln erzeugen

   Ablauf:
   Sekunde 1: 2 Kugeln
   Sekunde 2: 2 Kugeln
   Sekunde 3: 2 Kugeln
   Sekunde 4: 2 Kugeln
   Sekunde 5: 2 Kugeln

   Danach Rotation.
========================================================= */

function spawnParticlesEverySecond() {
  if (rotating) return;

  let now = millis();

  if (now - lastSpawnTime >= spawnInterval) {
    let remainingParticles = maxParticles - particleCounter;

    // Pro Sekunde 2 Kugeln,
    // aber nie mehr als 10 pro Zyklus
    let amountToSpawn = min(particlesPerSecond, remainingParticles);

    for (let i = 0; i < amountToSpawn; i++) {
      createCircleParticle(i, amountToSpawn);
      particleCounter++;
    }

    lastSpawnTime = now;

    if (particleCounter >= maxParticles) {
      startRotation();
    }
  }
}


/* =========================================================
   Größere Kugeln mit stärkerer Größenvariation

   random(8, 19) * SCALE:
   kleinere und deutlich größere Kugeln gemischt,
   proportional zur Canvas-Größe
========================================================= */

function createCircleParticle(indexInSpawn, totalInSpawn) {
  // stärkere Größenvariation
  let radius = random(8, 19) * SCALE;

  /*
    Wenn zwei Kugeln gleichzeitig fallen,
    starten sie leicht nebeneinander,
    damit sie nicht exakt übereinander liegen.
  */
  let spacing = 28 * SCALE;
  let offset = (indexInSpawn - (totalInSpawn - 1) / 2) * spacing;

  let x = CENTER_X + offset + random(-6, 6) * SCALE;
  let y = 35 * SCALE;

  let circleParticle = Bodies.circle(
    x,
    y,
    radius,
    {
      friction: 0.25,
      frictionAir: 0.01,
      restitution: 0.08,
      density: 0.0025
    }
  );

  let particleColor;

  // Farben wechseln sich ab:
  // 0 = Indigo, 1 = Weiß, 2 = Indigo, 3 = Weiß ...
  if (colorCounter % 2 === 0) {
    particleColor = {
      r: 110,
      g: 115,
      b: 255
    };
  } else {
    particleColor = {
      r: 255,
      g: 255,
      b: 255
    };
  }

  colorCounter++;

  particles.push({
    body: circleParticle,
    radius: radius,
    alpha: 255,
    fading: false,
    color: particleColor
  });

  World.add(world, circleParticle);
}


/* =========================================================
   180° Rotation
========================================================= */

function startRotation() {
  rotating = true;

  rotationStartTime = millis();

  startAngle = currentAngle;
  targetAngle = currentAngle + PI;

  particleCounter = 0;

  /*
    Wenn jeder neue Zyklus wieder mit Indigo starten soll,
    diese Zeile aktivieren:

    colorCounter = 0;

    Aktuell läuft der Farbwechsel über alle Zyklen weiter.
  */
}


/* =========================================================
   Rotation aktualisieren
========================================================= */

function updateRotation() {
  if (!rotating) return;

  let elapsed = millis() - rotationStartTime;
  let t = constrain(elapsed / rotationDuration, 0, 1);

  t = easeInOutCubic(t);

  currentAngle = lerp(startAngle, targetAngle, t);

  if (elapsed >= rotationDuration) {
    currentAngle = targetAngle;
    rotating = false;
    cycle++;
    lastSpawnTime = millis();
  }
}


function easeInOutCubic(t) {
  if (t < 0.5) {
    return 4 * t * t * t;
  } else {
    return 1 - pow(-2 * t + 2, 3) / 2;
  }
}


/* =========================================================
   Kugeln am unteren Rand langsam verschwinden lassen
========================================================= */

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    let pos = p.body.position;

    // Wenn die Kugeln unten angekommen sind,
    // beginnen sie langsam auszublenden.
    if (pos.y > height - 62 * SCALE) {
      p.fading = true;
    }

    if (p.fading) {
      p.alpha -= 3;
    }

    if (p.alpha <= 0 || pos.y > height + 100 * SCALE) {
      Composite.remove(world, p.body);
      particles.splice(i, 1);
    }
  }
}


/* =========================================================
   Gefäße zeichnen

   Warmgrau:
   RGB [184, 179, 176]
========================================================= */

function drawContainerWalls() {
  push();

  stroke(184, 179, 176);
  strokeWeight(8 * SCALE);
  strokeCap(ROUND);
  noFill();

  for (let wall of containerWalls) {
    let p1 = transformPoint(wall.a, currentAngle);
    let p2 = transformPoint(wall.b, currentAngle);

    line(p1.x, p1.y, p2.x, p2.y);
  }

  pop();
}


/* =========================================================
   Kugeln zeichnen

   Abwechselnd:
   - Indigo RGB [110, 115, 255]
   - Weiß RGB [255, 255, 255]
========================================================= */

function drawParticles() {
  for (let p of particles) {
    let body = p.body;
    let pos = body.position;

    push();

    translate(pos.x, pos.y);

    noStroke();
    fill(p.color.r, p.color.g, p.color.b, p.alpha);
    circle(0, 0, p.radius * 2);

    pop();
  }
}