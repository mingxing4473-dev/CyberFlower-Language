// ═══════════════════════════════════════════════
// faceDetect.js — 摄像头情绪识别模块
// 基于 face-api.js  (TinyFaceDetector + FaceExpressions)
// ═══════════════════════════════════════════════

class FaceDetector {
  constructor(videoEl, overlayCanvas, onEmotion) {
    this.video = videoEl;
    this.overlay = overlayCanvas;
    this.onEmotion = onEmotion;  // callback(emotionName, flowerIdx, scores)
    this.stream = null;
    this.active = false;
    this.loopId = null;
    this.modelsLoaded = false;
  }

  // ─── 加载模型 ───
  // 模型文件放在 /models/ 目录下
  // 下载: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
  async loadModels(modelPath = './models') {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
        faceapi.nets.faceExpressionNet.loadFromUri(modelPath),
      ]);
      this.modelsLoaded = true;
      console.log('[FaceDetect] Models loaded ✓');
      return true;
    } catch (e) {
      console.warn('[FaceDetect] Model load failed:', e.message);
      console.warn('[FaceDetect] 请下载模型文件至 /models/ 目录');
      console.warn('  下载地址: https://github.com/justadudewhohacks/face-api.js/tree/master/weights');
      return false;
    }
  }

  // ─── 启动摄像头 ───
  async start() {
    if (this.active) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' }
      });
      this.video.srcObject = this.stream;
      this.video.style.display = 'block';
      this.active = true;

      if (!this.modelsLoaded) {
        await this.loadModels();
      }

      this.video.addEventListener('loadedmetadata', () => {
        this._syncOverlay();
        this._loop();
      });

      return true;
    } catch (e) {
      console.error('[FaceDetect] Camera access denied:', e.message);
      return false;
    }
  }

  stop() {
    this.active = false;
    if (this.loopId) clearTimeout(this.loopId);
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.video.style.display = 'none';
  }

  _syncOverlay() {
    this.overlay.width = this.video.videoWidth;
    this.overlay.height = this.video.videoHeight;
    this.overlay.style.width = this.video.clientWidth + 'px';
    this.overlay.style.height = this.video.clientHeight + 'px';
    this.overlay.style.top = this.video.offsetTop + 'px';
    this.overlay.style.left = this.video.offsetLeft + 'px';
  }

  async _loop() {
    if (!this.active) return;

    try {
      const detections = await faceapi
        .detectSingleFace(this.video, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (detections) {
        this._drawDetection(detections);
        const dominant = this._getDominantEmotion(detections.expressions);
        const flowerIdx = FACE_EMOTION_MAP[dominant] ?? 3;
        this.onEmotion(dominant, flowerIdx, detections.expressions);
      }
    } catch (e) {
      // 无人脸时静默跳过
    }

    this.loopId = setTimeout(() => this._loop(), 500); // 2fps，性能优先
  }

  _getDominantEmotion(expressions) {
    return Object.entries(expressions)
      .sort((a, b) => b[1] - a[1])[0][0];
  }

  _drawDetection(det) {
    const ctx = this.overlay.getContext('2d');
    ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);

    const dims = faceapi.matchDimensions(this.overlay, this.video, true);
    const resized = faceapi.resizeResults(det, dims);

    // 人脸框
    const box = resized.detection.box;
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    // 情绪标签
    const dominant = this._getDominantEmotion(resized.expressions);
    const score = Math.round(resized.expressions[dominant] * 100);
    ctx.fillStyle = '#c084fc';
    ctx.font = '11px monospace';
    ctx.fillText(`${dominant} ${score}%`, box.x, box.y - 4);
  }
}
