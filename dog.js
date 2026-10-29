'use strict';
// 狗狗養成（黑四目長毛臘腸）：照顧（花金幣餵食、玩耍）讓狗狗長大，並在狗狗商店買毛色、帽子、衣服、嘴裡叼的東西、坐騎、背景
// 這個檔案要在 app.js 之前載入（app.js 的 freshState 會用到 newPet）；其餘函式執行時才用到 app.js 的 S、save、toast 等
// 規則和社會＋自然闖關王的狗狗相同：每週成長上限、答對題目也會照顧、家長可設定每天最多花多少

// ───────── 成長階段 ─────────
// 門檻依「每天約 43 成長值」（答題約 20＋摸摸頭 6＋照顧約 17）估算，約 70 天養成，比期末考（1/10）早幾天
const PET_STAGES = [
  { at: 0, name: '新生小奶狗', emoji: '🐶', desc: '縮在小被子上呼呼大睡' },
  { at: 260, name: '搖搖幼犬', emoji: '🐶', desc: '大頭圓眼睛、短短的腿' },
  { at: 700, name: '活潑小臘腸', emoji: '🐕', desc: '吐舌頭到處跑，開始長長毛' },
  { at: 1300, name: '少年臘腸', emoji: '🐕', desc: '身體拉長，耳朵和尾巴毛變長' },
  { at: 2100, name: '帥氣大臘腸', emoji: '🐕', desc: '抬頭挺胸，一身閃亮飄逸長毛' },
  { at: 3000, name: '傳說神犬', emoji: '🌟', desc: '長出翅膀和光環，飛起來了！' },
];
const PET_GOAL = { date: '2027-01-10', label: '期末考前' }; // 養成目標日（顯示用）
// 每週（週一～週日）最多成長多少：330 × 9 週 ＝ 2970 ＜ 3000，最快也要 12/28 那週才養成（約期末考前兩週）
const PET_WEEK_CAP = 330;

// ───────── 答題也會照顧狗狗 ─────────
// 每答對 1 題：飽足、心情、清潔各 +3（只補到 60，想更高要花金幣照顧），成長 +1
const PET_LEARN = { per: 3, floor: 60, grow: 1 };

// ───────── 照顧（每項 20～50 金幣）─────────
// food 飽足、happy 心情、clean 清潔、grow 成長值
const PET_CARE = [
  { id: 'feed', icon: '🥣', name: '狗狗飼料', cost: 20, food: 30, grow: 10 },
  { id: 'meal', icon: '🍖', name: '牛肉大餐', cost: 40, food: 60, happy: 10, grow: 25 },
  { id: 'snack', icon: '🦴', name: '潔牙骨', cost: 30, food: 15, happy: 25, grow: 12 },
  { id: 'disc', icon: '🥏', name: '丟飛盤', cost: 25, happy: 30, grow: 12 },
  { id: 'walk', icon: '🌳', name: '公園散步', cost: 35, happy: 40, grow: 18 },
  { id: 'bath', icon: '🛁', name: '洗澡吹乾', cost: 20, clean: 50, happy: 5, grow: 5 },
  { id: 'brush', icon: '✨', name: '梳順長毛', cost: 25, clean: 30, happy: 15, grow: 8 },
  { id: 'study', icon: '📚', name: '一起讀書', cost: 50, happy: 10, grow: 35 },
];
const PET_PATS_PER_DAY = 3;   // 每天免費摸摸頭的次數
const PET_DECAY = { food: 25, happy: 20, clean: 20 }; // 每天自然減少多少
const RENAME_COST = 10;       // 第一次改名免費

// ───────── 狗狗商店 ─────────
// 小東西 10～50、比較好的 100～500、最好的 800～1000
const PET_SHOP = {
  color: { name: '毛色', icon: '🎨', items: [
    { id: 'c-normal', name: '黑四目（原色）', cost: 0 },
    { id: 'c-red', name: '紅棕色', cost: 20 },
    { id: 'c-choco', name: '巧克力', cost: 30 },
    { id: 'c-cream', name: '奶油色', cost: 40 },
    { id: 'c-blue', name: '藍灰色', cost: 50 },
    { id: 'c-pink', name: '草莓粉', cost: 80 },
    { id: 'c-mint', name: '薄荷綠', cost: 80 },
    { id: 'c-ghost', name: '透明小幽靈', cost: 150 },
    { id: 'c-rainbow', name: '彩虹變色', cost: 500 },
    { id: 'c-gold', name: '閃亮黃金', cost: 1000 },
  ] },
  hat: { name: '帽子', icon: '🎩', items: [
    { id: 'h-bow', emoji: '🎀', name: '蝴蝶結', cost: 10 },
    { id: 'h-flower', emoji: '🌼', name: '小花', cost: 15 },
    { id: 'h-cap', emoji: '🧢', name: '棒球帽', cost: 20 },
    { id: 'h-straw', emoji: '👒', name: '草帽', cost: 40 },
    { id: 'h-grad', emoji: '🎓', name: '學士帽', cost: 50 },
    { id: 'h-helmet', emoji: '⛑️', name: '救難頭盔', cost: 80 },
    { id: 'h-top', emoji: '🎩', name: '紳士帽', cost: 100 },
    { id: 'h-army', emoji: '🪖', name: '鋼盔', cost: 150 },
    { id: 'h-crown', emoji: '👑', name: '皇冠', cost: 500 },
  ] },
  outfit: { name: '衣服', icon: '👕', items: [
    { id: 'o-collar', name: '鈴鐺項圈', cost: 15 },
    { id: 'o-bandana', name: '點點領巾', cost: 25 },
    { id: 'o-sweater', name: '條紋毛衣', cost: 40 },
    { id: 'o-raincoat', name: '小黃雨衣', cost: 60 },
    { id: 'o-dino', name: '恐龍裝', cost: 120 },
    { id: 'o-rescue', name: '救難犬背心', cost: 150 },
    { id: 'o-tux', name: '燕尾服', cost: 200 },
    { id: 'o-tutu', name: '公主蓬蓬裙', cost: 300 },
    { id: 'o-cape', name: '英雄披風', cost: 400 },
    { id: 'o-medal', name: '冠軍犬勳章', cost: 500 },
    { id: 'o-armor', name: '騎士盔甲', cost: 800 },
  ] },
  gear: { name: '叼著', icon: '🦴', items: [
    { id: 'g-bone', emoji: '🦴', name: '骨頭', cost: 10 },
    { id: 'g-ball', emoji: '🎾', name: '網球', cost: 15 },
    { id: 'g-paper', emoji: '📰', name: '報紙', cost: 20 },
    { id: 'g-disc', emoji: '🥏', name: '飛盤', cost: 30 },
    { id: 'g-pencil', emoji: '✏️', name: '鉛筆', cost: 40 },
    { id: 'g-ruler', emoji: '📐', name: '三角板', cost: 60 },
    { id: 'g-brush', emoji: '🖌️', name: '毛筆', cost: 80 },
    { id: 'g-rose', emoji: '🌹', name: '玫瑰花', cost: 100 },
    { id: 'g-basket', emoji: '🏀', name: '籃球', cost: 150 },
    { id: 'g-violin', emoji: '🎻', name: '小提琴', cost: 250 },
    { id: 'g-trophy', emoji: '🏆', name: '冠軍獎盃', cost: 500 },
    { id: 'g-wand', emoji: '🪄', name: '魔法棒', cost: 1000 },
    { id: 'g-ak47', emoji: '', name: 'AK47 步槍', cost: 600, svg: '<rect x="0" y="5" width="14" height="1.6" fill="#4a4a4a"/><rect x="1.5" y="3.4" width="1" height="1.8" fill="#4a4a4a"/><rect x="6" y="3.7" width="9" height="1.4" fill="#5a5a5a"/><rect x="12" y="4" width="8.5" height="3.6" rx="1" fill="#a0582a"/><rect x="19.5" y="3.4" width="11" height="4.6" rx=".6" fill="#3a3a3a"/><rect x="22" y="4.6" width="5" height=".8" fill="#666"/><path d="M21.5 8 L25.5 8 Q26.5 12 28.5 15 L24.5 16.2 Q22.5 12 21.5 8 Z" fill="#c4652a"/><path d="M22.5 9 Q23.2 11.5 24.6 14" stroke="#9a4a1c" stroke-width=".5" fill="none"/><path d="M28.5 8 L31.5 8 L32.5 13 L29.5 13.4 Z" fill="#6b3a1e"/><path d="M30.5 4 L40 5 L40 10.6 L31 8 Z" fill="#a0582a"/><path d="M33 6 L39 6.6" stroke="#7a4020" stroke-width=".5"/>' }, // 自己畫的卡通步槍（寬 40、高 16），槍口朝左
  ] },
  mount: { name: '坐騎', icon: '🛹', items: [
    { id: 'm-skate', emoji: '🛹', name: '滑板', cost: 50 },
    { id: 'm-cart', emoji: '🛒', name: '推車', cost: 80 },
    { id: 'm-scooter', emoji: '🛵', name: '小綿羊', cost: 150 },
    { id: 'm-canoe', emoji: '🛶', name: '獨木舟', cost: 200 },
    { id: 'm-elephant', emoji: '🐘', name: '大象', cost: 300 },
    { id: 'm-train', emoji: '🚂', name: '小火車', cost: 400 },
    { id: 'm-ufo', emoji: '🛸', name: '飛碟', cost: 600 },
    { id: 'm-rocket', emoji: '🚀', name: '火箭', cost: 800 },
    { id: 'm-dragon', emoji: '🐉', name: '神龍', cost: 1000 },
  ] },
  bg: { name: '背景', icon: '🖼️', items: [
    { id: 'b-yard', name: '家門前草地', cost: 0, bg: 'linear-gradient(#bfe6ff, #e9f7ff 62%, #9fdc8a 62%)',
      art: '<path d="M0 62 H100" stroke="#86c873" stroke-width="1"/>' + Array.from({ length: 6 }, (_, i) => `<rect x="${2 + i * 6}" y="50" width="2.4" height="13" fill="#fff" stroke="#d9d2c5" stroke-width=".3"/>`).join('') + '<rect x="2" y="53" width="33" height="1.6" fill="#fff"/><rect x="2" y="58" width="33" height="1.6" fill="#fff"/>' +
        '<rect x="76" y="48" width="20" height="16" fill="#c8874a"/><path d="M73 50 L86 37 L99 50 Z" fill="#c0392b"/><path d="M82 64 v-8 a4 4 0 0 1 8 0 v8 z" fill="#3b2a1e"/>', deco: [['☀️', 6, 6], ['☁️', 40, 8]] },
    { id: 'b-park', name: '狗狗公園', cost: 50, bg: 'linear-gradient(#cdeccf, #e8f6e1 60%, #7cc06b 60%)', deco: [['🌳', 2, 30], ['⛲', 76, 36], ['🌼', 46, 78, 0.08]] },
    { id: 'b-beach', name: '海灘', cost: 80, bg: 'linear-gradient(#9fdcff, #c9efff 50%, #4fb4e8 50%, #4fb4e8 62%, #f3dca2 62%)', deco: [['🌴', 4, 30], ['🐚', 82, 80, 0.09], ['🦀', 12, 82, 0.08]] },
    { id: 'b-snow', name: '雪地', cost: 120, bg: 'linear-gradient(#cfe8ff, #f2f8ff 60%, #ffffff 60%)', deco: [['☃️', 74, 34], ['🌲', 2, 30], ['❄️', 40, 6, 0.08], ['❄️', 60, 16, 0.07]] },
    { id: 'b-sakura', name: '櫻花步道', cost: 150, bg: 'linear-gradient(#ffe3ef, #fff6fa 62%, #c7e6b3 62%)', deco: [['🌸', 4, 8], ['🌸', 70, 4], ['🌸', 38, 14, 0.08], ['🌳', 80, 32]] },
    { id: 'b-autumn', name: '楓紅山谷', cost: 150, bg: 'linear-gradient(#ffd7a8, #fff1dd 58%, #d9a35b 58%)', art: '<path d="M0 58 L18 40 L34 54 L52 34 L70 52 L86 38 L100 50 V58 Z" fill="#c4683b"/>', deco: [['🍁', 10, 12, 0.09], ['🍁', 80, 64, 0.08], ['🍂', 44, 80, 0.08]] },
    { id: 'b-camp', name: '星空露營', cost: 200, bg: 'linear-gradient(#1c2350, #3b3f8f 62%, #2c5a3d 62%)', deco: [['🌙', 78, 6], ['⭐', 14, 10, 0.08], ['✨', 44, 6, 0.08], ['⛺', 4, 36], ['🔥', 80, 48, 0.12]] },
    { id: 'b-fair', name: '遊樂園', cost: 250, bg: 'linear-gradient(#bfe4ff, #f2fbff 64%, #a6dc8f 64%)', deco: [['🎡', 66, 14, 0.3], ['🎠', 2, 36, 0.2], ['🎈', 40, 6, 0.1]] },
    // ── 臺灣與世界地標（art 是畫在背景上的 SVG，座標 0～100）──
    { id: 'b-101', name: '台北 101', cost: 400, bg: 'linear-gradient(#a9d8ff, #e9f6ff 70%, #9ccf8a 70%)',
      art: '<rect x="4" y="54" width="9" height="16" fill="#9fb4c8"/><rect x="15" y="58" width="8" height="12" fill="#b5c6d6"/><rect x="88" y="56" width="9" height="14" fill="#9fb4c8"/>' +
        Array.from({ length: 8 }, (_, i) => { const y = 51 - i * 4.4; return `<path d="M68.5 ${y + 4.4} L81.5 ${y + 4.4} L83 ${y} L67 ${y} Z" fill="${i % 2 ? '#6aa5b6' : '#7fb8c8'}"/>`; }).join('') +
        '<rect x="66" y="51" width="18" height="19" fill="#5e95a6"/><rect x="72" y="11" width="6" height="5" fill="#5e95a6"/><path d="M75 11 V2" stroke="#4d5b66" stroke-width="1.2"/>', deco: [['☁️', 8, 10]] },
    { id: 'b-lighthouse', name: '鵝鑾鼻燈塔', cost: 300, bg: 'linear-gradient(#9fdcff, #e5f6ff 54%, #2f8fd0 54%, #2f8fd0 62%, #8fcf6e 62%)',
      art: '<path d="M60 64 Q78 52 100 56 V66 H60 Z" fill="#7cbc5c"/><path d="M73 60 L75 24 L81 24 L83 60 Z" fill="#fff" stroke="#d6dde6" stroke-width=".5"/><rect x="73.5" y="18" width="9" height="6" fill="#39424c"/><rect x="74.6" y="19.2" width="6.8" height="3.4" fill="#ffe27a"/><path d="M73 18 L78 12 L83 18 Z" fill="#2d3640"/><path d="M83 21 L100 16 V26 Z" fill="#fff6b0" opacity=".55"/>', deco: [['⛵', 10, 46, 0.1], ['☁️', 20, 8]] },
    { id: 'b-jiufen', name: '九份老街', cost: 300, bg: 'linear-gradient(#ffb48a, #ffe1c2 60%, #8a6a52 60%)',
      art: '<path d="M0 60 L0 44 H14 V36 H26 V46 H36 V40 H48 V60 Z" fill="#6b4a3a"/><path d="M60 60 V42 H72 V34 H86 V44 H100 V60 Z" fill="#5d3f31"/>' +
        [[4, 48], [16, 40], [28, 50], [40, 44], [64, 46], [76, 38], [90, 48]].map(([x, y]) => `<rect x="${x}" y="${y}" width="3" height="3" fill="#ffd36b"/>`).join(''), deco: [['🏮', 30, 18, 0.1], ['🏮', 62, 14, 0.1], ['🏮', 46, 26, 0.08]] },
    { id: 'b-eiffel', name: '巴黎鐵塔', cost: 400, bg: 'linear-gradient(#ffd6e3, #fff3f6 66%, #a9d98e 66%)',
      art: '<path d="M66 66 L72 42 L74 22 L75.3 6 L76.6 22 L78.6 42 L84.6 66 H80.6 Q75.3 56 70 66 Z" fill="#8a6a48"/><rect x="69.5" y="41" width="11.6" height="2.4" fill="#6f5338"/><rect x="72.2" y="24" width="6.2" height="2" fill="#6f5338"/>', deco: [['🎈', 14, 12, 0.11], ['☁️', 30, 6]] },
    { id: 'b-bigben', name: '倫敦大笨鐘', cost: 400, bg: 'linear-gradient(#c9dcf0, #eef4fa 66%, #8fbf7a 66%)',
      art: '<rect x="30" y="50" width="38" height="16" fill="#c9a06a"/>' + Array.from({ length: 9 }, (_, i) => `<rect x="${32 + i * 4}" y="53" width="1.6" height="9" fill="#a37f4f"/>`).join('') +
        '<rect x="70" y="22" width="10" height="44" fill="#c49a5e"/><rect x="69" y="17" width="12" height="7" fill="#a37642"/><path d="M69 17 L75 3 L81 17 Z" fill="#4e5f55"/><circle cx="75" cy="28.5" r="3.8" fill="#fff6dc" stroke="#6b4f2e" stroke-width=".8"/><path d="M75 28.5 V25.8 M75 28.5 H77.2" stroke="#333" stroke-width=".6"/>', deco: [['☁️', 8, 8], ['🚌', 4, 70, 0.1]] },
    { id: 'b-pisa', name: '比薩斜塔', cost: 400, bg: 'linear-gradient(#a8d8ff, #eef8ff 66%, #9fd08a 66%)',
      art: '<g transform="rotate(8 75 66)"><rect x="69" y="18" width="12" height="48" fill="#f4eee1" stroke="#d6ccb8" stroke-width=".6"/>' + Array.from({ length: 6 }, (_, i) => `<rect x="69" y="${24 + i * 7}" width="12" height="1" fill="#d6ccb8"/>` + `<rect x="${71 + (i % 2) * 4}" y="${19.5 + i * 7}" width="1.6" height="3.2" fill="#c9bea6"/>`).join('') + '<rect x="71" y="12" width="8" height="6" fill="#efe7d6" stroke="#d6ccb8" stroke-width=".5"/></g>', deco: [['🍕', 6, 50, 0.1], ['☁️', 20, 6]] },
    { id: 'b-windmill', name: '荷蘭風車', cost: 350, bg: 'linear-gradient(#bfe2ff, #f0f9ff 62%, #7cc46a 62%)',
      art: '<path d="M70 64 L72 40 L80 40 L82 64 Z" fill="#b5653a"/><path d="M69.5 40 L76 32 L82.5 40 Z" fill="#7a3f22"/><rect x="74.5" y="56" width="3" height="8" fill="#5a3a24"/><g transform="rotate(22 76 37)"><rect x="75.2" y="15" width="1.6" height="44" fill="#f4f1ea"/><rect x="54" y="36.2" width="44" height="1.6" fill="#f4f1ea"/><rect x="77" y="15" width="3" height="18" fill="#e9e2d4" opacity=".8"/><rect x="58" y="38" width="18" height="3" fill="#e9e2d4" opacity=".8"/></g>', deco: [['🌷', 6, 76, 0.08], ['🌷', 16, 80, 0.08], ['🌷', 30, 78, 0.08]] },
    { id: 'b-pyramid', name: '埃及金字塔', cost: 400, bg: 'linear-gradient(#ffcf8a, #fff0c9 64%, #e9c46a 64%)',
      art: '<path d="M30 64 L53 26 L54 64 Z" fill="#e6b45c"/><path d="M53 26 L80 64 L54 64 Z" fill="#c98f35"/><path d="M72 64 L85 44 L86 64 Z" fill="#e6b45c"/><path d="M85 44 L99 64 L86 64 Z" fill="#c98f35"/>', deco: [['☀️', 6, 6], ['🐪', 4, 54, 0.13]] },
    { id: 'b-kyoto', name: '京都千本鳥居', cost: 350, bg: 'linear-gradient(#ffe9d6, #fff8f0 64%, #b9d99a 64%)', deco: [['⛩️', 62, 18, 0.34], ['⛩️', 6, 36, 0.18], ['🍵', 40, 78, 0.08]] },
    { id: 'b-taj', name: '泰姬瑪哈陵', cost: 400, bg: 'linear-gradient(#ffd9b8, #fff4ea 62%, #9fd2e8 62%, #9fd2e8 68%, #b6db9a 68%)', deco: [['🕌', 60, 14, 0.36], ['🌴', 4, 34, 0.18]] },
    { id: 'b-space', name: '外太空', cost: 500, bg: 'radial-gradient(circle at 30% 30%, #4b3a8f, #120d2e 70%)', deco: [['🪐', 74, 10], ['🌍', 6, 12], ['⭐', 40, 4], ['☄️', 82, 70]] },
    { id: 'b-kingdom', name: '狗狗王國', cost: 1000, bg: 'linear-gradient(#ffe9a8, #fff6d6 60%, #e7b94b 60%)', deco: [['🏰', 64, 16, 0.32], ['🦴', 8, 20, 0.12], ['✨', 44, 6], ['💎', 84, 74, 0.08]] },
  ] },
};
const PET_SLOTS = ['color', 'hat', 'outfit', 'gear', 'mount', 'bg'];
const PET_ITEM = Object.fromEntries(Object.values(PET_SHOP).flatMap(c => c.items).map(i => [i.id, i]));

function newPet() {
  return {
    name: '小臘腸', grow: 0, food: 70, happy: 70, clean: 70, last: Date.now(),
    owned: ['c-normal', 'b-yard'],
    equip: { color: 'c-normal', hat: null, outfit: null, gear: null, mount: null, bg: 'b-yard' },
    pats: {}, renamed: 0,
  };
}

// ───────── 狀態 ─────────
const petStage = p => { let s = 0; PET_STAGES.forEach((st, i) => { if (p.grow >= st.at) s = i; }); return s; };
function petTick() {
  const p = S.pet;
  const days = (Date.now() - (p.last || Date.now())) / 86400000;
  if (days > 0) {
    for (const k of Object.keys(PET_DECAY)) p[k] = Math.max(0, p[k] - PET_DECAY[k] * days);
    p.last = Date.now();
  }
}
function petMood(p) {
  const avg = (p.food + p.happy + p.clean) / 3;
  if (p.food < 20) return { face: '😵', text: '肚子好餓…' };
  if (p.clean < 20) return { face: '🫧', text: '身上髒髒的，想洗澡' };
  if (p.happy < 20) return { face: '😢', text: '好無聊，陪我玩～' };
  if (avg >= 75) return { face: '😆', text: '超開心！' };
  if (avg >= 45) return { face: '🙂', text: '心情不錯' };
  return { face: '😐', text: '有點需要照顧' };
}
const petNeedsCare = () => { petTick(); const p = S.pet; return p.food < 30 || p.happy < 30 || p.clean < 30; };

// ───────── 畫狗狗（自己畫的 SVG：黑四目長毛臘腸，臉朝左；衣服會依身體形狀「穿」上去）─────────
// 每個階段的身體幾何（座標 0～100，腳踩在 y≈95）；六個階段在體型、姿勢、毛量上刻意拉開差距
// body 身體橢圓、head 頭、size 在場景中的大小
// pose：lie 趴睡／sit 短腿站著／run 奔跑／stand 站好／proud 抬頭挺胸／fly 飛起來
// eye 眼睛大小、snout 嘴巴長度、ear 耳朵長度、fringe 耳朵長毛、hair 肚子長毛、legHair 腳上長毛、ruff 胸前毛領、tail 尾巴長度、plume 尾巴長毛
const PET_BODY = [
  { size: 0.48, body: { cx: 56, cy: 82, rx: 19, ry: 10 }, head: { cx: 35, cy: 77, r: 13 }, pose: 'lie', sleep: 1, eye: 1, snout: 0.5, ear: 0.75, fringe: 0, hair: 0, legHair: 0, ruff: 0, tail: 7, plume: 0, blanket: 1 },
  { size: 0.58, body: { cx: 57, cy: 74, rx: 17, ry: 13 }, head: { cx: 36, cy: 55, r: 17 }, pose: 'sit', eye: 1.45, snout: 0.6, ear: 0.85, fringe: 0, hair: 0, legHair: 0, ruff: 0, tail: 9, plume: 0, blush: 1 },
  { size: 0.66, body: { cx: 56, cy: 70, rx: 24, ry: 11 }, head: { cx: 29, cy: 52, r: 13.5 }, pose: 'run', eye: 1.15, snout: 0.85, ear: 1.15, fringe: 1, hair: 2, legHair: 0, ruff: 0, tail: 14, plume: 1, tongue: 1 },
  { size: 0.72, body: { cx: 56, cy: 72, rx: 29, ry: 12 }, head: { cx: 24, cy: 53, r: 12.5 }, pose: 'stand', eye: 1, snout: 1, ear: 1.45, fringe: 2, hair: 4, legHair: 1, ruff: 1, tail: 18, plume: 2 },
  { size: 0.8, body: { cx: 57, cy: 70, rx: 33, ry: 13 }, head: { cx: 22, cy: 44, r: 12.5 }, pose: 'proud', eye: 1, snout: 1.08, ear: 1.85, fringe: 3, hair: 6.5, legHair: 2, ruff: 2, tail: 22, plume: 3, shine: 1 },
  { size: 0.82, body: { cx: 57, cy: 64, rx: 33, ry: 13 }, head: { cx: 22, cy: 39, r: 12.5 }, pose: 'fly', eye: 1, snout: 1.08, ear: 1.9, fringe: 3, hair: 7, legHair: 2, ruff: 2, tail: 24, plume: 3, shine: 1, wings: 1, halo: 1, aura: 1 },
];
// 毛色：[主色, 棕色斑（四目、嘴、胸、腳）, 深色（遠側的腳）, 毛流線條]
const PET_COLORS = {
  'c-normal': ['#2b2422', '#c8803a', '#171211', '#4a403b'],
  'c-red': ['#a9521f', '#e09656', '#7d3814', '#c7703a'],
  'c-choco': ['#5b3521', '#d39b5d', '#3d2214', '#7a4d33'],
  'c-cream': ['#ecc994', '#fff0d6', '#cfa66c', '#f7dcb3'],
  'c-blue': ['#5e6a79', '#d6a77a', '#444e5a', '#7b8796'],
  'c-pink': ['#f29ac0', '#ffe2ef', '#d46f9c', '#f8bcd6'],
  'c-mint': ['#77d1ab', '#e3fff3', '#4bab83', '#a3e6c8'],
  'c-ghost': ['#eef3fb', '#ffffff', '#c9d4e6', '#d9e2f0'],
  'c-rainbow': ['#2b2422', '#c8803a', '#171211', '#4a403b'],
  'c-gold': ['#f2c230', '#fff1a8', '#c99512', '#ffe066'],
};
let petUid = 0;

// 衣服：back 畫在身體後面（披風、燕尾）；on 會被裁成身體的形狀；front 畫在最上層（項圈、勳章、裙擺…）
// 臘腸是橫的：衣服蓋住肩膀 xs 到屁股 xe；col 是脖子上項圈的位置
function petOutfit(id, b, h, u) {
  const xs = b.cx - b.rx * 0.74, xe = b.cx + b.rx * 0.58, top = b.cy - b.ry - 2, bot = b.cy + b.ry + 2;
  const cover = fill => `<rect x="${xs}" y="${top}" width="${xe - xs}" height="${bot - top}" fill="${fill}"/>`;
  const col = { x: (h.cx + h.r * 0.55 + b.cx - b.rx * 0.8) / 2, y: (h.cy + h.r * 0.7 + b.cy - b.ry * 0.5) / 2 };
  const ang = Math.atan2((b.cy - b.ry * 0.5) - (h.cy + h.r * 0.7), (b.cx - b.rx * 0.8) - (h.cx + h.r * 0.55)) * 180 / Math.PI - 90;
  const band = (fill, w = 3.2) => `<rect x="${col.x - h.r * 0.62}" y="${col.y - w / 2}" width="${h.r * 1.24}" height="${w}" rx="${w / 2}" fill="${fill}" transform="rotate(${ang} ${col.x} ${col.y})"/>`;
  const topY = x => b.cy - b.ry * Math.sqrt(Math.max(0, 1 - ((x - b.cx) / b.rx) ** 2)); // 背上的 y
  switch (id) {
    case 'o-collar': return {
      front: band('#e63946') + `<circle cx="${col.x - 1}" cy="${col.y + 3.4}" r="2.4" fill="#f5c542" stroke="#c99a1a" stroke-width=".6"/><path d="M${col.x - 2} ${col.y + 4.4} h2" stroke="#8a6a12" stroke-width=".6"/>` };
    case 'o-bandana': return {
      defs: `<pattern id="pd${u}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#e63946"/><circle cx="2" cy="2" r=".8" fill="#fff"/></pattern>`,
      front: band('#e63946', 3.6) + `<path d="M${col.x - h.r * 0.5} ${col.y} L${col.x + h.r * 0.45} ${col.y + 1} L${col.x - h.r * 0.15} ${col.y + h.r * 0.95} Z" fill="url(#pd${u})" transform="rotate(${ang * 0.5} ${col.x} ${col.y})"/>` };
    case 'o-sweater': return {
      defs: `<pattern id="ps${u}" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#e5484d"/><rect width="3" height="6" fill="#f3f0e6"/></pattern>`,
      on: cover(`url(#ps${u})`) + `<rect x="${xs - 1}" y="${top}" width="3" height="${bot - top}" fill="#b8302f"/>`,
      front: band('#b8302f', 3.4) };
    case 'o-raincoat': return {
      on: cover('#ffd23f') + `<rect x="${xs}" y="${b.cy + b.ry * 0.45}" width="${xe - xs}" height="2" fill="#f2a900"/>`,
      front: band('#ffd23f', 4) + [0, 1, 2].map(i => `<circle cx="${xs + 6 + i * 6}" cy="${b.cy - b.ry * 0.1}" r="1.2" fill="#2a6fdb"/>`).join('') };
    case 'o-dino': {
      let spikes = '';
      for (let x = xs + 2; x < xe; x += 6) { const y = topY(x); spikes += `<path d="M${x - 3} ${y + 1.5} L${x} ${y - 4.5} L${x + 3} ${y + 1.5} Z" fill="#f28c28"/>`; }
      return { on: cover('#4caf50') + `<ellipse cx="${b.cx}" cy="${b.cy + b.ry * 0.7}" rx="${b.rx * 0.6}" ry="${b.ry * 0.35}" fill="#a5d6a7"/>`, front: spikes + band('#388e3c', 3.6) };
    }
    case 'o-rescue': return {
      on: cover('#ff7a1a') + `<rect x="${xs}" y="${b.cy + b.ry * 0.3}" width="${xe - xs}" height="2.4" fill="#e9f0a6"/>`,
      front: `<rect x="${b.cx - 5}" y="${b.cy - b.ry * 0.6}" width="10" height="10" rx="1.5" fill="#fff"/><path d="M${b.cx - 3.6} ${b.cy - b.ry * 0.6 + 5} h7.2 M${b.cx} ${b.cy - b.ry * 0.6 + 1.4} v7.2" stroke="#e5484d" stroke-width="2.2"/>` + band('#ff7a1a', 3.6) };
    case 'o-tux': return {
      back: `<path d="M${xe - 4} ${b.cy} L${xe + 9} ${bot + 6} L${xe + 3} ${bot + 7} L${xe - 8} ${b.cy + 2} Z" fill="#1f2a44"/>`,
      on: cover('#1f2a44') + `<rect x="${xs}" y="${top}" width="${(xe - xs) * 0.28}" height="${bot - top}" fill="#fff"/>`,
      front: `<path d="M${col.x - 3.2} ${col.y - 1.8} v3.6 l3.2 -1.8 z M${col.x + 3.2} ${col.y - 1.8} v3.6 l-3.2 -1.8 z" fill="#e63946"/><circle cx="${col.x}" cy="${col.y}" r="1.2" fill="#b8202c"/>` };
    case 'o-tutu': {
      const y = b.cy + b.ry * 0.55;
      let frill = '';
      for (let x = xs - 2; x <= xe + 2; x += 4.4) frill += `<ellipse cx="${x}" cy="${y + 3}" rx="3.4" ry="4.4" fill="#ff8fc7"/>`;
      return { on: cover('#ffb6d9'), front: frill + `<path d="M${xs - 4} ${y + 1} Q${b.cx} ${y + 4} ${xe + 4} ${y + 1}" stroke="#ff5fa8" stroke-width="1.6" fill="none"/>` + band('#ff5fa8', 3) + `<circle cx="${col.x}" cy="${col.y + 2}" r="1.8" fill="#fff"/>` };
    }
    case 'o-cape': {
      const y0 = topY(xs) - 1;
      return {
        back: `<path d="M${xs - 2} ${y0} Q${b.cx} ${top - 8} ${xe + 10} ${b.cy - 2} L${xe + 16} ${bot + 2} Q${b.cx + b.rx * 0.6} ${b.cy + 2} ${xs + 4} ${b.cy - 2} Z" fill="#c1121f"/>`,
        front: `<path d="M${xs - 2} ${y0 + 1} Q${b.cx} ${top - 5} ${xe + 4} ${topY(xe) + 1}" stroke="#c1121f" stroke-width="3.4" fill="none" stroke-linecap="round"/>` + band('#c1121f', 2.6) + `<circle cx="${col.x}" cy="${col.y}" r="2.4" fill="#f2c14e" stroke="#c99a1a" stroke-width=".6"/>` };
    }
    case 'o-medal': return {
      front: band('#2b4c9a', 3) + `<path d="M${col.x - 1.6} ${col.y} L${col.x - 2.4} ${col.y + 7} M${col.x + 1.6} ${col.y} L${col.x + 0.8} ${col.y + 7}" stroke="#e63946" stroke-width="1.6"/>` +
        `<circle cx="${col.x - 0.8}" cy="${col.y + 10.5}" r="4.6" fill="#f5c542" stroke="#c99a1a" stroke-width="1"/><path d="M${col.x - 0.8} ${col.y + 7.8} l1 2 2.2 .3 -1.6 1.5 .4 2.2 -2 -1.1 -2 1.1 .4 -2.2 -1.6 -1.5 2.2 -.3z" fill="#fff6c9"/>` };
    case 'o-armor': return {
      defs: `<linearGradient id="pa${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6f9"/><stop offset=".5" stop-color="#b9c2cf"/><stop offset="1" stop-color="#8a95a5"/></linearGradient>`,
      on: cover(`url(#pa${u})`) + Array.from({ length: 4 }, (_, i) => `<rect x="${xs + (i + 1) * (xe - xs) / 5}" y="${top}" width="1" height="${bot - top}" fill="#6f7a8a"/>`).join('') +
        `<rect x="${xs}" y="${b.cy - 1}" width="${xe - xs}" height="2" fill="#d4af37"/>`,
      front: band('#d4af37', 3.6) + `<path d="M${xs - 3} ${b.cy - b.ry * 0.7} q5 -5 10 0 v5 q-5 3 -10 0 z" fill="url(#pa${u})" stroke="#6f7a8a" stroke-width=".6"/>` };
    default: return {};
  }
}

// 畫一隻狗狗：stage 階段、colorId 毛色、outfitId 衣服、gearId 嘴裡叼的、hatId 帽子
function petSvg(stage, colorId, outfitId, gearId, hatId) {
  const u = ++petUid;
  const B = PET_BODY[stage], b = B.body, h = B.head;
  const [coat0, tan, dark, line] = PET_COLORS[colorId] || PET_COLORS['c-normal'];
  const gold = colorId === 'c-gold';
  const coat = gold ? `url(#pg${u})` : coat0;
  const anim = colorId === 'c-rainbow' ? '<animate attributeName="fill" values="#ff6b6b;#ffb347;#ffe066;#6bd68a;#5ab0ff;#b48cff;#ff6b6b" dur="5s" repeatCount="indefinite"/>' : '';
  const C = (tag, attrs) => `<${tag} ${attrs} fill="${coat}">${anim}</${tag}>`; // 主毛色（彩虹會變色）
  const o = outfitId ? petOutfit(outfitId, b, h, u) : {};
  const k = h.r / 12.5;
  let s = `<svg viewBox="0 0 100 100" class="pet-svg" style="overflow:visible"${colorId === 'c-ghost' ? ' opacity=".78"' : ''}><defs>` +
    `<linearGradient id="pg${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#f2c230"/><stop offset="1" stop-color="#c99512"/></linearGradient>` +
    `<radialGradient id="pr${u}"><stop offset="0" stop-color="#fff6c2" stop-opacity=".95"/><stop offset=".6" stop-color="#ffd54a" stop-opacity=".45"/><stop offset="1" stop-color="#ffd54a" stop-opacity="0"/></radialGradient>` +
    `<clipPath id="pc${u}"><ellipse cx="${b.cx}" cy="${b.cy}" rx="${b.rx}" ry="${b.ry}"/></clipPath>${o.defs || ''}</defs>`;

  // 傳說神犬：金色光芒、地上的影子、翅膀
  if (B.aura) {
    s += `<circle cx="${b.cx - 8}" cy="${b.cy - 12}" r="50" fill="url(#pr${u})"/>`;
    for (let i = 0; i < 12; i++) s += `<path d="M${b.cx - 8} ${b.cy - 12} L${b.cx - 8 + 52 * Math.cos(i * Math.PI / 6)} ${b.cy - 12 + 52 * Math.sin(i * Math.PI / 6)}" stroke="#ffe27a" stroke-width="1.6" opacity=".35"/>`;
  }
  if (B.pose === 'fly') s += `<ellipse cx="${b.cx - 4}" cy="95" rx="${b.rx * 0.9}" ry="2.6" fill="#000" opacity=".15"/>`;
  if (B.blanket) s += `<ellipse cx="${b.cx - 6}" cy="91" rx="36" ry="7" fill="#9fd3f5"/><ellipse cx="${b.cx - 6}" cy="90" rx="33" ry="5.4" fill="#c8e8ff"/>` +
    [-24, -12, 0, 12, 24].map(dx => `<circle cx="${b.cx - 6 + dx}" cy="90.5" r="1.3" fill="#fff"/>`).join('');
  if (B.wings) for (const [dx, op, sc] of [[8, 0.7, 0.9], [0, 1, 1.1]]) {
    const wx = b.cx - 6 + dx, wy = b.cy - b.ry + 3;
    s += `<g opacity="${op}" transform="translate(${wx} ${wy}) scale(${sc}) translate(${-wx} ${-wy})"><path d="M${wx} ${wy} C${wx + 4} ${wy - 24} ${wx + 28} ${wy - 34} ${wx + 38} ${wy - 30} C${wx + 31} ${wy - 25} ${wx + 33} ${wy - 18} ${wx + 26} ${wy - 15} C${wx + 31} ${wy - 10} ${wx + 24} ${wy - 6} ${wx + 18} ${wy - 6} C${wx + 18} ${wy - 1} ${wx + 9} ${wy + 1} ${wx} ${wy} Z" fill="#fffdf4" stroke="#e8d9a8" stroke-width=".8"/>` +
      `<path d="M${wx + 6} ${wy - 6} Q${wx + 17} ${wy - 18} ${wx + 31} ${wy - 25} M${wx + 5} ${wy - 3} Q${wx + 15} ${wy - 9} ${wx + 22} ${wy - 12}" stroke="#eadfb8" stroke-width=".8" fill="none"/></g>`;
  }
  if (o.back) s += o.back;

  // 尾巴：小奶狗是短短一截；越大越長、毛越多
  {
    const tx = b.cx + b.rx * 0.9, ty = b.cy - b.ry * 0.35, L = B.tail;
    const up = B.pose === 'lie' ? 0.15 : B.pose === 'run' ? 1.0 : B.pose === 'fly' ? 0.3 : 0.75;
    const ex = tx + L * 0.75, ey = ty - L * up;
    s += `<path d="M${tx} ${ty} Q${tx + L * 0.55} ${ty - L * 0.05} ${ex} ${ey}" stroke="${coat0}" stroke-width="${3.4 * (0.7 + k * 0.3)}" fill="none" stroke-linecap="round">${anim ? anim.replace('attributeName="fill"', 'attributeName="stroke"') : ''}</path>`;
    const n = B.plume ? 2 + B.plume * 2 : 0;
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1), px = tx + (ex - tx) * t + 1, py = ty + (ey - ty) * t * t + 1.5;
      s += C('ellipse', `cx="${px + 1}" cy="${py + B.plume * 1.4}" rx="${1.2 + B.plume * 0.35}" ry="${1.8 + B.plume * 1.5}" transform="rotate(${-30 + i * 5} ${px} ${py})"`);
    }
  }

  // 腳：每種姿勢不同；下半截是棕色；長大後腳上有飄逸的長毛
  const fx = b.cx - b.rx * 0.62, bx = b.cx + b.rx * 0.6;
  const leg = (x, ang, fill, w, len, hairy) => {
    const y0 = b.cy + b.ry * 0.3;
    let g = `<g transform="rotate(${ang} ${x} ${y0})">`;
    if (hairy) g += [0.35, 0.6].map(t => C('ellipse', `cx="${x + w * 0.55}" cy="${y0 + len * t}" rx="${1 + hairy * 0.6}" ry="${2 + hairy * 1.4}" transform="rotate(-18 ${x} ${y0 + len * t})"`)).join('');
    g += `<rect x="${x - w / 2}" y="${y0}" width="${w}" height="${len}" rx="${w * 0.45}" fill="${fill}"/><rect x="${x - w / 2}" y="${y0 + len * 0.55}" width="${w}" height="${len * 0.45}" rx="${w * 0.42}" fill="${tan}"/><ellipse cx="${x - w * 0.22}" cy="${y0 + len - 0.8}" rx="${w * 0.7}" ry="${w * 0.36}" fill="${tan}"/>`;
    return g + '</g>';
  };
  const legSet = (near) => {
    const fill = near ? coat0 : dark, off = near ? 0 : 3.5;
    const len = 94 - (b.cy + b.ry * 0.3) - (near ? 0 : 1.5);
    const hairy = near ? B.legHair : 0;
    switch (B.pose) {
      case 'lie': return near ? `<ellipse cx="${h.cx - 2}" cy="${b.cy + b.ry * 0.85}" rx="5" ry="2.6" fill="${tan}"/><ellipse cx="${h.cx + 8}" cy="${b.cy + b.ry * 0.9}" rx="5" ry="2.6" fill="${tan}"/><ellipse cx="${bx + 4}" cy="${b.cy + b.ry * 0.85}" rx="5.5" ry="2.8" fill="${tan}"/>` : '';
      case 'sit': return leg(fx + off, 0, fill, 7.2, len, 0) + leg(bx + off, 0, fill, 7.2, len, 0);
      case 'run': return leg(fx + off, near ? 32 : 18, fill, 5.6, len, hairy) + leg(bx + off, near ? -34 : -20, fill, 5.6, len, hairy);
      case 'fly': return leg(fx + off, 62, fill, 5.6, len * 0.85, hairy) + leg(bx + off, -64, fill, 5.6, len * 0.85, hairy);
      default: return leg(fx + off, 0, fill, 5.8, len, hairy) + leg(bx + off, 0, fill, 5.8, len, hairy);
    }
  };
  s += legSet(false);

  // 肚子下面的長毛（越大越長）
  if (B.hair) {
    let p = `M${b.cx - b.rx * 0.8} ${b.cy + b.ry * 0.3}`;
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const x = b.cx - b.rx * 0.8 + (b.rx * 1.5) * i / n;
      const y = b.cy + b.ry * Math.sqrt(Math.max(0, 1 - ((x - b.cx) / b.rx) ** 2)) + B.hair * (i % 2 ? 1 : 0.45);
      p += ` L${x} ${y}`;
    }
    p += ` L${b.cx + b.rx * 0.7} ${b.cy} Z`;
    s += C('path', `d="${p}"`);
  }
  // 脖子
  {
    const nx = (h.cx + h.r * 0.4 + b.cx - b.rx * 0.75) / 2, ny = (h.cy + h.r * 0.5 + b.cy - b.ry * 0.2) / 2;
    const len = Math.hypot(b.cx - b.rx * 0.75 - h.cx, b.cy - h.cy) * 0.55;
    const a = Math.atan2(b.cy - h.cy, b.cx - b.rx * 0.75 - h.cx) * 180 / Math.PI;
    s += C('ellipse', `cx="${nx}" cy="${ny}" rx="${Math.max(len, h.r * 0.75)}" ry="${h.r * 0.68}" transform="rotate(${a} ${nx} ${ny})"`);
  }
  // 身體
  s += C('ellipse', `cx="${b.cx}" cy="${b.cy}" rx="${b.rx}" ry="${b.ry}"`);
  s += `<g clip-path="url(#pc${u})"><ellipse cx="${b.cx - b.rx * 0.92}" cy="${b.cy + b.ry * 0.35}" rx="${b.rx * 0.22}" ry="${b.ry * 0.62}" fill="${tan}"/></g>`;
  // 毛流、光澤
  if (B.hair) s += `<path d="M${b.cx - b.rx * 0.3} ${b.cy - b.ry * 0.45} q4 2 8 0 M${b.cx + b.rx * 0.15} ${b.cy - b.ry * 0.25} q4 2 8 0 M${b.cx - b.rx * 0.05} ${b.cy + b.ry * 0.2} q4 2 8 0" stroke="${line}" stroke-width=".9" fill="none" stroke-linecap="round" opacity=".8"/>`;
  if (B.shine) s += `<path d="M${b.cx - b.rx * 0.45} ${b.cy - b.ry * 0.5} Q${b.cx} ${b.cy - b.ry * 0.78} ${b.cx + b.rx * 0.4} ${b.cy - b.ry * 0.52}" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".28"/>`;
  s += legSet(true);
  if (o.on) s += `<g clip-path="url(#pc${u})">${o.on}</g>`;
  // 胸前毛領
  if (B.ruff) {
    const n = 2 + B.ruff * 2, x0 = b.cx - b.rx * 0.95, y0 = b.cy - b.ry * 0.5;
    for (let i = 0; i < n; i++) s += C('ellipse', `cx="${x0 - 1 + i * 0.6}" cy="${y0 + i * (b.ry * 1.1 / n)}" rx="${1.6 + B.ruff * 0.5}" ry="${2.4 + B.ruff * 0.9}" transform="rotate(25 ${x0} ${y0 + i * 3})"`);
  }

  // 頭：頭殼＋嘴（小奶狗嘴短、眼睛大）
  const sn = B.snout;
  const sx = h.cx - h.r * (0.6 + 0.35 * sn), sy = h.cy + h.r * 0.32;
  s += C('circle', `cx="${h.cx}" cy="${h.cy}" r="${h.r}"`);
  s += C('ellipse', `cx="${sx}" cy="${sy}" rx="${h.r * 0.74 * sn}" ry="${h.r * 0.4}"`);
  s += `<ellipse cx="${sx + h.r * 0.02}" cy="${sy + h.r * 0.12}" rx="${h.r * 0.68 * sn}" ry="${h.r * 0.28}" fill="${tan}"/>`;
  s += `<ellipse cx="${h.cx - h.r * 0.22}" cy="${h.cy + h.r * 0.45}" rx="${h.r * 0.26}" ry="${h.r * 0.16}" fill="${tan}"/>`;
  const nx2 = sx - h.r * 0.66 * sn;
  s += `<ellipse cx="${nx2}" cy="${sy - h.r * 0.08}" rx="${h.r * 0.17}" ry="${h.r * 0.14}" fill="#111"/><circle cx="${nx2 - h.r * 0.04}" cy="${sy - h.r * 0.14}" r="${h.r * 0.05}" fill="#fff" opacity=".7"/>`;
  s += `<path d="M${nx2 + h.r * 0.15} ${sy + h.r * 0.3} q${h.r * 0.35 * sn} ${h.r * 0.16} ${h.r * 0.75 * sn} ${-h.r * 0.02}" stroke="#5a3a20" stroke-width=".8" fill="none" stroke-linecap="round"/>`;
  if (B.tongue) s += `<path d="M${nx2 + h.r * 0.35} ${sy + h.r * 0.32} q${h.r * 0.02} ${h.r * 0.5} ${h.r * 0.22} ${h.r * 0.5} q${h.r * 0.2} 0 ${h.r * 0.16} ${-h.r * 0.48} z" fill="#ff7b9c" stroke="#e0567a" stroke-width=".5"/>`;
  if (B.blush) s += `<ellipse cx="${h.cx - h.r * 0.12}" cy="${h.cy + h.r * 0.28}" rx="${h.r * 0.2}" ry="${h.r * 0.12}" fill="#ff8fab" opacity=".55"/>`;
  // 眼睛＋上面的棕色「第二對眼睛」（四目）
  const er = h.r * 0.17 * B.eye;
  const ex = h.cx - h.r * 0.4, ey = h.cy - h.r * 0.06;
  if (B.sleep) s += `<path d="M${ex - h.r * 0.2} ${ey} q${h.r * 0.2} ${h.r * 0.16} ${h.r * 0.4} 0" stroke="#d9b48a" stroke-width="1.1" fill="none" stroke-linecap="round"/><text x="${h.cx + 2}" y="${h.cy - h.r - 2}" font-size="${h.r * 0.8}" fill="#7d9bd6" font-weight="700">z</text><text x="${h.cx + 9}" y="${h.cy - h.r - 9}" font-size="${h.r * 0.6}" fill="#7d9bd6" font-weight="700">z</text>`;
  else s += `<circle cx="${ex}" cy="${ey}" r="${er}" fill="#140b07" stroke="#6b4a32" stroke-width=".5"/><circle cx="${ex - er * 0.3}" cy="${ey - er * 0.35}" r="${er * 0.38}" fill="#fff"/>` +
    (B.eye > 1.2 ? `<circle cx="${ex + er * 0.35}" cy="${ey + er * 0.35}" r="${er * 0.18}" fill="#fff" opacity=".8"/>` : '');
  s += `<ellipse cx="${ex + h.r * 0.06}" cy="${ey - er - h.r * 0.17}" rx="${h.r * 0.13}" ry="${h.r * 0.09}" fill="${tan}"/>`;
  // 垂耳：小時候短短圓圓，長大後變成飄逸的長毛耳朵
  {
    const ax = h.cx + h.r * 0.05, ay = h.cy - h.r * 0.72, E = h.r * B.ear;
    const bx2 = h.cx + h.r * 0.7, by = h.cy + E * 0.85;
    let ear = `M${ax} ${ay} C${ax + h.r * 0.75} ${ay - h.r * 0.15} ${bx2 + h.r * 0.25} ${h.cy} ${bx2 + h.r * 0.1} ${by}`;
    const w = h.r * 0.95;
    if (B.fringe) {
      const n = 3 + B.fringe;
      for (let i = 1; i <= n; i++) ear += ` Q${bx2 + h.r * 0.1 - w * (i - 0.5) / n} ${by + (1.2 + B.fringe * 1.1) * k + (i % 2) * B.fringe * 0.8} ${bx2 + h.r * 0.1 - w * i / n} ${by - (i === n ? 1.5 : 0)}`;
    } else ear += ` Q${bx2 - w * 0.45} ${by + 4 * k} ${bx2 + h.r * 0.1 - w} ${by - 1.5}`;
    ear += ` C${ax - h.r * 0.25} ${h.cy + E * 0.2} ${ax - h.r * 0.2} ${ay + h.r * 0.3} ${ax} ${ay} Z`;
    s += C('path', `d="${ear}"`);
    if (B.fringe) s += Array.from({ length: B.fringe + 1 }, (_, i) => `<path d="M${ax + h.r * (0.15 + i * 0.22)} ${ay + h.r * 0.5} q${h.r * 0.22} ${E * 0.5} ${h.r * 0.04} ${E * 1.12}" stroke="${line}" stroke-width=".9" fill="none" stroke-linecap="round" opacity=".85"/>`).join('');
  }
  if (o.front) s += o.front;
  if (B.halo) s += `<ellipse cx="${h.cx + 1}" cy="${h.cy - h.r - 5}" rx="${h.r * 0.75}" ry="${h.r * 0.22}" fill="none" stroke="#ffd54a" stroke-width="2"/><ellipse cx="${h.cx + 1}" cy="${h.cy - h.r - 5}" rx="${h.r * 0.75}" ry="${h.r * 0.22}" fill="none" stroke="#fff6c2" stroke-width=".6"/>`;
  if (B.aura) for (const [x, y, r] of [[12, 20, 2.6], [88, 30, 2], [80, 8, 1.6], [6, 60, 1.8], [94, 70, 2.4]])
    s += `<path d="M${x} ${y - r * 2} L${x + r * 0.5} ${y - r * 0.5} L${x + r * 2} ${y} L${x + r * 0.5} ${y + r * 0.5} L${x} ${y + r * 2} L${x - r * 0.5} ${y + r * 0.5} L${x - r * 2} ${y} L${x - r * 0.5} ${y - r * 0.5} Z" fill="#fff3a6"/>`;
  if (B.pose === 'run') s += `<path d="M${b.cx + b.rx + 6} ${b.cy - 4} h8 M${b.cx + b.rx + 8} ${b.cy + 2} h10 M${b.cx + b.rx + 5} ${b.cy + 8} h7" stroke="#9aa7b5" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`;
  // 帽子、嘴裡叼的東西（表情圖案）
  const hat = hatId && PET_ITEM[hatId], gear = gearId && PET_ITEM[gearId];
  if (hat) s += `<text x="${h.cx + h.r * 0.05}" y="${h.cy - h.r * 0.45}" font-size="${h.r * 1.75}" text-anchor="middle">${hat.emoji}</text>`;
  if (gear && gear.svg) s += `<g transform="translate(${sx - h.r * 2.05} ${sy - h.r * 0.2}) scale(${k * 0.95}) rotate(-6)">${gear.svg}</g>`; // 咬在嘴裡，槍口朝前
  else if (gear) s += `<text x="${sx - h.r * 0.15}" y="${sy + h.r * 1.25}" font-size="${h.r * 1.35}" text-anchor="middle" transform="rotate(-10 ${sx} ${sy})">${gear.emoji}</text>`;
  return s + '</svg>';
}

// px：場景大小；mini：首頁左上角的小頭像（不畫小裝飾和嘴裡的東西）
function petSceneHtml(px, mini = false) {
  const p = S.pet;
  const si = petStage(p);
  const bg = PET_ITEM[p.equip.bg] || PET_SHOP.bg.items[0];
  const mount = p.equip.mount && PET_ITEM[p.equip.mount];
  const petPx = px * PET_BODY[si].size * (mount ? 0.82 : 1);
  const ground = mount ? px * 0.2 : px * 0.03;
  let h = `<div class="pet-scene" style="width:${px}px;height:${px}px;background:${bg.bg}">`;
  if (bg.art) h += `<svg class="pet-art" viewBox="0 0 100 100" preserveAspectRatio="none">${bg.art}</svg>`;
  h += (bg.deco || []).filter(d => !mini || (d[3] || 0) >= 0.25)
    .map(([e, x, y, sz = 0.13]) => `<span class="pet-deco" style="font-size:${px * sz}px;left:${x}%;top:${y}%">${e}</span>`).join('');
  if (mount) h += `<span class="pet-part" style="font-size:${px * 0.38}px;left:${px / 2 - px * 0.21}px;bottom:${px * 0.0}px">${mount.emoji}</span>`;
  h += `<div class="pet-part pet-body${p.equip.color === 'c-gold' ? ' pet-gold' : ''}" style="width:${petPx}px;height:${petPx}px;left:${(px - petPx) / 2}px;bottom:${ground}px">` +
    petSvg(si, p.equip.color, p.equip.outfit, mini ? null : p.equip.gear, p.equip.hat) + '</div>';
  return h + '</div>';
}
function petMini() {
  return petSceneHtml(64, true) + (petNeedsCare() ? '<span class="pet-alert">!</span>' : '');
}


// ───────── 狗狗頁 ─────────
let petTab = 'care';
function petPage() {
  petTick(); save();
  const p = S.pet;
  const si = petStage(p), st = PET_STAGES[si], next = PET_STAGES[si + 1];
  const mood = petMood(p);
  const free = spendable();
  const pats = p.pats[today()] || 0;
  const bar = (icon, label, v, color) => `
    <div class="pet-stat"><span>${icon} ${label}</span><div class="pet-bar"><div style="width:${Math.round(v)}%;background:${color}"></div></div><b>${Math.round(v)}</b></div>`;
  const tabs = [['care', '🍽️ 照顧'], ...PET_SLOTS.map(k => [k, `${PET_SHOP[k].icon} ${PET_SHOP[k].name}`])];
  app.innerHTML = `
    <div class="top-bar"><button class="back" onclick="home()">← 首頁</button><h2>🐶 我的狗狗</h2><span class="small muted" style="margin-left:auto">可用 🪙 ${free}</span></div>
    <div class="card pet-card">
      <div class="pet-stage-wrap" onclick="petPat()">${petSceneHtml(Math.min(300, innerWidth - 80))}</div>
      <div class="pet-info">
        <div class="row between wrap"><div class="title-line">${esc(p.name)} <span class="small muted">${st.name}</span></div>
          <button class="btn-sm" onclick="petRename()">✏️ 改名${p.renamed ? `（🪙 ${RENAME_COST}）` : '（免費）'}</button></div>
        <div class="small" style="margin:4px 0 8px">${mood.face} ${mood.text}</div>
        ${next ? `<div class="small muted">成長 ${p.grow} / ${next.at} → 下一階段「${next.name}」</div>
          <div class="xpbar"><div style="width:${((p.grow - st.at) / (next.at - st.at) * 100).toFixed(1)}%;background:var(--ok)"></div></div>`
          : `<div class="small">🌟 已經是最高階段「${st.name}」了！成長值 ${p.grow}</div>`}
        <div style="margin-top:10px">
          ${bar('🍗', '飽足', p.food, '#f5a524')}${bar('😊', '心情', p.happy, '#ec6aa0')}${bar('🫧', '清潔', p.clean, '#3fa7e0')}
        </div>
        <div class="small muted" style="margin-top:6px">點狗狗可以免費摸摸頭（今天還有 ${Math.max(0, PET_PATS_PER_DAY - pats)} 次）。
          每答對 1 題，狗狗成長 +${PET_LEARN.grow}，飽足、心情、清潔也會補一點（最多到 ${PET_LEARN.floor}）。肚子太餓時長得比較慢喔！</div>
        <div class="small" style="margin-top:4px">📅 本週成長 <b>${petWeekGrow()} / ${PET_WEEK_CAP}</b>${petWeekGrow() >= PET_WEEK_CAP ? '（已滿，下週一再長大；照顧仍會讓狗狗開心）' : ''}</div>
        ${S.petDailyLimit ? `<div class="small muted">爸媽設定：每天最多花 ${S.petDailyLimit} 金幣在狗狗身上（今天已花 ${ensureDay().petSpent || 0}）</div>` : ''}
      </div>
    </div>
    ${petRoadmapHtml()}
    <div class="pet-tabs">${tabs.map(([k, label]) => `<button class="${petTab === k ? 'on' : ''}" onclick="petTab='${k}';petPage()">${label}</button>`).join('')}</div>
    <div class="card">${petTab === 'care' ? petCareHtml(free) : petShopHtml(petTab, free)}</div>`;
}
// 成長路線圖：讓孩子先看到之後會變成什麼樣子
function petRoadmapHtml() {
  const p = S.pet;
  const si = petStage(p);
  const color = PET_ITEM[p.equip.color] || {};
  const last = PET_STAGES[PET_STAGES.length - 1];
  // 用最近 7 天的平均成長速度估計還要幾天
  const t = today();
  const recent = Array.from({ length: 7 }, (_, i) => S.days[addDays(t, -i)]?.petGrow || 0);
  const active = recent.filter(v => v > 0).length;
  const perDay = active ? Math.min(recent.reduce((a, b) => a + b, 0) / active, PET_WEEK_CAP / 7) : 0; // 只平均有玩的天數，且不超過每週上限
  const left = Math.max(0, last.at - p.grow);
  let eta = '';
  if (si === PET_STAGES.length - 1) eta = `🎉 已經養成「${last.name}」了，太厲害了！`;
  else if (perDay > 0) {
    const days = Math.ceil(left / perDay);
    const when = addDays(t, days);
    eta = `照最近的速度（每天約 ${Math.round(perDay)}），大約 <b>${days} 天後（${shortDate(when)}）</b>變成「${last.name}」` +
      (when <= PET_GOAL.date ? '，趕得上目標！💪' : `，要再加油才趕得上 ${shortDate(PET_GOAL.date)} 喔！`);
  } else eta = '開始答題、照顧狗狗，就能算出還要多久長大！';
  return `
    <div class="card">
      <div class="row between wrap"><h3>🗺️ 成長路線圖</h3><span class="small muted">目標：${PET_GOAL.label}（${shortDate(PET_GOAL.date)}）養成「${last.name}」</span></div>
      <div class="pet-road">${PET_STAGES.map((st, i) => {
        const state = i < si ? 'done' : i === si ? 'now' : 'next';
        return `<div class="road-step ${state}">
          <span class="road-emoji">${petSvg(i, p.equip.color, null, null, null)}</span>
          <b>${st.name}</b><span class="small muted">${st.desc}</span>
          <span class="road-tag">${state === 'done' ? '✓ 完成' : state === 'now' ? '現在' : `還差 ${st.at - p.grow}`}</span>
        </div>`;
      }).join('<span class="road-arrow">➜</span>')}</div>
      <div class="xpbar" style="margin-top:12px"><div style="width:${Math.min(100, p.grow / last.at * 100).toFixed(1)}%;background:var(--ok)"></div></div>
      <div class="small" style="margin-top:6px">總成長 ${p.grow} / ${last.at}。${eta}</div>
    </div>`;
}

// ───────── 家長頁：金幣去向與狗狗花費上限 ─────────
function coinFlowHtml() {
  const t = today();
  const week = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6));
  const sum = key => week.reduce((a, k) => a + ((S.days[k] || {})[key] || 0), 0);
  const doneIn = r => r.done && week.includes(r.doneDate || r.date);
  const rewardWeek = S.redeems.filter(doneIn).reduce((a, r) => a + r.cost, 0);
  const rewardAll = S.redeems.filter(r => r.done).reduce((a, r) => a + r.cost, 0);
  return `
    <div class="card">
      <h3>🪙 金幣去向</h3>
      <table>
        <tr><th></th><th class="num">今天</th><th class="num">近 7 天</th><th class="num">累計</th></tr>
        <tr><td>賺到的金幣</td><td class="num">${ensureDay().earned || 0}</td><td class="num">${sum('earned')}</td><td class="num">—</td></tr>
        <tr><td>🐶 花在狗狗</td><td class="num">${ensureDay().petSpent || 0}</td><td class="num">${sum('petSpent')}</td><td class="num">${S.pet.spent || 0}</td></tr>
        <tr><td>🎁 兌換獎勵</td><td class="num">—</td><td class="num">${rewardWeek}</td><td class="num">${rewardAll}</td></tr>
        <tr><td>🛡️ 保護卡</td><td class="num">${ensureDay().shieldSpent || 0}</td><td class="num">${sum('shieldSpent')}</td><td class="num">${S.shieldSpent || 0}</td></tr>
      </table>
      <p class="small muted">目前剩 ${S.coins} 金幣。狗狗成長 ${S.pet.grow} / ${PET_STAGES[PET_STAGES.length - 1].at}（${PET_STAGES[petStage(S.pet)].name}），本週 ${petWeekGrow()} / ${PET_WEEK_CAP}。</p>
      <div class="row wrap">
        <span>狗狗每天最多花</span>
        <input id="petlim" type="tel" value="${S.petDailyLimit || ''}" placeholder="不限制" style="width:100px">
        <span>金幣</span>
        <button class="btn-sm" onclick="setPetLimit()">儲存</button>
      </div>
      <p class="small muted">留空或 0 ＝ 不限制。狗狗照顧、商店、改名都算在內。</p>
    </div>`;
}
function setPetLimit() {
  const v = parseInt(document.getElementById('petlim').value, 10);
  S.petDailyLimit = v > 0 ? v : 0;
  save();
  toast(S.petDailyLimit ? `狗狗每天最多花 ${S.petDailyLimit} 金幣` : '狗狗花費不限制');
  parentPage();
}

function petCareHtml(free) {
  const full = petWeekGrow() >= PET_WEEK_CAP;
  return `${full ? '<p class="small pending">本週成長已滿 🌙 現在照顧只會讓狗狗開心，不會長大，下週一再一起努力！</p>' : ''}
    <div class="pet-grid">${PET_CARE.map(c => {
    const fx = [c.food && `🍗+${c.food}`, c.happy && `😊+${c.happy}`, c.clean && `🫧+${c.clean}`, `🌱+${c.grow}`].filter(Boolean).join(' ');
    return `<button class="pet-item" onclick="petCare('${c.id}')" ${free >= c.cost ? '' : 'disabled'}>
      <span class="pi-ico">${c.icon}</span><b>${c.name}</b><span class="small muted">${fx}</span><span class="pi-cost">🪙 ${c.cost}</span></button>`;
  }).join('')}</div>`;
}
function petShopHtml(slot, free) {
  const p = S.pet;
  return `<div class="pet-grid">${PET_SHOP[slot].items.map(it => {
    const owned = p.owned.includes(it.id);
    const on = p.equip[slot] === it.id;
    const big = slot === 'bg' && ((it.deco || []).find(d => (d[3] || 0) >= 0.25) || (it.deco || [])[0]);
    const preview = slot === 'color' ? `<span class="pi-ico pi-svg">${petSvg(2, it.id)}</span>`
      : slot === 'outfit' ? `<span class="pi-ico pi-svg">${petSvg(Math.max(2, petStage(p)), p.equip.color, it.id)}</span>`
      : slot === 'bg' ? `<span class="pi-ico pi-bg" style="background:${it.bg}">${it.art ? `<svg class="pet-art" viewBox="0 0 100 100" preserveAspectRatio="none">${it.art}</svg>` : ''}${big ? `<span class="pi-bg-deco">${big[0]}</span>` : ''}</span>`
      : it.svg ? `<span class="pi-ico"><svg viewBox="-2 -2 44 20" style="width:64px;height:30px">${it.svg}</svg></span>`
      : `<span class="pi-ico">${it.emoji}</span>`;
    const label = on ? (slot === 'color' || slot === 'bg' ? '使用中' : '使用中（點一下卸下）') : owned ? '點一下換上' : it.cost ? `🪙 ${it.cost}` : '免費';
    return `<button class="pet-item ${on ? 'on' : ''}" onclick="petShopTap('${slot}','${it.id}')" ${!owned && free < it.cost ? 'disabled' : ''}>
      ${preview}<b>${it.name}</b><span class="pi-cost ${owned ? 'owned' : ''}">${label}</span></button>`;
  }).join('')}</div>`;
}

// ───────── 動作 ─────────
// 花在狗狗身上的金幣：受家長設定的每日上限限制，並記錄起來給家長頁統計
function petSpend(cost, what) {
  const d = ensureDay();
  const limit = S.petDailyLimit || 0;
  if (limit && (d.petSpent || 0) + cost > limit) { toast(`今天花在狗狗的金幣已達爸媽設定的上限 ${limit} 個`); return false; }
  if (spendable() < cost) { toast('金幣不夠喔'); return false; }
  if (cost >= 100 && !confirm(`用 ${cost} 金幣買「${what}」嗎？`)) return false;
  S.coins -= cost;
  d.petSpent = (d.petSpent || 0) + cost;
  S.pet.spent = (S.pet.spent || 0) + cost;
  return true;
}
// 答對題目時由 app.js 呼叫
function petLearn() {
  petTick();
  const p = S.pet;
  for (const k of ['food', 'happy', 'clean']) if (p[k] < PET_LEARN.floor) p[k] = Math.min(PET_LEARN.floor, p[k] + PET_LEARN.per);
  petGrow(PET_LEARN.grow);
}
// 這週（週一開始）已經成長多少
function petWeekGrow() {
  const ws = weekStart(today());
  return Array.from({ length: 7 }, (_, i) => S.days[addDays(ws, i)]?.petGrow || 0).reduce((a, b) => a + b, 0);
}
function petGrow(n) {
  const p = S.pet;
  const before = petStage(p);
  const d = ensureDay();
  const room = Math.max(0, PET_WEEK_CAP - petWeekGrow());
  const got = Math.min(room, p.food < 20 ? Math.ceil(n / 2) : n); // 太餓長得慢；每週有上限
  if (got < n && !d.petCapNoticed && room === 0) { d.petCapNoticed = true; toast(`🌙 ${p.name} 這週已經長很多了，下週一再繼續長大！（照顧還是能讓牠開心喔）`); }
  p.grow += got;
  d.petGrow = (d.petGrow || 0) + got;
  const after = petStage(p);
  if (after > before) {
    setTimeout(() => { burst('🎉', 20); toast(`🎊 ${p.name} 長大了！變成「${PET_STAGES[after].name}」`); }, 300);
  }
  return got;
}
function petCare(id) {
  const c = PET_CARE.find(x => x.id === id);
  petTick();
  if (!c) return;
  if (petWeekGrow() >= PET_WEEK_CAP && !confirm(`本週成長已經滿了，這次「${c.name}」只會讓狗狗的狀態變好，不會長大。還要花 ${c.cost} 金幣嗎？`)) return;
  if (!petSpend(c.cost, c.name)) return;
  const p = S.pet;
  for (const k of ['food', 'happy', 'clean']) if (c[k]) p[k] = Math.min(100, p[k] + c[k]);
  const got = petGrow(c.grow);
  save();
  burst(c.icon, 8);
  toast(`${c.icon} ${p.name}：謝謝你！${got ? `成長 +${got}` : '（本週成長已滿，但我很開心！）'}`);
  petPage();
}
function petPat() {
  const p = S.pet, t = today();
  const used = p.pats[t] || 0;
  if (used >= PET_PATS_PER_DAY) { toast(`${p.name} 今天被摸夠了，明天再來～`); return; }
  p.pats = { [t]: used + 1 };
  p.happy = Math.min(100, p.happy + 8);
  petGrow(2);
  save();
  burst('💗', 6);
  petPage();
}
function petRename() {
  const p = S.pet;
  const cost = p.renamed ? RENAME_COST : 0;
  if (cost && spendable() < cost) { toast('金幣不夠喔'); return; }
  const name = (prompt(`幫狗狗取新名字（最多 8 個字）${cost ? `，要花 ${cost} 金幣` : ''}：`, p.name) || '').trim().slice(0, 8);
  if (!name || name === p.name) return;
  if (cost && !petSpend(cost, '改名')) return;
  p.name = name; p.renamed++;
  save();
  toast(`狗狗的新名字是「${name}」！`);
  petPage();
}
function petShopTap(slot, id) {
  const p = S.pet, it = PET_ITEM[id];
  if (!it) return;
  if (!p.owned.includes(id)) {
    if (!petSpend(it.cost, it.name)) return;
    p.owned.push(id);
    p.equip[slot] = id;
    burst('✨', 12);
    toast(`買到「${it.name}」，已經換上了！`);
  } else if (p.equip[slot] === id) {
    // 顏色和背景一定要有一個，其他可以卸下
    if (slot === 'color' || slot === 'bg') return;
    p.equip[slot] = null;
  } else {
    p.equip[slot] = id;
  }
  save();
  petPage();
}

// ───────── 樣式 ─────────
(function petStyles() {
  const css = `
  .avatar.pet-mini { padding: 0; overflow: visible; position: relative; background: none; }
  .avatar.pet-mini .pet-scene { border-radius: 18px; box-shadow: 0 2px 6px rgba(0,0,0,.12); }
  .pet-alert { position: absolute; top: -6px; right: -6px; width: 22px; height: 22px; border-radius: 50%; background: var(--bad); color: #fff; font-weight: 800; font-size: 15px; display: grid; place-items: center; animation: pop .4s infinite alternate; }
  .pet-scene { position: relative; overflow: hidden; border-radius: 24px; flex: none; }
  .pet-svg { display: block; width: 100%; height: 100%; }
  .pet-art { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
  .pi-svg { width: 76px; height: 76px; }
  .pet-gold { filter: drop-shadow(0 0 6px #ffd54a); }
  .pet-part, .pet-deco { position: absolute; line-height: 1; }
  .pet-body { animation: petBob 2.4s ease-in-out infinite; }
  @keyframes petBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4%); } }
  .pet-rainbow { animation: petBob 2.4s ease-in-out infinite, petHue 3s linear infinite; }
  @keyframes petHue { from { filter: hue-rotate(0deg) saturate(1.4); } to { filter: hue-rotate(360deg) saturate(1.4); } }
  .pet-card { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; }
  .pet-stage-wrap { cursor: pointer; margin: 0 auto; }
  .pet-info { flex: 1; min-width: 240px; }
  .pet-stat { display: grid; grid-template-columns: 76px 1fr 34px; align-items: center; gap: 8px; font-size: 15px; margin: 5px 0; }
  .pet-bar { height: 12px; border-radius: 99px; background: var(--bg); overflow: hidden; }
  .pet-bar > div { height: 100%; border-radius: 99px; transition: width .4s; }
  .pet-stat b { text-align: right; font-size: 14px; }
  .pet-tabs { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 12px; -webkit-overflow-scrolling: touch; }
  .pet-tabs button { flex: none; padding: 9px 14px; border-radius: 12px; background: var(--card); box-shadow: var(--shadow); font-weight: 700; font-size: 16px; }
  .pet-tabs button.on { background: var(--brand); color: #fff; }
  .pet-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
  .pet-item { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 12px 8px; border-radius: 16px; background: var(--bg); border: 3px solid transparent; text-align: center; }
  .pet-item.on { border-color: var(--ok); background: var(--ok-soft); }
  .pet-item:disabled { opacity: .45; }
  .pet-item b { font-size: 16px; }
  .pi-ico { font-size: 38px; line-height: 1.1; display: inline-block; }
  .pi-bg { width: 72px; height: 54px; border-radius: 10px; position: relative; overflow: hidden; }
  .pi-bg-deco { position: absolute; right: 4px; top: 4px; font-size: 26px; line-height: 1; }
  .pi-cost { font-size: 14px; font-weight: 700; color: #a76a00; }
  .pi-cost.owned { color: var(--ok); }
  .pet-road { display: flex; align-items: stretch; gap: 4px; overflow-x: auto; padding: 8px 2px 4px; -webkit-overflow-scrolling: touch; }
  .road-step { flex: none; width: 112px; display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center; padding: 10px 6px; border-radius: 16px; background: var(--bg); border: 3px solid transparent; }
  .road-step b { font-size: 15px; }
  .road-step .small { font-size: 12px; line-height: 1.3; }
  .road-step.now { border-color: var(--brand); background: var(--brand-soft); }
  .road-step.next .road-emoji { opacity: .6; }
  .road-step.done { opacity: .75; }
  .road-emoji { width: 64px; height: 64px; display: inline-block; }
  .road-tag { margin-top: auto; font-size: 13px; font-weight: 800; color: var(--brand-dark); }
  .road-step.done .road-tag { color: var(--ok); }
  .road-arrow { align-self: center; color: var(--muted); flex: none; }
  `;
  const s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);
})();
