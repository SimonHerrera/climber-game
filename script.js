/* -------------------------------------------------------------
   Climber – 1980s Arcade Game
   Chippy the Squirrel climbs to get the golden acorn!
   ------------------------------------------------------------- */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

/* -------------------------------------------------------------
   CONFIGURATION
   ------------------------------------------------------------- */
const TILE = 32;
const GRAVITY = 0.6;
const JUMP_VELOCITY = -12;
const PLAYER_SPEED = 3;
const LEVEL_COUNT = 20;
const LIVES_START = 3;

/* -------------------------------------------------------------
   GLOBAL STATE
   ------------------------------------------------------------- */
let level = 1;
let lives = LIVES_START;
let score = 0;
let gameOver = false;
let win = false;
let branches = [];
let enemies = [];

/* -------------------------------------------------------------
   ASSET LOADER (uses colored rectangles if images missing)
   ------------------------------------------------------------- */
const images = {};
const assetList = ['squirrel', 'tree', 'branch', 'acorn', 'hawk', 'slide', 'bg', 'death'];

let assetsLoaded = 0;
const totalAssets = assetList.length;

for (const key of assetList) {
  const img = new Image();
  img.src = `assets/${key}.png`;
  img.onload = () => {
    assetsLoaded++;
    if (assetsLoaded === totalAssets) init();
  };
  img.onerror = () => {
    assetsLoaded++;
    if (assetsLoaded === totalAssets) init();
  };
  images[key] = img;
}

/* -------------------------------------------------------------
   PLAYER OBJECT
   ------------------------------------------------------------- */
const player = {
  x: canvas.width / 2 - TILE / 2,
  y: canvas.height - TILE * 3,
  w: TILE,
  h: TILE,
  vy: 0,
  onGround: false,
  lives: LIVES_START
};

/* -------------------------------------------------------------
   INPUT HANDLING
   ------------------------------------------------------------- */
const keys = { left: false, right: false, up: false };

window.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') keys.up = true;
});

window.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') keys.up = false;
});

canvas.addEventListener('mousedown', () => keys.up = true);
canvas.addEventListener('mouseup', () => keys.up = false);
canvas.addEventListener('touchstart', e => { e.preventDefault(); keys.up = true; });
canvas.addEventListener('touchend', e => { e.preventDefault(); keys.up = false; });

/* -------------------------------------------------------------
   LEVEL GENERATOR
   ------------------------------------------------------------- */
function generateLevel(num) {
  branches = [];
  enemies = [];

  const branchCount = 6 + Math.min(num, 10);
  const gapY = Math.max(60, 120 - num * 4);

  for (let i = 0; i < branchCount; i++) {
    const y = canvas.height - (i + 1) * gapY;
    const w = TILE * (2 + Math.floor(Math.random() * 2));
    const x = Math.random() * (canvas.width - w);
    const isSlide = Math.random() < 0.2 + 0.02 * num;
    const slideDir = Math.random() < 0.5 ? -1 : 1;
    branches.push({ x, y, w, isSlide, slideDir });
  }

  const enemyCount = Math.min(3 + Math.floor(num / 3), 10);
  for (let i = 0; i < enemyCount; i++) {
    const type = Math.random() < 0.7 ? 'acorn' : 'hawk';
    const x = Math.random() * (canvas.width - TILE);
    const y = -Math.random() * canvas.height;
    const vy = 2 + num * 0.3;
    enemies.push({ x, y, type, vy });
  }
}

/* -------------------------------------------------------------
   GAME LOOP
   ------------------------------------------------------------- */
function update() {
  if (gameOver || win) return;

  if (keys.left) player.x -= PLAYER_SPEED;
  if (keys.right) player.x += PLAYER_SPEED;

  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));

  if (keys.up && player.onGround) {
    player.vy = JUMP_VELOCITY;
    player.onGround = false;
  }
  player.vy += GRAVITY;
  player.y += player.vy;

  player.onGround = false;
  const gapY = Math.max(60, 120 - level * 4);

  for (const b of branches) {
    const onTop = player.y + player.h <= b.y && player.y + player.h + player.vy >= b.y;
    const withinX = player.x + player.w > b.x && player.x < b.x + b.w;
    if (onTop && withinX) {
      player.y = b.y - player.h;
      player.vy = 0;
      player.onGround = true;

      if (b.isSlide) {
        if (b.slideDir > 0) {
          player.y -= gapY;
        } else {
          player.y += gapY * 2;
        }
      }
    }
  }

  if (player.y > canvas.height) {
    loseLife();
    return;
  }

  for (const e of enemies) {
    e.y += e.vy;
    if (
      e.x < player.x + player.w &&
      e.x + TILE > player.x &&
      e.y < player.y + player.h &&
      e.y + TILE > player.y
    ) {
      loseLife();
      return;
    }
    if (e.y > canvas.height) {
      e.y = -Math.random() * canvas.height;
      e.x = Math.random() * (canvas.width - TILE);
    }
  }

  const topY = canvas.height - (branches.length + 2) * gapY;
  if (player.y <= topY) {
    score += 1000 * level;
    if (level >= LEVEL_COUNT) {
      win = true;
    } else {
      level++;
      resetPlayer();
      generateLevel(level);
    }
  }
}

/* -------------------------------------------------------------
   DRAWING
   ------------------------------------------------------------- */
function drawRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawSprite(key, x, y, w, h) {
  const img = images[key];
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, x, y, w, h);
  } else {
    // Fallback colored rectangle
    const colors = {
      squirrel: '#8B4513',
      branch: '#228B22',
      acorn: '#FFD700',
      hawk: '#4a4a4a',
      slide: '#8B4513',
      bg: '#87CEEB'
    };
    drawRect(x, y, w, h, colors[key] || '#fff');
  }
}

function draw() {
  // Background
  drawSprite('bg', 0, 0, canvas.width, canvas.height);

  // Branches
  for (const b of branches) {
    drawSprite('branch', b.x, b.y, b.w, TILE);
    if (b.isSlide) {
      drawSprite('slide', b.x + b.w / 2 - TILE / 2, b.y - TILE * 2, TILE, TILE * 2);
    }
  }

  // Enemies
  for (const e of enemies) {
    drawSprite(e.type, e.x, e.y, TILE, TILE);
  }

  // Player
  drawSprite('squirrel', player.x, player.y, player.w, player.h);

  // HUD
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`Level: ${level}/${LEVEL_COUNT}`, 10, 20);
  ctx.fillText(`Lives: ${player.lives}`, 10, 40);
  ctx.fillText(`Score: ${score}`, 10, 60);

  if (gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ff5555';
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
  }
  if (win) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#55ff55';
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2);
  }
}

/* -------------------------------------------------------------
   HELPERS
   ------------------------------------------------------------- */
function loseLife() {
  player.lives--;
  if (player.lives <= 0) {
    gameOver = true;
  } else {
    resetPlayer();
  }
}

function resetPlayer() {
  player.x = canvas.width / 2 - TILE / 2;
  player.y = canvas.height - TILE * 3;
  player.vy = 0;
  player.onGround = false;
}

function loop() {
  update();
  draw();
  if (!gameOver && !win) requestAnimationFrame(loop);
}

function init() {
  generateLevel(level);
  resetPlayer();
  loop();
}

// Start without waiting for images (they'll just show colored rects)
init();