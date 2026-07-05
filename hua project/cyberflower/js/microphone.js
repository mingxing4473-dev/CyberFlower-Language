// ═══════════════════════════════════════════════
// microphone.js — 麦克风音量/音调感应模块
// Web Audio API: AnalyserNode + 自相关音调检测
// ═══════════════════════════════════════════════

class MicrophoneAnalyzer {
  constructor(vizCanvas, onAudio) {
    this.canvas = vizCanvas;
    this.ctx = vizCanvas.getContext('2d');
    this.onAudio = onAudio; // callback(volume 0-100, pitch Hz, flowerIdx)
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
    this.active = false;
    this.animId = null;
    this.bufferLength = 2048;
    this.dataArray = null;
    this.freqArray = null;
    this._smoothVol = 0;
    this._smoothPitch = 0;
  }

  async start() {
    if (this.active) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 4096;
      this.analyser.smoothingTimeConstant = 0.8;
      this.bufferLength = this.analyser.fftSize;
      this.dataArray = new Float32Array(this.bufferLength);
      this.freqArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.source = this.audioCtx.createMediaStreamSource(this.stream);
      this.source.connect(this.analyser);
      this.active = true;
      this._loop();
      return true;
    } catch (e) {
      console.error('[Mic] Access denied:', e.message);
      return false;
    }
  }

  stop() {
    this.active = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.audioCtx) this.audioCtx.close();
    this.audioCtx = null;
  }

  _loop() {
    if (!this.active) return;
    this.animId = requestAnimationFrame(() => this._loop());

    this.analyser.getFloatTimeDomainData(this.dataArray);
    this.analyser.getByteFrequencyData(this.freqArray);

    const volume = this._calcVolume();
    const pitch = this._calcPitch();

    // 平滑处理
    this._smoothVol = this._smoothVol * 0.7 + volume * 0.3;
    this._smoothPitch = pitch > 0
      ? this._smoothPitch * 0.6 + pitch * 0.4
      : this._smoothPitch;

    const flowerIdx = mapMicToFlower(this._smoothVol, this._smoothPitch);
    this.onAudio(this._smoothVol, this._smoothPitch, flowerIdx);

    this._drawViz(this._smoothVol);
  }

  // RMS 音量计算 → 0-100
  _calcVolume() {
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i] * this.dataArray[i];
    }
    const rms = Math.sqrt(sum / this.dataArray.length);
    return Math.min(100, rms * 300);
  }

  // 自相关函数音调检测 (YIN 简化版)
  _calcPitch() {
    const buf = this.dataArray;
    const sampleRate = this.audioCtx.sampleRate;
    const SIZE = buf.length;
    const MAX_SAMPLES = Math.floor(SIZE / 2);

    // 先检查是否有足够音量，避免噪声误检
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1;

    // 自相关
    let bestOffset = -1;
    let bestCorr = 0;
    let lastCorr = 1;
    let foundGoodCorr = false;
    const THRESHOLD = 0.9;

    for (let offset = 16; offset < MAX_SAMPLES; offset++) {
      let corr = 0;
      for (let i = 0; i < MAX_SAMPLES; i++) {
        corr += buf[i] * buf[i + offset];
      }
      corr = corr / MAX_SAMPLES;

      if (corr > THRESHOLD && corr > lastCorr) {
        foundGoodCorr = true;
        if (corr > bestCorr) {
          bestCorr = corr;
          bestOffset = offset;
        }
      } else if (foundGoodCorr) {
        break;
      }
      lastCorr = corr;
    }

    if (bestOffset === -1 || bestCorr < 0.01) return -1;

    // 抛物线插值提高精度
    const shift = (buf[bestOffset + 1] - buf[bestOffset - 1]) /
                  (2 * (2 * buf[bestOffset] - buf[bestOffset + 1] - buf[bestOffset - 1]));
    const period = bestOffset + shift;
    const pitch = sampleRate / period;

    // 有效范围 80Hz ~ 1500Hz
    return pitch >= 80 && pitch <= 1500 ? pitch : -1;
  }

  // 波形可视化
  _drawViz(vol) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    // 频谱条
    const barCount = 32;
    const barW = w / barCount;
    for (let i = 0; i < barCount; i++) {
      const v = this.freqArray[Math.floor(i * this.analyser.frequencyBinCount / barCount)] / 255;
      const barH = v * h;
      const alpha = 0.4 + v * 0.6;
      ctx.fillStyle = `rgba(192, 132, 252, ${alpha})`;
      ctx.fillRect(i * barW, h - barH, barW - 1, barH);
    }

    // 音量指示线
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    const lineX = (vol / 100) * w;
    ctx.beginPath();
    ctx.moveTo(lineX, 0);
    ctx.lineTo(lineX, h);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
