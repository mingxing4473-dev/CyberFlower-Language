# 🌸 CyberFlower Language — 未来花语系统

> 情绪可被视觉化、符号化和交互化的数字花朵语言

---

## 项目结构

```
cyberflower/
├── index.html          # 主入口
├── css/
│   └── style.css       # 样式
├── js/
│   ├── flowers.js      # 花语字典 & 映射规则
│   ├── canvas.js       # 花朵渲染引擎
│   ├── faceDetect.js   # 摄像头情绪识别
│   ├── microphone.js   # 麦克风音量/音调分析
│   ├── midi.js         # MIDI 控制器映射
│   ├── message.js      # 花信编解码系统
│   ├── arduino.js      # Arduino Web Serial 通信
│   └── main.js         # 主控制器
├── models/             # ← 需手动下载 face-api.js 模型
└── README.md
```

---

## 快速开始

### 1. 在 VS Code 中打开项目

```bash
code cyberflower/
```

### 2. 安装 Live Server 扩展

在 VS Code 扩展市场搜索 **Live Server** (Ritwick Dey)，安装后右键 `index.html` → **Open with Live Server**

> ⚠️ 必须通过 HTTP 服务器运行，直接双击 .html 文件会导致摄像头/MIDI/Serial API 无法使用

### 3. 下载 face-api.js 模型文件（情绪识别必需）

在项目根目录创建 `models/` 文件夹，下载以下文件：

**下载地址：** https://github.com/justadudewhohacks/face-api.js/tree/master/weights

需要的文件：
```
models/
├── tiny_face_detector_model-weights_manifest.json
├── tiny_face_detector_model-shard1
├── face_expression_model-weights_manifest.json
└── face_expression_model-shard1
```

**快速下载命令：**
```bash
mkdir models && cd models

# 使用 curl 批量下载
BASE="https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"

curl -O $BASE/tiny_face_detector_model-weights_manifest.json
curl -O $BASE/tiny_face_detector_model-shard1
curl -O $BASE/face_expression_model-weights_manifest.json
curl -O $BASE/face_expression_model-shard1
```

---

## 功能模块

### 🎭 情绪识别（摄像头）

- 基于 **face-api.js TinyFaceDetector**
- 识别 7 种基础情绪：happy · sad · angry · fearful · disgusted · surprised · neutral
- 2fps 检测频率（平衡性能与响应速度）
- 情绪 → 花型映射表见 `flowers.js` → `FACE_EMOTION_MAP`

**映射规则：**
| 情绪 | 花型 |
|------|------|
| happy | 喜悦 🌻 |
| sad | 孤独 🌸 |
| angry | 愤怒 🌹 |
| fearful / disgusted | 焦虑 🌺 |
| neutral | 平静 🪷 |
| surprised | 期待 ⭐ |

---

### 🎙 麦克风感应

- **Web Audio API** AnalyserNode
- 音量计算：RMS (均方根)
- 音调检测：自相关函数（简化 YIN 算法）
- 有效音调范围：80Hz ～ 1500Hz

**映射规则：**
| 音量 | 音调 | 花型 |
|------|------|------|
| 高 (>75) | 高 (>500Hz) | 愤怒 |
| 高 (>55) | 中高 (>400Hz) | 焦虑 |
| 高 (>55) | 任意 | 喜悦 |
| 低 (<20) | 任意 | 平静 |
| 任意 | 低 (<200Hz) | 孤独 |
| 任意 | 极高 (>600Hz) | 期待 |
| 中等 | 中等 | 治愈 |

---

### 🎹 MIDI 控制器

- **Web MIDI API**（Chrome / Edge 专属）
- **CC 映射：**
  - CC1 调制轮 → 花瓣数量（4～20）
  - CC7 音量旋钮 → 旋转速度
  - CC10 声像旋钮 → 波动幅度
- **Note 映射：**
  - C4(60) → 喜悦，D4(62) → 孤独，E4(64) → 焦虑
  - F4(65) → 平静，G4(67) → 思念，A4(69) → 愤怒
  - B4(71) → 治愈，D5(74) → 期待
- 可实时叠加 MIDI 参数与花型，形成情感乐器

---

### 🔌 Arduino 硬件

**接线：**
```
HC-SR04 距离传感器:
  VCC  → Arduino 5V
  GND  → Arduino GND
  TRIG → D9
  ECHO → D10

触摸传感器 (TTP223):
  VCC  → 3.3V 或 5V
  GND  → GND
  SIG  → D2

光敏电阻 (需外接 10kΩ 分压电阻):
  5V → 10kΩ 电阻 → A0 引脚 → LDR光敏电阻 → GND
```

**距离→花型触发：**
| 距离 | 花型 |
|------|------|
| 0–15 cm | 愤怒（极近，紧张感）|
| 15–30 cm | 喜悦（近距离互动）|
| 30–60 cm | 焦虑 |
| 60–80 cm | 治愈 |
| 80–120 cm | 平静 |
| >120 cm | 孤独（远离）|

**串口协议（Arduino 发送）：**
```json
{"d":45,"t":0,"l":512}
```
- `d`: 距离 cm
- `t`: 触摸 0/1
- `l`: 光照 0-1023

---

### 💌 花信系统

**编码格式：**
```
CF1::{花型}-{花瓣}-{节奏}-{波动}::{加密级别}::{BASE64文本}::{CRC8校验}
```

**加密等级：**
- `visual` — 仅视觉加密，接收者看到花朵动画，无法读取文字
- `cipher` — 花语密文，知道系统规则可解码
- `hidden` — 隐写模式，文字字符嵌入粒子轨迹坐标中

---

## 浏览器兼容性

| 功能 | Chrome | Edge | Firefox | Safari |
|------|--------|------|---------|--------|
| 摄像头情绪识别 | ✅ | ✅ | ✅ | ✅ |
| 麦克风感应 | ✅ | ✅ | ✅ | ✅ |
| MIDI 控制 | ✅ | ✅ | ❌ | ❌ |
| Arduino 串口 | ✅ | ✅ | ❌ | ❌ |

> 推荐使用 **Chrome 最新版**以支持全部功能

---

## 扩展方向

1. **p5.js 重写渲染层** — 可引入 `noise()` 使花瓣更有机
2. **TouchDesigner 集成** — 通过 OSC 协议将花信码发送至 TouchDesigner 做投影映射
3. **多用户花园** — WebSocket 服务器让多人同时种植自己的花朵
4. **Processing 版本** — 将 `canvas.js` 的绘制逻辑移植为 Processing Sketch

---

*CyberFlower Language — 让情绪成为可编程的符号语言*
