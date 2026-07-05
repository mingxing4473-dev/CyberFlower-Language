// ═══════════════════════════════════════════════
// midi.js — MIDI 控制器映射模块
// Web MIDI API: CC 映射花朵参数, Note 切换花型
// ═══════════════════════════════════════════════

class MidiController {
  constructor(onCC, onNote) {
    this.onCC = onCC;   // callback(cc, value 0-127)
    this.onNote = onNote; // callback(note, velocity, flowerIdx)
    this.midiAccess = null;
    this.active = false;
    this.deviceName = null;

    // CC 当前值
    this.cc = { 1: 0, 7: 64, 10: 64 };
  }

  async connect() {
    if (!navigator.requestMIDIAccess) {
      console.warn('[MIDI] Web MIDI API not supported in this browser.');
      console.warn('[MIDI] 请在 Chrome 或 Edge 中使用，或安装 Jazz-Plugin');
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this._bindInputs();

      // 监听设备热插拔
      this.midiAccess.onstatechange = () => this._bindInputs();

      this.active = true;
      return true;
    } catch (e) {
      console.error('[MIDI] Access denied:', e.message);
      return false;
    }
  }

  _bindInputs() {
    for (const input of this.midiAccess.inputs.values()) {
      input.onmidimessage = (e) => this._onMessage(e);
      this.deviceName = input.name;
    }
  }

  _onMessage(event) {
    const [status, data1, data2] = event.data;
    const type = status & 0xf0;
    const channel = status & 0x0f;

    // Note On
    if (type === 0x90 && data2 > 0) {
      const flowerIdx = this._noteToFlower(data1);
      this.onNote(data1, data2, flowerIdx);
    }
    // Note Off
    else if (type === 0x80 || (type === 0x90 && data2 === 0)) {
      // 可用于花朵收拢动画
    }
    // Control Change
    else if (type === 0xb0) {
      this.cc[data1] = data2;
      this.onCC(data1, data2, this._ccToFlowerParam(data1, data2));
    }
  }

  // MIDI Note → 花型索引
  // C4(60)=喜悦, D4(62)=孤独, E4(64)=焦虑, F4(65)=平静...
  _noteToFlower(note) {
    for (let i = 0; i < FLOWERS.length; i++) {
      if (FLOWERS[i].midiNotes.includes(note)) return i;
    }
    // 音符取模映射 (白键)
    const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11]; // C D E F G A B
    const pc = note % 12;
    const wkIdx = WHITE_KEYS.indexOf(pc);
    return wkIdx >= 0 ? wkIdx % FLOWERS.length : note % FLOWERS.length;
  }

  // CC → 花朵参数解释
  // CC1  (0-127) → petals  映射 4-20
  // CC7  (0-127) → speed   映射 0.002-0.08
  // CC10 (0-127) → wave    映射 0.1-2.0
  _ccToFlowerParam(cc, value) {
    if (cc === 1)  return { param: 'petals', value: Math.round(4 + (value / 127) * 16) };
    if (cc === 7)  return { param: 'speed',  value: 0.002 + (value / 127) * 0.078 };
    if (cc === 10) return { param: 'wave',   value: 0.1 + (value / 127) * 1.9 };
    return { param: null, value };
  }

  getDeviceName() { return this.deviceName; }
  isConnected() { return this.active && this.midiAccess?.inputs.size > 0; }
}
