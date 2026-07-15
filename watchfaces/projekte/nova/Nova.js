const Engine = Matter.Engine;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Body = Matter.Body;

let engine;
let world;

let outerCircles = [];
let projectiles = [];

let centerX, centerY;

let outerCount = 16;
let ringRadius;
let baseCircleRadius;
let projectileRadius;

let rotationAngle = 0;
let rotationSpeed = 0.5;

let lastShotTime = 0;
let lastBigPulseTime = 0;
let bigPulseStart = -99999;

let burstCounter = 0;

const indigoColor = [110, 115, 255];
const greyColor = [184, 179, 176];

const projectileColors = [
  indigoColor,
  greyColor
];


const centerCircleScale = 1.4; // Faktor für den größeren Kreis in der Mitte

// Magnet-Parameter
let magnetRange;
let magnetStrength;
let maxMagnetForce;


let magnetPauseUntil = 0; // kurze Pause nach dem großen Puls, damit die Kugeln wegfliegen können

function setup() {
  createCanvas(windowWidth, windowHeight);

  engine = Engine.create();
  world = engine.world;
  engine.gravity.x = 0;
  engine.gravity.y = 0;

  resetScene();

  lastShotTime = millis();
  lastBigPulseTime = millis();
}

function resetScene() { //setzt die komplette Szene neu auf, Am Anfang und bei Neuladen der Seite
  World.clear(world, false);

  outerCircles = [];
  projectiles = [];

 //Berechnen der Mitte des Fensters in X- und Y-Richtung
  centerX = width / 2; 
  centerY = height / 2;

  const s = min(width, height);

  ringRadius = s * 0.38; //wie weit die äußeren Kreise von der Mitte entfernt liegen
  baseCircleRadius = constrain(s * 0.038, 17, 30); //berechnet die Größe der äußeren Kreise
  projectileRadius = baseCircleRadius * 0.45; //die kleinen Kreise sind 0.45 mal so groß wie äußeren

  magnetRange = ringRadius * 0.55; // Magnetwerte abhängig von der Bildschirmgröße

  
  magnetStrength = 0.0022 * (s / 800); // Stärke der magnetischen Anziehung

 
  maxMagnetForce = 0.0045 * (s / 800); // Maximale Kraft pro Kugel, damit es stabil bleibt

  for (let i = 0; i < outerCount; i++) {
    const angle = TWO_PI * i / outerCount; //berechnet, an welchem Winkel der jeweilige Kreis liegt

    const x = centerX + cos(angle) * ringRadius;
    const y = centerY + sin(angle) * ringRadius;

    const body = Bodies.circle(x, y, baseCircleRadius, { //erstellen eines physikalischen Kreiskörper
      isStatic: true,
      restitution: 0.25, // leichtes Abprallen
      friction: 0,
      frictionAir: 0
    });

    body.kind = "outer"; // Körper bekommt eigene Eigenschaft
    body.outerIndex = i; // Körper merkt sich seinen Index im Ring
    body.currentRadius = baseCircleRadius; //speichern des aktuellen Radius für späteres Pulsieren mit matter.js

    World.add(world, body); // Körper wird zur Matter-Welt hinzugefügt

    outerCircles.push({ // äußerer Kreis wird in Array gespeichert
      body,
      index: i // Dadurch später alle äußeren Kreise durchgehen und zeichnen oder bewegen

    });
  }
}

function draw() {
  background(0); // Hintergrund schwarz

  const now = millis();
  const dt = min(deltaTime, 33.33) / 1000; // verhindert das Animation durch Browserstörung einen großen Sprung macht 

  rotationAngle += rotationSpeed * dt; // Rotationswinkel wird erhöht, eigentliche Drehbewegung

  if (now - lastShotTime >= 1000) { // sind seit dem letzten Schuss mindestens 1000 Millisek. vergangen?
    lastShotTime += 1000; // oder: lastShotTime = now; Was ist besser? letzter Schusszeitpunkt wird um 1 Sekunde weitergesetzt
    shootBurst(); // Jetzt wird neue Welle kleiner Kugeln geschossen
  }

  if (now - lastBigPulseTime >= 10000) { // sind seit dem letzten großen Puls mind. 10 sek vergangen?
    lastBigPulseTime += 10000; // Zeitpunkt des letzten großen Pulses wird aktualisiert
    bigPulseStart = now; // großer Puls startet jetzt

    blastProjectilesFromCenter(); // kleine Kugeln werden nach außen weggestoßen

    magnetPauseUntil = now + 650;// Magneten kurz deaktivieren
  }
  updateOuterCircles(); // äußeren Kreise werden neu positioniert und skaliert

  applyMagneticForces(); // // Magnetkräfte werden auf die kleinen Kugeln angewendet; Passiert vor Physik Update

  Engine.update(engine, min(deltaTime, 33.33)); // matter.js wird aktualisiert; Wieder mit Begrenzung für Stabilität

  removeFarAwayProjectiles(); // Kleine Kugeln, die weit außerhalb des Bildschirms sind, werden gelöscht

  drawComposition(); // jetzt wird alles gezeichnet (äußere, mittlere, kleine Kreise)
} 

function getNormalPulseScale() { // berechnet wie stark die Kreise normal pulsieren
  const phase = (millis() % 1000) / 1000; // erzeugt Wert zwischen 0 und 1, der sich jede Sekunde wiederholt; % = Rest
  const wave = (sin(TWO_PI * phase - HALF_PI) + 1) / 2; // erzeugen eienr weichen Sinuswelle

  return 1 + pow(wave, 2.0) * 0.8; // gibt Puls-Skalierungsfaktor zurück; Macht Bewegung leichter
}

function getBigPulseScale() { // berechnet den großen Impuls
  const elapsed = millis() - bigPulseStart; // berechnet wie lang der große Puls schon läuft

  if (elapsed < 0 || elapsed > 850) {
    return 0; //Wenn der Puls noch nicht gestartet ist oder länger als 850 ms her ist, gibt es keinen großen Puls; Dann wird 0 zurückgegeben
  }

  return sin((elapsed / 850) * PI) * 0.25;
}


function getBigPulseDistanceOffset() { //berechnet, wie weit die äußeren Kugeln beim großen Puls zusätzlich nach außen geschoben werden
  const elapsed = millis() - bigPulseStart;

  if (elapsed < 0 || elapsed > 850) {
    return 0;
  }

  return sin((elapsed / 850) * PI) * 20;
}

function getCurrentCircleRadius() { //berechnet aktuellen Radius der äußeren Kreise
  return baseCircleRadius * (getNormalPulseScale() + getBigPulseScale());
}

function getCurrentCenterCircleRadius() { //berechnet Radius des mittleren Kreises.
  return getCurrentCircleRadius() * centerCircleScale;
}

function outerAngle(index) { //gibt aktuellen Winkel eines äußeren Kreises zurück
  return rotationAngle + TWO_PI * index / outerCount; //dadurch rotiert der ganze Kreis
}

function updateOuterCircles() { //aktualisiert die Position und Größe aller äußeren Kreise
  const r = getCurrentCircleRadius(); //aktuelle pulsierende Radius wird berechnet

  // zusätzlicher Abstand beim großen Puls
  const currentRingRadius = ringRadius + getBigPulseDistanceOffset();

  for (let i = 0; i < outerCircles.length; i++) { //Alle äußeren Kreise werden durchlaufen
    const item = outerCircles[i];
    const body = item.body;

    const a = outerAngle(i); //aktueller Winkel für diesen Kreis wird berechnet

    const x = centerX + cos(a) * currentRingRadius;
    const y = centerY + sin(a) * currentRingRadius;

    Body.setPosition(body, { x, y }); //body wird an diese neue Position gesetzt

    const scaleFactor = r / body.currentRadius; //berechnet, wie stark der Körper skaliert werden muss
    Body.scale(body, scaleFactor, scaleFactor); //Der Matter-Körper wird skaliert
    body.currentRadius = r; //neuer Radius wird gespeichert
  }
}

function shootBurst() { //erzeugt eine neue Kugelwelle aus der Mitte
  const amount = 16; //Pro Welle werden 16 kleine Kugeln erzeugt
  const speed = 7.8; //Startgeschwindigkeit der kleinen Kugeln

  const offset = burstCounter * 0.13; //Jede neue Welle wird leicht gedreht, sonst würden alle Kugeln immer exakt gleiche Bahn nehmen
  burstCounter++; //Zähler wird um 1 erhöht

  
  const startDistance = getCurrentCenterCircleRadius() + projectileRadius + 3; //bestimmt, wo die kleinen Kugeln starten. Sollen nicht in Mitte sondern am Rand starten

  for (let i = 0; i < amount; i++) { //Schleife erzeugt alle kleinen Kugeln der Welle
    const a = offset + TWO_PI * i / amount; //Der Winkel der aktuellen kleinen Kugel wird berechnet, werden gleichmäßig im Kreis verteilt

    const x = centerX + cos(a) * startDistance; //Startposition der Kugel berechnen
    const y = centerY + sin(a) * startDistance;

    const body = Bodies.circle(x, y, projectileRadius, { //neuer physikalischer Kreis wird erstellt
      restitution: 0.35, //Kugel prallt leicht ab
      friction: 0.01, //sehr wenig Reibung bei Kontakt
      frictionAir: 0.012, //sorgt dafür, dass die kleinen Kugeln mit der Zeit etwas langsamer werden
      density: 0.001 //Dichte der Kugel, beeinflusst Masse
    });

    body.kind = "projectile"; //body bekommt eigene Kategorie; "projectile" bedeutet das ist kleine geschossene Kugel
    body.radiusVisual = projectileRadius; //speichert die visuelle Größe
    body.color = projectileColors[i % projectileColors.length];

    Body.setVelocity(body, { //Kugel bekommt Startgeschwindigkeit
      x: cos(a) * speed,
      y: sin(a) * speed
    });

    World.add(world, body); //Kugel wird zu Physik Welt hinzugefügt
    projectiles.push(body);
  }
}

function applyMagneticForces() { //Magneteffekt
  const now = millis();

  // Während des großen Pulses kurz keine Magnetkraft
  if (now < magnetPauseUntil) return; //Wenn aktuelle Zeit noch vor magnetPauseUntil liegt, wird Funktion sofort beendet

  for (const p of projectiles) { //Jetzt wird jede kleine Kugel durchlaufen
    let fx = 0;
    let fy = 0;

    for (const item of outerCircles) { //Für jede kleine Kugel werden alle äußeren Kreise geprüft
      const ob = item.body;

      const dx = ob.position.x - p.position.x;
      const dy = ob.position.y - p.position.y;

      const dSq = dx * dx + dy * dy;
      const d = sqrt(dSq);

      if (d <= 0.0001) continue;

      if (d < magnetRange) { // Nur innerhalb einer bestimmten Reichweite wirkt der Magnet
        const nx = dx / d;
        const ny = dy / d;

        const t = 1 - d / magnetRange; // Je näher die kleine Kugel am Magneten ist, desto stärker wird die Anziehung
        
        let force = magnetStrength * t * t; // Sanfte, nicht zu harte Magnetkurve

        fx += nx * force;
        fy += ny * force;
      }
    }

    const forceLength = sqrt(fx * fx + fy * fy); // Gesamtkraft begrenzen, damit die Simulation nicht explodiert

    if (forceLength > maxMagnetForce) { //Wenn gesamte Kraft zu stark ist, wird sie begrenzt
      const scale = maxMagnetForce / forceLength;
      fx *= scale;
      fy *= scale;
    }

    Body.applyForce(p, p.position, { //Hier wird die Kraft tatsächlich auf die kleine Kugel angewendet
      x: fx,
      y: fy
    });
  }
}

function blastProjectilesFromCenter() { //stößt alle kleinen Kugeln von der Mitte weg
  for (const p of projectiles) {
    const dx = p.position.x - centerX;
    const dy = p.position.y - centerY;
    const len = max(0.0001, sqrt(dx * dx + dy * dy));

    const nx = dx / len;
    const ny = dy / len;

    Body.setVelocity(p, {
      x: nx * 12.5,
      y: ny * 12.5
    });

    Body.applyForce(p, p.position, { //Geschwindigkeit der Kugel wird direkt gesetzt
      x: nx * 0.025,
      y: ny * 0.025
    });
  }
}

function removeFarAwayProjectiles() { //löscht Kugeln, die weit außerhalb des Bildschirms sind
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];

    const margin = 300;

    if (
      p.position.x < -margin ||
      p.position.x > width + margin ||
      p.position.y < -margin ||
      p.position.y > height + margin
    ) {
      World.remove(world, p);
      projectiles.splice(i, 1);
    }
  }
}

function drawComposition() {
  noStroke();

  const r = getCurrentCircleRadius();
  const centerR = getCurrentCenterCircleRadius();

 for (let i = 0; i < outerCircles.length; i++) { // äußere pulsierende Kreise
  const item = outerCircles[i];
  const p = item.body.position;

  let circleRadius;

  if (i % 2 === 0) {
    // weiße Kreise normal groß
    fill(255);
    circleRadius = r;
  } else {
    // schwarze Kreise größer
    fill(0);
    circleRadius = r * 1.2;
  }

  circle(p.x, p.y, circleRadius * 2);
}
  // mittlerer Kreis etwas größer in Weiß
  fill(0, 0, 0);
  circle(centerX, centerY, centerR * 2);

  // kleine fliegende Kugeln in Lavendel
  for (const p of projectiles) {
  const c = p.color || indigoColor;

  fill(c[0], c[1], c[2]);
  circle(p.position.x, p.position.y, projectileRadius * 2);
}
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  resetScene();

  lastShotTime = millis();
  lastBigPulseTime = millis();
  bigPulseStart = -99999;
  magnetPauseUntil = 0;
}
