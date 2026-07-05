// ═══════════════════════════════════════════════
// canvas.js — 花朵渲染引擎
// 负责主画布 & 花信画布的绘制
// ═══════════════════════════════════════════════

class FlowerRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.t = 0;
    this.particles = [];
    this.currentIdx = 0;
    this.animId = null;

    // MIDI 覆盖参数 (null = 使用花型默认值)
    this.midiOverride = { petals: null, speed: null, wave: null };

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  setFlower(idx) {
    this.currentIdx = idx;
    this.particles = [];
    this.t = 0;
  }

  applyMidi(petals, speed, wave) {
    this.midiOverride = { petals, speed, wave };
  }

  // ─── 粒子类 ───
  _spawnParticle(f) {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const angle = Math.random() * Math.PI * 2;
    const speed = f.particleSpeed;

    const sp =
      f.type === 'rage'      ? speed * (0.7 + Math.random()) :
      f.type === 'dandelion' ? speed * (0.3 + Math.random() * 0.6) :
      speed * (0.4 + Math.random() * 0.8);

    const vy_offset = f.type === 'dandelion' ? -1.2 : 0;

    return {
      x: cx, y: cy,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp + vy_offset,
      color: f.particleColor,
      size: f.type === 'dandelion' ? 1.5 + Math.random() * 2 : 1 + Math.random() * 3,
      life: 1,
      decay:
        f.type === 'dandelion' ? 0.003 + Math.random() * 0.005 :
        f.type === 'rage'      ? 0.022 + Math.random() * 0.018 :
        0.006 + Math.random() * 0.01,
      gravity: f.type === 'dandelion' ? -0.01 : 0.018,
    };
  }

  _updateParticles(f) {
    // 生成新粒子
    const rate = this.midiOverride.speed
      ? f.particleRate * (this.midiOverride.speed / f.speed)
      : f.particleRate;

    if (Math.random() < rate / 6) {
      this.particles.push(this._spawnParticle(f));
    }

    // 更新存活粒子
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life -= p.decay;
      return p.life > 0;
    });
  }

  _drawParticles() {
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.life * 0.75);
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  // ─── 花瓣绘制 ───
  _drawPetal(cx, cy, angle, len, w, f, phase) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const grad = ctx.createLinearGradient(0, 0, len, 0);
    grad.addColorStop(0, f.color + 'cc');
    grad.addColorStop(0.5, f.color);
    grad.addColorStop(1, f.color2 + '88');

    ctx.beginPath();

    switch (f.type) {
      case 'thorn':
      case 'rage':
        // 尖刺形
        ctx.moveTo(0, 0);
        ctx.lineTo(len * 0.25, -w * 0.5);
        ctx.lineTo(len * 0.6, -w * 0.3);
        ctx.lineTo(len, 0);
        ctx.lineTo(len * 0.6, w * 0.3);
        ctx.lineTo(len * 0.25, w * 0.5);
        ctx.closePath();
        break;

      case 'droop': {
        // 下垂弧瓣
        const drp = Math.sin(phase * 0.3) * 10;
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(len * 0.4, -w + drp, len * 0.7, -w * 0.3 + drp, len, drp * 1.5);
        ctx.bezierCurveTo(len * 0.7, w * 0.3 + drp, len * 0.4, w + drp, 0, 0);
        break;
      }

      case 'dandelion':
        // 细丝瓣
        ctx.moveTo(0, 0);
        ctx.lineTo(len * 0.5, -w * 0.4);
        ctx.lineTo(len, 0);
        ctx.lineTo(len * 0.5, w * 0.4);
        ctx.closePath();
        break;

      case 'lily':
        // 宽扁瓣
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(len * 0.2, -w * 1.2, len * 0.8, -w * 1.0, len, 0);
        ctx.bezierCurveTo(len * 0.8, w * 1.0, len * 0.2, w * 1.2, 0, 0);
        break;

      case 'heal':
        // 圆心四叶
        ctx.arc(len * 0.5, 0, len * 0.5, 0, Math.PI * 2);
        break;

      default:
        // 标准贝塞尔瓣
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(len * 0.3, -w, len * 0.7, -w, len, 0);
        ctx.bezierCurveTo(len * 0.7, w, len * 0.3, w, 0, 0);
    }

    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.82;
    ctx.fill();

    // 瓣边高光
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = f.color2;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.restore();
  }

  // ─── 绘制完整花朵 ───
  _drawFlower(f, cx, cy) {
    const ctx = this.ctx;
    const t = this.t;

    const petals  = this.midiOverride.petals  ?? f.petals;
    const speed   = this.midiOverride.speed   ?? f.speed;
    const wave    = this.midiOverride.wave    ?? f.wave;

    // 基础旋转
    const rot = t * speed * (f.type === 'rage' ? 2 : 1);

    // 发光背景
    const glowR = f.radius * 1.8;
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    grd.addColorStop(0, f.glow ?? f.color + '22');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fill();

    // 茎
    ctx.save();
    ctx.strokeStyle = '#4a8a4a88';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy + f.radius * 0.35);
    ctx.quadraticCurveTo(cx + 8, cy + f.radius * 0.7, cx, cy + f.radius * 0.7 + 40);
    ctx.stroke();
    ctx.restore();

    // 花瓣
    for (let i = 0; i < petals; i++) {
      const baseAngle = (i / petals) * Math.PI * 2 + rot;

      let r = f.radius;
      if (f.type === 'thorn' || f.type === 'rage') {
        r += Math.sin(t * 0.3 + i * 1.5) * 14 * wave;
      } else {
        r += Math.sin(t * 0.08 + i * 0.8) * 8 * wave;
      }

      this._drawPetal(cx, cy, baseAngle, r, f.petalW, f, t);
    }

    // 花心
    const pulse = 1 + Math.sin(t * speed * 60) * 0.12;
    const r = 16 * pulse;
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2);
    cg.addColorStop(0, '#ffffff');
    cg.addColorStop(0.3, f.color2);
    cg.addColorStop(1, f.color + '66');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = cg;
    ctx.globalAlpha = 0.95;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ─── 主渲染循环 ───
  start() {
    const loop = () => {
      this.animId = requestAnimationFrame(loop);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.t++;

      const f = FLOWERS[this.currentIdx];
      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;

      this._updateParticles(f);
      this._drawParticles();
      this._drawFlower(f, cx, cy);
    };
    loop();
  }

  stop() {
    if (this.animId) cancelAnimationFrame(this.animId);
  }

  // ─── 截图 ───
  capture() {
    return this.canvas.toDataURL('image/png');
  }
}

// 花信画布渲染器 (继承主渲染器，带文字隐写)
class MessageRenderer extends FlowerRenderer {
  constructor(canvasId) {
    super(canvasId);
    this.hiddenText = '';
    this.encryptLevel = 'visual';
    this.msgParticles = [];
    this.msgT = 0;
  }

  renderMessage(flowerIdx, text, encryptLevel) {
    this.currentIdx = flowerIdx;
    this.hiddenText = text;
    this.encryptLevel = encryptLevel;
    this.msgParticles = [];
    this.msgT = 0;

    const ctx = this.ctx;
    const c = this.canvas;

    // 绘制静态截图
    ctx.clearRect(0, 0, c.width, c.height);

    const f = FLOWERS[flowerIdx];
    const cx = c.width / 2;
    const cy = c.height / 2;

    // 渲染若干帧粒子
    for (let i = 0; i < 60; i++) {
      this._updateParticles(f);
    }
    this._drawParticles();
    this._drawFlower(f, cx, cy);

    // 根据加密级别处理文字
    if (encryptLevel === 'hidden') {
      this._embedTextInParticles(text, f);
    }

    // 花语码水印（极小、半透明）
    const code = encodeFlowerMessage(flowerIdx, text);
    ctx.save();
    ctx.font = '8px monospace';
    ctx.fillStyle = f.color + '30';
    ctx.fillText(code.substring(0, 40) + '…', 8, c.height - 8);
    ctx.restore();
  }

  // 将文字字符嵌入粒子坐标（隐写）
  _embedTextInParticles(text, f) {
    const ctx = this.ctx;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      // 用字符码偏移粒子角度，使粒子排列隐含文字信息
      const angle = (i / text.length) * Math.PI * 2;
      const dist = 60 + (charCode % 60);
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;

      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = f.particleColor;
      ctx.beginPath();
      ctx.arc(x, y, 3 + (charCode % 4), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
