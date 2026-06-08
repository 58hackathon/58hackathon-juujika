import type { Item } from "./itemTypes";

export const demoItems: Item[] = [
  {
    id: "item_1",
    title: "NIKE エアフォース1",
    description: "数回しか履いていません。大切に使ってくれる人に譲りたいです。",
    ownerId: "user_1",
    ownerName: "haru_03",
    wantedItem: "スニーカー、バッグ、アクセサリー",
    category: "ファッション",
    status: "available",
    imageUrl: "/images/demo/air-force-1.png",
    likes: 72,
    createdAt: "2026-06-08T10:00:00.000Z",
  },
  {
    id: "item_2",
    title: "レザーショルダーバッグ",
    description: "通学で使っていました。小物と交換できたらうれしいです。",
    ownerId: "user_2",
    ownerName: "mika_11",
    wantedItem: "腕時計、文房具、カフェチケット",
    category: "バッグ",
    status: "trading",
    imageUrl: "/images/demo/1-1.webp",
    likes: 34,
    createdAt: "2026-06-08T11:00:00.000Z",
  },
];

