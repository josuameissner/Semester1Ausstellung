// Weltall Final

let Engine = Matter.Engine;
let World = Matter.World;
let Bodies = Matter.Bodies;
let Body = Matter.Body;
let Events = Matter.Events;
let ballZaehler = 0;

let engine;
let world;

let kugel;
let cyanBaelle = [];

let cx, cy;
let rx = 260;
let ry = 150;

let winkel = 0;
let letzteKugelZeit = 0;

function setup() {
  createCanvas(960, 960);

  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 0;

  cx = width / 2;
  cy = height / 2;

  kugel = Bodies.circle(cx + rx, cy, 40, {
    restitution: 0.9,
    frictionAir: 0.04,
    label: "kugel"
  });

  World.add(world, kugel);

  Events.on(engine, "collisionStart", function(event) {
  for (let pair of event.pairs) {
    let a = pair.bodyA;
    let b = pair.bodyB;

    if (
      (a.label === "kugel" && b.label === "cyan") ||
      (a.label === "cyan" && b.label === "kugel")
    ) {
      let cyan = a.label === "cyan" ? a : b;

      let dx = kugel.position.x - cyan.position.x;
      let dy = kugel.position.y - cyan.position.y;
      let d = sqrt(dx * dx + dy * dy);

      if (d > 0) {
        Body.setVelocity(kugel, {
  x: (dx / d) * 18,
  y: (dy / d) * 18
});

      }

      World.remove(world, cyan);

      let index = cyanBaelle.indexOf(cyan);
      if (index !== -1) {
        cyanBaelle.splice(index, 1);
      }
    }
  }
});

}

function draw() {
  background("#000000");

  Engine.update(engine);

  cx = width / 2;
  cy = height / 2;

  stroke("#8C8C8C");
strokeWeight(3);
noFill();

beginShape();
for (let i = 0; i <= 360; i++) {
  let a = map(i, 0, 360, 0, TWO_PI);

  let x = cx + cos(a) * rx;
  let y = cy + sin(a * 3) * ry;

  vertex(x, y);
}
endShape(CLOSE);



  winkel += 0.004;

 
  let zielX = cx + cos(winkel) * rx;
let zielY = cy + sin(winkel * 3) * ry;



  let kraftX = (zielX - kugel.position.x) * 0.0009;
  let kraftY = (zielY - kugel.position.y) * 0.0009;

  Body.applyForce(kugel, kugel.position, {
    x: kraftX,
    y: kraftY
  });

  if (millis() - letzteKugelZeit > 1000) {
    erstelleCyanBall();
    letzteKugelZeit = millis();
  }

  zeichneKugel(kugel, "#3DD6F5");

  for (let i = cyanBaelle.length - 1; i >= 0; i--) {
    let b = cyanBaelle[i];

    if (b.zielBall) {
  let dx = kugel.position.x - b.position.x;
  let dy = kugel.position.y - b.position.y;
  let d = sqrt(dx * dx + dy * dy);

  if (d > 0) {
    Body.setVelocity(b, {
      x: (dx / d) * 6,
      y: (dy / d) * 6
    });
  }
}


    if (b.istCyan) {
  zeichneKugel(b,"#3DD6F5");
} else {
  zeichneKugel(b, "#8C8C8C");
}


    if (
      b.position.x < -100 ||
      b.position.x > width + 100 ||
      b.position.y < -100 ||
      b.position.y > height + 100
    ) {
      World.remove(world, b);
      cyanBaelle.splice(i, 1);
    }
  }
}

function erstelleCyanBall() {
  ballZaehler++;

  let seite = floor(random(4));
  let x, y;
  let vx, vy;

  if (seite === 0) {
    x = -30;
    y = random(height);
    vx = random(4, 8);
    vy = random(-3, 3);
  } else if (seite === 1) {
    x = width + 30;
    y = random(height);
    vx = random(-8, -4);
    vy = random(-3, 3);
  } else if (seite === 2) {
    x = random(width);
    y = -30;
    vx = random(-3, 3);
    vy = random(4, 8);
  } else {
    x = random(width);
    y = height + 30;
    vx = random(-3, 3);
    vy = random(-8, -4);
  }

  let istCyan = ballZaehler % 3 === 0;

let ball = Bodies.circle(x, y, 8, {
  restitution: 1,
  frictionAir: 0,
  label: istCyan ? "cyan" : "weiss",
  isSensor: !istCyan
});

ball.istCyan = istCyan;
ball.zielBall = istCyan;


  Body.setVelocity(ball, {
    x: vx,
    y: vy
  });

  cyanBaelle.push(ball);
  World.add(world, ball);
}


function zeichneKugel(body, farbe) {
  noStroke();
  fill(farbe);
  circle(body.position.x, body.position.y, body.circleRadius * 2);
}

function windowResized() {
  resizeCanvas(960, 960);
}
function punktAufRechteck(t, cx, cy, w, h) {
  t = t % 1;

  let umfang = 2 * w + 2 * h;
  let s = t * umfang;

  let x, y;

  // obere Kante: links nach rechts
  if (s < w) {
    x = cx - w / 2 + s;
    y = cy - h / 2;
  }

  // rechte Kante: oben nach unten
  else if (s < w + h) {
    x = cx + w / 2;
    y = cy - h / 2 + (s - w);
  }

  // untere Kante: rechts nach links
  else if (s < 2 * w + h) {
    x = cx + w / 2 - (s - w - h);
    y = cy + h / 2;
  }

  // linke Kante: unten nach oben
  else {
    x = cx - w / 2;
    y = cy + h / 2 - (s - 2 * w - h);
  }

  return createVector(x, y);
}
