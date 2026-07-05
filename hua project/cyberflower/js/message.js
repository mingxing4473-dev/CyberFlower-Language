// ═══════════════════════════════════════════════
// message.js — 花信编解码系统
// 四维花语参数 → 加密码字 → 可解码/可传播
// ═══════════════════════════════════════════════

// ─── 花信编码 ───
// 格式: CF1::{花型ID}::{加密级别}::{BASE64文本}::{校验码}
function encodeFlowerMessage(flowerIdx, text, level = 'cipher') {
  const f = FLOWERS[flowerIdx];
  const b64 = btoa(unescape(encodeURIComponent(text)));

  // 花语参数序列化 (四维)
  const params = [
    flowerIdx,             // 维度1: 花型
    f.petals,              // 维度2: 形态
    Math.round(f.speed * 1000), // 维度3: 节奏 (×1000避免小数)
    Math.round(f.wave * 100),   // 维度4: 波动
  ].join('-');

  const checksum = _crc8(params + b64);

  return `CF1::${params}::${level}::${b64}::${checksum.toString(16).padStart(2, '0')}`;
}

// ─── 花信解码 ───
function decodeFlowerMessage(code) {
  try {
    const parts = code.trim().split('::');
    if (parts[0] !== 'CF1' || parts.length !== 5) {
      return { ok: false, error: '无效花信格式' };
    }

    const [, params, level, b64, checksum] = parts;

    // 校验
    const expected = _crc8(params + b64).toString(16).padStart(2, '0');
    if (expected !== checksum) {
      return { ok: false, error: '花信校验失败（内容已损坏）' };
    }

    // 解析参数
    const [idx, petals, speedX1000, waveX100] = params.split('-').map(Number);
    const text = decodeURIComponent(escape(atob(b64)));
    const f = FLOWERS[idx];

    return {
      ok: true,
      flowerIdx: idx,
      flower: f,
      petals,
      speed: speedX1000 / 1000,
      wave: waveX100 / 100,
      level,
      text,
      meaning: {
        color: f.rules[0],
        form: f.rules[1],
        rhythm: f.rules[2],
        particle: f.rules[3],
      }
    };
  } catch (e) {
    return { ok: false, error: '解码失败: ' + e.message };
  }
}

// 简易 CRC-8
function _crc8(str) {
  let crc = 0;
  for (const ch of str) {
    crc ^= ch.charCodeAt(0);
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x80 ? (crc << 1) ^ 0x07 : crc << 1;
    }
  }
  return crc & 0xff;
}

// ─── UI 管理 ───
class MessageSystem {
  constructor(renderer) {
    this.renderer = renderer;
    this.selectedFlower = 0;
    this.currentCode = '';

    this._buildComposeGrid();
    this._buildTriggerRows();
    this._bindEvents();
  }

  _buildComposeGrid() {
    const grid = document.getElementById('composeFlowerGrid');
    if (!grid) return;
    grid.innerHTML = FLOWERS.map((f, i) => `
      <button class="compose-flower-btn ${i === 0 ? 'active' : ''}"
              onclick="msgSystem.selectFlower(${i})"
              style="${i === 0 ? `border-color:${f.color}` : ''}">
        <div class="cfdot" style="background:${f.color}"></div>
        <span class="cfname" style="color:${f.color}">${f.name}</span>
      </button>
    `).join('');
  }

  _buildTriggerRows() {
    const rows = document.getElementById('triggerRows');
    if (!rows) return;
    rows.innerHTML = DISTANCE_TRIGGER_MAP.map((t, i) => {
      const f = FLOWERS[t.flowerIdx];
      return `
        <div class="trigger-row" id="tr-${i}">
          <span class="tr-range">${t.label}</span>
          <div class="tr-dot" style="background:${f.color}"></div>
          <span>${f.name} · ${f.en}</span>
        </div>
      `;
    }).join('');
  }

  selectFlower(idx) {
    this.selectedFlower = idx;
    const f = FLOWERS[idx];
    document.querySelectorAll('.compose-flower-btn').forEach((btn, i) => {
      btn.classList.toggle('active', i === idx);
      btn.style.borderColor = i === idx ? FLOWERS[i].color : '';
    });
  }

  _bindEvents() {
    document.getElementById('btnCompose')?.addEventListener('click', () => this.compose());
    document.getElementById('btnDecode')?.addEventListener('click', () => this.decode());
    document.getElementById('btnCopyCode')?.addEventListener('click', () => this.copyCode());
    document.getElementById('btnDownload')?.addEventListener('click', () => this.download());
  }

  compose() {
    const text = document.getElementById('msgText')?.value?.trim() ?? '';
    const level = document.getElementById('encryptLevel')?.value ?? 'cipher';

    this.currentCode = encodeFlowerMessage(this.selectedFlower, text, level);

    // 渲染花信图像
    this.renderer.renderMessage(this.selectedFlower, text, level);

    // 显示花信码
    const display = document.getElementById('flowerCodeDisplay');
    if (display) display.textContent = this.currentCode;

    // 隐藏解码面板
    const dp = document.getElementById('msgDecodePanel');
    if (dp) dp.style.display = 'none';
  }

  decode() {
    if (!this.currentCode) return;
    const result = decodeFlowerMessage(this.currentCode);
    const dp = document.getElementById('msgDecodePanel');
    const dc = document.getElementById('msgDecodeContent');
    const ot = document.getElementById('msgOriginalText');
    if (!dp || !dc) return;

    if (!result.ok) {
      dc.innerHTML = `<p style="color:#f87171">${result.error}</p>`;
      dp.style.display = 'block';
      return;
    }

    const f = result.flower;
    dc.innerHTML = `
      <div class="msg-decode-row"><span class="msg-decode-key">花型</span>
        <span class="msg-decode-val" style="color:${f.color}">${f.name} · ${f.en}</span></div>
      <div class="msg-decode-row"><span class="msg-decode-key">色彩</span>
        <span class="msg-decode-val">${result.meaning.color}</span></div>
      <div class="msg-decode-row"><span class="msg-decode-key">形态</span>
        <span class="msg-decode-val">${result.meaning.form}</span></div>
      <div class="msg-decode-row"><span class="msg-decode-key">节奏</span>
        <span class="msg-decode-val">${result.meaning.rhythm}</span></div>
      <div class="msg-decode-row"><span class="msg-decode-key">粒子</span>
        <span class="msg-decode-val">${result.meaning.particle}</span></div>
      <div class="msg-decode-row"><span class="msg-decode-key">加密</span>
        <span class="msg-decode-val">${result.level}</span></div>
    `;

    ot.textContent = result.level !== 'visual' ? result.text : '（视觉加密：文字不可见）';
    dp.style.display = 'block';
  }

  copyCode() {
    if (!this.currentCode) return;
    navigator.clipboard.writeText(this.currentCode).then(() => {
      const btn = document.getElementById('btnCopyCode');
      if (btn) { btn.textContent = '✓ 已复制'; setTimeout(() => btn.textContent = '📋 复制花信码', 2000); }
    });
  }

  download() {
    const canvas = document.getElementById('msgCanvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `cyberflower_${FLOWERS[this.selectedFlower].id}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  updateActiveTrigger(distanceCm) {
    DISTANCE_TRIGGER_MAP.forEach((t, i) => {
      const el = document.getElementById(`tr-${i}`);
      if (!el) return;
      const active = distanceCm >= t.range[0] && distanceCm < t.range[1];
      el.classList.toggle('active-trigger', active);
    });
  }
}
