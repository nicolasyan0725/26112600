// === 圖片變數 ===
let bgImg;
let char1StopImg, char1WalkImg, char1AttackImg;
let char2StopImg, char2Action1Img;
let loadErrorMsg = '';

// === 精靈圖張數設定 ===
// 角色1 實際圖片寬475, 高87，共8張
const CHAR1_STOP_FRAMES = 8;
const CHAR1_WALK_FRAMES = 8;
const CHAR1_ATTACK_FRAMES = 8;

// 角色2 規格 (8張循環)
const CHAR2_STOP_FRAMES = 8;    // 寬699, 高190
const CHAR2_ACTION1_FRAMES = 8; // 寬1083, 高171

// === 角色統一視覺高度 (讓角色1與角色2一樣大小、等比例不變形) ===
const CHARACTER_HEIGHT = 190;

// === 角色與世界座標設定 ===
let char1WorldX;
let char1Y;
const char1Speed = 6;
let char1Dir = 1; // 1: 朝右, -1: 朝左
let isAttacking = false;
let attackFrameCounter = 0;

let char2WorldX;
let char2Y;
const TRIGGER_DISTANCE = 160;

// === 動畫計時器 ===
let animTimer = 0;
const ANIM_SPEED = 6;

// === 數學四選一題庫與狀態 ===
const MATH_QUESTIONS = [
  {
    q: '24 ÷ 3 + 5 = ？',
    options: ['11', '13', '15', '17'],
    answer: 1
  },
  {
    q: '一個長方形長 12 公分、寬 7 公分，面積是多少平方公分？',
    options: ['19', '38', '84', '96'],
    answer: 2
  },
  {
    q: '3/4 + 1/4 等於多少？',
    options: ['1/2', '1', '4/8', '2'],
    answer: 1
  },
  {
    q: '小明有 15 顆蘋果，送給同學 6 顆後又買了 8 顆，現在有幾顆？',
    options: ['1', '15', '17', '29'],
    answer: 2
  },
  {
    q: '18 × 4 = ？',
    options: ['62', '68', '72', '76'],
    answer: 2
  },
  {
    q: '一個三角形的底是 10 公分、高是 6 公分，面積是多少平方公分？',
    options: ['30', '60', '16', '20'],
    answer: 0
  },
  {
    q: '0.5 + 1.25 = ？',
    options: ['1.30', '1.75', '1.85', '2.00'],
    answer: 1
  },
  {
    q: '某數加上 19 等於 45，某數是多少？',
    options: ['24', '26', '34', '64'],
    answer: 1
  }
];

let wasNear = false;
let currentQuestion = null;
let lastQuestionIndex = -1;
let answeredCurrentApproach = false;
let optionBoxes = []; // 儲存四個選項按鈕的螢幕座標 { x, y, w, h, idx }

// === 特效狀態 (各持續 2000 毫秒 = 2 秒) ===
const EFFECT_DURATION_MS = 2000;
let effectType = null; // 'firework' | 'lightning' | null
let effectStartTime = 0;
let fireworks = [];
let lightningBolts = [];

function handleLoadError(path) {
  loadErrorMsg = '圖片載入失敗：' + path;
  console.error(loadErrorMsg);
}

function preload() {
  bgImg = loadImage('bg.png', () => {}, () => handleLoadError('bg.png'));
  char1StopImg = loadImage('1/stop/stop.png', () => {}, () => handleLoadError('1/stop/stop.png'));
  char1WalkImg = loadImage('1/walk/walk.png', () => {}, () => handleLoadError('1/walk/walk.png'));
  char1AttackImg = loadImage('1/attack/attack.png', () => {}, () => handleLoadError('1/attack/attack.png'));
  char2StopImg = loadImage('2/stop/final.png', () => {}, () => handleLoadError('2/stop/final.png'));
  char2Action1Img = loadImage('2/action1/FINAL.png', () => {}, () => handleLoadError('2/action1/FINAL.png'));
}

function setup() {
  // 避免熱更新或重複執行時殘留多個 canvas
  selectAll('canvas').forEach((c) => c.remove());

  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);

  const groundY = height * 0.78;
  char1Y = groundY;
  char2Y = groundY;

  // 原始背景 [0, width]，左端複製背景 [-width, 0]
  char1WorldX = width * 0.5;
  char2WorldX = -width * 0.5;
}

function pickNextQuestion() {
  if (MATH_QUESTIONS.length === 0) return null;
  if (MATH_QUESTIONS.length === 1) {
    lastQuestionIndex = 0;
    return MATH_QUESTIONS[0];
  }
  let idx = floor(random(MATH_QUESTIONS.length));
  while (idx === lastQuestionIndex) {
    idx = floor(random(MATH_QUESTIONS.length));
  }
  lastQuestionIndex = idx;
  return MATH_QUESTIONS[idx];
}

function triggerFireworkEffect() {
  effectType = 'firework';
  effectStartTime = millis();
  fireworks = [];

  const bursts = [
    { x: width * 0.25, y: height * 0.28 },
    { x: width * 0.5, y: height * 0.22 },
    { x: width * 0.75, y: height * 0.28 }
  ];
  const palette = [
    [255, 90, 90],
    [255, 215, 60],
    [90, 230, 140],
    [90, 190, 255],
    [255, 130, 230]
  ];

  bursts.forEach((b, bIdx) => {
    const col = palette[bIdx % palette.length];
    for (let i = 0; i < 36; i++) {
      const angle = (TWO_PI * i) / 36 + random(-0.08, 0.08);
      const speed = random(2.5, 7.5);
      fireworks.push({
        x: b.x,
        y: b.y,
        vx: cos(angle) * speed,
        vy: sin(angle) * speed - 1.2,
        col,
        size: random(4, 8)
      });
    }
  });
}

function triggerLightningEffect() {
  effectType = 'lightning';
  effectStartTime = millis();
  regenerateLightningBolts();
}

function regenerateLightningBolts() {
  lightningBolts = [];
  const xPositions = [width * 0.22, width * 0.5, width * 0.78];
  xPositions.forEach((startX) => {
    const pts = [{ x: startX, y: 0 }];
    let curX = startX;
    let curY = 0;
    while (curY < height * 0.85) {
      curY += random(45, 85);
      curX = startX + random(-55, 55);
      pts.push({ x: curX, y: min(curY, height * 0.85) });
    }
    lightningBolts.push(pts);
  });
}

function submitAnswer(selectedIdx) {
  if (!currentQuestion || answeredCurrentApproach) return;
  answeredCurrentApproach = true;

  if (selectedIdx === currentQuestion.answer) {
    triggerFireworkEffect();
  } else {
    triggerLightningEffect();
  }
}

function draw() {
  background(135, 206, 235);
  animTimer++;

  // 更新特效計時 (2 秒後自動結束)
  if (effectType !== null && millis() - effectStartTime >= EFFECT_DURATION_MS) {
    effectType = null;
    fireworks = [];
    lightningBolts = [];
  }

  let isMoving = false;

  if (isAttacking) {
    attackFrameCounter++;
    if (attackFrameCounter >= CHAR1_ATTACK_FRAMES * ANIM_SPEED) {
      isAttacking = false;
      attackFrameCounter = 0;
    }
  } else {
    if (keyIsDown(LEFT_ARROW)) {
      char1WorldX -= char1Speed;
      char1Dir = -1;
      isMoving = true;
    }
    if (keyIsDown(RIGHT_ARROW)) {
      char1WorldX += char1Speed;
      char1Dir = 1;
      isMoving = true;
    }
  }

  char1WorldX = constrain(char1WorldX, -width + 50, width - 50);

  let cameraX = char1WorldX - width * 0.5;
  cameraX = constrain(cameraX, -width, 0);

  const distToChar2 = abs(char1WorldX - char2WorldX);
  const isNear = distToChar2 < TRIGGER_DISTANCE;

  // 每次「剛靠近」角色2時，抽取一題新的數學題
  if (isNear && !wasNear) {
    currentQuestion = pickNextQuestion();
    answeredCurrentApproach = false;
  } else if (!isNear && wasNear) {
    currentQuestion = null;
    answeredCurrentApproach = false;
    optionBoxes = [];
  }
  wasNear = isNear;

  // 若正在播放 2 秒閃電特效，加入輕微畫面震動
  let shakeX = 0;
  let shakeY = 0;
  if (effectType === 'lightning') {
    shakeX = random(-7, 7);
    shakeY = random(-5, 5);
    if (frameCount % 6 === 0) {
      regenerateLightningBolts();
    }
  }

  push();
  translate(-cameraX + shakeX, shakeY);

  if (bgImg && bgImg.width > 0) {
    image(bgImg, -width * 0.5, height * 0.5, width, height);
    image(bgImg, width * 0.5, height * 0.5, width, height);
  }

  if (isNear) {
    const frameIdx = floor(animTimer / ANIM_SPEED) % CHAR2_ACTION1_FRAMES;
    drawSprite(char2Action1Img, CHAR2_ACTION1_FRAMES, frameIdx, char2WorldX, char2Y, 1, CHARACTER_HEIGHT);
  } else {
    const frameIdx = floor(animTimer / ANIM_SPEED) % CHAR2_STOP_FRAMES;
    drawSprite(char2StopImg, CHAR2_STOP_FRAMES, frameIdx, char2WorldX, char2Y, 1, CHARACTER_HEIGHT);
  }

  if (isAttacking) {
    const frameIdx = floor(attackFrameCounter / ANIM_SPEED) % CHAR1_ATTACK_FRAMES;
    drawSprite(char1AttackImg, CHAR1_ATTACK_FRAMES, frameIdx, char1WorldX, char1Y, char1Dir, CHARACTER_HEIGHT);
  } else if (isMoving) {
    const frameIdx = floor(animTimer / ANIM_SPEED) % CHAR1_WALK_FRAMES;
    drawSprite(char1WalkImg, CHAR1_WALK_FRAMES, frameIdx, char1WorldX, char1Y, char1Dir, CHARACTER_HEIGHT);
  } else {
    const frameIdx = floor(animTimer / ANIM_SPEED) % CHAR1_STOP_FRAMES;
    drawSprite(char1StopImg, CHAR1_STOP_FRAMES, frameIdx, char1WorldX, char1Y, char1Dir, CHARACTER_HEIGHT);
  }

  pop();

  // 繪製數學四選一題目面板
  if (isNear && currentQuestion) {
    drawMathQuizPanel(currentQuestion);
  }

  // 繪製 2 秒煙火或 2 秒閃電特效
  if (effectType === 'firework') {
    drawFireworks();
  } else if (effectType === 'lightning') {
    drawLightning();
  }

  if (loadErrorMsg) {
    push();
    fill(200, 30, 30);
    textSize(18);
    text(loadErrorMsg, 20, 36);
    pop();
  }
}

function drawMathQuizPanel(questionObj) {
  optionBoxes = [];

  const panelW = min(640, width - 48);
  const panelH = 230;
  const panelX = (width - panelW) * 0.5;
  const panelY = 36;

  push();
  fill(20, 28, 45, 232);
  stroke(255, 215, 90);
  strokeWeight(3);
  rect(panelX, panelY, panelW, panelH, 16);

  noStroke();
  fill(255, 220, 110);
  textAlign(LEFT, TOP);
  textSize(16);
  text('數學挑戰（點擊選項或按鍵盤 1～4 作答）', panelX + 22, panelY + 14);

  fill(255);
  textSize(22);
  text(questionObj.q, panelX + 22, panelY + 42, panelW - 44, 52);

  const labels = ['A', 'B', 'C', 'D'];
  const gap = 14;
  const btnW = (panelW - 44 - gap) * 0.5;
  const btnH = 44;
  const startY = panelY + 104;

  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = floor(i / 2);
    const bx = panelX + 22 + col * (btnW + gap);
    const by = startY + row * (btnH + gap);

    const isHover =
      mouseX >= bx && mouseX <= bx + btnW && mouseY >= by && mouseY <= by + btnH;

    if (answeredCurrentApproach) {
      if (i === questionObj.answer) {
        fill(45, 165, 95);
      } else {
        fill(65, 75, 95);
      }
    } else {
      fill(isHover ? 68 : 44, isHover ? 125 : 62, isHover ? 210 : 102);
    }

    stroke(220, 235, 255, 180);
    strokeWeight(1.5);
    rect(bx, by, btnW, btnH, 10);

    noStroke();
    fill(255);
    textAlign(LEFT, CENTER);
    textSize(18);
    text(`${labels[i]} (${i + 1})：${questionObj.options[i]}`, bx + 14, by + btnH * 0.5);

    optionBoxes.push({ x: bx, y: by, w: btnW, h: btnH, idx: i });
  }
  pop();
}

function drawFireworks() {
  push();
  for (let p of fireworks) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12; // 輕微重力
    p.vx *= 0.985;

    noStroke();
    fill(p.col[0], p.col[1], p.col[2], 235);
    ellipse(p.x, p.y, p.size, p.size);
  }

  fill(255, 240, 120);
  textAlign(CENTER, CENTER);
  textSize(34);
  text('答對了！煙火綻放！', width * 0.5, height * 0.45);
  pop();
}

function drawLightning() {
  push();
  // 半透明閃電閃光底色
  fill(255, 255, 180, 55);
  noStroke();
  rect(0, 0, width, height);

  for (let pts of lightningBolts) {
    // 外層光暈
    stroke(120, 200, 255, 140);
    strokeWeight(12);
    noFill();
    beginShape();
    for (let pt of pts) vertex(pt.x, pt.y);
    endShape();

    // 內層亮白閃電核心
    stroke(255, 255, 220);
    strokeWeight(4);
    beginShape();
    for (let pt of pts) vertex(pt.x, pt.y);
    endShape();
  }

  noStroke();
  fill(255, 95, 95);
  textAlign(CENTER, CENTER);
  textSize(34);
  text('答錯了！遭閃電擊中！', width * 0.5, height * 0.45);
  pop();
}

function mousePressed() {
  if (!currentQuestion || answeredCurrentApproach) return;
  for (let box of optionBoxes) {
    if (
      mouseX >= box.x &&
      mouseX <= box.x + box.w &&
      mouseY >= box.y &&
      mouseY <= box.y + box.h
    ) {
      submitAnswer(box.idx);
      break;
    }
  }
}

function keyPressed() {
  if (key === ' ' && !isAttacking) {
    isAttacking = true;
    attackFrameCounter = 0;
  }

  if (currentQuestion && !answeredCurrentApproach) {
    if (key === '1') submitAnswer(0);
    else if (key === '2') submitAnswer(1);
    else if (key === '3') submitAnswer(2);
    else if (key === '4') submitAnswer(3);
  }
}

function drawSprite(spriteSheet, totalFrames, currentFrame, x, y, dir, targetHeight) {
  if (!spriteSheet || spriteSheet.width <= 1 || spriteSheet.height <= 1 || totalFrames <= 0) {
    return;
  }

  const safeFrame = ((currentFrame % totalFrames) + totalFrames) % totalFrames;
  const frameW = spriteSheet.width / totalFrames;
  const frameH = spriteSheet.height;

  const sx = Math.round(safeFrame * frameW);
  const nextSx = Math.round((safeFrame + 1) * frameW);
  const sw = Math.max(1, nextSx - sx);

  const drawH = targetHeight || frameH;
  const drawW = drawH * (frameW / frameH);

  push();
  translate(x, y);
  scale(dir, 1);
  image(spriteSheet, 0, 0, drawW, drawH, sx, 0, sw, frameH);
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  const groundY = height * 0.78;
  char1Y = groundY;
  char2Y = groundY;
}