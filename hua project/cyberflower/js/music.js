// ═══════════════════════════════════════════════
// music.js — 花朵轻音乐合成模块
// 基于 Tone.js，每朵花对应独立音乐风格
// 实时程序化生成，无需外部音频文件
// ═══════════════════════════════════════════════

class FlowerMusicEngine {
  constructor() {
    this.started = false;
    this.active = false;
    this.currentIdx = -1;
    this.volume = 0.7; // 全局音量 0~1

    // 所有音色/序列器集合，按花型分组
    this._instruments = {};
    this._sequences = {};
    this._patterns = {};
    this._effects = {};

    // 主音量节点
    this._masterGain = null;
    this._reverb = null;
  }

  // ─── 首次交互后初始化 Tone.js ───
  async init() {
    if (this.started) return;
    await Tone.start();
    Tone.Transport.bpm.value = 72;

    // 全局效果链
    this._masterGain = new Tone.Gain(this.volume).toDestination();
    this._reverb = new Tone.Reverb({ decay: 2.5, wet: 0.3 }).connect(this._masterGain);

    this._buildAllInstruments();
    this.started = true;
    console.log('[Music] Tone.js 初始化完成');
  }

  // ─── 构建所有花型音色 ───
  _buildAllInstruments() {
    this._buildJoy();        // 0 喜悦
    this._buildSolitude();   // 1 孤独
    this._buildAnxiety();    // 2 焦虑
    this._buildCalm();       // 3 平静
    this._buildLonging();    // 4 思念
    this._buildRage();       // 5 愤怒
    this._buildHealing();    // 6 治愈
    this._buildAnticipation(); // 7 期待
  }

  // ════════════════════════════════
  // 0. 喜悦 Joy — 明快钢琴 + 木琴
  // 风格: 跳跃、明亮、C大调、120bpm
  // ════════════════════════════════
  _buildJoy() {
    const piano = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.2, release: 0.8 },
      volume: -8,
    }).connect(this._reverb);

    const marimba = new Tone.MetalSynth({
      frequency: 400, envelope: { attack: 0.001, decay: 0.4, release: 0.2 },
      harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
      volume: -18,
    }).connect(this._reverb);

    // C大调欢快旋律
    const melody = ['C5','E5','G5','A5','G5','E5','C5','E5','G5','B5','A5','G5','E5','C5','D5','E5'];
    const beats  = ['8n','8n','8n','4n','8n','8n','8n','8n','8n','8n','8n','8n','8n','4n','8n','4n'];
    let mi = 0;
    const seq = new Tone.Sequence((time, note) => {
      piano.triggerAttackRelease(note, beats[mi % beats.length], time);
      if (mi % 4 === 0) marimba.triggerAttackRelease('16n', time);
      mi = (mi + 1) % melody.length;
    }, melody, '8n');

    // 低音伴奏
    const bass = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.5 },
      volume: -14,
    }).connect(this._reverb);
    const bassSeq = new Tone.Sequence((time, note) => {
      bass.triggerAttackRelease(note, '4n', time);
    }, ['C3','G3','A3','F3'], '4n');

    this._instruments[0] = { piano, marimba, bass };
    this._sequences[0] = [seq, bassSeq];
    this._patterns[0] = { bpm: 120 };
  }

  // ════════════════════════════════
  // 1. 孤独 Solitude — 钢琴独奏 + 长音弦乐
  // 风格: 缓慢、余音绵长、小调、40bpm
  // ════════════════════════════════
  _buildSolitude() {
    const piano = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.1, decay: 1.2, sustain: 0.3, release: 3.0 },
      volume: -10,
    }).connect(this._reverb);

    const strings = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth', partialCount: 3 },
      envelope: { attack: 1.5, decay: 0.5, sustain: 0.8, release: 4.0 },
      volume: -20,
    }).connect(new Tone.Filter(800, 'lowpass').connect(this._reverb));

    // A小调冥想旋律
    const melody = ['A4','null','E4','null','C5','null','B4','null','A4','null','G4','null','F4','null','E4','null'];
    const chords = [['A3','C4','E4'], ['F3','A3','C4'], ['E3','G3','B3'], ['A3','C4','E4']];
    let ci = 0;
    const seq = new Tone.Sequence((time, note) => {
      if (note !== 'null') piano.triggerAttackRelease(note, '2n', time);
    }, melody, '4n');
    const chordSeq = new Tone.Sequence((time) => {
      strings.triggerAttackRelease(chords[ci % chords.length], '2n', time);
      ci++;
    }, ['x'], '2n');

    this._instruments[1] = { piano, strings };
    this._sequences[1] = [seq, chordSeq];
    this._patterns[1] = { bpm: 42 };
  }

  // ════════════════════════════════
  // 2. 焦虑 Anxiety — 不规则节奏 + 高音噪声
  // 风格: 紧张、不稳定、不规则重音、90bpm
  // ════════════════════════════════
  _buildAnxiety() {
    const lead = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 0.2 },
      volume: -12,
    }).connect(new Tone.Distortion(0.2).connect(this._reverb));

    const noise = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.005, decay: 0.08, sustain: 0, release: 0.1 },
      volume: -28,
    }).connect(this._reverb);

    const arp = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.05, sustain: 0.1, release: 0.1 },
      volume: -18,
    }).connect(this._reverb);

    // 焦虑音型：不规则跳音
    const notes = ['D5','F5','Ab4','E5','C5','Gb5','D5','Bb4','F5','Ab5','E5','C5'];
    let ni = 0;
    const seq = new Tone.Sequence((time) => {
      lead.triggerAttackRelease(notes[ni % notes.length], '16n', time);
      if (Math.random() > 0.6) noise.triggerAttackRelease('32n', time);
      if (Math.random() > 0.7) arp.triggerAttackRelease(notes[(ni+3) % notes.length], '32n', time + 0.05);
      ni++;
    }, new Array(16).fill('x'), '16n');

    this._instruments[2] = { lead, noise, arp };
    this._sequences[2] = [seq];
    this._patterns[2] = { bpm: 95 };
  }

  // ════════════════════════════════
  // 3. 平静 Calm — 颂钵 + 呼吸音效
  // 风格: 极慢、冥想、长延音、35bpm
  // ════════════════════════════════
  _buildCalm() {
    const bowl = new Tone.MetalSynth({
      frequency: 220, envelope: { attack: 0.001, decay: 4.0, release: 3.0 },
      harmonicity: 3.1, modulationIndex: 8, resonance: 3200, octaves: 0.8,
      volume: -14,
    }).connect(new Tone.Reverb({ decay: 6, wet: 0.6 }).connect(this._masterGain));

    const pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 2.0, decay: 1.0, sustain: 0.9, release: 5.0 },
      volume: -22,
    }).connect(new Tone.Reverb({ decay: 8, wet: 0.8 }).connect(this._masterGain));

    // 颂钵音序 (五声音阶)
    const bowlNotes = ['C3','G3','C4','E4','G4'];
    let bi = 0;
    const seq = new Tone.Sequence((time) => {
      bowl.triggerAttackRelease(bowlNotes[bi % bowlNotes.length], '1n', time);
      bi++;
    }, ['x'], '2n');

    const padChords = [['C3','E3','G3','B3'], ['F3','A3','C4','E4']];
    let pi = 0;
    const padSeq = new Tone.Sequence((time) => {
      pad.triggerAttackRelease(padChords[pi % padChords.length], '4n', time);
      pi++;
    }, ['x'], '1n');

    this._instruments[3] = { bowl, pad };
    this._sequences[3] = [seq, padSeq];
    this._patterns[3] = { bpm: 36 };
  }

  // ════════════════════════════════
  // 4. 思念 Longing — 吉他拨弦 + 口哨
  // 风格: 优美、叹息感、G大调、58bpm
  // ════════════════════════════════
  _buildLonging() {
    const guitar = new Tone.PluckSynth({
      attackNoise: 1, dampening: 3000, resonance: 0.96, volume: -8,
    }).connect(this._reverb);

    const whistle = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.2, decay: 0.1, sustain: 0.8, release: 1.5 },
      volume: -14,
    }).connect(new Tone.Vibrato(4, 0.3).connect(this._reverb));

    // G大调思念旋律（Satie风格）
    const melody = ['G4','A4','B4','D5','B4','A4','G4','null','E4','G4','A4','C5','A4','G4','E4','null'];
    const guitar_part = ['G3','D3','G3','D3','B3','D3','G3','D3'];
    let mi = 0, gi = 0;

    const seq = new Tone.Sequence((time) => {
      if (melody[mi] !== 'null') whistle.triggerAttackRelease(melody[mi], '4n', time);
      guitar.triggerAttackRelease(guitar_part[gi % guitar_part.length], time);
      mi = (mi + 1) % melody.length;
      gi++;
    }, new Array(16).fill('x'), '8n');

    this._instruments[4] = { guitar, whistle };
    this._sequences[4] = [seq];
    this._patterns[4] = { bpm: 58 };
  }

  // ════════════════════════════════
  // 5. 愤怒 Rage — 重击鼓 + 失真低音
  // 风格: 猛烈、节奏强劲、快速、140bpm
  // ════════════════════════════════
  _buildRage() {
    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.08, octaves: 6, envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.1 },
      volume: -6,
    }).connect(this._masterGain);

    const bass = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.2 },
      volume: -10,
    }).connect(new Tone.Distortion(0.5).connect(this._masterGain));

    const stab = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.005, decay: 0.15, sustain: 0, release: 0.1 },
      volume: -16,
    }).connect(new Tone.Distortion(0.3).connect(this._reverb));

    // 强力鼓点
    const kickPat = [1,0,0,1,1,0,1,0, 1,0,0,1,1,0,1,1];
    const bassPat = ['D2','null','null','A2','D2','null','Bb2','null','D2','null','null','A2','D2','null','G2','null'];
    let i16 = 0;
    const seq = new Tone.Sequence((time) => {
      if (kickPat[i16 % 16]) kick.triggerAttackRelease('C1', '8n', time);
      if (bassPat[i16 % 16] !== 'null') bass.triggerAttackRelease(bassPat[i16 % 16], '16n', time);
      if (i16 % 8 === 0) stab.triggerAttackRelease(['D3','F3','A3'], '8n', time);
      i16++;
    }, new Array(16).fill('x'), '16n');

    this._instruments[5] = { kick, bass, stab };
    this._sequences[5] = [seq];
    this._patterns[5] = { bpm: 138 };
  }

  // ════════════════════════════════
  // 6. 治愈 Healing — 钢琴 + 自然音效
  // 风格: 温暖、螺旋上升、F大调、65bpm
  // ════════════════════════════════
  _buildHealing() {
    const piano = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.05, decay: 0.6, sustain: 0.4, release: 2.0 },
      volume: -10,
    }).connect(this._reverb);

    const bell = new Tone.MetalSynth({
      frequency: 600, envelope: { attack: 0.001, decay: 1.2, release: 0.8 },
      harmonicity: 8, modulationIndex: 10, resonance: 5000, octaves: 1,
      volume: -22,
    }).connect(this._reverb);

    const pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.8, decay: 0.2, sustain: 0.9, release: 3.0 },
      volume: -24,
    }).connect(new Tone.Reverb({ decay: 5, wet: 0.6 }).connect(this._masterGain));

    // F大调治愈旋律（螺旋递进）
    const melody = ['F4','G4','A4','C5','A4','G4','F4','G4','A4','C5','D5','C5','A4','F4','G4','A4'];
    let mi = 0;
    const seq = new Tone.Sequence((time) => {
      piano.triggerAttackRelease(melody[mi % melody.length], '4n', time);
      if (mi % 6 === 0) bell.triggerAttackRelease('8n', time);
      mi++;
    }, new Array(16).fill('x'), '8n');

    const padChords = [['F3','A3','C4'], ['C3','E3','G3'], ['Bb3','D4','F4'], ['G3','B3','D4']];
    let pi = 0;
    const padSeq = new Tone.Sequence((time) => {
      pad.triggerAttackRelease(padChords[pi % padChords.length], '2n', time);
      pi++;
    }, ['x'], '2n');

    this._instruments[6] = { piano, bell, pad };
    this._sequences[6] = [seq, padSeq];
    this._patterns[6] = { bpm: 66 };
  }

  // ════════════════════════════════
  // 7. 期待 Anticipation — 上行琶音 + 钟声
  // 风格: 明亮、层层递进、D大调、88bpm
  // ════════════════════════════════
  _buildAnticipation() {
    const arp = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.6 },
      volume: -12,
    }).connect(this._reverb);

    const bell = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.8, sustain: 0.1, release: 1.5 },
      volume: -16,
    }).connect(this._reverb);

    const riser = new Tone.Synth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 2.0, decay: 0.5, sustain: 0.4, release: 1.0 },
      volume: -22,
    }).connect(new Tone.Filter(1200, 'lowpass').connect(this._reverb));

    // D大调上行琶音
    const arpNotes = ['D4','F#4','A4','D5','F#5','A5','D6','A5','F#5','D5','A4','F#4'];
    const bellNotes = [['D5','F#5','A5'], ['G4','B4','D5'], ['A4','C#5','E5'], ['D5','F#5','A5']];
    let ai = 0, bi2 = 0;
    const seq = new Tone.Sequence((time) => {
      arp.triggerAttackRelease(arpNotes[ai % arpNotes.length], '16n', time);
      ai++;
    }, new Array(12).fill('x'), '16n');

    const bellSeq = new Tone.Sequence((time) => {
      bell.triggerAttackRelease(bellNotes[bi2 % bellNotes.length], '4n', time);
      if (bi2 % 8 === 0) riser.triggerAttackRelease('A3', '1n', time);
      bi2++;
    }, ['x'], '4n');

    this._instruments[7] = { arp, bell, riser };
    this._sequences[7] = [seq, bellSeq];
    this._patterns[7] = { bpm: 88 };
  }

  // ─── 切换花朵音乐 ───
  async switchTo(idx) {
    if (!this.started) await this.init();
    if (idx === this.currentIdx) return;

    // 淡出当前
    if (this.currentIdx >= 0 && this._sequences[this.currentIdx]) {
      this._sequences[this.currentIdx].forEach(s => s.stop());
    }

    Tone.Transport.stop();
    Tone.Transport.cancel();

    // 设置新 BPM
    const pattern = this._patterns[idx];
    if (pattern) {
      Tone.Transport.bpm.rampTo(pattern.bpm, 0.5);
    }

    // 启动新序列
    if (this._sequences[idx]) {
      this._sequences[idx].forEach(s => s.start(0));
    }

    Tone.Transport.start();
    this.currentIdx = idx;
    this.active = true;
  }

  // ─── 暂停/恢复 ───
  pause() {
    Tone.Transport.pause();
    this.active = false;
  }

  resume() {
    if (!this.started) return;
    Tone.Transport.start();
    this.active = true;
  }

  // ─── 停止所有 ───
  stopAll() {
    Tone.Transport.stop();
    if (this.currentIdx >= 0 && this._sequences[this.currentIdx]) {
      this._sequences[this.currentIdx].forEach(s => s.stop());
    }
    this.active = false;
    this.currentIdx = -1;
  }

  // ─── 设置音量 ───
  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this._masterGain) {
      this._masterGain.gain.rampTo(this.volume, 0.2);
    }
  }
}

// 单例导出
const musicEngine = new FlowerMusicEngine();
