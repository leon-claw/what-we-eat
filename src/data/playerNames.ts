export const playfulPlayerNames = [
  "锅气猎人",
  "饭点刺客",
  "奶茶裁判",
  "辣度勇者",
  "碳水魔术师",
  "香菜探长",
  "夜宵队长",
  "火锅军师",
  "小笼包拳手",
  "芝士巡游者",
  "汤底诗人",
  "米饭守门员",
  "烧烤指挥官",
  "酸甜观察员",
  "面条漂移手",
  "煲仔饭骑士",
  "炸鸡预言家",
  "点心收藏家",
  "咖喱航海家",
  "快乐干饭王",
];

export function randomPlayerName() {
  return playfulPlayerNames[Math.floor(Math.random() * playfulPlayerNames.length)];
}
