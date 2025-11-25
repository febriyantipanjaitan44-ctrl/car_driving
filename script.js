const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const playerImage = new Image();
playerImage.src = "mobil.png";

const truckImage = new Image();
truckImage.src = "truk2.png";

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Jalan
const road = {
  laneWidth: window.innerWidth < 768 
    ? canvas.width * 0.9 
    : canvas.width * 0.55,
  stripeWidth: 10,
  stripeHeight: 40,
  gap: 30,
  speed: 5,
  offset: 0,
};

function drawRoad() {
  const theme = getCurrentTheme();
  const centerX = canvas.width / 2;

  // Aspal
  ctx.fillStyle = theme.roadColor || "#111";
  ctx.fillRect(centerX - road.laneWidth / 2, 0, road.laneWidth, canvas.height);

  // Garis putus-putus
  ctx.fillStyle = theme.stripeColor || "white";
  let y = -road.stripeHeight + road.offset;
  while (y < canvas.height) {
    ctx.fillRect(
      centerX - road.stripeWidth / 2,
      y,
      road.stripeWidth,
      road.stripeHeight
    );
    y += road.stripeHeight + road.gap;
  }

  // Animasi offset jalan
  road.offset += road.speed;
  if (road.offset >= road.stripeHeight + road.gap) {
    road.offset = 0;
  }
}

function drawBiomeSides() {
  const theme = getCurrentTheme();
  const sideWidth = (canvas.width - road.laneWidth) / 2;

  // kiri
  theme.sideFill(ctx, 0, 0, sideWidth, canvas.height);
  // kanan
  theme.sideFill(ctx, canvas.width - sideWidth, 0, sideWidth, canvas.height);
}

// Player
const player = {
  x: canvas.width / 2 - 50,
  y: canvas.height - 120,
  width: 100,
  height: 100,
  speed: 6,
  vx: 0,
};

const playerHitbox = {
  offsetX: 30,
  offsetY: 5,
  width: 40,
  height: 90,
};

player.x = canvas.width / 2 - player.width / 2;

let keys = { a: false, d: false, w: false, s: false };

document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "a") keys.a = true;
  if (e.key.toLowerCase() === "d") keys.d = true;
  if (e.key.toLowerCase() === "w") keys.w = true;
  if (e.key.toLowerCase() === "s") keys.s = true;
});

document.addEventListener("keyup", (e) => {
  if (e.key.toLowerCase() === "a") keys.a = false;
  if (e.key.toLowerCase() === "d") keys.d = false;
  if (e.key.toLowerCase() === "w") keys.w = false;
  if (e.key.toLowerCase() === "s") keys.s = false;
});

// Obstacles
let obstacles = [];
let spawnInterval = 1500;
let lastSpawn = 0;

// Score & Level
let score = 0;
let bestScore = Number(localStorage.getItem("bestScore")) || 0;
let gameOver = false;
let level = 1;
let nextLevelScore = 10; // naik level tiap 10 score
let showLevelPopup = false;
let popupTimer = 0;

function createObstacle() {
  if (!truckImage.width || !truckImage.height) return;

  const desiredHeight = 120;
  const desiredWidth = desiredHeight * (truckImage.width / truckImage.height);

  const minX = canvas.width / 2 - road.laneWidth / 2;
  const maxX = canvas.width / 2 + road.laneWidth / 2 - desiredWidth;

  const x = Math.random() * (maxX - minX) + minX;
  const speed = 2 + Math.random() * 3;

  const hitboxPaddingX = 55;
  const hitboxPaddingY = 10;

  obstacles.push({
    x,
    y: -desiredHeight,
    width: desiredWidth,
    height: desiredHeight,
    speed,
    hitbox: {
      x: x + hitboxPaddingX,
      y: -desiredHeight + hitboxPaddingY,
      width: desiredWidth - hitboxPaddingX * 2,
      height: desiredHeight - hitboxPaddingY * 2,
    },
  });
}

function updatePlayer() {
  player.vx = 0;
  let vy = 0;

  if (keys.a) player.vx = -player.speed;
  if (keys.d) player.vx = player.speed;
  if (keys.w) vy = -player.speed;
  if (keys.s) vy = player.speed;

  player.x += player.vx;
  player.y += vy;

  const leftBoundary = canvas.width / 2 - road.laneWidth / 2;
  const rightBoundary = canvas.width / 2 + road.laneWidth / 2 - player.width;

  if (player.x < leftBoundary) player.x = leftBoundary;
  if (player.x > rightBoundary) player.x = rightBoundary;
  if (player.y < 0) player.y = 0;
  if (player.y + player.height > canvas.height)
    player.y = canvas.height - player.height;
}

function updateObstacles() {
  if (!lastSpawn || Date.now() - lastSpawn > spawnInterval) {
    createObstacle();
    lastSpawn = Date.now();
    spawnInterval = Math.max(400, spawnInterval - 10); // makin cepat
  }

  for (let ob of obstacles) {
    ob.y += ob.speed;
    ob.hitbox.y += ob.speed;
  }

  obstacles = obstacles.filter((ob) => {
    if (ob.y > canvas.height) {
      score++;
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem("bestScore", bestScore);
      }

      // Cek level up
      if (score >= nextLevelScore) {
        level++;
        nextLevelScore += 10; // tiap 10 poin naik level
        showLevelPopup = true;
        popupTimer = Date.now();
        spawnInterval = Math.max(300, spawnInterval - 200); // makin banyak mobil
      }

      return false;
    }
    return true;
  });
}

function detectCollision(rect1, rect2) {
  const r1 = {
    x: rect1.x + playerHitbox.offsetX,
    y: rect1.y + playerHitbox.offsetY,
    width: playerHitbox.width,
    height: playerHitbox.height,
  };

  const r2 = rect2.hitbox || rect2;

  return (
    r1.x < r2.x + r2.width &&
    r1.x + r1.width > r2.x &&
    r1.y < r2.y + r2.height &&
    r1.y + r1.height > r2.y
  );
}

function checkCollisions() {
  for (let ob of obstacles) {
    if (detectCollision(player, ob)) {
      gameOver = true;
    }
  }
}

function drawPlayer() {
  ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
}

function drawObstacles() {
  obstacles.forEach((ob) => {
    ctx.save();
    ctx.translate(ob.x + ob.width / 2, ob.y + ob.height / 2);
    ctx.rotate((3 * Math.PI) / 2);
    ctx.drawImage(
      truckImage,
      -ob.width / 2,
      -ob.height / 2,
      ob.width,
      ob.height
    );
    ctx.restore();
  });
}

function drawScore() {
  ctx.save();

  const padding = 12;
  ctx.font = "24px Arial";
  ctx.textAlign = "left"; // pastikan kiri
  ctx.textBaseline = "top"; // biar y dihitung dari atas

  const textScore = `Score: ${score}`;
  const textBest = `Best: ${bestScore}`;
  const textLevel = `Level: ${level}`;

  const lineHeight = 28;

  // Hitung lebar teks terpanjang (sesuai font di atas)
  const maxTextWidth = Math.max(
    ctx.measureText(textScore).width,
    ctx.measureText(textBest).width,
    ctx.measureText(textLevel).width
  );

  const bgWidth = maxTextWidth + padding * 2;
  const bgHeight = lineHeight * 3 + padding * 2;

  // Background box
  const boxX = 15;
  const boxY = 20;
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(boxX, boxY, bgWidth, bgHeight);

  // Tulis teks (mulai dari top + padding)
  let x = boxX + padding;
  let y = boxY + padding;

  ctx.fillStyle = "white";
  ctx.fillText(textScore, x, y);

  y += lineHeight;
  ctx.fillStyle = "yellow";
  ctx.fillText(textBest, x, y);

  y += lineHeight;
  ctx.fillStyle = "cyan";
  ctx.fillText(textLevel, x, y);

  ctx.restore();
}

function drawGameOver() {
  ctx.fillStyle = "yellow";
  ctx.font = "64px Arial";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
}

// Popup level
function drawLevelPopup() {
  if (showLevelPopup) {
    ctx.fillStyle = "white";
    ctx.font = "60px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`LEVEL ${level}`, canvas.width / 2, canvas.height / 2 - 100);

    if (Date.now() - popupTimer > 2000) {
      showLevelPopup = false;
    }
  }
}

// ===== THEME SYSTEM =====
const levelsPerTheme = 3; // ganti tema tiap 3 level (silakan ubah)

const THEMES = [
  {
    name: "Desert",
    roadColor: "#111",
    stripeColor: "white",
    sideFill(ctx, x, y, w, h) {
      // pasir solid
      ctx.fillStyle = "#f4a261";
      ctx.fillRect(x, y, w, h);
    },
  },
  {
    name: "Grassland",
    roadColor: "#3a3a3a",
    stripeColor: "#f7f7f7",
    sideFill(ctx, x, y, w, h) {
      // gradasi hijau
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, "#7ec850");
      g.addColorStop(1, "#2c7c31");
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      // aksen garis-garis rumput tipis yang "bergerak" bareng jalan
      drawGrassLines(ctx, x, y, w, h);
    },
  },
  {
    name: "Ocean",
    roadColor: "#0f1a2b",
    stripeColor: "#a8d5ff",
    sideFill(ctx, x, y, w, h) {
      // gradasi biru laut
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, "#69a9ff");
      g.addColorStop(1, "#0b4ea2");
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      // gelombang halus
      drawWaves(ctx, x, y, w, h);
    },
  },
  {
    name: "Snow",
    roadColor: "#263238",
    stripeColor: "#e0f7fa",
    sideFill(ctx, x, y, w, h) {
      ctx.fillStyle = "#e9f5ff";
      ctx.fillRect(x, y, w, h);
      // butiran salju
      drawSnowDots(ctx, x, y, w, h);
    },
  },
];

function getCurrentThemeIndex() {
  return Math.floor((level - 1) / levelsPerTheme) % THEMES.length;
}
function getCurrentTheme() {
  return THEMES[getCurrentThemeIndex()];
}

// Dekor: rumput (garis pendek)
function drawGrassLines(ctx, x, y, w, h) {
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 1;
  const gapY = 22;
  const startY = road.offset % gapY;
  for (let yy = y - startY; yy < y + h; yy += gapY) {
    ctx.beginPath();
    ctx.moveTo(x + 8, yy);
    ctx.lineTo(x + w - 8, yy);
    ctx.stroke();
  }
  ctx.restore();
}

// Dekor: gelombang laut
function drawWaves(ctx, x, y, w, h) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 2;
  const amp = 4;
  const gapY = 18;
  const freq = 0.03;
  const startY = road.offset % gapY;
  for (let yy = y - startY; yy < y + h; yy += gapY) {
    ctx.beginPath();
    for (let xx = x; xx <= x + w; xx += 8) {
      const dy = Math.sin(xx * freq + yy * 0.05) * amp;
      if (xx === x) ctx.moveTo(xx, yy + dy);
      else ctx.lineTo(xx, yy + dy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// Dekor: titik-titik salju
function drawSnowDots(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  const gap = 26;
  const start = road.offset % gap;
  for (let yy = y - start; yy < y + h; yy += gap) {
    for (let xx = x + 8; xx < x + w; xx += gap) {
      ctx.beginPath();
      ctx.arc(xx, yy, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawSignature() {
  ctx.save();
  ctx.font = "18px Arial";
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText("by Leon & Ghali", 20, canvas.height - 20);
  ctx.restore();
}

function gameLoop() {
  if (gameOver) {
    drawGameOver();
    return;
  }

  // Background / sides dulu
  drawBiomeSides();
  drawRoad();

  updatePlayer();
  updateObstacles();
  checkCollisions();

  drawPlayer();
  drawObstacles();
  drawScore();
  drawLevelPopup();
  drawSignature();

  requestAnimationFrame(gameLoop);
}

gameLoop();

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  road.laneWidth = window.innerWidth < 768 
    ? canvas.width * 0.9 
    : canvas.width * 0.55;

  player.y = canvas.height - 120;
  player.x = canvas.width / 2 - player.width / 2;
});


function drawGameOver() {
  ctx.save();
  ctx.fillStyle = "yellow";
  ctx.font = "64px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
  ctx.restore();
}



