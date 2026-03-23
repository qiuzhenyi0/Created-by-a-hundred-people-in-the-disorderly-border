let handpose;
let video;
let hands = [];
let particles = [];
let mode = 0; // 0: 玫瑰紋樣, 1: 失序邊境
let button;
let statusDiv;

// ASCII 符號 (僅供顯示在畫面上)
const roseAscii = "⊹玫瑰⊹"; // 簡化顯示
const liminalText = "失序邊境.𖥔 ݁˖𝕋𝕙𝕖 𝕃𝕚𝕞𝕚𝕟𝕒𝕝 𝕍𝕖𝕚𝕝.⋆";

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide(); // 隱藏原生的 video 標籤

  statusDiv = select('#status');

  // 初始化 MediaPipe
  // 為了效能，我們在這裡指定偵測參數
  handpose = ml5.handpose(video, { flipHorizontal: true }, modelReady);
  handpose.on("predict", results => {
    hands = results;
  });

  // 切換模式按鈕
  button = createButton('切換模式 / Switch Mode');
  button.position(20, 20);
  button.style('padding', '10px 20px');
  button.style('font-size', '16px');
  button.style('cursor', 'pointer');
  button.style('background-color', 'rgba(255,255,255,0.7)');
  button.style('border', 'none');
  button.style('border-radius', '20px');
  button.mousePressed(toggleMode);
}

function modelReady() {
  statusDiv.html("模型已就緒 請對著攝像頭張開或握緊手掌");
  setTimeout(()=> statusDiv.style('opacity', '0'), 3000); // 3秒後隱藏
}

function toggleMode() {
  mode = (mode + 1) % 2;
  // 切換模式時清除舊粒子
  particles = [];
}

function draw() {
  // 模式 0 柔和灰/白底，模式 1 深黑底
  background(mode === 0 ? 245 : 10); 
  
  // 為了讓粒子看起來像跟著手，我們水平翻轉 video 的坐標系
  translate(width, 0);
  scale(-1, 1);

  if (hands.length > 0) {
    let hand = hands[0];
    let annotations = hand.annotations;
    
    // 計算手掌中心 (palmBase 是手腕)
    let palmX = map(annotations.palmBase[0][0], 0, 640, 0, width);
    let palmY = map(annotations.palmBase[0][1], 0, 480, 0, height);
    
    // 計算中指尖與手腕的距離來判斷手勢
    let middleFingerTip = annotations.middleFinger[3];
    let wrist = annotations.palmBase[0];
    let d = dist(middleFingerTip[0], middleFingerTip[1], wrist[0], wrist[1]);
    
    // 門檻值 (需根據距離調整，這裡用 130 作為基準)
    let isFist = d < 130; 

    // 產生粒子 (張開手時)
    if (!isFist) {
      // 模式 0 (玫瑰) 產生較少但較大的粒子，模式 1 (邊境) 產生多而細碎的粒子
      let spawnCount = mode === 0 ? 3 : 8;
      for (let i = 0; i < spawnCount; i++) {
        particles.push(new Particle(palmX, palmY, mode));
      }
    }

    // 繪製與更新粒子
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update(isFist, palmX, palmY);
      particles[i].show();
      if (particles[i].finished()) {
        particles.splice(i, 1);
      }
    }
  }

  // 重置坐標系以便繪製文字
  translate(width, 0);
  scale(-1, 1);

  // 顯示當前模式文字
  displayModeText();
}

function displayModeText() {
  noStroke();
  textFont('monospace');
  textSize(20);
  if (mode === 0) {
    fill(150, 50, 50); // 深玫瑰紅
    textAlign(LEFT, TOP);
    text(roseAscii, 20, 70);
  } else {
    fill(0, 255, 200); // 青色
    textAlign(LEFT, TOP);
    text(liminalText, 20, 70);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// === 粒子類別 ===
class Particle {
  constructor(x, y, mode) {
    this.x = x;
    this.y = y;
    this.mode = mode;
    this.alpha = 255;
    this.angle = random(TWO_PI); // 初始旋轉角度

    if (mode === 0) {
      // 🌹 玫瑰模式：花瓣，速度稍慢，較圓潤
      this.vx = random(-2, 2);
      this.vy = random(-1, -4); // 向上飄居多
      this.size = random(10, 20);
      this.color = color(random(180, 255), random(50, 100), random(80, 120), this.alpha); // 粉紅到深紅
      this.rotSpeed = random(-0.02, 0.02);
    } else {
      // 𖥔 失序邊境：碎片，速度快，銳利
      this.vx = random(-5, 5);
      this.vy = random(-5, 5);
      this.size = random(2, 5);
      this.color = color(0, random(200, 255), random(200, 255), this.alpha); // 青色系
      this.rotSpeed = random(-0.1, 0.1);
    }
  }

  finished() {
    return this.alpha < 0 || this.size < 0.5;
  }

  update(isFist, tx, ty) {
    if (isFist) {
      // 握拳：向中心吸入
      this.x = lerp(this.x, tx, 0.15);
      this.y = lerp(this.y, ty, 0.15);
      this.size *= 0.95;
      this.alpha -= 10;
    } else {
      // 張開：擴散
      this.x += this.vx;
      this.y += this.vy;
      this.angle += this.rotSpeed; // 旋轉

      if (this.mode === 0) {
        this.alpha -= 3; // 玫瑰慢慢淡出
        this.vy += 0.05; // 受一點重力影響向下飄
      } else {
        this.alpha -= 7; // 邊境碎片消失較快
      }
    }
  }

  show() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    noStroke();
    
    // 根據模式繪製不同形狀
    let c = this.color;
    c.setAlpha(this.alpha); // 更新透明度
    fill(c);

    if (this.mode === 0) {
      // 繪製「花瓣/心形」
      beginShape();
      vertex(0, -this.size/2);
      bezierVertex(this.size/2, -this.size, this.size, this.size/3, 0, this.size);
      bezierVertex(-this.size, this.size/3, -this.size/2, -this.size, 0, -this.size/2);
      endShape(CLOSE);
    } else {
      // 繪製「破碎三角形/線條」
      beginShape();
      vertex(0, -this.size);
      vertex(this.size/2, this.size/2);
      vertex(-this.size/2, this.size/2);
      endShape(CLOSE);
    }
    pop();
  }
}
