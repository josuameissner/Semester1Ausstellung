// Flüssigkeit Final

const { Engine, World, Bodies, Body } = Matter;

const CONFIG = {
  size: 960,

  color: '#3DD6F5',

  // Magnet
  attractionStrength: 3e-5,

  // Sekunden-Tropfen
  dropRadius: 20,
  dropSpawnRadius: 460,   // wo am Rand die Tropfen entstehen
  dropAbsorbDistance: 30, // Distanz zum Zentrum, ab der Tropfen "geschluckt" werden
  frictionAir: 0.20,

  // Blob
  blobPoints: 80,         // Anzahl der Punkte auf dem Blob-Rand (mehr = glatter)
  blobMinRadius: 40,      // Größe am Anfang der Minute
  blobMaxRadius: 400,     // Größe am Ende der Minute (Bildschirm füllen)
  blobPeakRadius: 500,
  blobShrinkRadius: 40,
  
  // Wellen-Bewegung des Blob-Rands
  waveAmplitude: 20,      // wie stark der Rand wellt
  waveSpeed: 0.6,         // Geschwindigkeit der Wellen
  waveFrequency: 5,       // wie viele Wellen gleichzeitig
  noiseScale: 0.8,        // Detailgrad des Perlin-Noise
  
  // Wachstum
  growthSmoothing: 0.08,  // wie weich der Blob wächst (höher = schneller)
  growthPerDrop: null,       // wird automatisch berechnet (siehe setup)
};


let engine;
let world;
let particles = [];
let lastSecond = -1;
let currentBlobRadius;     // aktueller, geglätteter Radius
let targetBlobRadius;      // Ziel-Radius je nach Sekunde
let noiseOffsetT = 0;

const W = CONFIG.size;
const H = CONFIG.size;
const CX = W / 2;
const CY = H / 2;


function setup() {
  createCanvas(W, H);

  engine = Engine.create();
  engine.gravity.x = 0;
  engine.gravity.y = 0;
  world = engine.world;

  currentBlobRadius = CONFIG.blobMinRadius;
  targetBlobRadius  = CONFIG.blobMinRadius;

  CONFIG.growthPerDrop = (CONFIG.blobMaxRadius - CONFIG.blobMinRadius) / 58;
}


function draw() {
  background(0);

  const sec = second();

  if (sec !== lastSecond) {
    if (sec === 0 && lastSecond !== -1) {
      resetBlob();
    } else if (sec >= 1) {
      spawnDrop(sec);
    }
    lastSecond = sec;
  }

  if (sec === 59) {
  targetBlobRadius = CONFIG.blobPeakRadius;
} else if (sec === 0) {
  targetBlobRadius = CONFIG.blobShrinkRadius;
}
  
  currentBlobRadius += (targetBlobRadius - currentBlobRadius) * CONFIG.growthSmoothing;

  applyMagneticForce();
  absorbParticles();
  Engine.update(engine, 1000 / 60);

  drawMarkers();
  drawBlob();
  drawParticles();

  noiseOffsetT += CONFIG.waveSpeed * 0.01;
}



function drawBlob() {
  push();
  fill(CONFIG.color);
  noStroke();

  beginShape();
  const points = CONFIG.blobPoints;
  const positions = [];

  for (let i = 0; i < points; i++) {
    const a = (i / points) * TWO_PI;

    const noiseVal = noise(
      cos(a) * CONFIG.noiseScale + noiseOffsetT,
      sin(a) * CONFIG.noiseScale + noiseOffsetT
    );
    const waveVal = sin(a * CONFIG.waveFrequency + noiseOffsetT * 4);

    const amp = CONFIG.waveAmplitude * (0.5 + currentBlobRadius / CONFIG.blobMaxRadius * 0.5);
    const r = currentBlobRadius + (noiseVal - 0.5) * amp * 2 + waveVal * amp * 0.3;

    const x = CX + cos(a) * r;
    const y = CY + sin(a) * r;
    positions.push({ x, y });
  }

  curveVertex(positions[points - 1].x, positions[points - 1].y);
  for (let i = 0; i < points; i++) {
    curveVertex(positions[i].x, positions[i].y);
  }
  curveVertex(positions[0].x, positions[0].y);
  curveVertex(positions[1].x, positions[1].y);

  endShape(CLOSE);
  pop();
}


function spawnDrop(sec) {
  const angle = (sec / 60) * TWO_PI - HALF_PI;
  const x = CX + cos(angle) * CONFIG.dropSpawnRadius;
  const y = CY + sin(angle) * CONFIG.dropSpawnRadius;

  const drop = Bodies.circle(x, y, CONFIG.dropRadius, {
    frictionAir: CONFIG.frictionAir,
    restitution: 0.2,
    density: 0.001,
    label: 'drop',
  });

  Body.setVelocity(drop, {
    x: -cos(angle) * 3,
    y: -sin(angle) * 3,
  });

  World.add(world, drop);
  particles.push(drop);
}

function applyMagneticForce() {
  for (const p of particles) {
    const dx = CX - p.position.x;
    const dy = CY - p.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy) + 0.0001;

    const f = CONFIG.attractionStrength * p.mass * dist;
    Body.applyForce(p, p.position, {
      x: (dx / dist) * f,
      y: (dy / dist) * f,
    });
  }
}

function absorbParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const dx = CX - p.position.x;
    const dy = CY - p.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const absorbThreshold = currentBlobRadius - CONFIG.dropAbsorbDistance;

    if (dist < absorbThreshold || dist < CONFIG.dropAbsorbDistance) {
      World.remove(world, p);
      particles.splice(i, 1);

      const sec = second();
      if (sec <= 58 && currentBlobRadius < CONFIG.blobMaxRadius) {
        targetBlobRadius = Math.min(
          targetBlobRadius + CONFIG.growthPerDrop,
          CONFIG.blobMaxRadius
        );
      }
    }
  }
}



function drawParticles() {
  push();
  noStroke();
  fill(CONFIG.color);
  for (const p of particles) {
    circle(p.position.x, p.position.y, CONFIG.dropRadius * 2);
  }
  pop();
}

function resetBlob() {
  for (const p of particles) {
    World.remove(world, p);
  }
  particles = [];
  targetBlobRadius = CONFIG.blobMinRadius;
}


function drawMarkers() {
  push();
  noStroke();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * TWO_PI - HALF_PI;
    const r = W / 2 - 8;
    const x = CX + cos(a) * r;
    const y = CY + sin(a) * r;
    const isHour = i % 5 === 0;
    fill(isHour ? '#8C8C8C' : '#8C8C8C');
    circle(x, y, isHour ? 8 : 3);
  }

  const sec = second();
  const a = (sec / 60) * TWO_PI - HALF_PI;
  const r = W / 2 - 8;
  push();
  fill(CONFIG.color);
  circle(CX + cos(a) * r, CY + sin(a) * r, 12);
  pop();
  pop();
}