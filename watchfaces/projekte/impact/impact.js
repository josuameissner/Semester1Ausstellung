const { Engine, Bodies, Body, Composite, World } = Matter;

let engine, world;

// Parameter
const ballRadius = 40;
const center = { x: 480, y: 480 };
const baseInnerDist = 260;
const spawnDist = 520;
const shootSpeed = 6;
const delayBetweenShots = 1000;
const magnetDuration = 500;
const magnetStrength = 0.0001;
const magnetRadius = 2000;
const BALL = 2 * ballRadius;

// Farben
const COLOR_DEFAULT = '#ffffff';
const COLOR_SHOOTER = '#00E5FF';
const BLUE_SPEED = 1.5;

const onAxis = (angle, d) => ({
    x: center.x + Math.cos(angle) * d,
    y: center.y + Math.sin(angle) * d
});

// Globale Drehung
const ROTATION_OFFSET = -Math.PI / 3;

// 6 Schienen
const rails = Array.from({ length: 6 }, (_, i) => {
    const closer = i < 3;
    const angle = i * Math.PI / 3 + ROTATION_OFFSET;
    const innerDist = closer ? baseInnerDist - BALL : baseInnerDist;
    const outerDist = innerDist + BALL;
    const offset = closer ? +BALL : -BALL;
    return {
        angle, cos: Math.cos(angle), sin: Math.sin(angle),
        innerDist, outerDist,
        magnets: [
            { pos: onAxis(angle, innerDist + offset), active: false },
            { pos: onAxis(angle, outerDist + offset), active: false },
        ],
    };
});
const numRails = rails.length;

let magnetTimeouts = [];

function activateMagnetsForAxis(railAngle) {
    rails.forEach(rail => {
        let diff = Math.abs(rail.angle - railAngle) % (2 * Math.PI);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        if (diff > 0.01 && Math.abs(diff - Math.PI) > 0.01) return;
        rail.magnets.forEach(m => {
            m.active = true;
            magnetTimeouts.push(setTimeout(() => m.active = false, magnetDuration));
        });
    });
}

const ballOptions = {
    restitution: 1.0, friction: 0, frictionAir: 0, frictionStatic: 0,
    density: 0.01, slop: 0.005, inertia: Infinity
};

function createRailBall(rail, d, color = COLOR_DEFAULT) {
    const p = onAxis(rail.angle, d);
    const ball = Bodies.circle(p.x, p.y, ballRadius, ballOptions);
    ball.railIndex = rails.indexOf(rail);
    ball.color = color; // Farbe wird jetzt selbst verwaltet statt über Matter.render
    return ball;
}

// Zustand
let shootIndex = 0;
let shootTimeout = null;

function setupWorld() {
    if (shootTimeout) clearTimeout(shootTimeout);
    magnetTimeouts.forEach(clearTimeout);
    magnetTimeouts = [];
    rails.forEach(r => r.magnets.forEach(m => m.active = false));

    Composite.clear(world, false);
    shootIndex = 0;

    rails.forEach(rail => World.add(world, [
        createRailBall(rail, rail.innerDist),
        createRailBall(rail, rail.outerDist),
    ]));

    updateStatus();
    shootTimeout = setTimeout(shootNext, 1200);
}

function shootNext() {
    const rail = rails[shootIndex % numRails];
    const shooter = createRailBall(rail, spawnDist, COLOR_SHOOTER);
    World.add(world, shooter);
    Body.setVelocity(shooter, { x: -rail.cos * shootSpeed, y: -rail.sin * shootSpeed });

    shootIndex++;
    updateStatus();
    shootTimeout = setTimeout(shootNext, delayBetweenShots);
}

function updateStatus() {
    const el = document.getElementById('status');
    if (!el) return;
    const pos = ((shootIndex - 1) % numRails) + 1;
    el.textContent = shootIndex === 0 ? 'Bereit...' : `Schuss ${shootIndex} → Position ${pos}`;
}

// Schienen-Logik & Magnete
function applyMagnetsAndRails() {
    const bodies = Composite.allBodies(world);

    rails.forEach((rail, ri) => {
        rail.magnets.forEach(magnet => {
            if (!magnet.active) return;

            let target = null, best = Infinity;
            for (const b of bodies) {
                if (b.railIndex !== ri) continue;
                const d = Math.hypot(magnet.pos.x - b.position.x, magnet.pos.y - b.position.y);
                if (d < best) { best = d; target = b; }
            }
            if (!target || best <= 1 || best >= magnetRadius) return;

            const dx = magnet.pos.x - target.position.x;
            const dy = magnet.pos.y - target.position.y;
            const f = magnetStrength * target.mass / best;
            Body.applyForce(target, target.position, { x: dx / best * f, y: dy / best * f });

            if (best < 40) {
                Body.setVelocity(target, { x: target.velocity.x * 0.5, y: target.velocity.y * 0.5 });
            }
        });
    });

    bodies.forEach(body => {
        if (body.railIndex === undefined) return;
        const { cos, sin, angle } = rails[body.railIndex];

        const along = (body.position.x - center.x) * cos + (body.position.y - center.y) * sin;
        Body.setPosition(body, { x: center.x + cos * along, y: center.y + sin * along });

        const vAlong = body.velocity.x * cos + body.velocity.y * sin;
        Body.setVelocity(body, { x: cos * vAlong, y: sin * vAlong });

        body.color = Math.abs(vAlong) > BLUE_SPEED ? COLOR_SHOOTER : COLOR_DEFAULT;

        if (Math.abs(along) > 700) {
            World.remove(world, body);
            activateMagnetsForAxis(angle);
        }
    });
}

// Setup & Draw
function setup() {
    const canvas = createCanvas(960, 960);
    canvas.parent('container');

    engine = Engine.create();
    engine.gravity.x = engine.gravity.y = 0;
    engine.positionIterations = 12;
    engine.velocityIterations = 12;
    world = engine.world;

    setupWorld();
}

function draw() {
    background(0);

    Engine.update(engine);
    applyMagnetsAndRails();

    noStroke();
    Composite.allBodies(world).forEach(body => {
        fill(body.color || COLOR_DEFAULT);
        circle(body.position.x, body.position.y, ballRadius * 2);
    });
}