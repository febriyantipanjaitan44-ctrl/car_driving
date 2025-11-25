// =========================
//  SETUP CANVAS
// =========================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// =========================
//  LOAD IMAGES
// =========================
const playerImage = new Image();
playerImage.src = "mobil.png";

const truckImage = new Image();
truckImage.src = "truk2.png";

// =========================
//  PLAYER
// =========================
const player = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  speed: 6
};

player.x = canvas.width / 2 - player.width / 2;
player.y = canvas.height - 140;

let keys = { a: false, d: false, w: false, s: false };

// =========================
//  TOUCH CONTROL FIX
// =========================
const tLeft = document.getElementById("btnLeft");
const tRight = document.getElementById("btnRight");
const tUp = document.getElementById("btnUp");
const tDown = document.getElementById("btnDown");

function bindTouch(btn, keyName) {
  btn.addEventListener("touchstart", () => (keys[keyName] = true));
  btn.addEventListener("touchend", () => (keys[keyName] = false));
}

bindTouch(tLeft, "a");
bindTouch(tRight, "d");
bindTouch(tUp, "w");
bindTouch(tDown, "s");

// =========================
//  ROAD
// =========================
const road = {
  laneWidth: canvas.width * 0.5,
  stripeWidth: 10,
  stripeHeight: 40,
  gap: 30,
  speed: 6,
  offset: 0
};

function drawRoad() {
  const centerX = canvas.width / 2;

  ctx.fillStyle = "#111";
  ctx.fillRect(centerX - road.laneWidth / 2, 0, road.laneWidth, canvas.height);

  ctx.fillStyle = "white";
  let y = -road.stripeHeight + road.offset;
  while (y < canvas.height) {
    ctx.fillRect(centerX - road.stripeWidth / 2, y, road.stripeWidth, road.stripeHeight);
    y += road.stripeHeight + road.gap;
  }

  road.offset += road.speed;
  if (road.offset > road.stripeHeight + road.gap) road.offset = 0;
}

// =========================
//  OBSTACLES
// =========================
let obstacles = [];
let spawnInterval = 1500;
let lastSpawn = 0;

function createObstacle() {
  if (!truckImage.width) return;

  const h = 120;
  const w = (truckImage.width / truckImage.height) * h;

  const minX = canvas.width / 2 - road.laneWidth / 2;
  const maxX = canvas.width / 2 + road.laneWidth / 2 - w;
  const x = Math.random() * (maxX - minX) + minX;

  obstacles.push({
    x, y: -h, width: w, height: h, speed: 4
  });
}

function updateObstacles() {
  if (!lastSpawn || Date.now() - lastSpawn > spawnInterval) {
    createObstacle();
    lastSpawn = Date.now();
  }

  obstacles.forEach(o => {
    o.y += o.speed;
  });

  obstacles = obstacles.filter(o => o.y < canvas.height);
}

// =========================
//  COLLISION
// =========================
function collides(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function checkCollisions() {
  for (let o of obstacles) {
    if (collides(player, o)) {
      return true;
    }
  }
  return false;
}

// =========================
//  PLAYER MOVEMENT
// =========================
function updatePlayer() {
  if (keys.a) player.x -= player.speed;
  if (keys.d) player.x += player.speed;
  if (keys.w) player.y -= player.speed;
  if (keys.s) player.y += player.speed;

  const leftLimit = canvas.width / 2 - road.laneWidth / 2;
  const rightLimit = canvas.width / 2 + road.laneWidth / 2 - player.width;

  if (player.x < leftLimit) player.x = leftLimit;
  if (player.x > rightLimit) player.x = rightLimit;
  if (player.y < 0) player.y = 0;
  if (player.y + player.height > canvas.height)
    player.y = canvas.height - player.height;
}

// =========================
//  DRAW GAME
// =========================
function drawPlayer() {
  ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
}

function drawObstacles() {
  obstacles.forEach(o => {
    ctx.drawImage(truckImage, o.x, o.y, o.width, o.height);
  });
}

// =========================
//  GAME LOOP
// =========================
let score = 0;
let gameOver = false;

function resetGame() {
  obstacles = [];
  score = 0;
  gameOver = false;

  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - 140;
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawRoad();
  updatePlayer();
  updateObstacles();
  drawPlayer();
  drawObstacles();

  if (checkCollisions()) {
    gameOver = true;
  }

  if (!gameOver) {
    score++;
  } else {
    ctx.fillStyle = "yellow";
    ctx.font = "48px Arial";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
  }

  requestAnimationFrame(gameLoop);
}

gameLoop();
