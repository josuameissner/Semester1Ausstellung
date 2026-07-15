const {
  Engine,
  World,
  Bodies,
  Body,
  Constraint,
  Composite,
  Events,
  Mouse,
  MouseConstraint,
} = Matter;

const WORLD_SIZE = 960;
const PLAYER_SIZE = 96;
const PLAYER_CORNER_RADIUS = 18;
const PICKUP_RADIUS = 15;
const PICKUP_SQUARE_SIZE = 36;
const ROPE_SEGMENTS = 28;
const SPAWN_INTERVAL_MS = 1000;
const CYCLE_DURATION_MS = 60000;

let engine;
let world;
let ball;
let ropes = [];
let pickups = [];
let mouseConstraint;
let score = 0;
let collectedPulse = 0;
let loopTarget = 0;
let slingFrames = 0;
let slingSide = 0;
let slingCooldown = 0;
let ropeConstraints = [];
let cycleStartTime = 0;
let lastPickupSpawnTime = 0;
let spawnedPickupCount = 0;
let fallingMode = false;
let resetVersion = 0;
let bottomWall;

const parameters = {
  gravity: 0,
  ropeStiffness: 0.58,
  ropeSpread: 100,
  pullStrength: 1,
  slingPower: 1.2,
  pointMotion: 1.7,
};

function setup() {
  const canvas = createCanvas(WORLD_SIZE, WORLD_SIZE);
  canvas.parent("canvas-container");
  pixelDensity(1);
  frameRate(60);

  engine = Engine.create({
    gravity: { x: 0, y: parameters.gravity, scale: 0.001 },
    positionIterations: 10,
    velocityIterations: 8,
    constraintIterations: 6,
  });
  world = engine.world;

  createWorld();
  installMouse(canvas);
  installCollisions();
  installParameterMenu();

  document.getElementById("reset-button").addEventListener("click", resetGame);
}

function createWorld() {
  ropeConstraints = [];
  pickups = [];
  fallingMode = false;
  engine.gravity.y = parameters.gravity;
  addInvisibleBounds();

  ropes = [
    createRope(226, 2, 237, 958, -13, -1),
    createRope(739, 2, 744, 958, 14, 1),
  ];

  ball = Bodies.rectangle(600, 105, PLAYER_SIZE, PLAYER_SIZE, {
    label: "player",
    chamfer: { radius: PLAYER_CORNER_RADIUS },
    restitution: 0.92,
    friction: 0.002,
    frictionAir: 0.006,
    density: 0.0042,
    collisionFilter: {
      category: 0x0002,
      mask: 0xffff,
    },
  });
  Body.setVelocity(ball, { x: -2.8, y: 0.65 });
  World.add(world, ball);

  startPickupCycle();
  updateScoreAndCycle();
}

function createRope(topX, topY, bottomX, bottomY, bend, side) {
  const composite = Composite.create();
  const bodies = [];
  const segmentHeight = (bottomY - topY) / ROPE_SEGMENTS;
  const spread = parameters.ropeSpread * side;
  const shiftedTopX = topX + spread;
  const shiftedBottomX = bottomX + spread;

  for (let i = 0; i <= ROPE_SEGMENTS; i += 1) {
    const t = i / ROPE_SEGMENTS;
    const wave = Math.sin(t * Math.PI) * bend;
    const x = lerp(shiftedTopX, shiftedBottomX, t) + wave;
    const y = lerp(topY, bottomY, t);
    const segment = Bodies.circle(x, y, 9, {
      label: "rope",
      restitution: 1.05,
      friction: 0,
      frictionAir: 0.006,
      density: 0.004,
      collisionFilter: { group: -2 },
      render: { visible: false },
    });

    bodies.push(segment);
    Composite.add(composite, segment);

    if (i > 0) {
      const link = Constraint.create({
        bodyA: bodies[i - 1],
        bodyB: segment,
        length: segmentHeight * 0.92,
        stiffness: parameters.ropeStiffness,
        damping: 0.075,
      });
      Composite.add(composite, link);
      ropeConstraints.push(link);
    }
  }

  const topAnchor = Constraint.create({
      pointA: { x: shiftedTopX, y: topY },
      bodyB: bodies[0],
      length: 0,
      stiffness: 0.92,
      damping: 0.1,
    });
  const bottomAnchor = Constraint.create({
      pointA: { x: shiftedBottomX, y: bottomY },
      bodyB: bodies[bodies.length - 1],
      length: 0,
      stiffness: 0.92,
      damping: 0.1,
    });

  Composite.add(composite, topAnchor);
  Composite.add(composite, bottomAnchor);

  World.add(world, composite);
  return {
    composite,
    bodies,
    topAnchor,
    bottomAnchor,
    side,
    spread: parameters.ropeSpread,
  };
}

function createPickup(x, y, vx, vy, index) {
  const isSquare = index > 0 && index % 5 === 0;
  const options = {
    label: "pickup",
    restitution: 0.98,
    friction: 0,
    frictionAir: 0.004,
    density: 0.0014,
    isSensor: false,
    plugin: {
      pickupIndex: index,
      pickupShape: isSquare ? "square" : "circle",
      floatPhase: random(TWO_PI),
      turnRate: random(0.006, 0.014),
    },
  };
  const pickup = isSquare
    ? Bodies.rectangle(x, y, PICKUP_SQUARE_SIZE, PICKUP_SQUARE_SIZE, {
        ...options,
        chamfer: { radius: 6 },
      })
    : Bodies.circle(x, y, PICKUP_RADIUS, options);

  Body.setVelocity(pickup, { x: vx, y: vy });
  World.add(world, pickup);
  return pickup;
}

function addInvisibleBounds() {
  const options = {
    isStatic: true,
    label: "wall",
    restitution: 1,
    friction: 0,
  };
  const topWall = Bodies.rectangle(480, -35, 1100, 70, {
    ...options,
    label: "top-wall",
  });
  bottomWall = Bodies.rectangle(480, 995, 1100, 70, {
    ...options,
    label: "bottom-wall",
  });

  World.add(world, [
    topWall,
    bottomWall,
    Bodies.rectangle(-35, 480, 70, 1100, options),
    Bodies.rectangle(995, 480, 70, 1100, options),
  ]);
}

function installMouse(canvas) {
  const mouse = Mouse.create(canvas.elt);
  mouse.pixelRatio = pixelDensity();

  mouseConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: {
      stiffness: 0.075,
      damping: 0.04,
      render: { visible: false },
    },
    collisionFilter: {
      mask: 0x0002,
    },
  });

  World.add(world, mouseConstraint);
}

function installCollisions() {
  Events.on(engine, "collisionStart", (event) => {
    for (const pair of event.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      const pickup =
        a.label === "player" && b.label === "pickup"
          ? b
          : b.label === "player" && a.label === "pickup"
            ? a
            : null;

      if (pickup && pickups.includes(pickup)) {
        collectPickup(pickup);
      }

      handleVerticalWallBounce(a, b);

      const playerRope =
        a.label === "player" && b.label === "rope"
          ? b
          : b.label === "player" && a.label === "rope"
            ? a
            : null;

      if (playerRope && slingCooldown === 0) {
        slingSide = playerRope.position.x < WORLD_SIZE / 2 ? -1 : 1;
        slingFrames = 34;
        slingCooldown = 85;
      }

      const floatingBall =
        a.label === "pickup" && b.label === "rope"
          ? a
          : b.label === "pickup" && a.label === "rope"
            ? b
            : null;

      if (floatingBall) {
        const direction = floatingBall.position.x < WORLD_SIZE / 2 ? 1 : -1;
        Body.setVelocity(floatingBall, {
          x: direction * random(2.2, 3.2),
          y: floatingBall.velocity.y + random(-0.8, 0.8),
        });
      }
    }
  });
}

function handleVerticalWallBounce(a, b) {
  if (fallingMode) return;

  const topHit =
    a.label === "top-wall" && isFallingElement(b)
      ? b
      : b.label === "top-wall" && isFallingElement(a)
        ? a
        : null;
  const bottomHit =
    a.label === "bottom-wall" && isFallingElement(b)
      ? b
      : b.label === "bottom-wall" && isFallingElement(a)
        ? a
        : null;

  if (topHit) {
    Body.setVelocity(topHit, {
      x: topHit.velocity.x,
      y: max(abs(topHit.velocity.y), 3.2),
    });
    Body.applyForce(topHit, topHit.position, { x: 0, y: 0.0022 });
  }

  if (bottomHit) {
    Body.setVelocity(bottomHit, {
      x: bottomHit.velocity.x,
      y: -max(abs(bottomHit.velocity.y), 3.2),
    });
    Body.applyForce(bottomHit, bottomHit.position, { x: 0, y: -0.0022 });
  }
}

function isFallingElement(body) {
  return body.label === "player" || body.label === "pickup";
}

function installParameterMenu() {
  bindParameter("gravity-control", "gravity-value", "gravity", (value) => {
    engine.gravity.y = value;
  });
  bindParameter("rope-control", "rope-value", "ropeStiffness", (value) => {
    ropeConstraints.forEach((constraint) => {
      constraint.stiffness = value;
    });
  });
  bindParameter("spread-control", "spread-value", "ropeSpread", (value) => {
    applyRopeSpread(value);
  }, (value) => `${Math.round(value)} px`);
  bindParameter("pull-control", "pull-value", "pullStrength");
  bindParameter("sling-control", "sling-value", "slingPower");
  bindParameter("points-control", "points-value", "pointMotion");
}

function bindParameter(
  controlId,
  outputId,
  key,
  onChange = () => {},
  formatValue = (value) => value.toFixed(2),
) {
  const control = document.getElementById(controlId);
  const output = document.getElementById(outputId);

  control.addEventListener("input", () => {
    const value = Number(control.value);
    parameters[key] = value;
    output.value = formatValue(value);
    onChange(value);
  });
}

function applyRopeSpread(value) {
  for (const rope of ropes) {
    const delta = (value - rope.spread) * rope.side;

    for (const body of rope.bodies) {
      Body.translate(body, { x: delta, y: 0 });
    }

    rope.topAnchor.pointA.x += delta;
    rope.bottomAnchor.pointA.x += delta;
    rope.spread = value;
  }
}

function collectPickup(pickup) {
  pickups = pickups.filter((item) => item !== pickup);
  World.remove(world, pickup);
  score += 1;
  collectedPulse = 1;
  updateScoreAndCycle();
}

function startPickupCycle() {
  pickups = [];
  cycleStartTime = millis();
  lastPickupSpawnTime = cycleStartTime;
  spawnedPickupCount = 1;
  pickups.push(spawnPickupAwayFromBall(spawnedPickupCount));
}

function spawnPickupAwayFromBall(index) {
  let x;
  let y;
  let attempts = 0;

  do {
    x = random(300, 665);
    y = random(120, 850);
    attempts += 1;
  } while (
    attempts < 80 &&
    (dist(x, y, ball.position.x, ball.position.y) < 190 ||
      pickups.some((pickup) => dist(x, y, pickup.position.x, pickup.position.y) < 52))
  );

  const angle = random(TWO_PI);
  const speed = random(1.4, 2.7) * parameters.pointMotion;
  return createPickup(
    x,
    y,
    cos(angle) * speed,
    sin(angle) * speed,
    index,
  );
}

function updateScoreAndCycle() {
  document.getElementById("score").textContent = String(score).padStart(2, "0");
  document.getElementById("field-count").textContent =
    pickups.length === 1 ? "1 Ball" : `${pickups.length} Bälle`;
  const remainingSeconds = max(
    0,
    ceil((CYCLE_DURATION_MS - (millis() - cycleStartTime)) / 1000),
  );
  document.getElementById("cycle-time").textContent =
    fallingMode
      ? "Fallmodus"
      : remainingSeconds === 1
        ? "Fall in 1 Sekunde"
        : `Fall in ${remainingSeconds} Sekunden`;
}

function draw() {
  background(0);
  updatePickupSpawning();
  if (!fallingMode) {
    updateLoopMotion();
  }
  Engine.update(engine, 1000 / 60);

  if (!fallingMode) {
    keepMotionAlive(ball, 1.5, 9);
  }
  pickups.forEach((pickup, index) => {
    if (!fallingMode) {
      floatBody(pickup, index);
      keepMotionAlive(
        pickup,
        0.7 * parameters.pointMotion,
        2.7 * parameters.pointMotion,
      );
    }
  });

  drawRopes();
  drawPickups();
  drawBall();

  collectedPulse *= 0.91;
}

function updatePickupSpawning() {
  const now = millis();

  if (now - cycleStartTime >= CYCLE_DURATION_MS) {
    enterFallingMode();
    updateScoreAndCycle();
    return;
  }

  while (now - lastPickupSpawnTime >= SPAWN_INTERVAL_MS) {
    lastPickupSpawnTime += SPAWN_INTERVAL_MS;
    spawnedPickupCount += 1;
    pickups.push(spawnPickupAwayFromBall(spawnedPickupCount));
  }

  updateScoreAndCycle();
}

function enterFallingMode() {
  if (fallingMode) return;

  fallingMode = true;
  engine.gravity.y = 0.9;

  if (bottomWall) {
    World.remove(world, bottomWall);
    bottomWall = null;
  }

  Body.setVelocity(ball, {
    x: ball.velocity.x * 0.45,
    y: max(ball.velocity.y, 1.4),
  });
  for (const pickup of pickups) {
    Body.setVelocity(pickup, {
      x: pickup.velocity.x * 0.45,
      y: max(pickup.velocity.y, 1.1),
    });
  }
}

function updateLoopMotion() {
  if (!ball || mouseConstraint.body === ball) return;

  if (slingCooldown > 0) slingCooldown -= 1;

  if (slingFrames > 0) {
    // Der Ball drückt für einen Moment weiter in das Seil hinein.
    Body.applyForce(ball, ball.position, {
      x: slingSide * 0.0032 * parameters.pullStrength,
      y: sin(frameCount * 0.08) * 0.00016,
    });
    slingFrames -= 1;

    if (slingFrames === 0) {
      // Danach entlädt sich das gespannte Seil und schießt ihn zur Gegenseite.
      Body.setVelocity(ball, {
        x: -slingSide * random(7.2, 8.6) * parameters.slingPower,
        y: constrain(ball.velocity.y + random(-1.6, 1.6), -3.3, 3.3),
      });
      loopTarget = slingSide < 0 ? 1 : 0;
    }
    return;
  }

  const targetRope = ropes[loopTarget];
  const ropeBody = nearestRopeBody(targetRope, ball.position.y);
  const dx = ropeBody.position.x - ball.position.x;

  // Sanfte Automatik: Der Ball pendelt endlos zwischen beiden Seilen.
  Body.applyForce(ball, ball.position, {
    x:
      constrain(dx * 0.00000115, -0.00034, 0.00034) *
      parameters.pullStrength,
    y:
      sin(frameCount * 0.013) * 0.00011 +
      cos(frameCount * 0.0067) * 0.000055 +
      (WORLD_SIZE / 2 - ball.position.y) * 0.00000012,
  });
}

function nearestRopeBody(rope, y) {
  let nearest = rope.bodies[0];
  let nearestDistance = abs(nearest.position.y - y);

  for (const body of rope.bodies) {
    const distance = abs(body.position.y - y);
    if (distance < nearestDistance) {
      nearest = body;
      nearestDistance = distance;
    }
  }
  return nearest;
}

function floatBody(body, index) {
  if (mouseConstraint.body === body) return;

  const motion = parameters.pointMotion;
  const phase =
    frameCount * body.plugin.turnRate * motion +
    body.plugin.floatPhase +
    index * 0.8;
  const orbitX = sin(phase * 1.37);
  const orbitY = cos(phase * 0.91);

  Body.applyForce(body, body.position, {
    x:
      orbitX * 0.00004 * motion +
      (WORLD_SIZE / 2 - body.position.x) * 0.000000012,
    y:
      orbitY * 0.000052 * motion +
      (WORLD_SIZE / 2 - body.position.y) * 0.000000085,
  });
}

function drawRopes() {
  noFill();
  stroke("#444444");
  strokeWeight(15);
  strokeCap(ROUND);
  strokeJoin(ROUND);

  for (const rope of ropes) {
    beginShape();
    curveVertex(rope.bodies[0].position.x, rope.bodies[0].position.y);
    for (const body of rope.bodies) {
      curveVertex(body.position.x, body.position.y);
    }
    const end = rope.bodies[rope.bodies.length - 1].position;
    curveVertex(end.x, end.y);
    endShape();
  }
}

function drawPickups() {
  noStroke();
  for (const pickup of pickups) {
    const speed = Body.getSpeed(pickup);
    const glow = constrain(map(speed, 0, 3.5, 8, 25), 8, 25);
    drawingContext.shadowBlur = glow;
    drawingContext.shadowColor = "rgba(242,242,242,.32)";
    fill("#f2f2f2");
    if (pickup.plugin.pickupShape === "square") {
      push();
      translate(pickup.position.x, pickup.position.y);
      rotate(pickup.angle);
      rectMode(CENTER);
      rect(0, 0, PICKUP_SQUARE_SIZE, PICKUP_SQUARE_SIZE, 6);
      pop();
    } else {
      circle(pickup.position.x, pickup.position.y, PICKUP_RADIUS * 2);
    }
  }
  drawingContext.shadowBlur = 0;
}

function drawBall() {
  const size = PLAYER_SIZE * (1 + collectedPulse * 0.08);
  drawingContext.shadowBlur = 26 + collectedPulse * 35;
  drawingContext.shadowColor = "rgba(254, 217, 13, .36)";
  noStroke();
  fill("#FED90D");
  push();
  translate(ball.position.x, ball.position.y);
  rotate(ball.angle);
  rectMode(CENTER);
  rect(0, 0, size, size, PLAYER_CORNER_RADIUS);
  pop();
  drawingContext.shadowBlur = 0;
}

function keepMotionAlive(body, minimumSpeed, maximumSpeed) {
  const speed = Body.getSpeed(body);

  if (speed > maximumSpeed) {
    Body.setVelocity(body, {
      x: (body.velocity.x / speed) * maximumSpeed,
      y: (body.velocity.y / speed) * maximumSpeed,
    });
  } else if (speed < minimumSpeed && !mouseConstraint.body) {
    const direction = atan2(body.velocity.y, body.velocity.x) || random(TWO_PI);
    Body.applyForce(body, body.position, {
      x: cos(direction) * 0.000018,
      y: sin(direction) * 0.000018,
    });
  }
}

function resetGame() {
  resetVersion += 1;
  Composite.clear(world, false, true);
  score = 0;
  collectedPulse = 0;
  loopTarget = 0;
  slingFrames = 0;
  slingSide = 0;
  slingCooldown = 0;
  createWorld();
  World.add(world, mouseConstraint);
}
