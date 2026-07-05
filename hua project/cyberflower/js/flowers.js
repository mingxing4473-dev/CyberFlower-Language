// ═══════════════════════════════════════════════
// flowers.js — CyberFlower Language 花语字典
// 每朵花定义四个维度: 色彩 · 形态 · 节奏 · 粒子
// ═══════════════════════════════════════════════

const FLOWERS = [
  {
    id: 'joy',
    name: '喜悦', en: 'Joy',
    type: 'sunflower',
    color: '#f5a623', color2: '#ffcc44', glow: '#f5a62344',
    tags: ['暖金·橙', '快速脉冲', '向外扩张'],
    rules: ['暖金橙', '多重圆瓣', '60bpm+ 快脉冲', '密集辐射粒子'],
    petals: 12, radius: 90, speed: 0.025, wave: 0.3, petalW: 18,
    particleColor: '#ffcc44', particleRate: 3, particleSpeed: 2.5,
    // 情绪识别映射 (face-api emotion → this flower)
    faceEmotions: ['happy'],
    // 麦克风映射: 音量范围 [min, max], 音调范围 Hz
    micVolRange: [60, 100], micPitchRange: [300, 800],
    // Arduino 距离范围 cm
    distanceRange: [0, 30],
    // MIDI Note 触发
    midiNotes: [60, 72],  // C4, C5
  },
  {
    id: 'solitude',
    name: '孤独', en: 'Solitude',
    type: 'droop',
    color: '#7b68ee', color2: '#9988ff', glow: '#7b68ee33',
    tags: ['暮紫', '缓慢下垂', '低频漂移'],
    rules: ['暮紫·靛', '下垂弧瓣', '10bpm 慢漂', '稀疏漂浮粒子'],
    petals: 6, radius: 75, speed: 0.006, wave: 0.6, petalW: 25,
    particleColor: '#aaaaff', particleRate: 0.5, particleSpeed: 0.8,
    faceEmotions: ['sad', 'disgusted'],
    micVolRange: [0, 25], micPitchRange: [80, 200],
    distanceRange: [120, 200],
    midiNotes: [62, 74],
  },
  {
    id: 'anxiety',
    name: '焦虑', en: 'Anxiety',
    type: 'thorn',
    color: '#ff6b6b', color2: '#ff9999', glow: '#ff6b6b33',
    tags: ['烈红', '尖刺震颤', '不规则扩散'],
    rules: ['烈红·暗橙', '尖锐刺瓣', '不规则抖动', '爆发式粒子'],
    petals: 8, radius: 80, speed: 0.04, wave: 1.2, petalW: 12,
    particleColor: '#ff8888', particleRate: 4, particleSpeed: 3.5,
    faceEmotions: ['fearful', 'surprised'],
    micVolRange: [50, 80], micPitchRange: [500, 1200],
    distanceRange: [30, 60],
    midiNotes: [64, 76],
  },
  {
    id: 'calm',
    name: '平静', en: 'Calm',
    type: 'lily',
    color: '#4ecdc4', color2: '#88dddd', glow: '#4ecdc433',
    tags: ['青碧', '慢波振荡', '向心聚拢'],
    rules: ['青碧·水绿', '圆润扁平瓣', '5bpm 极慢', '向心聚拢粒子'],
    petals: 10, radius: 85, speed: 0.004, wave: 0.2, petalW: 22,
    particleColor: '#88eeee', particleRate: 1, particleSpeed: 0.5,
    faceEmotions: ['neutral'],
    micVolRange: [0, 20], micPitchRange: [200, 350],
    distanceRange: [80, 120],
    midiNotes: [65, 77],
  },
  {
    id: 'longing',
    name: '思念', en: 'Longing',
    type: 'dandelion',
    color: '#e8a0bf', color2: '#ffccdd', glow: '#e8a0bf33',
    tags: ['粉霞', '飘散分离', '粒子远飞'],
    rules: ['粉霞·玫粉', '细丝飘瓣', '缓慢飘散', '粒子向外飞逸'],
    petals: 20, radius: 95, speed: 0.008, wave: 0.1, petalW: 5,
    particleColor: '#ffaabb', particleRate: 2, particleSpeed: 1.5,
    faceEmotions: ['sad'],
    micVolRange: [15, 45], micPitchRange: [250, 500],
    distanceRange: [150, 250],
    midiNotes: [67, 79],
  },
  {
    id: 'rage',
    name: '愤怒', en: 'Rage',
    type: 'rage',
    color: '#ff4444', color2: '#ff6600', glow: '#ff444444',
    tags: ['燃红', '爆炸裂变', '高速旋转'],
    rules: ['燃红·深赤', '锯齿爆裂瓣', '极速旋转', '爆炸式粒子'],
    petals: 7, radius: 88, speed: 0.07, wave: 2.0, petalW: 14,
    particleColor: '#ff6600', particleRate: 6, particleSpeed: 5,
    faceEmotions: ['angry'],
    micVolRange: [80, 100], micPitchRange: [150, 400],
    distanceRange: [0, 15],
    midiNotes: [69, 81],
  },
  {
    id: 'healing',
    name: '治愈', en: 'Healing',
    type: 'heal',
    color: '#90ee90', color2: '#aaffaa', glow: '#90ee9033',
    tags: ['嫩绿', '螺旋生长', '均匀扩散'],
    rules: ['嫩绿·草翠', '对称四叶', '慢速螺旋', '均匀向外粒子'],
    petals: 4, radius: 80, speed: 0.012, wave: 0.25, petalW: 30,
    particleColor: '#aaffaa', particleRate: 1.5, particleSpeed: 1.2,
    faceEmotions: ['happy', 'neutral'],
    micVolRange: [20, 50], micPitchRange: [350, 700],
    distanceRange: [60, 80],
    midiNotes: [71, 83],
  },
  {
    id: 'anticipation',
    name: '期待', en: 'Anticipation',
    type: 'star',
    color: '#ffd700', color2: '#ffee66', glow: '#ffd70033',
    tags: ['星金', '向外绽放', '跳动脉冲'],
    rules: ['星金·明黄', '放射星芒瓣', '律动脉冲', '向外爆发粒子'],
    petals: 16, radius: 92, speed: 0.03, wave: 0.5, petalW: 10,
    particleColor: '#ffee44', particleRate: 3, particleSpeed: 2,
    faceEmotions: ['surprised', 'happy'],
    micVolRange: [40, 70], micPitchRange: [600, 1500],
    distanceRange: [30, 80],
    midiNotes: [73, 85],
  },
];

// face-api emotion → flower index 映射表
const FACE_EMOTION_MAP = {
  happy:     0,  // 喜悦
  sad:       1,  // 孤独 (也可映射思念, 取优先级)
  fearful:   2,  // 焦虑
  disgusted: 2,  // 焦虑
  neutral:   3,  // 平静
  angry:     5,  // 愤怒
  surprised: 7,  // 期待
};

// 距离→花型映射规则
const DISTANCE_TRIGGER_MAP = [
  { range: [0, 15],   flowerIdx: 5, label: '极近 (0–15cm)' },
  { range: [15, 30],  flowerIdx: 0, label: '很近 (15–30cm)' },
  { range: [30, 60],  flowerIdx: 2, label: '近 (30–60cm)' },
  { range: [60, 80],  flowerIdx: 6, label: '适中 (60–80cm)' },
  { range: [80, 120], flowerIdx: 3, label: '远 (80–120cm)' },
  { range: [120, 200],flowerIdx: 1, label: '很远 (>120cm)' },
];

// 音量+音调 → 花型映射
function mapMicToFlower(volume, pitch) {
  // 高音量 + 高音调 = 愤怒/焦虑
  if (volume > 75 && pitch > 500) return 5; // rage
  if (volume > 55 && pitch > 400) return 2; // anxiety
  if (volume > 55) return 0; // joy
  // 低音量区分平静/孤独/思念
  if (pitch < 200) return 1; // solitude
  if (pitch > 600) return 7; // anticipation
  if (volume < 20) return 3; // calm
  return 6; // healing (default mid-range)
}
