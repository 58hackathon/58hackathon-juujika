# フロントエンド TS/TSX コード解説

このドキュメントは、`frontend/src` 配下の画面・コンポーネント・簡易ルーティングに関わる TypeScript / TSX ファイルを、中級者向けにファイル単位で解説するものです。

対象は実際の UI 構成に直接関わる 11 ファイルです。`features/` 配下の API・型・ダミーデータ、`vite-env.d.ts`、`vite.config.ts` は、このドキュメントでは個別解説の対象外にしています。ただし、各画面から利用されている API や型については必要に応じて触れます。

## 対象ファイル

```txt
frontend/src/main.tsx
frontend/src/App.tsx
frontend/src/routes/screenTypes.ts
frontend/src/components/AppNav.tsx
frontend/src/components/ItemCard.tsx
frontend/src/screens/HomeScreen.tsx
frontend/src/screens/ItemDetailScreen.tsx
frontend/src/screens/CreateItemScreen.tsx
frontend/src/screens/TradeRequestScreen.tsx
frontend/src/screens/MyPageScreen.tsx
frontend/src/screens/AiProposalScreen.tsx
```

## 全体像

このフロントエンドは、React Router のような外部ルーティングライブラリを使わず、`App.tsx` の `currentScreen` state で表示する画面を切り替えています。

大まかな流れは次の通りです。

```txt
main.tsx
  ↓ React アプリを起動
App.tsx
  ↓ currentScreen で画面を切り替える
HomeScreen / CreateItemScreen / MyPageScreen / AiProposalScreen / ItemDetailScreen
  ↓ 必要に応じて
ItemCard / AppNav
  ↓ 必要に応じて
features/items/itemApi.ts などからデータ取得
```

ポイントは、画面遷移・お気に入り状態・選択中の商品といったアプリ全体に関わる状態を `App.tsx` が持ち、各画面には props として渡していることです。各画面は、自分の画面内だけで完結する検索文字、フォーム入力、取得済みデータなどをローカル state として持っています。

---

## 1. `frontend/src/main.tsx`

### 役割

React アプリケーションの起動地点です。HTML 側の `#root` 要素に `App` コンポーネントを差し込み、グローバル CSS もここで読み込みます。

### 主要コード

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import "./styles/theme.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### 何をどう実現しているか

`createRoot(document.getElementById("root")!)` で、`index.html` にある `id="root"` の DOM 要素を React の描画先にしています。末尾の `!` は TypeScript の non-null assertion で、「ここでは `root` が必ず存在する」とコンパイラに伝えています。

`<React.StrictMode>` は開発時に副作用や非推奨な書き方を見つけやすくするためのラッパーです。本番 UI を直接変えるものではありませんが、開発環境では `useEffect` が確認目的で複数回実行されることがあります。

`globals.css` と `theme.css` はアプリ全体に効くスタイルです。個別画面の CSS は各コンポーネント側で import されていますが、全体のリセットやテーマ変数はこの起動地点で読み込む構成になっています。

### 読み解くポイント

このファイルには画面ロジックはありません。アプリの本体は `App.tsx` から始まります。`main.tsx` は「React を DOM に接続するための入口」と考えると分かりやすいです。

---

## 2. `frontend/src/App.tsx`

### 役割

アプリ全体の画面切り替え、選択中の商品、お気に入り一覧を管理する親コンポーネントです。このプロジェクトにおける簡易ルーターの役割も担っています。

### 主要コード

```tsx
const [currentScreen, setCurrentScreen] = useState<Screen>("home");
const [selectedItem, setSelectedItem] = useState<Item | null>(null);
const [favoriteItemIds, setFavoriteItemIds] = useState<string[]>([]);
```

### 何をどう実現しているか

`currentScreen` は現在表示している画面を表す state です。初期値は `"home"` なので、アプリ起動直後は商品一覧画面が表示されます。型は `Screen` なので、`"home"` や `"createItem"` など、定義済みの画面名だけを入れられます。

`selectedItem` は商品詳細画面に渡すための商品データです。`null` のときは選択中の商品がない状態、`Item` が入っているときはその商品を詳細表示できます。

`favoriteItemIds` はお気に入り済みの商品 ID だけを配列で持っています。商品オブジェクト全体を持つのではなく ID だけを持つことで、一覧データとの対応が取りやすくなっています。

### 画面遷移の実装

```tsx
const handleNavigate = (screen: Screen) => {
  setCurrentScreen(screen);
  setSelectedItem(null);
};
```

ナビゲーションから画面を移動するときは `currentScreen` を更新します。同時に `selectedItem` を `null` に戻しているため、詳細画面用の古い選択状態が残りにくくなっています。

商品一覧から詳細へ移動する処理は、`HomeScreen` に渡している `onSelectItem` で行われます。

```tsx
<HomeScreen
  onSelectItem={async (itemId) => {
    const item = await getItemById(itemId);
    if (!item) return;

    setSelectedItem(item);
    setCurrentScreen("itemDetail");
  }}
  ...
/>
```

ここでは、子コンポーネントの `HomeScreen` や `ItemCard` は「商品 ID が選ばれた」ことだけを親へ伝えます。実際に商品詳細データを取得し、詳細画面へ切り替える責務は親である `App.tsx` が持っています。

### お気に入りの実装

```tsx
const handleToggleFavorite = (itemId: string) => {
  setFavoriteItemIds((currentIds) => {
    if (currentIds.includes(itemId)) {
      return currentIds.filter((currentId) => currentId !== itemId);
    }

    return [...currentIds, itemId];
  });
};
```

`setFavoriteItemIds` に関数を渡しているのがポイントです。これは React の functional update と呼ばれる書き方で、更新前の最新 state を `currentIds` として受け取れます。

すでに ID が含まれていれば `filter` で外し、含まれていなければ spread 構文で追加します。元の配列を直接変更せず、新しい配列を返しているため、React が state の変更を検知できます。

### 条件付きレンダリング

```tsx
{currentScreen === "home" && (
  <HomeScreen ... />
)}

{currentScreen === "itemDetail" && selectedItem && (
  <ItemDetailScreen item={selectedItem} ... />
)}
```

`currentScreen` の値に応じて表示する画面コンポーネントを切り替えています。React Router ではなく、state と条件式で画面を出し分ける構成です。

`itemDetail` では `selectedItem` も条件に入っています。これにより、商品データがないのに詳細画面を描画する事故を防いでいます。

### ナビゲーションの表示制御

```tsx
{currentScreen !== "itemDetail" && (
  <AppNav
    currentScreen={currentScreen}
    onNavigate={handleNavigate}
  />
)}
```

商品詳細画面では `AppNav` を非表示にしています。詳細画面では専用の「戻る」ボタンを使わせたい設計だと読み取れます。

### 注意点

`Screen` 型には `"tradeRequest"` と `"requestDetail"` がありますが、現在の `App.tsx` にはそれらを表示する条件分岐がありません。また、`TradeRequestScreen.tsx` も空ファイルです。交換申請画面は型や構想はあるものの、現時点では未接続の状態です。

---

## 3. `frontend/src/routes/screenTypes.ts`

### 役割

アプリ内で使える画面名を TypeScript の union type として定義しています。

### 主要コード

```ts
export type Screen =
  | "home"
  | "itemDetail"
  | "tradeRequest"
  | "requestList"
  | "requestDetail"
  | "createItem"
  | "myPage"
  | "aiProposal";
```

### 何をどう実現しているか

`Screen` は文字列リテラル型の union です。`currentScreen` や `onNavigate` の引数にこの型を使うことで、画面名の打ち間違いをコンパイル時に検出できます。

たとえば、`"mypage"` のように小文字違いで書くと `Screen` 型に含まれていないためエラーになります。画面数が増えるほど、このような型定義は安全性を上げます。

### 読み解くポイント

このファイルは「画面名の辞書」です。新しい画面を追加する場合は、ここに画面名を足すだけでなく、`App.tsx` の条件付きレンダリングや `AppNav.tsx` の `navItems` も合わせて更新する必要があります。

---

## 4. `frontend/src/components/AppNav.tsx`

### 役割

画面下部または共通位置に表示されるメインナビゲーションです。商品一覧、出品、リクエスト、AI提案、マイページへ移動するための UI を提供します。

### props の設計

```tsx
type AppNavProps = {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
};
```

`currentScreen` は現在アクティブな画面を判定するために使います。`onNavigate` はボタンが押されたときに親の `App.tsx` へ移動先を伝えるためのコールバックです。

### ナビ項目の定義

```tsx
const navItems: { screen: Screen; label: string }[] = [
  { screen: "home", label: "商品一覧" },
  { screen: "createItem", label: "出品" },
  { screen: "requestList", label: "リクエスト" },
  { screen: "aiProposal", label: "AI提案"},
];
```

配列としてナビ項目を持ち、それを JSX 内で `map` しています。これにより、ボタンを個別に何個も書くよりも、項目の追加・削除がしやすくなっています。

`screen` は `Screen` 型なので、ここでも画面名のミスを TypeScript がチェックできます。

### アクティブ表示の実装

```tsx
className={
  currentScreen === item.screen
    ? "app-nav__item app-nav__item--active"
    : "app-nav__item"
}
```

現在の画面とボタンの画面名が一致したら、`--active` の modifier class を追加しています。状態は React の state、見た目は CSS class で分離する、よく使われる実装パターンです。

### 画面遷移の実装

```tsx
onClick={() => onNavigate(item.screen)}
```

ボタンがクリックされたら、自分で `setCurrentScreen` は呼ばず、親から受け取った `onNavigate` を呼びます。このコンポーネントは「どの画面へ移動したいか」を通知するだけで、アプリ全体の state 管理は `App.tsx` に任せています。

### マイページボタン

```tsx
<button
  aria-label="マイページ"
  className={
    currentScreen === "myPage"
      ? "app-nav__profile app-nav__profile--active"
      : "app-nav__profile"
  }
  onClick={() => onNavigate("myPage")}
  type="button"
>
  <img className="app-nav__profile-image" src="/images/demo/e10821c74b533d465ba888ea66daa30f.jpg" alt="profile-image" />
</button>
```

マイページは通常のテキストボタンではなく、プロフィール画像のボタンとして実装されています。`aria-label` があるため、画像だけのボタンでもスクリーンリーダーに目的を伝えられます。

---

## 5. `frontend/src/components/ItemCard.tsx`

### 役割

商品一覧に表示する 1 商品分のカード UI です。商品画像、状態、カテゴリ、タイトル、希望アイテム、出品者、価格、お気に入りボタンを表示します。

### props の設計

```tsx
type ItemCardProps = {
  item: Item;
  onSelectItem: (itemId: string) => void;
  isFavorite: boolean;
  onToggleFavorite: (itemId: string) => void;
};
```

`item` は表示対象の商品データです。`onSelectItem` はカード本体が選択されたときに商品 ID を親へ通知します。

`isFavorite` と `onToggleFavorite` はお気に入り状態の表示と切り替えに使います。お気に入り状態そのものは `App.tsx` が管理しているため、`ItemCard` は props をもとに見た目を切り替えるだけです。

### ステータス表示

```tsx
const statusLabel = {
  available: "募集中",
  trading: "交渉中",
  completed: "成立",
}[item.status];
```

商品の `status` は内部データとして `"available"` などの英語キーで持っています。UI に表示するときは日本語ラベルへ変換しています。

この書き方は、オブジェクトを辞書のように使って `item.status` に対応するラベルを取り出すパターンです。ステータスが増える場合は、この対応表も更新する必要があります。

### カード全体をクリック可能にする実装

```tsx
<article
  className="item-card"
  onClick={() => onSelectItem(item.id)}
  onKeyDown={handleCardKeyDown}
  role="button"
  tabIndex={0}
>
```

`article` をカードとして使いながら、クリック時に `onSelectItem(item.id)` を呼んで詳細画面へつなげています。

`role="button"` と `tabIndex={0}` を付けることで、キーボード操作でもフォーカス可能な疑似ボタンとして扱えるようにしています。

### キーボード操作

```tsx
const handleCardKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
  if (event.target !== event.currentTarget) return;

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onSelectItem(item.id);
  }
};
```

Enter または Space キーでカードを選択できるようにしています。

`event.target !== event.currentTarget` の判定は、カード内の子要素から発生したキーイベントを拾いすぎないためのガードです。イベントがカード自身から発生したときだけ詳細へ移動します。

### お気に入りボタンとイベント伝播の制御

```tsx
const handleFavoriteClick = (event: React.MouseEvent<HTMLButtonElement>) => {
  event.stopPropagation();
  onToggleFavorite(item.id);
};
```

カード全体にも `onClick` があり、お気に入りボタンにも `onClick` があります。そのままにすると、お気に入りボタンを押したときにカード本体のクリックも発火して、詳細画面へ遷移してしまいます。

そこで `event.stopPropagation()` を呼び、クリックイベントが親の `article` まで伝播しないようにしています。その上で `onToggleFavorite(item.id)` を呼び、お気に入り状態だけを切り替えます。

### お気に入り数の表示

```tsx
const favoriteCount = item.likes + (isFavorite ? 1 : 0);
```

元の商品データに入っている `likes` に、現在のユーザーがこの場でお気に入りした分を加算しています。バックエンドへ永続化しているわけではなく、ローカル state の `isFavorite` に応じて見た目上の数を調整しています。

---

## 6. `frontend/src/screens/HomeScreen.tsx`

### 役割

商品一覧のメイン画面です。商品データの取得、検索、カテゴリ絞り込み、商品カード一覧の表示、マイページへの入口を担当します。

### props の設計

```tsx
type HomeScreenProps = {
  onSelectItem: (itemId: string) => void;
  onOpenMyPage: () => void;
  favoriteItemIds: string[];
  onToggleFavorite: (itemId: string) => void;
};
```

`HomeScreen` 自身は、商品を選んだ後にどの画面へ行くかを知りません。`onSelectItem` で商品 ID を親へ渡すだけです。

お気に入り状態も `HomeScreen` が所有せず、`favoriteItemIds` と `onToggleFavorite` を受け取って `ItemCard` へ流しています。

### 画面内 state

```tsx
const [activeCategory, setActiveCategory] = useState("すべて");
const [searchText, setSearchText] = useState("");
const [items, setItems] = useState<Item[]>([]);
```

`activeCategory` はカテゴリボタンで選ばれている値、`searchText` は検索欄の入力値、`items` は API から取得した商品一覧です。

これらはホーム画面内で完結する状態なので、`App.tsx` ではなく `HomeScreen` が持っています。

### 商品取得

```tsx
useEffect(() => {
  const loadItems = async () => {
    const itemsFromApi = await getItems();
    setItems(itemsFromApi);
  };

  loadItems();
}, []);
```

`useEffect` の依存配列が `[]` なので、コンポーネントが初めて表示されたタイミングで商品一覧を取得します。

`getItems()` は `features/items/itemApi.ts` にあり、バックエンド API への fetch と、API に接続できない場合のデモデータ fallback を担当しています。画面側は `getItems()` の中身を意識せず、`Item[]` が返るものとして扱っています。

### 検索とカテゴリ絞り込み

```tsx
const filteredItems = items.filter((item) => {
  const matchesCategory =
    activeCategory === "すべて" || item.category === activeCategory;
  const matchesSearch =
    item.title.includes(searchText) ||
    item.wantedItem.includes(searchText) ||
    item.description.includes(searchText);

  return matchesCategory && matchesSearch;
});
```

`filteredItems` は state ではなく、`items`、`activeCategory`、`searchText` から毎回計算される派生データです。

カテゴリは `"すべて"` のとき全件表示、それ以外は `item.category` と一致するものだけに絞ります。検索はタイトル、希望アイテム、説明文のいずれかに検索文字が含まれていれば一致とみなします。

### 入力フォーム

```tsx
<input
  aria-label="アイテムを検索"
  className="home-screen__search-input"
  onChange={(event) => setSearchText(event.target.value)}
  placeholder="スニーカー、バッグなど"
  type="search"
  value={searchText}
/>
```

`value={searchText}` と `onChange={...}` をセットにした controlled input です。入力欄の表示値は React state と同期しており、文字を入力するたびに `searchText` が更新されます。

### カテゴリボタン

```tsx
{categories.map((category) => (
  <button
    className={
      category === activeCategory
        ? "home-screen__category home-screen__category--active"
        : "home-screen__category"
    }
    key={category}
    onClick={() => setActiveCategory(category)}
    type="button"
  >
    {category}
  </button>
))}
```

カテゴリ配列を `map` してボタンを生成しています。現在選択中のカテゴリだけ `--active` class を付け、見た目を切り替えます。

### 商品カードへのデータ受け渡し

```tsx
{filteredItems.map((item) => (
  <ItemCard
    key={item.id}
    item={item}
    isFavorite={favoriteItemIds.includes(item.id)}
    onSelectItem={onSelectItem}
    onToggleFavorite={onToggleFavorite}
  />
))}
```

`ItemCard` に商品データとイベントハンドラを渡しています。`isFavorite` は `favoriteItemIds` にその商品の ID が含まれているかで判定します。

ここでも、ホーム画面はお気に入り state を直接更新しません。最終的な更新は `App.tsx` の `handleToggleFavorite` が担当します。

### 空状態

```tsx
{filteredItems.length > 0 ? (
  <div className="home-screen__grid">...</div>
) : (
  <div className="home-screen__empty">
    <p>該当するアイテムがありません</p>
    <span>検索ワードやカテゴリを変えてみてください。</span>
  </div>
)}
```

検索やカテゴリ条件に合う商品がない場合は、空状態のメッセージを表示します。データがないケースを UI として明示しているため、画面が突然空白になるのを防いでいます。

---

## 7. `frontend/src/screens/ItemDetailScreen.tsx`

### 役割

選択した商品の詳細情報を表示する画面です。商品画像、カテゴリ、タイトル、価格、説明、希望アイテム、出品者を表示し、戻るボタンで一覧へ戻ります。

### props の設計

```tsx
type ItemDetailScreenProps = {
  item: Item;
  onBack: () => void;
};
```

`item` は詳細表示する商品データです。`onBack` は戻るボタンが押されたときに親へ通知するコールバックです。

### 何をどう実現しているか

```tsx
function ItemDetailScreen({ item, onBack }: ItemDetailScreenProps) {
  return (
    <section className="item-detail-screen">
      <button className="item-detail-screen__back" onClick={onBack} type="button">
        戻る
      </button>

      <img className="item-detail-screen__image" src={item.imageUrl} alt={item.title} />

      <div className="item-detail-screen__body">
        <p className="item-detail-screen__category">{item.category}</p>
        <h1>{item.title}</h1>
        <p className="item-detail-screen__price">¥{item.price.toLocaleString()}</p>
        <p>{item.description}</p>
        <p>希望: {item.wantedItem}</p>
        <p>出品者: {item.ownerName}</p>
      </div>
    </section>
  );
}
```

このコンポーネントは state を持たない presentational component です。受け取った `item` をそのまま表示し、戻る操作も `onBack` を呼ぶだけです。

価格は `item.price.toLocaleString()` で桁区切りにしています。たとえば `12000` は `12,000` のように表示されます。

### 読み解くポイント

詳細画面に必要な商品取得や、戻るときの画面切り替えは `App.tsx` が担当しています。このファイルは「表示に専念する画面」として責務が小さく保たれています。

---

## 8. `frontend/src/screens/CreateItemScreen.tsx`

### 役割

商品を出品するフォーム画面です。画像選択、商品情報入力、交換希望タグ選択、入力状況に応じたステッパー表示、送信処理、完了モーダルを担当します。

### props の設計

```tsx
type CreateItemScreenProps = {
  onItemCreated: () => void;
};
```

`onItemCreated` は出品完了後に「商品一覧へ」ボタンを押したとき、親へ画面遷移を依頼するためのコールバックです。

### 入力 state

```tsx
const [photoUrl, setPhotoUrl] = useState<string | null>(null);
const [itemName, setItemName] = useState("");
const [category, setCategory] = useState("");
const [condition, setCondition] = useState("");
const [comment, setComment] = useState("");
const [isSubmitting, setIsSubmitting] = useState(false);
const [isComplete, setIsComplete] = useState(false);
const [selectedWantedItems, setSelectedWantedItems] = useState<string[]>([]);
```

フォーム入力値を React state として持っています。`photoUrl` は画像プレビュー用、`itemName`、`category`、`condition`、`comment` は入力値、`selectedWantedItems` は交換希望タグの選択状態です。

`isSubmitting` は送信中の二重送信防止とボタン表示に使います。`isComplete` は出品完了モーダルを表示するための state です。

### 画像プレビュー

```tsx
const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const imageUrl = URL.createObjectURL(file);
  setPhotoUrl(imageUrl);
};
```

ファイル入力から最初のファイルを取り出し、`URL.createObjectURL(file)` でブラウザ内だけで使える一時 URL を作っています。この URL を `img` の `src` に指定することで、アップロード前でも選択画像のプレビューを表示できます。

### 交換希望タグの排他制御

```tsx
const handleWantedToggle = (wantedItem: string) => {
  if (wantedItem === "なんでもOK!") {
    setSelectedWantedItems(["なんでもOK!"]);
    return;
  }

  const withoutAnythingOk = selectedWantedItems.filter(
    (item) => item !== "なんでもOK!"
  );

  if (withoutAnythingOk.includes(wantedItem)) {
    setSelectedWantedItems(
      withoutAnythingOk.filter((item) => item !== wantedItem)
    );
    return;
  }

  setSelectedWantedItems([...withoutAnythingOk, wantedItem]);
};
```

`"なんでもOK!"` は他のタグと同時選択しない特別な選択肢として扱われています。

`"なんでもOK!"` が押されたら、選択状態をそれだけにします。それ以外のタグが押された場合は、まず `"なんでもOK!"` を除外した配列を作ります。そのタグがすでに選ばれていれば外し、未選択なら追加します。

この処理により、次のルールが実現されています。

- `"なんでもOK!"` を選ぶと他の希望条件は消える
- 他の希望条件を選ぶと `"なんでもOK!"` は消える
- 通常タグは複数選択できる

### 入力完了判定

```tsx
const hasPhoto = photoUrl !== null;
const hasBasicInfo =
  itemName.trim() !== "" &&
  category !== "" &&
  condition !== "" &&
  comment.trim() !== "";
const hasWantedItems = selectedWantedItems.length > 0;
const isReadyToSubmit = hasPhoto && hasBasicInfo && hasWantedItems;
```

フォーム送信できるかどうかを、入力 state から派生する boolean として計算しています。

`trim()` を使っているため、空白だけの入力は未入力扱いになります。`isReadyToSubmit` が `false` の間は送信ボタンが disabled になります。

### ステッパー表示

```tsx
const activeStep = isComplete
  ? 4
  : hasPhoto
    ? hasBasicInfo
      ? hasWantedItems
        ? 4
        : 3
      : 2
    : 1;
```

現在どの入力段階にいるかを `activeStep` として計算しています。

写真があればステップ 2、基本情報まで入っていればステップ 3、交換希望まで入っていればステップ 4、完了済みならステップ 4 という流れです。

### className を組み立てるヘルパー

```tsx
const getStepClassName = (step: number) => {
  const classNames = ["create-stepper__item"];

  if (activeStep === step) {
    classNames.push("create-stepper__item--active");
  }

  if (isComplete || activeStep > step) {
    classNames.push("create-stepper__item--done");
  }

  return classNames.join(" ");
};
```

ステップごとの状態に応じて CSS class を動的に組み立てています。基本 class を配列に入れ、条件に応じて modifier class を追加し、最後に `join(" ")` で文字列にしています。

同じ判定を JSX 内に何度も書くのではなく、関数に切り出しているため、ステッパー部分の JSX が読みやすくなっています。

### 送信処理

```tsx
const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  if (!isReadyToSubmit || isSubmitting) return;

  setIsSubmitting(true);

  const formData = new FormData(event.currentTarget);

  await createItem({
    title: String(formData.get("itemName") ?? ""),
    category: String(formData.get("category") ?? ""),
    description: String(formData.get("comment") ?? ""),
    wantedItem: selectedWantedItems.join("、"),
    imageUrl: photoUrl ?? "/images/demo/generated/reading-card-500.png",
  });

  setIsComplete(true);
  setIsSubmitting(false);
};
```

`event.preventDefault()` でブラウザ標準のフォーム送信を止め、React 側で送信処理を行います。

`!isReadyToSubmit || isSubmitting` のガードにより、未入力状態や送信中の再送信を防いでいます。

`FormData` からフォーム入力値を取り出し、`createItem()` に渡しています。交換希望は複数選択の配列なので、`join("、")` で日本語の区切り文字を使った文字列に変換しています。

送信が終わると `isComplete` を `true` にして完了モーダルを表示し、`isSubmitting` を `false` に戻します。

### controlled form

```tsx
<input
  id="itemName"
  name="itemName"
  onChange={(event) => setItemName(event.target.value)}
  type="text"
  value={itemName}
/>
```

商品名、カテゴリ、状態、コメントは、入力値を state で管理する controlled component として実装されています。UI の表示値と React state が常に一致するため、入力完了判定やステッパー更新に使いやすくなっています。

### 完了モーダル

```tsx
{isComplete && (
  <div className="create-complete" role="dialog" aria-modal="true" aria-labelledby="createCompleteTitle">
    ...
    <button
      className="create-complete__primary"
      onClick={onItemCreated}
      type="button"
    >
      商品一覧へ
    </button>
  </div>
)}
```

`isComplete` が `true` のときだけ完了モーダルを表示します。`role="dialog"` と `aria-modal="true"` により、モーダル UI であることを支援技術へ伝えています。

「商品一覧へ」ボタンは `onItemCreated` を呼びます。実際にどの画面へ戻るかは親の `App.tsx` が決めています。

### 注意点

`condition` は入力完了判定には使われていますが、現在の `createItem()` 呼び出しには渡していません。商品状態をバックエンドや一覧表示にも反映したい場合は、API の入力型と `Item` 型の設計も含めて拡張が必要です。

また、`URL.createObjectURL` で作った URL は、厳密には不要になったタイミングで `URL.revokeObjectURL` するとメモリ管理がより丁寧になります。

---

## 9. `frontend/src/screens/TradeRequestScreen.tsx`

### 役割

交換申請画面用のファイルですが、現時点では 0 行の空ファイルです。コンポーネント、props、export はまだ定義されていません。

### 現在実現している機能

現在このファイル自体が実現している UI 機能はありません。

`screenTypes.ts` には `"tradeRequest"` が定義されていますが、`App.tsx` では `TradeRequestScreen` を import しておらず、`currentScreen === "tradeRequest"` の条件分岐もありません。そのため、画面としては未接続です。

### 今後実装する場合の接続イメージ

交換申請画面を実装する場合は、少なくとも次の作業が必要です。

- `TradeRequestScreen.tsx` に React コンポーネントを定義する
- 必要な props を決める
- `App.tsx` で import する
- `currentScreen === "tradeRequest"` の条件分岐を追加する
- 商品詳細や一覧から `setCurrentScreen("tradeRequest")` する導線を作る
- `features/tradeRequests/tradeRequestApi.ts` の API 関数と接続する

空ファイルであること自体はエラーではありませんが、どこかから import しようとすると default export がないため実装が必要になります。

---

## 10. `frontend/src/screens/MyPageScreen.tsx`

### 役割

ユーザーのマイページ画面です。自分の出品、お気に入り、受信した交換リクエストをまとめて表示します。

### props の設計

```tsx
type MyPageScreenProps = {
  favoriteItemIds: string[];
  onBack: () => void;
};
```

お気に入り一覧は `App.tsx` が持つ `favoriteItemIds` を受け取って作ります。戻るボタンは `onBack` を呼び、親に画面遷移を任せています。

### 現在ユーザーの扱い

```tsx
const currentUserId = "current_user";
```

ログイン機能がまだないため、現在のユーザー ID を固定値で扱っています。`item.ownerId` や `request.receiverId` と比較することで、自分に関係するデータを抽出しています。

### データ取得

```tsx
useEffect(() => {
  const loadMyPageData = async () => {
    const [itemsFromApi, requestsFromApi] = await Promise.all([
      getItems(),
      getTradeRequests(),
    ]);

    setItems(itemsFromApi);
    setTradeRequests(requestsFromApi);
  };

  loadMyPageData();
}, []);
```

商品一覧と交換リクエスト一覧を並列で取得しています。`Promise.all` を使うことで、片方の取得完了を待ってからもう片方を開始するのではなく、同時に開始できます。

取得後は `items` と `tradeRequests` の state に保存し、画面表示用の派生データを作ります。

### 派生データ

```tsx
const myItems = items.filter((item) => item.ownerId === currentUserId);
const favoriteItems = items.filter((item) => favoriteItemIds.includes(item.id));
const receivedRequests = tradeRequests.filter(
  (request) => request.receiverId === currentUserId
);
const visibleRequests =
  receivedRequests.length > 0 ? receivedRequests : tradeRequests.slice(0, 3);
```

`myItems` は自分が出品した商品、`favoriteItems` はお気に入り ID に含まれる商品、`receivedRequests` は自分宛ての交換リクエストです。

`visibleRequests` は、自分宛てのリクエストがあればそれを表示し、なければデモ用に最初の 3 件を表示します。発表やデモで画面が空になりすぎないようにする意図が読み取れます。

### 統計表示

```tsx
<div className="my-page-screen__stats">
  <div>
    <span>{myItems.length}</span>
    <p>出品中</p>
  </div>
  <div>
    <span>{favoriteItems.length}</span>
    <p>お気に入り</p>
  </div>
  <div>
    <span>{visibleRequests.length}</span>
    <p>受信リクエスト</p>
  </div>
</div>
```

派生データの件数をそのまま統計として表示しています。state を別に増やさず、既存データから表示値を計算している点がシンプルです。

### 各セクションの条件付きレンダリング

```tsx
{myItems.length > 0 ? (
  <div className="my-page-list">
    {myItems.map((item) => (
      <article className="my-page-item" key={item.id}>...</article>
    ))}
  </div>
) : (
  <p className="my-page-empty">まだ出品した商品はありません。</p>
)}
```

自分の出品、お気に入り、受信リクエストの各セクションで、データがある場合はリスト、ない場合は空状態メッセージを表示します。

### ステータスラベル変換

```tsx
function getItemStatusLabel(status: Item["status"]): string {
  const labels = {
    available: "募集中",
    trading: "交渉中",
    completed: "成立",
  };

  return labels[status];
}
```

`Item["status"]` は `Item` 型の `status` プロパティの型を参照する TypeScript の書き方です。`ItemStatus` を別 import しなくても、`Item` の定義と同期した型を使えます。

交換リクエストも同じ考え方で、`TradeRequest["status"]` を使って日本語ラベルへ変換しています。

### 読み解くポイント

`MyPageScreen` は、複数のデータソースをまとめて「表示用の派生データ」に変換している画面です。API から取った生データをそのまま表示するのではなく、現在ユーザーやお気に入り ID を基準に filter してから UI に渡しています。

---

## 11. `frontend/src/screens/AiProposalScreen.tsx`

### 役割

AI 交換提案機能の準備中画面です。現時点では、入力フォームや AI 通信はなく、将来的な機能の UI イメージを静的に表示しています。

### 主要コード

```tsx
function AiProposalScreen() {
  return (
    <section className="ai-proposal-screen">
      <header className="ai-proposal-screen__header">
        <p className="ai-proposal-screen__eyebrow">交換提案AI</p>
        <h1>欲しいものまでの道筋を探す</h1>
        <p>
          出品した商品と到達したい商品を選ぶと、AIが交換ルート候補を提案します。
        </p>
      </header>
      ...
    </section>
  );
}
```

### 何をどう実現しているか

このコンポーネントは state も props も持っていません。固定の JSX を返すだけの静的画面です。

```tsx
<div className="ai-proposal-board">
  <article className="ai-proposal-card ai-proposal-card--source">
    <span>1</span>
    <h2>出品した商品</h2>
    <p>自分の商品を選択</p>
  </article>

  <div className="ai-proposal-arrow">→</div>

  <article className="ai-proposal-card ai-proposal-card--goal">
    <span>2</span>
    <h2>欲しい商品</h2>
    <p>到達したい商品を選択</p>
  </article>
</div>
```

`source` と `goal` のカードを並べることで、「自分の商品から欲しい商品へ交換ルートを探す」という機能コンセプトを視覚化しています。

```tsx
<section className="ai-proposal-preview">
  <div>
    <p className="ai-proposal-preview__label">提案イメージ</p>
    <h2>3ステップで成立しやすいルート</h2>
    <p>価格差と相手の希望条件を見ながら、複数候補を比較します。</p>
  </div>
  <button type="button">準備中</button>
</section>
```

下部には提案結果のイメージと「準備中」ボタンを置いています。今はクリックしても何も起きません。

### 今後拡張する場合

AI 提案機能として動かすなら、次のような state と処理が必要になります。

- 自分の商品を選ぶ state
- 目標商品を選ぶ state
- 提案生成中かどうかの `isLoading`
- AI API の呼び出し関数
- 提案結果の配列 state
- エラー表示
- 「準備中」ではなく「提案する」ボタンのクリック処理

現在のファイルは、機能実装前の画面デザインの土台という位置づけです。

---

## 実装パターン別まとめ

### 親が持つ state と子が持つ state

`App.tsx` は画面遷移やお気に入りなど、複数画面で使う state を持っています。一方、`HomeScreen.tsx` の検索文字や `CreateItemScreen.tsx` のフォーム入力は、その画面だけで使うため各画面が持っています。

この分け方により、必要以上に state を上位へ持ち上げずに済んでいます。

### props callback による子から親への通知

`ItemCard` は自分で画面遷移せず、`onSelectItem(item.id)` を呼びます。`AppNav` も自分で state を変更せず、`onNavigate(screen)` を呼びます。

子コンポーネントは「何が起きたか」を通知し、親コンポーネントが「アプリ全体をどう変えるか」を決める構造です。

### 派生データを state にしない

`filteredItems`、`myItems`、`favoriteItems`、`isReadyToSubmit` などは、既存の state や props から計算できます。そのため別 state として持たず、レンダリング時に計算しています。

これは state の不整合を減らす良い設計です。たとえば `items` が変わったのに `filteredItems` の state を更新し忘れる、といったバグを避けられます。

### 条件付きレンダリング

画面切り替え、空状態、完了モーダル、アクティブ class など、多くの UI が条件式で制御されています。

このプロジェクトでは特に `&&` と三項演算子がよく使われています。

```tsx
{isComplete && <div className="create-complete">...</div>}

{filteredItems.length > 0 ? (
  <div className="home-screen__grid">...</div>
) : (
  <div className="home-screen__empty">...</div>
)}
```

### 型で画面名やデータ構造を守る

`Screen`、`Item`、`TradeRequest` といった型により、画面名や API データの構造を TypeScript がチェックできます。

特に `Screen` は簡易ルーティングの中心なので、画面追加時には `screenTypes.ts`、`App.tsx`、`AppNav.tsx` をセットで確認すると安全です。

