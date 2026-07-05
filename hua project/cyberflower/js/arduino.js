// ═══════════════════════════════════════════════
// arduino.js — Arduino Web Serial 通信模块
// 协议: 每行 JSON {"d":cm,"t":0/1,"l":0-1023}
// ═══════════════════════════════════════════════

class ArduinoSerial {
  constructor(onData) {
    this.onData = onData; // callback({distance, touch, light})
    this.port = null;
    this.reader = null;
    this.active = false;
    this.buffer = '';
  }

  isSupported() {
    return 'serial' in navigator;
  }

  async connect() {
    if (!this.isSupported()) {
      console.warn('[Arduino] Web Serial API not supported.');
      console.warn('[Arduino] 请使用 Chrome 89+ 或 Edge 89+，并在 chrome://flags 启用 Web Serial');
      return false;
    }

    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 9600 });
      this.active = true;
      this._readLoop();
      return true;
    } catch (e) {
      console.error('[Arduino] Serial connect failed:', e.message);
      return false;
    }
  }

  async disconnect() {
    this.active = false;
    try {
      if (this.reader) { await this.reader.cancel(); this.reader = null; }
      if (this.port) { await this.port.close(); this.port = null; }
    } catch (e) { /* ignore */ }
  }

  async _readLoop() {
    const decoder = new TextDecoderStream();
    this.port.readable.pipeTo(decoder.writable);
    const reader = decoder.readable.getReader();
    this.reader = reader;

    while (this.active) {
      try {
        const { value, done } = await reader.read();
        if (done) break;
        this.buffer += value;
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop();
        for (const line of lines) {
          this._parseLine(line.trim());
        }
      } catch (e) {
        if (this.active) console.error('[Arduino] Read error:', e.message);
        break;
      }
    }
  }

  _parseLine(line) {
    if (!line) return;
    try {
      const data = JSON.parse(line);
      // 期望格式: {"d":45,"t":0,"l":512}
      if (typeof data.d === 'number') {
        this.onData({
          distance: data.d,   // 距离 cm
          touch: !!data.t,    // 触摸 bool
          light: data.l ?? 0, // 光照 0-1023
        });
      }
    } catch (e) {
      // 非 JSON 行当作日志输出
      this._appendLog(line);
    }
  }

  _appendLog(line) {
    const log = document.getElementById('serialLog');
    if (!log) return;
    log.textContent += line + '\n';
    log.scrollTop = log.scrollHeight;
    // 只保留最近 200 行
    const lines = log.textContent.split('\n');
    if (lines.length > 200) {
      log.textContent = lines.slice(-200).join('\n');
    }
  }
}

// ─── Arduino 源码字符串 ───
const ARDUINO_SKETCH = `// CyberFlower Language — Arduino 传感器端
// 连接: HC-SR04 距离传感器 + 触摸传感器 + 光敏电阻
// 串口输出: JSON 格式 {"d":cm,"t":0/1,"l":0-1023}

#define TRIG_PIN 9
#define ECHO_PIN 10
#define TOUCH_PIN 2
#define LIGHT_PIN A0

void setup() {
  Serial.begin(9600);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(TOUCH_PIN, INPUT);
  Serial.println("CyberFlower Arduino Ready");
}

void loop() {
  // ─── HC-SR04 距离测量 ───
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 超时30ms
  int distance = duration * 0.034 / 2;

  // 过滤无效读数
  if (distance <= 0 || distance > 400) distance = 400;

  // ─── 触摸传感器 ───
  int touch = digitalRead(TOUCH_PIN);

  // ─── 光敏电阻 ───
  int light = analogRead(LIGHT_PIN);

  // ─── 发送 JSON ───
  Serial.print("{\\"d\\":");
  Serial.print(distance);
  Serial.print(",\\"t\\":");
  Serial.print(touch);
  Serial.print(",\\"l\\":");
  Serial.print(light);
  Serial.println("}");

  delay(100); // 10Hz 采样率
}

// ─── 接线说明 ───
// HC-SR04:
//   VCC  → 5V
//   GND  → GND
//   TRIG → D9
//   ECHO → D10
//
// 触摸传感器 (TTP223):
//   VCC  → 3.3V 或 5V
//   GND  → GND
//   SIG  → D2
//
// 光敏电阻 (分压电路):
//   5V → 10kΩ → A0 → LDR → GND`;
