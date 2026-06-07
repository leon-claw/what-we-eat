import type { FoodCategory, FoodOption } from "../types";

const image = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=82`;

type OptionSeed = {
  id: string;
  name: string;
  tags?: string[];
  spicyLevel?: FoodOption["spicyLevel"];
  priceLevel?: FoodOption["priceLevel"];
};

type CategorySeed = {
  id: string;
  name: string;
  imageId: string;
  scene: string;
  options: OptionSeed[];
};

const categorySeeds: CategorySeed[] = [
  {
    id: "sichuan-hunan-jiangxi",
    name: "川湘赣菜",
    imageId: "photo-1563379926898-05f4575a45d8",
    scene: "适合想吃重口下饭菜的时候",
    options: [
      { id: "sichuan", name: "川菜", tags: ["麻辣", "下饭"], spicyLevel: 3 },
      { id: "hunan", name: "湘菜", tags: ["鲜辣", "小炒"], spicyLevel: 3 },
      { id: "jiangxi", name: "江西菜", tags: ["香辣", "家常"], spicyLevel: 3 },
    ],
  },
  {
    id: "cantonese-fujian",
    name: "粤闽菜",
    imageId: "photo-1551218808-94e220e084d2",
    scene: "适合偏爱鲜味、清爽口感或精致点心的时候",
    options: [
      { id: "cantonese", name: "粤菜", tags: ["清鲜", "点心"] },
      { id: "chaoshan", name: "潮汕菜", tags: ["生腌", "牛肉"] },
      { id: "fujian", name: "福建菜", tags: ["海鲜", "汤羹"] },
    ],
  },
  {
    id: "jiangsu-zhejiang-shanghai",
    name: "江浙沪菜",
    imageId: "photo-1555939594-58d7cb561ad1",
    scene: "适合想吃细腻、鲜甜和浓油赤酱风味的时候",
    options: [
      { id: "shanghai", name: "上海本帮菜", tags: ["浓油赤酱", "本帮"] },
      { id: "hangzhou", name: "杭帮菜", tags: ["清鲜", "江南"] },
      { id: "huaiyang", name: "淮扬菜", tags: ["刀工", "精致"] },
    ],
  },
  {
    id: "northern-chinese",
    name: "北方菜",
    imageId: "photo-1546833999-b9f581a1996d",
    scene: "适合想吃分量扎实、咸香过瘾的一餐",
    options: [
      { id: "northeastern", name: "东北菜", tags: ["大份", "炖菜"] },
      { id: "beijing", name: "北京菜", tags: ["烤鸭", "京味"] },
      { id: "shandong", name: "鲁菜", tags: ["咸鲜", "传统"] },
    ],
  },
  {
    id: "yunnan-guizhou",
    name: "云贵菜",
    imageId: "photo-1601050690597-df0568f70950",
    scene: "适合想试酸辣、菌香和山野风味的时候",
    options: [
      { id: "yunnan", name: "云南菜", tags: ["菌菇", "汽锅"] },
      { id: "guizhou", name: "贵州菜", tags: ["酸汤", "糟辣"], spicyLevel: 2 },
    ],
  },
  {
    id: "northwest-xinjiang",
    name: "西北新疆",
    imageId: "photo-1529193591184-b1d58069ecdd",
    scene: "适合想吃面食、牛羊肉和浓郁香料的时候",
    options: [
      { id: "shaanxi", name: "陕西菜", tags: ["面食", "肉夹馍"] },
      { id: "xinjiang", name: "新疆菜", tags: ["羊肉", "孜然"] },
    ],
  },
  {
    id: "hotpot-dry-pot",
    name: "火锅香锅",
    imageId: "photo-1583953623787-ada99d338235",
    scene: "适合热气腾腾地涮、煮、拌上一大锅",
    options: [
      { id: "sichuan-hotpot", name: "川渝火锅", tags: ["牛油锅", "聚餐"], spicyLevel: 3, priceLevel: 3 },
      { id: "chaoshan-beef-hotpot", name: "潮汕牛肉火锅", tags: ["鲜切牛肉", "清汤"], priceLevel: 3 },
      { id: "beijing-mutton-hotpot", name: "老北京涮肉", tags: ["铜锅", "羊肉"], priceLevel: 3 },
      { id: "coconut-chicken-hotpot", name: "椰子鸡火锅", tags: ["清甜", "鸡肉"], priceLevel: 3 },
      { id: "fish-frog-hotpot", name: "鱼蛙火锅", tags: ["鱼蛙", "重口"], spicyLevel: 2, priceLevel: 3 },
      { id: "chuanchuan", name: "串串香", tags: ["串串", "夜宵"], spicyLevel: 2 },
      { id: "malatang", name: "麻辣烫", tags: ["自选", "一人食"], spicyLevel: 2, priceLevel: 1 },
      { id: "mala-xiangguo", name: "麻辣香锅", tags: ["干锅", "自选"], spicyLevel: 2 },
      { id: "maocai", name: "冒菜", tags: ["川味", "一人食"], spicyLevel: 2, priceLevel: 1 },
    ],
  },
  {
    id: "barbecue-grill",
    name: "烧烤烤肉",
    imageId: "photo-1529692236671-f1f6cf9683ba",
    scene: "适合聚餐、夜宵或者想要烟火气的时候",
    options: [
      { id: "skewers", name: "烧烤烤串", tags: ["孜然", "夜宵"] },
      { id: "korean-bbq", name: "韩式烤肉", tags: ["五花肉", "生菜包"], priceLevel: 3 },
      { id: "japanese-yakiniku", name: "日式烧肉", tags: ["和牛", "炭火"], priceLevel: 3 },
      { id: "buffet-bbq", name: "自助烤肉", tags: ["自助", "畅吃"], priceLevel: 2 },
      { id: "seafood-bbq", name: "海鲜烧烤", tags: ["海鲜", "蒜蓉"], priceLevel: 3 },
      { id: "grilled-fish", name: "烤鱼", tags: ["整鱼", "配菜"], spicyLevel: 2, priceLevel: 2 },
    ],
  },
  {
    id: "rice-fast-food",
    name: "米饭快餐",
    imageId: "photo-1512058564366-18510be2db19",
    scene: "适合快速解决一顿又要吃得扎实的时候",
    options: [
      { id: "chinese-fast-food", name: "快餐简餐", tags: ["快捷", "工作餐"], priceLevel: 1 },
      { id: "rice-bowl", name: "盖浇饭", tags: ["下饭", "一人食"], priceLevel: 1 },
      { id: "fried-rice", name: "炒饭", tags: ["快手", "主食"], priceLevel: 1 },
      { id: "claypot-rice", name: "煲仔饭", tags: ["锅巴", "腊味"], priceLevel: 2 },
      { id: "braised-chicken-rice", name: "黄焖鸡", tags: ["鸡肉", "下饭"], priceLevel: 1 },
      { id: "bbq-rice-bowl", name: "烤肉拌饭", tags: ["烤肉", "拌饭"], priceLevel: 1 },
      { id: "wooden-bucket-rice", name: "木桶饭", tags: ["小炒", "米饭"], priceLevel: 1 },
      { id: "bento", name: "便当", tags: ["套餐", "工作餐"], priceLevel: 1 },
      { id: "healthy-light-meal", name: "轻食健康餐", tags: ["低卡", "蔬菜"], priceLevel: 2 },
    ],
  },
  {
    id: "noodles-congee-dim-sum",
    name: "粉面粥点",
    imageId: "photo-1569718212165-3a8278d5f624",
    scene: "适合嗦粉吃面，或者来点热乎碳水的时候",
    options: [
      { id: "noodle-shop", name: "面馆", tags: ["汤面", "拌面"], priceLevel: 1 },
      { id: "rice-noodles-yunnan", name: "米线", tags: ["汤粉", "云南"], priceLevel: 1 },
      { id: "rice-noodles", name: "米粉", tags: ["嗦粉", "早餐"], priceLevel: 1 },
      { id: "luosifen", name: "螺蛳粉", tags: ["酸笋", "重口"], spicyLevel: 2, priceLevel: 1 },
      { id: "hot-sour-noodles", name: "酸辣粉", tags: ["酸辣", "红薯粉"], spicyLevel: 2, priceLevel: 1 },
      { id: "wonton", name: "馄饨抄手", tags: ["汤食", "肉馅"], priceLevel: 1 },
      { id: "dumplings", name: "饺子", tags: ["水饺", "主食"], priceLevel: 1 },
      { id: "steamed-buns", name: "包子馒头", tags: ["早餐", "面点"], priceLevel: 1 },
      { id: "shengjian-potstickers", name: "生煎锅贴", tags: ["煎制", "脆底"], priceLevel: 1 },
      { id: "congee", name: "粥铺", tags: ["清淡", "暖胃"], priceLevel: 1 },
    ],
  },
  {
    id: "snacks-late-night",
    name: "小吃夜宵",
    imageId: "photo-1562967916-eb82221dfb92",
    scene: "适合嘴馋、加餐和深夜续摊的时候",
    options: [
      { id: "fried-skewers", name: "炸串炸物", tags: ["酥脆", "夜宵"], priceLevel: 1 },
      { id: "braised-duck-neck", name: "卤味鸭脖", tags: ["卤味", "追剧"], spicyLevel: 2, priceLevel: 1 },
      { id: "crayfish", name: "小龙虾", tags: ["夜宵", "聚餐"], spicyLevel: 2, priceLevel: 3 },
      { id: "jianbing", name: "煎饼果子", tags: ["早餐", "街头小吃"], priceLevel: 1 },
      { id: "roujiamo", name: "肉夹馍", tags: ["陕西小吃", "夹馍"], priceLevel: 1 },
      { id: "liangpi", name: "凉皮", tags: ["酸辣", "凉拌"], spicyLevel: 1, priceLevel: 1 },
      { id: "stinky-tofu", name: "臭豆腐", tags: ["街头小吃", "香辣"], spicyLevel: 1, priceLevel: 1 },
      { id: "oden", name: "关东煮", tags: ["暖汤", "便利店"], priceLevel: 1 },
    ],
  },
  {
    id: "japanese-korean",
    name: "日韩料理",
    imageId: "photo-1579871494447-9811cf80d66c",
    scene: "适合想换换口味，吃得精致或轻松一点",
    options: [
      { id: "sushi", name: "寿司", tags: ["刺身", "清爽"], priceLevel: 3 },
      { id: "japanese-ramen", name: "日式拉面", tags: ["豚骨", "汤面"], priceLevel: 2 },
      { id: "japanese-donburi", name: "日式盖饭", tags: ["丼饭", "一人食"], priceLevel: 2 },
      { id: "japanese-curry", name: "日式咖喱", tags: ["咖喱", "米饭"], priceLevel: 2 },
      { id: "izakaya", name: "居酒屋", tags: ["小酒", "烧鸟"], priceLevel: 3 },
      { id: "korean-fried-chicken", name: "韩式炸鸡", tags: ["炸鸡", "甜辣"], spicyLevel: 1, priceLevel: 2 },
      { id: "bibimbap", name: "石锅拌饭", tags: ["拌饭", "韩式辣酱"], spicyLevel: 1, priceLevel: 1 },
    ],
  },
  {
    id: "western-international",
    name: "西餐异国",
    imageId: "photo-1565299507177-b0ac66763828",
    scene: "适合想吃西式主食或异国香料风味的时候",
    options: [
      { id: "burger", name: "汉堡", tags: ["牛肉饼", "快餐"], priceLevel: 2 },
      { id: "pizza", name: "披萨", tags: ["芝士", "分享"], priceLevel: 2 },
      { id: "steak", name: "牛排", tags: ["扒类", "约会"], priceLevel: 3 },
      { id: "pasta", name: "意大利面", tags: ["意面", "西式"], priceLevel: 2 },
      { id: "southeast-asian", name: "东南亚菜", tags: ["香料", "酸辣"], spicyLevel: 1, priceLevel: 2 },
      { id: "indian", name: "印度菜", tags: ["咖喱", "香料"], spicyLevel: 1, priceLevel: 2 },
    ],
  },
  {
    id: "drinks-desserts",
    name: "饮品甜点",
    imageId: "photo-1551024506-0bccd828d307",
    scene: "适合下午茶、饭后收尾或者单纯奖励自己",
    options: [
      { id: "milk-fruit-tea", name: "奶茶果茶", tags: ["茶饮", "解馋"], priceLevel: 1 },
      { id: "coffee", name: "咖啡", tags: ["提神", "咖啡馆"], priceLevel: 2 },
      { id: "juice", name: "果汁", tags: ["水果", "清爽"], priceLevel: 1 },
      { id: "chinese-dessert-soup", name: "糖水", tags: ["广式甜品", "清润"], priceLevel: 1 },
      { id: "bakery", name: "面包烘焙", tags: ["面包", "早餐"], priceLevel: 2 },
      { id: "cakes-desserts", name: "蛋糕甜品", tags: ["蛋糕", "下午茶"], priceLevel: 2 },
      { id: "ice-cream", name: "冰淇淋", tags: ["冰品", "甜味"], priceLevel: 2 },
    ],
  },
];

export const builtInCategories: FoodCategory[] = categorySeeds.map(
  (seed, index) => ({
    id: `category-${seed.id}`,
    name: seed.name,
    sortOrder: index,
    status: "active",
    source: "system",
  }),
);

const categoryBySeedId = new Map(
  builtInCategories.map((categoryRecord, index) => [
    categorySeeds[index].id,
    categoryRecord,
  ]),
);

export const builtInOptions: FoodOption[] = categorySeeds.flatMap((seed) => {
  const categoryRecord = categoryBySeedId.get(seed.id);
  if (!categoryRecord) return [];

  return seed.options.map((optionSeed, index) => ({
    id: `option-${optionSeed.id}`,
    categoryId: categoryRecord.id,
    categoryName: categoryRecord.name,
    parentOptionId: null,
    name: optionSeed.name,
    path: [categoryRecord.name, optionSeed.name],
    imageUrl: image(seed.imageId),
    tags: [optionSeed.name, categoryRecord.name, ...(optionSeed.tags ?? [])],
    description: `${optionSeed.name}是${categoryRecord.name}里的常见选择，${seed.scene}。`,
    spicyLevel: optionSeed.spicyLevel,
    priceLevel: optionSeed.priceLevel ?? 2,
    selectable: true,
    sortOrder: index,
    status: "active",
    source: "system",
  }));
});
