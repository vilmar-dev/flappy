const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const finalScore = document.getElementById("finalScore");
const bestScore = document.getElementById("bestScore");
const soundToggle = document.getElementById("soundToggle");

// Sound system
let soundEnabled = true;
let audioContext = null;
let backgroundAudioContext = null;
let bgOscillators = [];

function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function playFlapSound() {
  if (!soundEnabled) return;
  try {
    const ctx = initAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(523, now);
    osc.frequency.exponentialRampToValueAtTime(349, now + 0.15);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {
    console.log("Audio not supported");
  }
}

function playDeathSound() {
  if (!soundEnabled) return;
  try {
    const ctx = initAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0, now + 0.5);
    
    osc.start(now);
    osc.stop(now + 0.5);
  } catch (e) {
    console.log("Audio not supported");
  }
}

function startBackgroundMusic() {
  if (!soundEnabled) return;
  try {
    if (!backgroundAudioContext) {
      backgroundAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    stopBackgroundMusic();
    
    const ctx = backgroundAudioContext;
    const now = ctx.currentTime;
    
    // Create a simple repeating melody
    const notes = [262, 294, 330, 349]; // C, D, E, F
    let noteIndex = 0;
    
    const playNote = () => {
      if (!soundEnabled || gameStarted) return;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.value = notes[noteIndex % notes.length];
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
      
      bgOscillators.push(osc);
      
      noteIndex++;
      
      if (!gameStarted && soundEnabled) {
        setTimeout(playNote, 500);
      }
    };
    
    playNote();
  } catch (e) {
    console.log("Background music not supported");
  }
}

function stopBackgroundMusic() {
  bgOscillators.forEach(osc => {
    try {
      osc.stop();
    } catch (e) {}
  });
  bgOscillators = [];
}

const W = canvas.width;
const H = canvas.height;

const bird = {
  x: 95,
  y: H / 2,
  radius: 16,
  velocity: 0,
  gravity: 0.42,
  flapPower: -7.4,
  rotation: 0
};

const pipeSettings = {
  width: 72,
  gap: 155,
  speed: 2.7,
  spawnEvery: 95
};

let pipes = [];
let frame = 0;
let score = 0;
let best = Number(localStorage.getItem("flappyBest") || 0);
let running = false;
let gameStarted = false;

function resetGame() {
  bird.y = H / 2;
  bird.velocity = 0;
  bird.rotation = 0;

  pipes = [];
  frame = 0;
  score = 0;
  
  stopBackgroundMusic();
}

function startGame() {
  resetGame();

  running = true;
  gameStarted = true;

  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  
  stopBackgroundMusic();
}

function flap() {
  if (!gameStarted) {
    startGame();
  }

  if (running) {
    bird.velocity = bird.flapPower;
    playFlapSound();
  }
}

function endGame() {
  if (!running) return;

  running = false;
  gameStarted = false;
  
  playDeathSound();

  if (score > best) {
    best = score;
    localStorage.setItem("flappyBest", String(best));
  }

  finalScore.textContent = score;
  bestScore.textContent = best;

  gameOverScreen.classList.remove("hidden");
  
  setTimeout(() => {
    startBackgroundMusic();
  }, 800);
}

function spawnPipe() {
  const margin = 85;
  const minTop = margin;
  const maxTop = H - pipeSettings.gap - margin;

  const topHeight =
    Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;

  pipes.push({
    x: W + 20,
    topHeight: topHeight,
    bottomY: topHeight + pipeSettings.gap,
    passed: false
  });
}

function update() {
  if (!running) return;

  frame++;

  bird.velocity += bird.gravity;
  bird.y += bird.velocity;

  bird.rotation = Math.min(
    Math.max(bird.velocity * 0.07, -0.45),
    1.15
  );

  if (frame % pipeSettings.spawnEvery === 0) {
    spawnPipe();
  }

  for (const pipe of pipes) {
    pipe.x -= pipeSettings.speed;

    if (
      !pipe.passed &&
      pipe.x + pipeSettings.width < bird.x
    ) {
      pipe.passed = true;
      score++;
    }

    const birdLeft = bird.x - bird.radius;
    const birdRight = bird.x + bird.radius;
    const birdTop = bird.y - bird.radius;
    const birdBottom = bird.y + bird.radius;

    const overlapsX =
      birdRight > pipe.x &&
      birdLeft < pipe.x + pipeSettings.width;

    const hitsTopPipe =
      birdTop < pipe.topHeight;

    const hitsBottomPipe =
      birdBottom > pipe.bottomY;

    if (
      overlapsX &&
      (hitsTopPipe || hitsBottomPipe)
    ) {
      endGame();
    }
  }

  pipes = pipes.filter(
    pipe => pipe.x + pipeSettings.width > -30
  );

  if (
    bird.y + bird.radius >= H - 48 ||
    bird.y - bird.radius <= 0
  ) {
    endGame();
  }
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(
    0,
    0,
    0,
    H
  );

  gradient.addColorStop(0, "#77d7ff");
  gradient.addColorStop(0.65, "#c9f3ff");
  gradient.addColorStop(1, "#eafcff");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  drawCloud(72, 90, 1);
  drawCloud(285, 145, 0.8);
  drawCloud(195, 245, 0.65);

  ctx.fillStyle = "#9ee66f";
  ctx.fillRect(0, H - 48, W, 48);

  ctx.fillStyle = "#70bf4c";

  for (let x = 0; x < W; x += 28) {
    ctx.fillRect(
      x,
      H - 48,
      14,
      6
    );
  }
}

function drawCloud(x, y, scale) {
  ctx.save();

  ctx.globalAlpha = 0.75;
  ctx.fillStyle = "#ffffff";

  ctx.beginPath();

  ctx.arc(
    x,
    y,
    24 * scale,
    0,
    Math.PI * 2
  );

  ctx.arc(
    x + 28 * scale,
    y - 10 * scale,
    31 * scale,
    0,
    Math.PI * 2
  );

  ctx.arc(
    x + 60 * scale,
    y,
    24 * scale,
    0,
    Math.PI * 2
  );

  ctx.fill();
  ctx.restore();
}

function drawPipe(pipe) {
  const width = pipeSettings.width;
  const capHeight = 20;
  const capExtra = 8;

  ctx.fillStyle = "#4fbe42";

  ctx.fillRect(
    pipe.x,
    0,
    width,
    pipe.topHeight
  );

  ctx.fillRect(
    pipe.x,
    pipe.bottomY,
    width,
    H - pipe.bottomY - 48
  );

  ctx.fillStyle = "#6de15c";

  ctx.fillRect(
    pipe.x + 7,
    0,
    10,
    pipe.topHeight
  );

  ctx.fillRect(
    pipe.x + 7,
    pipe.bottomY,
    10,
    H - pipe.bottomY - 48
  );

  ctx.fillStyle = "#3f9c35";

  ctx.fillRect(
    pipe.x - capExtra,
    pipe.topHeight - capHeight,
    width + capExtra * 2,
    capHeight
  );

  ctx.fillRect(
    pipe.x - capExtra,
    pipe.bottomY,
    width + capExtra * 2,
    capHeight
  );

  ctx.strokeStyle = "#287b2c";
  ctx.lineWidth = 3;

  ctx.strokeRect(
    pipe.x,
    0,
    width,
    pipe.topHeight
  );

  ctx.strokeRect(
    pipe.x,
    pipe.bottomY,
    width,
    H - pipe.bottomY - 48
  );
}

function drawBird() {
  ctx.save();

  ctx.translate(
    bird.x,
    bird.y
  );

  ctx.rotate(
    bird.rotation
  );

  // Bird body
  ctx.fillStyle = "#ffd447";

  ctx.beginPath();

  ctx.ellipse(
    0,
    0,
    22,
    17,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();

  // Wing
  ctx.fillStyle = "#f6a623";

  ctx.beginPath();

  ctx.ellipse(
    -7,
    7,
    13,
    8,
    -0.45,
    0,
    Math.PI * 2
  );

  ctx.fill();

  // Eye
  ctx.fillStyle = "#ffffff";

  ctx.beginPath();

  ctx.arc(
    9,
    -6,
    8,
    0,
    Math.PI * 2
  );

  ctx.fill();

  // Pupil
  ctx.fillStyle = "#1f2a35";

  ctx.beginPath();

  ctx.arc(
    11.5,
    -6,
    3,
    0,
    Math.PI * 2
  );

  ctx.fill();

  // Beak
  ctx.fillStyle = "#ff7d22";

  ctx.beginPath();

  ctx.moveTo(
    18,
    1
  );

  ctx.lineTo(
    34,
    5
  );

  ctx.lineTo(
    18,
    9
  );

  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawScore() {
  ctx.save();

  ctx.font = "bold 42px Arial";
  ctx.textAlign = "center";

  ctx.lineWidth = 7;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";

  ctx.strokeText(
    String(score),
    W / 2,
    72
  );

  ctx.fillStyle = "#ffffff";

  ctx.fillText(
    String(score),
    W / 2,
    72
  );

  ctx.restore();
}

function draw() {
  drawBackground();

  for (const pipe of pipes) {
    drawPipe(pipe);
  }

  drawBird();
  drawScore();
}

function gameLoop() {
  update();
  draw();

  requestAnimationFrame(
    gameLoop
  );
}

document.addEventListener(
  "keydown",
  event => {
    if (event.code === "Space") {
      event.preventDefault();
      flap();
    }

    if (
      !running &&
      gameStarted &&
      event.code === "Enter"
    ) {
      startGame();
    }
  }
);

canvas.addEventListener(
  "pointerdown",
  flap
);

startBtn.addEventListener(
  "click",
  event => {
    event.stopPropagation();
    startGame();
  }
);

restartBtn.addEventListener(
  "click",
  event => {
    event.stopPropagation();
    startGame();
  }
);

bestScore.textContent = best;

// Sound toggle button
soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundToggle.textContent = soundEnabled ? "🔊 Sound ON" : "🔇 Sound OFF";
  
  if (soundEnabled && !gameStarted && !running) {
    startBackgroundMusic();
  } else if (!soundEnabled) {
    stopBackgroundMusic();
  }
});

draw();
gameLoop();

// Start background music on initial load
startBackgroundMusic();