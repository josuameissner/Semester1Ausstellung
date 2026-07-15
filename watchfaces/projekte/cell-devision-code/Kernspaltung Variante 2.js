const {
  Engine,
  World,
  Bodies,
  Body
} = Matter;

let engine;
let world;

let balls = [];

let canvasSize;
let centerX;
let centerY;
let watchRadius;

let animationPhase = 'originOrbit';
let phaseFrame = 0;
let splitCount = 0;
let currentCycleColor;

const originalBallCount = 1;
const maxSplits = 6;

const invisibleBoundaryGroup = -1;

const phaseDurations = {
  originOrbit: 220,
  splitFloat: 360,
  calmPause: 30,
  fragmentBloom: 180,
  fragmentReturn: 420
};

const splitColors = [
  [80, 210, 255],
  [125, 245, 180],
  [255, 215, 90],
  [255, 130, 160],
  [185, 140, 255],
  [90, 245, 235],
  [255, 170, 95]
];

function setup() {
  setupCanvas();

  engine = Engine.create();
  world = engine.world;
  world.gravity.x = 0;
  world.gravity.y = 0;

  createOriginalBalls();
}

function draw() {
  drawSoftBackground();

  updateAnimation();
  // text(animationPhase, 20, 20)
  // text(phaseFrame, 120, 20)

  Engine.update(engine, 1000 / 60);

  //drawPatternLines();
  drawBalls();
//  drawCenterTime();
}

function windowResized() {
  setupCanvas();
  World.clear(world, false);
  createOriginalBalls();
}

function setupCanvas() {
  // Das ist die exakte Größe deines Canvas-Bereichs
  canvasSize = 713; 
  let c = createCanvas(canvasSize, canvasSize);
  
  pixelDensity(2);
  centerX = width / 2;
  centerY = height / 2;
  watchRadius = width * 0.46;
}




class WatchBall {
  constructor(x, y, radius, ballColor, index = 0) {
    this.radius = radius;
    this.ballColor = ballColor;
    this.index = index;

    this.alpha = 230;

    this.startPosition = createVector(x, y);
    this.targetPosition = createVector(x, y);
    this.patternSeed = random(TWO_PI);
    this.moveProgress = 1;
    this.moveDuration = 1;
    this.patternStrength = 0;

    this.body = Bodies.circle(x, y, radius, {
      frictionAir: 0.18,
      restitution: 0.2,
      density: 0.001,
      collisionFilter: {
        group: invisibleBoundaryGroup
      }
    });

    World.add(world, this.body);
  }

  startFloatingTo(x, y, duration, patternStrength = 0.35) {
    const position = this.body.position;

    this.startPosition.set(position.x, position.y);
    this.targetPosition.set(x, y);
    this.moveProgress = 0;
    this.moveDuration = duration;
    this.patternStrength = patternStrength;
  }

  updateFloating() {
    if (this.moveProgress >= this.moveDuration) {
      this.applySoftForceTo(this.targetPosition.x, this.targetPosition.y, 0.00008, 0.0007);
      this.limitVelocity(1.4);
      return;
    }

    this.moveProgress += 1;

    const progress = constrain(this.moveProgress / this.moveDuration, 0, 1);
    const easedProgress = easeInOutSine(progress);

    const baseX = lerp(this.startPosition.x, this.targetPosition.x, easedProgress);
    const baseY = lerp(this.startPosition.y, this.targetPosition.y, easedProgress);

    const direction = createVector(
      this.targetPosition.x - this.startPosition.x,
      this.targetPosition.y - this.startPosition.y
    );

    const distance = Math.max(1, direction.mag());
    direction.normalize();

    const perpendicular = createVector(-direction.y, direction.x);

    const waveAmount = sin(progress * PI) * this.patternStrength * watchRadius;
    const waveFrequency = 2.0 + splitCount * 0.22;

    const personalWave = sin(
      progress * TWO_PI * waveFrequency +
      this.index * 0.42 +
      this.patternSeed
    );

    const spiralAngle = progress * TWO_PI * 0.9 + this.patternSeed + this.index * 0.08;
    const spiralAmount = sin(progress * PI) * this.patternStrength * watchRadius * 0.22;

    const patternX =
      perpendicular.x * waveAmount * personalWave +
      cos(spiralAngle) * spiralAmount;

    const patternY =
      perpendicular.y * waveAmount * personalWave +
      sin(spiralAngle) * spiralAmount;

    const desiredX = baseX + patternX;
    const desiredY = baseY + patternY;

    this.applySoftForceTo(desiredX, desiredY, 0.00012, 0.00095);
    this.limitVelocity(1.75);
    this.keepInsideInvisibleWatchArea();
  }

  applySoftForceTo(x, y, strength = 0.0001, maxForce = 0.001) {
    const position = this.body.position;

    let forceX = (x - position.x) * strength;
    let forceY = (y - position.y) * strength;

    const forceMagnitude = Math.sqrt(forceX * forceX + forceY * forceY);

    if (forceMagnitude > maxForce) {
      forceX = (forceX / forceMagnitude) * maxForce;
      forceY = (forceY / forceMagnitude) * maxForce;
    }

    Body.applyForce(this.body, position, {
      x: forceX,
      y: forceY
    });
  }

  limitVelocity(maxSpeed) {
    const velocity = this.body.velocity;
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

    if (speed > maxSpeed) {
      Body.setVelocity(this.body, {
        x: (velocity.x / speed) * maxSpeed,
        y: (velocity.y / speed) * maxSpeed
      });
    }
  }

  keepInsideInvisibleWatchArea() {
    const position = this.body.position;
    const dx = position.x - centerX;
    const dy = position.y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const maxDistance = watchRadius * 0.86;

    if (distance > maxDistance) {
      const pullBack = createVector(centerX - position.x, centerY - position.y);
      pullBack.normalize();
      pullBack.mult(0.00065);

      Body.applyForce(this.body, position, {
        x: pullBack.x,
        y: pullBack.y
      });
    }
  }

  draw() {
    const position = this.body.position;

    const r = red(this.ballColor);
    const g = green(this.ballColor);
    const b = blue(this.ballColor);

    noStroke();

/*    for (let glowIndex = 5; glowIndex >= 1; glowIndex--) {         Leuchten
      const glowSize = this.radius * (2.2 + glowIndex * 1.05);
      const glowAlpha = this.alpha * 0.045 * glowIndex;

      fill(r, g, b, glowAlpha);
      circle(position.x, position.y, glowSize);
    }*/


            //strokeWeight(4);                 Strich und gefüllt
   // noFill();
     fill('white');
     circle(position.x, position.y, this.radius * 2.2);

     //fill(125);
    //circle(position.x, position.y, this.radius * 2);
    

    // line(width/2, height/2, position.x, position.y);      mit linien
    // line(width/2, 0, position.x, position.y)
    // line(width/2, height, position.x, position.y)

  }

  removeFromWorld() {
    World.remove(world, this.body);
  }
}

function updateAnimation() {
  phaseFrame += 1;

  if (animationPhase === 'originOrbit') {
    updateOriginOrbit();

    if (phaseFrame > phaseDurations.originOrbit) {
      splitCurrentBalls();
    }

    return;
  }

  if (animationPhase === 'splitFloat') {
    updateFloatingBalls();

    if (phaseFrame > phaseDurations.splitFloat) {
      if (splitCount >= maxSplits) {
        startFragmentBloom();
      } else {
        animationPhase = 'calmPause';
        phaseFrame = 0;
      }
    }

    return;
  }

  if (animationPhase === 'calmPause') {
    updateCalmPause();

    if (phaseFrame > phaseDurations.calmPause) {
      splitCurrentBalls();
    }

    return;
  }

  if (animationPhase === 'fragmentBloom') {
    updateFragmentBloom();

    if (phaseFrame > phaseDurations.fragmentBloom) {
      startFragmentReturn();
    }

    return;
  }

  if (animationPhase === 'fragmentReturn') {
    updateFragmentReturn();

    if (phaseFrame > phaseDurations.fragmentReturn) {
      createOriginalBalls();
    }
  }
}

function createOriginalBalls() {
  balls.forEach((ball) => ball.removeFromWorld());
  balls = [];

  animationPhase = 'originOrbit';
  phaseFrame = 0;
  splitCount = 0;
  currentCycleColor = getSplitColor(0);

  const radius = watchRadius * 0.055;

  for (let index = 0; index < originalBallCount; index++) {
    const angle = -HALF_PI + index * TWO_PI / originalBallCount;
    const startRadius = watchRadius * 0.055;

    const x = centerX + cos(angle) * startRadius;
    const y = centerY + sin(angle) * startRadius;

    balls.push(new WatchBall(x, y, radius, currentCycleColor, index));
  }
}

function updateOriginOrbit() {
  const orbitRadius = watchRadius * 0.12;
  const orbitSpeed = 0.012;

  balls.forEach((ball, index) => {
    const angle = -HALF_PI + index * TWO_PI / balls.length + frameCount * orbitSpeed;

    const targetX = centerX + cos(angle) * orbitRadius;
    const targetY = centerY + sin(angle) * orbitRadius;

    ball.applySoftForceTo(targetX, targetY, 0.00012, 0.0008);
    ball.limitVelocity(1.15);
  });
}

function updateFloatingBalls() {
  balls.forEach((ball) => {
    ball.updateFloating();
  });
}

function updateCalmPause() {
  balls.forEach((ball) => {
    const pulse = sin(frameCount * 0.018 + ball.patternSeed) * watchRadius * 0.006;

    const targetX = ball.targetPosition.x + cos(ball.patternSeed) * pulse;
    const targetY = ball.targetPosition.y + sin(ball.patternSeed) * pulse;

    ball.applySoftForceTo(targetX, targetY, 0.00006, 0.00045);
    ball.limitVelocity(0.75);
    ball.keepInsideInvisibleWatchArea();
  });
}

function splitCurrentBalls() {
  splitCount += 1;
  phaseFrame = 0;
  animationPhase = 'splitFloat';

  currentCycleColor = getSplitColor(splitCount);

  const parentBalls = balls;
  const childCount = parentBalls.length * 2;

  const floatingOutward = splitCount % 2 === 1;
  const targets = floatingOutward
    ? createOuterFlowerTargets(childCount)
    : createInnerSpiralTargets(childCount);

  balls = [];

  parentBalls.forEach((parentBall, parentIndex) => {
    const parentPosition = parentBall.body.position;
    const childRadius = Math.max(watchRadius * 0.012, parentBall.radius * 0.76);

    parentBall.removeFromWorld();

    for (let childIndex = 0; childIndex < 2; childIndex++) {
      const globalIndex = parentIndex * 2 + childIndex;
      const splitAngle = -HALF_PI + globalIndex * TWO_PI / childCount;

      const startOffset = parentBall.radius * 0.18;

      const x = parentPosition.x + cos(splitAngle) * startOffset;
      const y = parentPosition.y + sin(splitAngle) * startOffset;

      const childBall = new WatchBall(
        x,
        y,
        childRadius,
        currentCycleColor,
        globalIndex
      );

      const target = targets[globalIndex];

      childBall.startFloatingTo(
        target.x,
        target.y,
        phaseDurations.splitFloat,
        floatingOutward ? 0.18 : 0.13
      );

      Body.setVelocity(childBall.body, {
        x: 0,
        y: 0
      });

      balls.push(childBall);
    }
  });
}

function createOuterFlowerTargets(count) {
  const targets = [];

  for (let index = 0; index < count; index++) {
    const normalizedIndex = index / count;
    const angle = -HALF_PI + normalizedIndex * TWO_PI;

    const flowerWave = sin(angle * 6 + splitCount * 0.8) * watchRadius * 0.045;
    const smallBreath = sin(index * 0.73 + splitCount) * watchRadius * 0.018;

    const radius = watchRadius * 0.68 + flowerWave + smallBreath;

    targets.push({
      x: centerX + cos(angle) * radius,
      y: centerY + sin(angle) * radius
    });
  }

  return targets;
}

function createInnerSpiralTargets(count) {
  const targets = [];
  const goldenAngle = PI * (3 - sqrt(5));
  const maxClusterRadius = watchRadius * 0.31;

  for (let index = 0; index < count; index++) {
    const progress = (index + 0.5) / count;
    const radius = sqrt(progress) * maxClusterRadius;
    const angle = index * goldenAngle + splitCount * 0.55;

    targets.push({
      x: centerX + cos(angle) * radius,
      y: centerY + sin(angle) * radius
    });
  }

  return targets;
}

function startFragmentBloom() {
  phaseFrame = 0;
  animationPhase = 'fragmentBloom';

  currentCycleColor = getSplitColor(maxSplits);

  const parentBalls = balls;
  balls = [];

  parentBalls.forEach((parentBall, parentIndex) => {
    const parentPosition = parentBall.body.position;
    const fragmentsPerBall = 2;  

    parentBall.removeFromWorld();

    for (let fragmentIndex = 0; fragmentIndex < fragmentsPerBall; fragmentIndex++) {
      const angle = parentIndex * 0.23 + fragmentIndex * PI + random(-0.18, 0.18);
      //const radius = random(watchRadius * 0.0045, watchRadius * 0.0085);
      const radius =  watchRadius * 0.006;

      const x = parentPosition.x + cos(angle) * parentBall.radius * 0.4;
      const y = parentPosition.y + sin(angle) * parentBall.radius * 0.4;

      const fragmentBall = new WatchBall(
        x,
        y,
        radius,
        currentCycleColor,
        parentIndex * fragmentsPerBall + fragmentIndex
      );

      const bloomRadius = watchRadius * random(0.48, 0.76);
      const bloomAngle = angle + random(-0.35, 0.35);

      fragmentBall.startFloatingTo(
        centerX + cos(bloomAngle) * bloomRadius,
        centerY + sin(bloomAngle) * bloomRadius,
        phaseDurations.fragmentBloom,
        0.1
      );

      fragmentBall.alpha = 210;

      balls.push(fragmentBall);
    }
  });
}

function updateFragmentBloom() {
  balls.forEach((ball) => {
    ball.updateFloating();
    ball.limitVelocity(1.2);
  });
}

function startFragmentReturn() {
  phaseFrame = 0;
  animationPhase = 'fragmentReturn';

  balls.forEach((ball, index) => {
    const targetAngle = index * 0.35;
    const targetRadius = watchRadius * random(0.018, 0.11);

    ball.startFloatingTo(
      centerX + cos(targetAngle) * targetRadius,
      centerY + sin(targetAngle) * targetRadius,
      phaseDurations.fragmentReturn,
      0.16
    );
  });
}

function updateFragmentReturn() {
  const progress = constrain(phaseFrame / phaseDurations.fragmentReturn, 0, 1);

  balls.forEach((ball) => {
    ball.updateFloating();
    ball.alpha = lerp(220, 70, progress);
    ball.limitVelocity(1.1);
  });
}

function drawSoftBackground() {
  background("black");

}

function drawPatternLines() {
  if (balls.length < 2) {
    return;
  }

  const lineColor = currentCycleColor || color(80, 210, 255);

  push();
  noFill();
  stroke(red(lineColor), green(lineColor), blue(lineColor), 20);
  strokeWeight(1);

  beginShape();

  const maxPoints = Math.min(balls.length, 220);

  for (let index = 0; index < maxPoints; index++) {
    const ball = balls[index];
    const position = ball.body.position;
    curveVertex(position.x, position.y);
  }

  endShape(CLOSE);
  pop();
}

function drawBalls() {
  balls.forEach((ball) => {
    ball.draw();
  });
}

function drawCenterTime() {
  const now = new Date();

  const hours = `${now.getHours()}`.padStart(2, '0');
  const minutes = `${now.getMinutes()}`.padStart(2, '0');

  push();

  textAlign(CENTER, CENTER);
  textFont('monospace');

  noStroke();
  fill(230, 245, 255, 205);
  textSize(watchRadius * 0.13);
  text(`${hours}:${minutes}`, centerX, centerY + watchRadius * 0.54);

  fill(180, 215, 255, 110);
  textSize(watchRadius * 0.038);

  if (animationPhase === 'fragmentBloom' || animationPhase === 'fragmentReturn') {
    text('REKOMBINATION', centerX, centerY + watchRadius * 0.66);
  } else if (animationPhase === 'originOrbit') {
    text('UR-BÄLLE', centerX, centerY + watchRadius * 0.66);
  } else {
    text(`TEILUNG ${splitCount}/${maxSplits}`, centerX, centerY + watchRadius * 0.66);
  }

  pop();
}

function getSplitColor(level) {
  const values = splitColors[level % splitColors.length];

  return color(values[0], values[1], values[2], 235);
}

function easeInOutSine(value) {
  return -(cos(PI * value) - 1) / 2;
}
