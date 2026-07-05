// ═══════════════════════════════════════════════
// main.js — 主控制器 (含音乐系统)
// ═══════════════════════════════════════════════

// ─── 全局状态 ───
let currentFlower = 0;
let inputSource = 'manual';
let musicPlaying = false;
let musicBadgeTimer = null;

// 每朵花的音乐描述
const MUSIC_META = [
  { style: '明快钢琴 + 木琴',   key: 'C 大调 · 120bpm' },
  { style: '钢琴独奏 + 弦乐',   key: 'A 小调 · 42bpm'  },
  { style: '失真合成 + 噪声',   key: '无调性 · 95bpm'  },
  { style: '颂钵 + 冥想音垫',   key: '五声音阶 · 36bpm' },
  { style: '拨弦吉他 + 口哨',   key: 'G 大调 · 58bpm'  },
  { style: '重击鼓 + 失真低音', key: 'D 小调 · 138bpm' },
  { style: '钢琴 + 钟声音垫',   key: 'F 大调 · 66bpm'  },
  { style: '上行琶音 + 钟声',   key: 'D 大调 · 88bpm'  },
];

// ─── 初始化渲染器 ───
const renderer = new FlowerRenderer('mainCanvas');
renderer.start();

const msgRenderer = new MessageRenderer('msgCanvas');
const msgSystem = new MessageSystem(msgRenderer);

// ─── 摄像头检测器 ───
const faceDetector = new FaceDetector(
  document.getElementById('camVideo'),
  document.getElementById('faceCanvas'),
  (emotion, flowerIdx, scores) => {
    if (inputSource !== 'face') return;
    switchFlower(flowerIdx, 'face');
    document.getElementById('faceEmotion').textContent = emotion;
    updateEmotionBars(scores);
  }
);

// ─── 麦克风分析器 ───
const micAnalyzer = new MicrophoneAnalyzer(
  document.getElementById('micCanvas'),
  (volume, pitch, flowerIdx) => {
    if (inputSource !== 'mic') return;
    switchFlower(flowerIdx, 'mic');
    document.getElementById('micVolume').textContent = Math.round(volume);
    document.getElementById('micPitch').textContent = pitch > 0 ? Math.round(pitch) + ' Hz' : '—';
    document.getElementById('micFlower').textContent = FLOWERS[flowerIdx].name;
  }
);

// ─── MIDI 控制器 ───
const midiCtrl = new MidiController(
  (cc, value, param) => {
    if (cc === 1)  document.getElementById('midiCC1').textContent = value;
    if (cc === 7)  document.getElementById('midiCC7').textContent = value;
    if (cc === 10) document.getElementById('midiCC10').textContent = value;
    if (param.param === 'petals') renderer.applyMidi(param.value, null, null);
    if (param.param === 'speed')  renderer.applyMidi(null, param.value, null);
    if (param.param === 'wave')   renderer.applyMidi(null, null, param.value);
    logMidi(`CC${cc} = ${value} → ${param.param ?? '—'}: ${typeof param.value === 'number' ? param.value.toFixed(3) : param.value}`);
  },
  (note, vel, flowerIdx) => {
    document.getElementById('midiNote').textContent = `${noteName(note)} (${note})`;
    if (inputSource === 'midi' || inputSource === 'manual') {
      switchFlower(flowerIdx, 'midi');
    }
    logMidi(`Note ${noteName(note)} vel:${vel} → ${FLOWERS[flowerIdx].name}`);
  }
);

// ─── Arduino 串口 ───
const arduino = new ArduinoSerial(({ distance, touch, light }) => {
  const pct = Math.min(100, (distance / 250) * 100);
  document.getElementById('distanceBar').style.width = pct + '%';
  document.getElementById('distanceVal').textContent = distance + ' cm';

  const touchEl = document.getElementById('touchIndicator');
  touchEl.textContent = touch ? '触碰中 ✓' : '未触碰';
  touchEl.classList.toggle('touched', touch);

  const lPct = Math.min(100, (light / 1023) * 100);
  document.getElementById('lightBar').style.width = lPct + '%';
  document.getElementById('lightVal').textContent = Math.round(lPct) + '%';

  if (inputSource === 'arduino') {
    const trigger = DISTANCE_TRIGGER_MAP.find(t => distance >= t.range[0] && distance < t.range[1]);
    if (trigger) switchFlower(trigger.flowerIdx, 'arduino');
    msgSystem.updateActiveTrigger(distance);
  }
  logSerial(`d:${distance}cm t:${touch?1:0} l:${light}`);
});

// ═══════════════════════════════════════════════
// 核心：花朵切换（含音乐联动）
// ═══════════════════════════════════════════════
function switchFlower(idx, source) {
  // 同花同来源时跳过（但 manual 每次都允许，防止点击无反应）
  if (idx === currentFlower && source === inputSource && source !== 'manual') return;

  currentFlower = idx;
  inputSource = source;

  // 渲染切换
  renderer.setFlower(idx);
  updateFlowerUI(idx);
  updateSourceBadge(source);

  // 侧边栏高亮
  document.querySelectorAll('#flowerButtons .flower-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === idx);
  });

  // 音乐联动：如果正在播放，立刻切换音乐
  if (musicPlaying) {
    musicEngine.switchTo(idx);
    updateMusicUI(idx);
  }
}

function selectFlowerManual(idx) {
  switchFlower(idx, 'manual');
  renderer.applyMidi(null, null, null);
}

// ═══════════════════════════════════════════════
// UI 更新
// ═══════════════════════════════════════════════
function updateFlowerUI(idx) {
  const f = FLOWERS[idx];
  document.getElementById('overlayName').textContent = f.name;
  document.getElementById('overlayEn').textContent = `${f.en} · ${f.type}`;

  const tags = document.getElementById('overlayTags');
  tags.innerHTML = f.tags.map(t => `
    <span class="flower-tag" style="color:${f.color};border-color:${f.color}44;background:${f.color}11">${t}</span>
  `).join('');

  document.getElementById('rColor').style.background = f.color;
  document.getElementById('rColorTxt').textContent = f.rules[0];
  document.getElementById('rFormTxt').textContent = f.rules[1];
  document.getElementById('rRhythmTxt').textContent = f.rules[2];
  document.getElementById('rParticleTxt').textContent = f.rules[3];
}

const SOURCE_LABELS = {
  manual: '手动选择', face: '🎭 情绪识别',
  mic: '🎙 声音感应', midi: '🎹 MIDI 控制', arduino: '🔌 距离传感器',
};

function updateSourceBadge(source) {
  document.getElementById('sourceBadge').textContent = SOURCE_LABELS[source] ?? source;
}

// ═══════════════════════════════════════════════
// 音乐系统
// ═══════════════════════════════════════════════
function updateMusicUI(idx) {
  const meta = MUSIC_META[idx];
  const f = FLOWERS[idx];

  document.getElementById('musicToggle')?.classList.add('playing');
  document.getElementById('musicIcon').textContent = '⏸';
  document.getElementById('musicName').textContent = `${f.name} · ${meta.style}`;
  document.getElementById('musicBpm').textContent = meta.key;
  document.getElementById('musicViz')?.classList.add('active');

  const badge = document.getElementById('musicBadge');
  if (badge) {
    badge.style.borderColor = f.color + '66';
    const mbStyle = document.getElementById('mbStyle');
    if (mbStyle) { mbStyle.textContent = meta.style; mbStyle.style.color = f.color; }
    const mbKey = document.getElementById('mbKey');
    if (mbKey) mbKey.textContent = meta.key;
    badge.classList.add('visible');
    clearTimeout(musicBadgeTimer);
    musicBadgeTimer = setTimeout(() => badge.classList.remove('visible'), 3500);
  }
}

function setMusicPaused() {
  document.getElementById('musicToggle')?.classList.remove('playing');
  document.getElementById('musicIcon').textContent = '▶';
  document.getElementById('musicName').textContent = '— 已暂停 —';
  document.getElementById('musicBpm').textContent = '';
  document.getElementById('musicViz')?.classList.remove('active');
  document.getElementById('musicBadge')?.classList.remove('visible');
}

// 播放/暂停按钮
document.getElementById('musicToggle')?.addEventListener('click', async () => {
  if (!musicPlaying) {
    await musicEngine.switchTo(currentFlower);
    musicPlaying = true;
    updateMusicUI(currentFlower);
  } else {
    musicEngine.pause();
    musicPlaying = false;
    setMusicPaused();
  }
});

// 音量滑块
document.getElementById('musicVol')?.addEventListener('input', function () {
  musicEngine.setVolume(this.value / 100);
});

// ═══════════════════════════════════════════════
// 花朵按钮列表
// ═══════════════════════════════════════════════
function buildFlowerButtons() {
  const container = document.getElementById('flowerButtons');
  container.innerHTML = FLOWERS.map((f, i) => `
    <button class="flower-btn ${i === 0 ? 'active' : ''}" onclick="selectFlowerManual(${i})">
      <div class="fdot" style="background:${f.color}"></div>
      <div>
        <div class="flabel">${f.name} ${f.en}</div>
        <div class="fsub">${f.rules[1]} · ${f.rules[2]}</div>
      </div>
    </button>
  `).join('');
}

// ═══════════════════════════════════════════════
// 传感器按钮事件
// ═══════════════════════════════════════════════
document.getElementById('toggleCam')?.addEventListener('click', async function () {
  if (faceDetector.active) {
    faceDetector.stop();
    this.textContent = '启动'; this.classList.remove('active');
    if (inputSource === 'face') inputSource = 'manual';
    setStatus('camStatus', 'off');
  } else {
    this.textContent = '启动中…';
    const ok = await faceDetector.start();
    if (ok) {
      this.textContent = '停止'; this.classList.add('active');
      inputSource = 'face'; setStatus('camStatus', 'on');
    } else {
      this.textContent = '启动'; setStatus('camStatus', 'err');
      alert('摄像头启动失败。请检查浏览器权限，并确保 /models/ 目录下有 face-api.js 模型文件。');
    }
  }
});

document.getElementById('toggleMic')?.addEventListener('click', async function () {
  if (micAnalyzer.active) {
    micAnalyzer.stop();
    this.textContent = '启动'; this.classList.remove('active');
    if (inputSource === 'mic') inputSource = 'manual';
    setStatus('micStatus', 'off');
  } else {
    this.textContent = '启动中…';
    const ok = await micAnalyzer.start();
    if (ok) {
      this.textContent = '停止'; this.classList.add('active');
      inputSource = 'mic'; setStatus('micStatus', 'on');
    } else {
      this.textContent = '启动'; setStatus('micStatus', 'err');
      alert('麦克风启动失败。请检查浏览器麦克风权限。');
    }
  }
});

document.getElementById('toggleMidi')?.addEventListener('click', async function () {
  if (midiCtrl.active) {
    midiCtrl.active = false;
    this.textContent = '连接'; this.classList.remove('active');
    setStatus('midiStatus', 'off');
  } else {
    this.textContent = '连接中…';
    const ok = await midiCtrl.connect();
    if (ok) {
      this.textContent = '已连接'; this.classList.add('active');
      setStatus('midiStatus', 'on');
      if (midiCtrl.deviceName) logMidi('设备: ' + midiCtrl.deviceName);
    } else {
      this.textContent = '连接'; setStatus('midiStatus', 'err');
      alert('MIDI 连接失败。请确保设备已插入，并在 Chrome/Edge 中使用此页面。');
    }
  }
});

document.getElementById('btnSerial')?.addEventListener('click', async function () {
  if (arduino.active) {
    await arduino.disconnect();
    this.textContent = '连接串口 (Web Serial)';
    document.getElementById('serialInfo').textContent = '未连接';
    if (inputSource === 'arduino') inputSource = 'manual';
    setStatus('serialStatus', 'off');
  } else {
    if (!arduino.isSupported()) {
      alert('Web Serial API 不支持。\n请使用 Chrome 89+ 或 Edge 89+。');
      return;
    }
    const ok = await arduino.connect();
    if (ok) {
      this.textContent = '断开串口';
      document.getElementById('serialInfo').textContent = '已连接 · 9600 baud';
      inputSource = 'arduino'; setStatus('serialStatus', 'on');
    } else {
      setStatus('serialStatus', 'err');
    }
  }
});

document.getElementById('btnCopyArduino')?.addEventListener('click', function () {
  navigator.clipboard.writeText(ARDUINO_SKETCH).then(() => {
    this.textContent = '✓ 已复制';
    setTimeout(() => this.textContent = '📋 复制代码', 2000);
  });
});

// Tab 切换
document.querySelectorAll('.nav-tabs .tab').forEach(tab => {
  tab.addEventListener('click', function () {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
    this.classList.add('active');
    document.getElementById('tab-' + this.dataset.tab)?.classList.add('active');
    if (this.dataset.tab === 'garden') renderer._resize();
  });
});

// ═══════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════
function setStatus(id, state) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = 'status-dot' + (state === 'on' ? ' on' : state === 'err' ? ' err' : state === 'warn' ? ' warn' : '');
}

function updateEmotionBars(scores) {
  const container = document.getElementById('emotionBars');
  if (!container) return;
  const EMOTION_COLORS = {
    happy:'#ffd700', sad:'#7b68ee', angry:'#ff4444',
    fearful:'#ff6b6b', disgusted:'#a855f7', surprised:'#f5a623', neutral:'#4ecdc4'
  };
  container.innerHTML = Object.entries(scores).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([em,v]) => `
    <div class="emotion-bar-row">
      <span style="min-width:52px">${em}</span>
      <div class="emotion-bar-track">
        <div class="emotion-bar-fill" style="width:${Math.round(v*100)}%;background:${EMOTION_COLORS[em]??'#888'}"></div>
      </div>
      <span style="min-width:28px;text-align:right">${Math.round(v*100)}%</span>
    </div>
  `).join('');
}

function logMidi(msg) {
  const el = document.getElementById('midiLog');
  if (!el) return;
  el.textContent = msg + '\n' + el.textContent;
  if (el.textContent.length > 400) el.textContent = el.textContent.slice(0, 400);
}

function logSerial(msg) {
  const el = document.getElementById('serialLog');
  if (!el) return;
  el.textContent = `[${new Date().toLocaleTimeString()}] ${msg}\n` + el.textContent;
  if (el.textContent.split('\n').length > 100)
    el.textContent = el.textContent.split('\n').slice(0,100).join('\n');
}

function noteName(midi) {
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  return names[midi % 12] + Math.floor(midi / 12 - 1);
}

// ═══════════════════════════════════════════════
// 初始化
// ═══════════════════════════════════════════════
buildFlowerButtons();
updateFlowerUI(0);
updateSourceBadge('manual');

const codeEl = document.getElementById('arduinoCode');
if (codeEl) codeEl.textContent = ARDUINO_SKETCH;

const msgCanvas = document.getElementById('msgCanvas');
if (msgCanvas) { msgCanvas.width = 400; msgCanvas.height = 240; }

console.log('🌸 CyberFlower Language 初始化完成 — 点击 ▶ 播放花朵音乐');
