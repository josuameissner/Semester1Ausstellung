const {
  Engine,
  World,
  Bodies,
  Body,
} = Matter;

const CANVAS_SIZE = 960;

const OUTERMOST_LINE_DURATION_SECONDS = 20;
const OUTER_LINE_DURATION_SECONDS = 15;
const MIDDLE_LINE_DURATION_SECONDS = 10;
const INNER_LINE_DURATION_SECONDS = 5;

const MILLISECONDS_PER_SECOND = 1000;

const FINAL_RESET_DELAY_MILLISECONDS = 7000;

const COLLISION_CATEGORY_BALL = 0x0001;
const COLLISION_CATEGORY_FRAGMENT = 0x0002;
const COLLISION_CATEGORY_ACTIVE_OUTLINE = 0x0004;
const COLLISION_CATEGORY_BOUNDARY = 0x0008;

let physicsEngine;
let watchface;
let controlMenu;

function setup() {
  createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  angleMode(RADIANS);
  frameRate(60);

  physicsEngine = Engine.create();
  physicsEngine.gravity.x = 0;
  physicsEngine.gravity.y = 0;

  physicsEngine.positionIterations = 14;
  physicsEngine.velocityIterations = 10;
  physicsEngine.constraintIterations = 4;

  // controlMenu = new ControlMenu();

  watchface = new QuadrupleGrowingCircleWatchface({
    engine: physicsEngine,
    canvasSize: CANVAS_SIZE,
    centerX: width / 2,
    centerY: height / 2,

    outermostRadius: 400,
    outerRadius: 330,
    middleRadius: 260,
    innerRadius: 190,

    outermostLineWeight: 18,
    outerLineWeight: 18,
    middleLineWeight: 18,
    innerLineWeight: 18,

    outermostDurationMilliseconds: OUTERMOST_LINE_DURATION_SECONDS * MILLISECONDS_PER_SECOND,
    outerDurationMilliseconds: OUTER_LINE_DURATION_SECONDS * MILLISECONDS_PER_SECOND,
    middleDurationMilliseconds: MIDDLE_LINE_DURATION_SECONDS * MILLISECONDS_PER_SECOND,
    innerDurationMilliseconds: INNER_LINE_DURATION_SECONDS * MILLISECONDS_PER_SECOND,

    backgroundColor: color(10, 12, 16),

    outermostLineColor: color('lightblue'),               //Linien Farben
    outerLineColor: color('lightblue'),
    middleLineColor: color('lightblue'),
    innerLineColor: color('lightblue'),
  });

  // controlMenu.setResetCallback(() => {
  //   watchface.reset();
  // });
}

function draw() {
  // controlMenu.update();

  const explosionSpeed = 0.8 //controlMenu.getExplosionSpeed();                              //Splitter Geschwindigkeit

  watchface.update(deltaTime, explosionSpeed);
  watchface.draw();
}

class ControlMenu {
  constructor() {
    this.resetCallback = null;

    this.panel = createDiv();
    this.panel.position(24, 24);
    this.panel.style('width', '250px');
    this.panel.style('padding', '16px');
    this.panel.style('box-sizing', 'border-box');
    this.panel.style('border-radius', '14px');
    this.panel.style('background', 'rgba(0, 0, 0, 0.68)');
    this.panel.style('color', '#ffffff');
    this.panel.style('font-family', 'Arial, sans-serif');
    this.panel.style('font-size', '14px');
    this.panel.style('user-select', 'none');

    this.title = createDiv('Watchface-Menü');
    this.title.parent(this.panel);
    this.title.style('font-weight', '700');
    this.title.style('font-size', '17px');
    this.title.style('margin-bottom', '14px');

    this.speedLabel = createDiv('');
    this.speedLabel.parent(this.panel);
    this.speedLabel.style('margin-bottom', '8px');

    this.speedSlider = createSlider(0.2, 3, 1, 0.1);
    this.speedSlider.parent(this.panel);
    this.speedSlider.style('width', '100%');
    this.speedSlider.style('margin-bottom', '14px');

    this.resetButton = createButton('Animation neu starten');
    this.resetButton.parent(this.panel);
    this.resetButton.style('width', '100%');
    this.resetButton.style('margin-bottom', '10px');
    this.resetButton.style('padding', '8px 10px');
    this.resetButton.style('border', '0');
    this.resetButton.style('border-radius', '8px');
    this.resetButton.style('background', '#ffffff');
    this.resetButton.style('color', '#111111');
    this.resetButton.style('cursor', 'pointer');
    this.resetButton.mousePressed(() => {
      if (this.resetCallback) {
        this.resetCallback();
      }
    });

    this.hideButton = createButton('Menü ausblenden');
    this.hideButton.parent(this.panel);
    this.hideButton.style('width', '100%');
    this.hideButton.style('padding', '8px 10px');
    this.hideButton.style('border', '1px solid rgba(0, 0, 0, 0.35)');
    this.hideButton.style('border-radius', '8px');
    this.hideButton.style('background', 'transparent');
    this.hideButton.style('color', '#ffffff');
    this.hideButton.style('cursor', 'pointer');
    this.hideButton.mousePressed(() => {
      this.hide();
    });

    this.showButton = createButton('Menü');
    this.showButton.position(24, 24);
    this.showButton.style('padding', '10px 14px');
    this.showButton.style('border', '0');
    this.showButton.style('border-radius', '10px');
    this.showButton.style('background', 'rgba(255, 255, 255, 0.9)');
    this.showButton.style('color', '#111111');
    this.showButton.style('font-family', 'Arial, sans-serif');
    this.showButton.style('font-size', '14px');
    this.showButton.style('cursor', 'pointer');
    this.showButton.mousePressed(() => {
      this.show();
    });
    this.showButton.hide();

    this.update();
  }

  setResetCallback(callback) {
    this.resetCallback = callback;
  }

  update() {
    const speed = this.getExplosionSpeed().toFixed(1);
    // const speed = 0.3;
    this.speedLabel.html(`Splitter-Geschwindigkeit: ${speed}x`);
  }

  getExplosionSpeed() {
    console.log(this.speedSlider.value())
    return Number(this.speedSlider.value());
  }

  hide() {
    this.panel.hide();
    this.showButton.show();
  }

  show() {
    this.panel.show();
    this.showButton.hide();
  }
}

class QuadrupleGrowingCircleWatchface {
  constructor(options) {
    this.engine = options.engine;
    this.world = this.engine.world;

    this.canvasSize = options.canvasSize;

    this.center = createVector(options.centerX, options.centerY);
    this.backgroundColor = options.backgroundColor;

    this.circleSettings = [
      {
        name: 'outermost',
        radius: options.outermostRadius,
        lineWeight: options.outermostLineWeight,
        durationMilliseconds: options.outermostDurationMilliseconds,
        lineColor: options.outermostLineColor,
        fragmentCount: 116,
      },
      {
        name: 'outer',
        radius: options.outerRadius,
        lineWeight: options.outerLineWeight,
        durationMilliseconds: options.outerDurationMilliseconds,
        lineColor: options.outerLineColor,
        fragmentCount: 96,
      },
      {
        name: 'middle',
        radius: options.middleRadius,
        lineWeight: options.middleLineWeight,
        durationMilliseconds: options.middleDurationMilliseconds,
        lineColor: options.middleLineColor,
        fragmentCount: 78,
      },
      {
        name: 'inner',
        radius: options.innerRadius,
        lineWeight: options.innerLineWeight,
        durationMilliseconds: options.innerDurationMilliseconds,
        lineColor: options.innerLineColor,
        fragmentCount: 56,
      },
    ];

    this.growingCircleLines = [];
    this.splinterFragments = [];

    this.destroyedCircleIndices = new Set();

    this.boundaryBodies = [];
    this.createBoundaryBodies();

    this.ballController = new ElasticBallController({
      world: this.world,
      canvasSize: this.canvasSize,
      centerX: this.center.x,
      centerY: this.center.y,
      circleSettings: this.circleSettings,
      ballRadius: 14,
    });

    this.finalFallStartTime = null;

    this.reset();
  }

  createBoundaryBodies() {
    const wallThickness = 90;

    const floor = Bodies.rectangle(
      this.canvasSize / 2,
      this.canvasSize + wallThickness / 2 - 16,
      this.canvasSize + wallThickness * 2,
      wallThickness,
      {
        isStatic: true,
        restitution: 0.05,
        friction: 0.95,
        frictionStatic: 1,
        collisionFilter: {
          category: COLLISION_CATEGORY_BOUNDARY,
          mask:
            COLLISION_CATEGORY_FRAGMENT |
            COLLISION_CATEGORY_BALL,
        },
      }
    );

    const leftWall = Bodies.rectangle(
      -wallThickness / 2,
      this.canvasSize / 2,
      wallThickness,
      this.canvasSize * 2,
      {
        isStatic: true,
        restitution: 0.05,
        friction: 0.95,
        frictionStatic: 1,
        collisionFilter: {
          category: COLLISION_CATEGORY_BOUNDARY,
          mask:
            COLLISION_CATEGORY_FRAGMENT |
            COLLISION_CATEGORY_BALL,
        },
      }
    );

    const rightWall = Bodies.rectangle(
      this.canvasSize + wallThickness / 2,
      this.canvasSize / 2,
      wallThickness,
      this.canvasSize * 2,
      {
        isStatic: true,
        restitution: 0.05,
        friction: 0.95,
        frictionStatic: 1,
        collisionFilter: {
          category: COLLISION_CATEGORY_BOUNDARY,
          mask:
            COLLISION_CATEGORY_FRAGMENT |
            COLLISION_CATEGORY_BALL,
        },
      }
    );

    this.boundaryBodies = [
      floor,
      leftWall,
      rightWall,
    ];

    this.boundaryBodies.forEach((boundaryBody) => {
      World.add(this.world, boundaryBody);
    });
  }

  reset() {
    this.clearSplinterFragments();

    this.ballController.reset();

    const startTime = millis();

    this.destroyedCircleIndices = new Set();

    this.growingCircleLines = this.circleSettings.map((circleSetting) => {
      return new GrowingCircleLine({
        centerX: this.center.x,
        centerY: this.center.y,
        radius: circleSetting.radius,
        lineWeight: circleSetting.lineWeight,
        durationMilliseconds: circleSetting.durationMilliseconds,
        lineColor: circleSetting.lineColor,
        startTime,
      });
    });

    this.finalFallStartTime = null;
  }

  update(timeStepMilliseconds, explosionSpeed) {
    this.updateGrowingLines();

    this.updateFallingFragments(timeStepMilliseconds, explosionSpeed);

    const activeCircleIndex = this.ballController.getActiveCircleIndex();

    if (activeCircleIndex !== null) {
      this.ballController.updateDuringGrowing(
        timeStepMilliseconds,
        explosionSpeed,
        this.growingCircleLines[activeCircleIndex]
      );
    } else {
      this.ballController.updateDuringFinalFalling(
        timeStepMilliseconds,
        explosionSpeed
      );
    }

    this.destroyClosedCirclesInOrder();

    const shouldUpdatePhysics =
      this.ballController.hasActiveBody() ||
      this.splinterFragments.length > 0;

    if (shouldUpdatePhysics) {
      Engine.update(this.engine, timeStepMilliseconds * explosionSpeed);
    }

    this.ballController.keepBallInsideActiveCircle();

    this.removeObjectsThatHaveFallenOut();

    if (this.shouldRestartAfterFinalFall()) {
      this.reset();
    }
  }

  draw() {
    background(this.backgroundColor);

    this.drawSplinterFragments();
    this.drawGrowingLines();
    this.ballController.draw();
  }

  updateGrowingLines() {
    this.growingCircleLines.forEach((growingCircleLine, index) => {
      if (!this.destroyedCircleIndices.has(index)) {
        growingCircleLine.update();
      }
    });
  }

  drawGrowingLines() {
    this.growingCircleLines.forEach((growingCircleLine, index) => {
      if (!this.destroyedCircleIndices.has(index)) {
        growingCircleLine.draw();
      }
    });
  }

  destroyClosedCirclesInOrder() {
    const destructionOrder = [];

    for (let index = this.circleSettings.length - 1; index >= 0; index -= 1) {
      destructionOrder.push(index);
    }

    for (let i = 0; i < destructionOrder.length; i += 1) {
      const circleIndex = destructionOrder[i];

      if (this.destroyedCircleIndices.has(circleIndex)) {
        continue;
      }

      const growingCircleLine = this.growingCircleLines[circleIndex];

      if (growingCircleLine.isClosed()) {
        this.destroyCircle(circleIndex);
        break;
      }
    }
  }

  destroyCircle(circleIndex) {
    this.destroyedCircleIndices.add(circleIndex);

    const circleSetting = this.circleSettings[circleIndex];

    const fragments = this.createFragmentsForCircle(circleSetting);

    fragments.forEach((fragment) => {
      this.splinterFragments.push(fragment);
      World.add(this.world, fragment.body);
    });

    this.ballController.handleCircleDestroyed(circleIndex);

    const newActiveCircleIndex = this.ballController.getActiveCircleIndex();

    if (newActiveCircleIndex !== null) {
      this.ballController.syncActiveCircleOutline(
        this.growingCircleLines[newActiveCircleIndex].progress,
        true
      );
    }

    if (circleIndex === 0) {
      this.finalFallStartTime = millis();
      this.ballController.startFalling();
    }
  }

  createFragmentsForCircle(circleSetting) {
    const fragments = [];
    const angleStep = TWO_PI / circleSetting.fragmentCount;
    const startAngle = -HALF_PI;

    for (let index = 0; index < circleSetting.fragmentCount; index += 1) {
      const fragmentStartAngle = startAngle + index * angleStep;
      const fragmentEndAngle = fragmentStartAngle + angleStep * random(0.44, 0.76);
      const fragmentMiddleAngle = (fragmentStartAngle + fragmentEndAngle) / 2;

      const fragmentRadius = circleSetting.radius;

      const fragmentCenterX = this.center.x + cos(fragmentMiddleAngle) * fragmentRadius;
      const fragmentCenterY = this.center.y + sin(fragmentMiddleAngle) * fragmentRadius;

      const fragmentLength = circleSetting.radius * (fragmentEndAngle - fragmentStartAngle);
      const tangentAngle = fragmentMiddleAngle + HALF_PI;

      const body = Bodies.rectangle(
        fragmentCenterX,
        fragmentCenterY,
        fragmentLength,
        circleSetting.lineWeight,
        {
          frictionAir: 0.022,
          restitution: 0.08,
          friction: 0.82,
          frictionStatic: 1,
          density: 0.0014,
          slop: 0.01,
          collisionFilter: {
            category: COLLISION_CATEGORY_FRAGMENT,
            mask:
              COLLISION_CATEGORY_FRAGMENT |
              COLLISION_CATEGORY_BALL |
              COLLISION_CATEGORY_ACTIVE_OUTLINE |
              COLLISION_CATEGORY_BOUNDARY,
          },
        }
      );

      Body.setAngle(body, tangentAngle);

      const downwardSpeed = random(2.6, 5.6);
      const sideSpeed = random(-3.8, 3.8);
      const radialBurstSpeed = random(-1.2, 2.8);

      const radialDirection = createVector(
        cos(fragmentMiddleAngle),
        sin(fragmentMiddleAngle)
      );

      Body.setVelocity(body, {
        x: sideSpeed + radialDirection.x * radialBurstSpeed,
        y: downwardSpeed + radialDirection.y * radialBurstSpeed,
      });

      Body.setAngularVelocity(body, random(-0.28, 0.28));

      fragments.push(new SplinterFragment({
        body,
        length: fragmentLength,
        lineWeight: circleSetting.lineWeight,
        lineColor: circleSetting.lineColor,
      }));
    }

    return fragments;
  }

  updateFallingFragments(timeStepMilliseconds, explosionSpeed) {
    if (this.splinterFragments.length === 0) {
      return;
    }

    const frameScale = constrain(
      timeStepMilliseconds / (1000 / 60),
      0.25,
      2.5
    );

    const isFinalFall = this.finalFallStartTime !== null;

    const gravityStrength =
      (isFinalFall ? 0.36 : 0.24) *
      frameScale *
      explosionSpeed;

    const maximumFallSpeed = isFinalFall ? 16 : 13;

    this.splinterFragments.forEach((splinterFragment) => {
      const body = splinterFragment.body;

      const extraScatterX = isFinalFall
        ? random(-0.11, 0.11) * frameScale * explosionSpeed
        : random(-0.035, 0.035) * frameScale * explosionSpeed;

      const extraRotation = isFinalFall
        ? random(-0.012, 0.012) * frameScale * explosionSpeed
        : random(-0.004, 0.004) * frameScale * explosionSpeed;

      Body.setVelocity(body, {
        x: constrain(
          body.velocity.x * 0.992 + extraScatterX,
          -12,
          12
        ),
        y: min(body.velocity.y + gravityStrength, maximumFallSpeed),
      });

      Body.setAngularVelocity(
        body,
        constrain(
          body.angularVelocity + extraRotation,
          -0.45,
          0.45
        )
      );
    });
  }

  removeObjectsThatHaveFallenOut() {
    this.removeFragmentsThatHaveFallenOut();
    this.ballController.removeBallIfOutsideCanvas();
  }

  removeFragmentsThatHaveFallenOut() {
    if (this.splinterFragments.length === 0) {
      return;
    }

    const margin = 420;

    const remainingFragments = [];

    this.splinterFragments.forEach((splinterFragment) => {
      const body = splinterFragment.body;

      const isVeryFarBelowCanvas =
        body.position.y - splinterFragment.lineWeight > this.canvasSize + margin;

      const isVeryFarOutsideHorizontally =
        body.position.x < -this.canvasSize ||
        body.position.x > this.canvasSize * 2;

      if (isVeryFarBelowCanvas || isVeryFarOutsideHorizontally) {
        World.remove(this.world, body);
      } else {
        remainingFragments.push(splinterFragment);
      }
    });

    this.splinterFragments = remainingFragments;
  }

  drawSplinterFragments() {
    this.splinterFragments.forEach((splinterFragment) => {
      splinterFragment.draw();
    });
  }

  shouldRestartAfterFinalFall() {
    if (this.finalFallStartTime === null) {
      return false;
    }

    const elapsedMilliseconds = millis() - this.finalFallStartTime;
    return elapsedMilliseconds >= FINAL_RESET_DELAY_MILLISECONDS;
  }

  clearSplinterFragments() {
    this.splinterFragments.forEach((splinterFragment) => {
      World.remove(this.world, splinterFragment.body);
    });

    this.splinterFragments = [];
  }
}

class GrowingCircleLine {
  constructor(options) {
    this.center = createVector(options.centerX, options.centerY);
    this.radius = options.radius;
    this.lineWeight = options.lineWeight;
    this.durationMilliseconds = options.durationMilliseconds;
    this.lineColor = options.lineColor;

    this.startAngle = -HALF_PI;
    this.currentEndAngle = this.startAngle;

    this.startTime = options.startTime;
    this.progress = 0;

    this.minimumVisibleProgress = 0.004;
  }

  update() {
    const elapsedMilliseconds = millis() - this.startTime;

    this.progress = constrain(
      elapsedMilliseconds / this.durationMilliseconds,
      0,
      1
    );

    const visibleProgress = max(this.progress, this.minimumVisibleProgress);
    this.currentEndAngle = this.startAngle + TWO_PI * visibleProgress;
  }

  draw() {
    if (this.isClosed()) {
      this.drawClosedCircle();
      return;
    }

    this.drawGrowingArc();
  }

  isClosed() {
    return this.progress >= 1;
  }

  drawGrowingArc() {
    push();

    noFill();
    stroke(this.lineColor);
    strokeWeight(this.lineWeight);
    strokeCap(SQUARE);

    arc(
      this.center.x,
      this.center.y,
      this.radius * 2,
      this.radius * 2,
      this.startAngle,
      this.currentEndAngle
    );

    pop();
  }

  drawClosedCircle() {
    push();

    noFill();
    stroke(this.lineColor);
    strokeWeight(this.lineWeight);
    strokeCap(SQUARE);

    circle(
      this.center.x,
      this.center.y,
      this.radius * 2
    );

    pop();
  }
}

class SplinterFragment {
  constructor(options) {
    this.body = options.body;
    this.length = options.length;
    this.lineWeight = options.lineWeight;
    this.lineColor = options.lineColor;
  }

  draw() {
    push();

    translate(this.body.position.x, this.body.position.y);
    rotate(this.body.angle);

    stroke(this.lineColor);
    strokeWeight(this.lineWeight);
    strokeCap(SQUARE);
    noFill();

    line(
      -this.length / 2,
      0,
      this.length / 2,
      0
    );

    pop();
  }
}

class ElasticBallController {
  constructor(options) {
    this.world = options.world;
    this.canvasSize = options.canvasSize;

    this.center = createVector(options.centerX, options.centerY);
    this.circleSettings = options.circleSettings;
    this.ballRadius = options.ballRadius;

    this.ballBody = null;

    // Sichtbare, wachsende Kollisionsstücke für Splitter.
    this.outlineBodies = [];

    // Unsichtbare vollständige Kreis-Outline nur für den Ball.
    // Diese verhindert, dass der Ball aus dem aktiven Kreis springt.
    this.containmentOutlineBodies = [];

    this.state = 'idle';

    this.activeCircleIndex = this.circleSettings.length - 1;

    this.launchProgress = 0.82;
    this.startAngle = -HALF_PI;

    this.outlineSegmentCount = 128;
    this.containmentSegmentCount = 192;

    this.lastOutlineProgress = -1;
    this.lastOutlineCircleIndex = null;
    this.lastContainmentCircleIndex = null;
  }

  reset() {
    this.clear();

    this.state = 'idle';
    this.activeCircleIndex = this.circleSettings.length - 1;

    this.lastOutlineProgress = -1;
    this.lastOutlineCircleIndex = null;
    this.lastContainmentCircleIndex = null;
  }

  clear() {
    this.removeOutlineBodies();
    this.removeContainmentOutlineBodies();

    if (this.ballBody) {
      World.remove(this.world, this.ballBody);
      this.ballBody = null;
    }
  }

  getActiveCircleIndex() {
    return this.activeCircleIndex;
  }

  getActiveCircleSetting() {
    if (this.activeCircleIndex === null) {
      return null;
    }

    return this.circleSettings[this.activeCircleIndex];
  }

  updateDuringGrowing(timeStepMilliseconds, explosionSpeed, activeCircleLine) {
    if (!activeCircleLine) {
      return;
    }

    if (this.state === 'idle') {
      const shouldLaunchBall =
        activeCircleLine.progress >= this.launchProgress &&
        activeCircleLine.progress < 1;

      if (shouldLaunchBall) {
        this.launchBall(activeCircleLine.progress);
      }

      return;
    }

    if (this.state === 'bouncing') {
      this.syncActiveCircleOutline(activeCircleLine.progress);
      this.syncContainmentOutline(true);

      this.addRandomBallJitter(timeStepMilliseconds, explosionSpeed);
      this.keepBallEnergeticInsideCircle();
      this.keepBallInsideActiveCircle();
    }
  }

  updateDuringFinalFalling(timeStepMilliseconds, explosionSpeed) {
    if (this.state !== 'falling') {
      this.startFalling();
    }

    this.applyBallGravity(timeStepMilliseconds, explosionSpeed);
  }

  launchBall(currentProgress) {
    this.state = 'bouncing';

    const circleSetting = this.getActiveCircleSetting();

    const spawnAngle = random(TWO_PI);
    const spawnDistance = random(
      circleSetting.radius * 0.12,
      circleSetting.radius * 0.45
    );

    const spawnX = this.center.x + cos(spawnAngle) * spawnDistance;
    const spawnY = this.center.y + sin(spawnAngle) * spawnDistance;

    this.ballBody = Bodies.circle(
      spawnX,
      spawnY,
      this.ballRadius,
      {
        restitution: 0.92,
        friction: 0.02,
        frictionStatic: 0,
        frictionAir: 0.0008,
        density: 0.004,
        slop: 0.001,
        collisionFilter: {
          category: COLLISION_CATEGORY_BALL,
          mask:
            COLLISION_CATEGORY_ACTIVE_OUTLINE |
            COLLISION_CATEGORY_FRAGMENT |
            COLLISION_CATEGORY_BOUNDARY,
        },
      }
    );

    const launchAngle = random(TWO_PI);
    const launchSpeed = random(8.2, 10.6);

    Body.setVelocity(this.ballBody, {
      x: cos(launchAngle) * launchSpeed,
      y: sin(launchAngle) * launchSpeed,
    });

    Body.setAngularVelocity(this.ballBody, random(-0.22, 0.22));

    World.add(this.world, this.ballBody);

    this.syncContainmentOutline(true);
    this.syncActiveCircleOutline(currentProgress, true);
    this.keepBallInsideActiveCircle();
  }

  handleCircleDestroyed(destroyedCircleIndex) {
    if (destroyedCircleIndex !== this.activeCircleIndex) {
      return;
    }

    this.removeOutlineBodies();
    this.removeContainmentOutlineBodies();

    if (destroyedCircleIndex > 0) {
      this.activeCircleIndex = destroyedCircleIndex - 1;
      this.state = 'bouncing';

      this.lastOutlineProgress = -1;
      this.lastOutlineCircleIndex = null;
      this.lastContainmentCircleIndex = null;

      this.syncContainmentOutline(true);
      this.kickBallTowardNewOuterCircle();
      this.keepBallInsideActiveCircle();

      return;
    }

    this.activeCircleIndex = null;
    this.startFalling();
  }

  kickBallTowardNewOuterCircle() {
    if (!this.ballBody) {
      return;
    }

    const circleSetting = this.getActiveCircleSetting();

    let angleFromCenter = atan2(
      this.ballBody.position.y - this.center.y,
      this.ballBody.position.x - this.center.x
    );

    if (!isFinite(angleFromCenter)) {
      angleFromCenter = random(TWO_PI);
    }

    angleFromCenter += random(-0.6, 0.6);

    const outwardSpeed = random(7.6, 9.8);
    const tangentSpeed = random(-3.1, 3.1);

    const outward = createVector(
      cos(angleFromCenter),
      sin(angleFromCenter)
    );

    const tangent = createVector(
      cos(angleFromCenter + HALF_PI),
      sin(angleFromCenter + HALF_PI)
    );

    Body.setVelocity(this.ballBody, {
      x: outward.x * outwardSpeed + tangent.x * tangentSpeed,
      y: outward.y * outwardSpeed + tangent.y * tangentSpeed,
    });

    const distanceToCenter = dist(
      this.ballBody.position.x,
      this.ballBody.position.y,
      this.center.x,
      this.center.y
    );

    const minimumDistance = circleSetting.radius * 0.25;

    if (distanceToCenter < minimumDistance) {
      Body.setPosition(this.ballBody, {
        x: this.center.x + outward.x * minimumDistance,
        y: this.center.y + outward.y * minimumDistance,
      });
    }
  }

  hasBallEnteredActiveCircle() {
    if (!this.ballBody) {
      return false;
    }

    const circleSetting = this.getActiveCircleSetting();

    if (!circleSetting) {
      return false;
    }

    const distanceToCenter = dist(
      this.ballBody.position.x,
      this.ballBody.position.y,
      this.center.x,
      this.center.y
    );

    return distanceToCenter < circleSetting.radius - circleSetting.lineWeight * 1.6;
  }

  syncActiveCircleOutline(progress, forceUpdate = false) {
    const circleSetting = this.getActiveCircleSetting();

    if (!circleSetting) {
      return;
    }

    const outlineProgress = constrain(progress, 0, 1);

    if (
      !forceUpdate &&
      this.lastOutlineCircleIndex === this.activeCircleIndex &&
      abs(outlineProgress - this.lastOutlineProgress) < 0.008
    ) {
      return;
    }

    this.lastOutlineProgress = outlineProgress;
    this.lastOutlineCircleIndex = this.activeCircleIndex;

    this.removeOutlineBodies();

    const totalVisibleAngle = TWO_PI * outlineProgress;
    const maximumSegmentAngle = TWO_PI / this.outlineSegmentCount;

    let travelledAngle = 0;

    while (travelledAngle < totalVisibleAngle - 0.0001) {
      const segmentAngle = min(
        maximumSegmentAngle,
        totalVisibleAngle - travelledAngle
      );

      const segmentMiddleAngle =
        this.startAngle +
        travelledAngle +
        segmentAngle / 2;

      const segmentCenterX =
        this.center.x +
        cos(segmentMiddleAngle) * circleSetting.radius;

      const segmentCenterY =
        this.center.y +
        sin(segmentMiddleAngle) * circleSetting.radius;

      const segmentLength = circleSetting.radius * segmentAngle;
      const segmentThickness = circleSetting.lineWeight;
      const tangentAngle = segmentMiddleAngle + HALF_PI;

      const outlineBody = Bodies.rectangle(
        segmentCenterX,
        segmentCenterY,
        segmentLength,
        segmentThickness,
        {
          isStatic: true,
          restitution: 0.82,
          friction: 0.16,
          frictionStatic: 0,
          collisionFilter: {
            category: COLLISION_CATEGORY_ACTIVE_OUTLINE,

            // Diese sichtbaren Teilstücke kollidieren nur mit Splittern.
            // Der Ball wird separat durch die vollständige unsichtbare
            // Containment-Outline im Kreis gehalten.
            mask:
              COLLISION_CATEGORY_FRAGMENT,
          },
        }
      );

      Body.setAngle(outlineBody, tangentAngle);

      this.outlineBodies.push(outlineBody);
      World.add(this.world, outlineBody);

      travelledAngle += segmentAngle;
    }
  }

  syncContainmentOutline(forceUpdate = false) {
    const circleSetting = this.getActiveCircleSetting();

    if (!circleSetting) {
      return;
    }

    if (
      !forceUpdate &&
      this.lastContainmentCircleIndex === this.activeCircleIndex &&
      this.containmentOutlineBodies.length > 0
    ) {
      return;
    }

    this.removeContainmentOutlineBodies();

    this.lastContainmentCircleIndex = this.activeCircleIndex;

    const segmentAngle = TWO_PI / this.containmentSegmentCount;

    for (let index = 0; index < this.containmentSegmentCount; index += 1) {
      const segmentMiddleAngle = this.startAngle + index * segmentAngle + segmentAngle / 2;

      const segmentCenterX =
        this.center.x +
        cos(segmentMiddleAngle) * circleSetting.radius;

      const segmentCenterY =
        this.center.y +
        sin(segmentMiddleAngle) * circleSetting.radius;

      const segmentLength = circleSetting.radius * segmentAngle * 1.08;
      const segmentThickness = circleSetting.lineWeight + 6;
      const tangentAngle = segmentMiddleAngle + HALF_PI;

      const containmentBody = Bodies.rectangle(
        segmentCenterX,
        segmentCenterY,
        segmentLength,
        segmentThickness,
        {
          isStatic: true,
          restitution: 0.96,
          friction: 0.015,
          frictionStatic: 0,
          slop: 0.0005,
          collisionFilter: {
            category: COLLISION_CATEGORY_ACTIVE_OUTLINE,

            // Wichtig:
            // Diese vollständige Outline kollidiert nur mit dem Ball.
            mask:
              COLLISION_CATEGORY_BALL,
          },
        }
      );

      Body.setAngle(containmentBody, tangentAngle);

      this.containmentOutlineBodies.push(containmentBody);
      World.add(this.world, containmentBody);
    }
  }

  removeContainmentOutlineBodies() {
    this.containmentOutlineBodies.forEach((containmentBody) => {
      World.remove(this.world, containmentBody);
    });

    this.containmentOutlineBodies = [];
  }

  addRandomBallJitter(timeStepMilliseconds, explosionSpeed) {
    if (!this.ballBody || this.state !== 'bouncing') {
      return;
    }

    const frameScale = constrain(
      timeStepMilliseconds / (1000 / 60),
      0.25,
      2.5
    );

    const jitterStrength = 0.09 * frameScale * explosionSpeed;

    Body.setVelocity(this.ballBody, {
      x: constrain(
        this.ballBody.velocity.x + random(-jitterStrength, jitterStrength),
        -14,
        14
      ),
      y: constrain(
        this.ballBody.velocity.y + random(-jitterStrength, jitterStrength),
        -14,
        14
      ),
    });
  }

  keepBallEnergeticInsideCircle() {
    if (!this.ballBody || this.state !== 'bouncing') {
      return;
    }

    const velocity = this.ballBody.velocity;
    const speed = sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

    if (speed < 6.2) {
      const randomAngle = random(TWO_PI);
      const newSpeed = random(7.2, 9.4);

      Body.setVelocity(this.ballBody, {
        x: cos(randomAngle) * newSpeed,
        y: sin(randomAngle) * newSpeed,
      });
    }
  }

  keepBallInsideActiveCircle() {
    if (!this.ballBody || this.activeCircleIndex === null) {
      return;
    }

    const circleSetting = this.getActiveCircleSetting();

    if (!circleSetting) {
      return;
    }

    const dx = this.ballBody.position.x - this.center.x;
    const dy = this.ballBody.position.y - this.center.y;
    let distanceToCenter = sqrt(dx * dx + dy * dy);

    if (distanceToCenter <= 0.0001) {
      distanceToCenter = 0.0001;
    }

    const normalX = dx / distanceToCenter;
    const normalY = dy / distanceToCenter;

    const maximumAllowedDistance =
      circleSetting.radius -
      this.ballRadius -
      circleSetting.lineWeight * 0.62;

    const nearOutlineDistance =
      circleSetting.radius -
      this.ballRadius -
      circleSetting.lineWeight * 1.05;

    const velocity = this.ballBody.velocity;

    const radialVelocity =
      velocity.x * normalX +
      velocity.y * normalY;

    const ballIsTooFarOutside = distanceToCenter > maximumAllowedDistance;
    const ballIsCloseAndMovingOutward =
      distanceToCenter > nearOutlineDistance &&
      radialVelocity > 0;

    if (!ballIsTooFarOutside && !ballIsCloseAndMovingOutward) {
      return;
    }

    const correctedX = this.center.x + normalX * maximumAllowedDistance;
    const correctedY = this.center.y + normalY * maximumAllowedDistance;

    Body.setPosition(this.ballBody, {
      x: correctedX,
      y: correctedY,
    });

    const tangentDirection = random([-1, 1]);

    const tangentX = -normalY * tangentDirection;
    const tangentY = normalX * tangentDirection;

    const currentSpeed = sqrt(
      velocity.x * velocity.x +
      velocity.y * velocity.y
    );

    const bounceSpeed = constrain(
      max(currentSpeed, random(7.4, 10.2)),
      7.4,
      12.5
    );

    const inwardPart = random(0.62, 0.86);
    const tangentPart = sqrt(1 - inwardPart * inwardPart);

    Body.setVelocity(this.ballBody, {
      x:
        -normalX * bounceSpeed * inwardPart +
        tangentX * bounceSpeed * tangentPart,
      y:
        -normalY * bounceSpeed * inwardPart +
        tangentY * bounceSpeed * tangentPart,
    });

    Body.setAngularVelocity(
      this.ballBody,
      random(-0.32, 0.32)
    );
  }

  startFalling() {
    if (!this.ballBody) {
      return;
    }

    this.state = 'falling';

    this.activeCircleIndex = null;
    this.removeOutlineBodies();
    this.removeContainmentOutlineBodies();

    Body.setVelocity(this.ballBody, {
      x: this.ballBody.velocity.x * 0.45,
      y: max(this.ballBody.velocity.y, 2.5),
    });

    Body.setAngularVelocity(
      this.ballBody,
      this.ballBody.angularVelocity * 0.55
    );
  }

  removeOutlineBodies() {
    this.outlineBodies.forEach((outlineBody) => {
      World.remove(this.world, outlineBody);
    });

    this.outlineBodies = [];
  }

  applyBallGravity(timeStepMilliseconds, explosionSpeed) {
    if (!this.ballBody) {
      return;
    }

    const frameScale = constrain(
      timeStepMilliseconds / (1000 / 60),
      0.25,
      2.5
    );

    const gravityStrength = 0.34 * frameScale * explosionSpeed;

    Body.setVelocity(this.ballBody, {
      x: this.ballBody.velocity.x * 0.996,
      y: min(this.ballBody.velocity.y + gravityStrength, 20),
    });
  }

  removeBallIfOutsideCanvas() {
    if (!this.ballBody) {
      return;
    }

    const margin = 420;

    const isCompletelyBelowCanvas =
      this.ballBody.position.y - this.ballRadius > this.canvasSize + margin;

    const isFarOutsideHorizontally =
      this.ballBody.position.x < -this.canvasSize ||
      this.ballBody.position.x > this.canvasSize * 2;

    if (isCompletelyBelowCanvas || isFarOutsideHorizontally) {
      World.remove(this.world, this.ballBody);
      this.ballBody = null;
    }
  }

  draw() {
    this.drawBall();
  }

  drawBall() {
    if (!this.ballBody) {
      return;
    }

    const position = this.ballBody.position;

    push();

    translate(position.x, position.y);
    rotate(this.ballBody.angle);

    noStroke();
    fill('white');

    ellipse(
      0,
      0,
      this.ballRadius * 2,
      this.ballRadius * 2
    );

    pop();
  }

  hasActiveBody() {
    return this.ballBody !== null;
  }
}
