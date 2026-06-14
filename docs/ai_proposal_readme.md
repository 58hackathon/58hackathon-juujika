# AI Proposal README

この文書は、Warashibe の AI 提案機能を中級者から専門家まで追えるようにまとめた実装ガイドです。画面の使い方ではなく、データフロー、候補生成、Gemini 連携、fallback、保存ルート、拡張ポイントを中心に説明します。

## 目的

AI提案機能は、ユーザーが選んだ「開始商品」から「到達したい商品」へ近づくための交換候補を提示する仕組みです。単発のおすすめではなく、交換ルートを段階的に作り、必要に応じて保存・申請・進捗管理までつなげることを狙っています。

現状の実装は、次の3層で構成されています。

```txt
UI
  frontend/src/screens/AiProposalScreen.tsx

Frontend AI adapter
  frontend/src/features/aiProposals/aiProposalApi.ts
  frontend/src/features/aiProposals/aiProposalTypes.ts

Backend suggestion service
  backend/src/controllers/tradeRequestController.ts
  backend/src/services/tradeRequestService.ts
  backend/src/models/tradeRequest.ts
```

## 重要な用語

```txt
開始商品 / sourceItem
  交換ルートの出発点。AI倉庫の商品から選ぶ。

到達したい商品 / goalItem
  ルートの目的地。現在はお気に入り登録済みの商品だけが候補になる。

候補商品 / candidateItem
  AIが次の交換先として評価する商品。原則として AI倉庫の商品。

AI倉庫
  listingType === "warehouse" かつ warehouseUseCase === "ai_route" の商品。

ルート
  source -> candidate(s) -> goal という交換ステップ列。

saved route
  ユーザーが保存したルート。localStorage に保存され、各ステップの申請状態を持つ。
```

## ユーザー体験

AI提案画面には2つのモードがあります。

```txt
ナビモード
  AIが次の交換候補を1件ずつ提示する。
  ユーザーは「ルートに追加」「別候補を見る」「ルートを保存」を選ぶ。

オートモード
  AIがルートを生成し、交換申請、承認、完了までを順番に自動実行する。
  実行中のステップ、進行ログ、一時停止/再開、リセットを持つ。
  実行状態は localStorage に保存される。
```

到達したい商品は `favoriteItemIds` から作るため、ユーザーがお気に入りにした商品だけがゴール候補になります。この制約は「本当に欲しい商品」へルートを作るためのフィルタです。

## フロントエンドのデータフロー

### 1. 商品一覧の取得

`AiProposalScreen` は初期表示時に `getItems()` を呼び、商品一覧を state に保持します。

```txt
getItems()
  -> items
  -> warehouseItems
  -> sourceItems / candidates
```

AI倉庫の判定は現状この条件です。

```ts
item.listingType === "warehouse" &&
item.warehouseUseCase === "ai_route"
```

注意: 一部の実装では `warehouseUseCases` という複数用途配列も使われています。AI提案画面は現時点で単数の `warehouseUseCase` を見ているため、完全に複数用途対応へ寄せる場合は `isAiWarehouseItem()` と `aiProposalApi.ts` の candidate filter を合わせて変更してください。

### 2. ゴール候補の作成

ゴール候補は全商品ではなく、お気に入り済み商品から作ります。

```txt
items + favoriteItemIds
  -> favoriteGoalItems
  -> guidedGoalItems / autoGoalItems
```

選択済みのゴールがあとからお気に入り解除された場合は、`useEffect` で未選択に戻します。

### 3. AIルート取得

開始商品とゴール商品が両方選ばれると、`getAiTradeRoutes()` が呼ばれます。

```txt
AiProposalScreen
  -> getAiTradeRoutes({
       sourceItemId,
       goalItemId,
       items,
       limit
     })
  -> /api/trade-requests/suggestions
  -> AiTradeRoute[]
```

ナビモードとオートモードは、開始商品・ゴール商品・AI取得結果を別々の state に持ちます。片方の選択変更がもう片方へ漏れない設計です。

## フロントエンド AI adapter

`frontend/src/features/aiProposals/aiProposalApi.ts` は、画面とバックエンド提案APIの間にある変換層です。

主な責務:

- AI倉庫の商品だけを candidateItems にする
- backend の suggestion 形式を frontend の `AiTradeRoute` に変換する
- API失敗時に mock route を作る
- score を 0-100 に正規化する

### リクエスト候補の作り方

```ts
input.items
  .filter((item) => item.id !== input.sourceItemId)
  .filter((item) => item.listingType === "warehouse")
  .filter((item) => item.warehouseUseCase === "ai_route")
  .filter((item) => item.status === "available")
```

その後、`goalItemId` と一致する候補があれば先頭に寄せます。ただし、ゴール商品が通常出品で AI倉庫ではない場合、backend の `candidateItems` には入りません。現状の Gemini 評価は「source と AI倉庫候補の相性」を主に見ており、goal は frontend の route 表示や mock route 生成で強く効きます。

### レスポンス変換

backend response:

```ts
{
  suggestions: [
    {
      itemId: string,
      title: string,
      score: number,
      reason: string
    }
  ],
  source: "gemini" | "fallback"
}
```

frontend route:

```ts
{
  id: string,
  title: string,
  matchScore: number,
  summary: string,
  source: "gemini" | "fallback" | "mock",
  steps: [
    sourceItem,
    suggestedItem
  ],
  traceReasons: string[]
}
```

`traceReasons` は説明可能性の足場です。現状 UI では全面的には出していませんが、デバッグ表示や管理者向け評価UIに流用できます。

## Backend suggestion API

AI提案は `POST /api/trade-requests/suggestions` を使います。

```txt
POST /api/trade-requests/suggestions
```

Request:

```json
{
  "targetItem": {
    "id": "item_1",
    "title": "USB-C充電ケーブル",
    "category": "家電",
    "description": "予備で持っていました。",
    "wantedItem": "モバイルバッテリー、イヤホン",
    "ownerName": "you"
  },
  "candidateItems": [
    {
      "id": "item_20",
      "title": "モバイルバッテリー",
      "category": "家電",
      "description": "充電確認済み",
      "wantedItem": "イヤホン、バッグ",
      "ownerName": "warehouse"
    }
  ],
  "limit": 4
}
```

Response:

```json
{
  "suggestions": [
    {
      "itemId": "item_20",
      "title": "モバイルバッテリー",
      "score": 88,
      "reason": "希望条件に家電カテゴリが含まれており、次の交換につなげやすい候補です。"
    }
  ],
  "source": "gemini"
}
```

命名上は `targetItem` ですが、現状 frontend では「現在の開始商品」を入れています。今後 `sourceItem` / `goalItem` / `candidateItems` の3要素へ API を分けると、専門家が読んでも意図がより明確になります。

## Gemini 連携

Gemini は `backend/src/services/tradeRequestService.ts` の `generateGeminiTradeSuggestions()` から呼びます。

必要な環境変数:

```env
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash
```

`GEMINI_MODEL` は省略可能です。値が `models/` で始まらない場合は、サービス側で `models/{model}` に正規化します。

接続先:

```txt
https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
```

generationConfig:

```ts
{
  temperature: 0.2,
  responseMimeType: "application/json",
  responseSchema: {
    type: "OBJECT",
    properties: {
      suggestions: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            itemId: { type: "STRING" },
            title: { type: "STRING" },
            score: { type: "NUMBER" },
            reason: { type: "STRING" }
          },
          required: ["itemId", "title", "score", "reason"]
        }
      }
    },
    required: ["suggestions"]
  }
}
```

低めの temperature にしているのは、候補選択の再現性を上げるためです。マーケット画面の提案では創造性より一貫性が重要なので、現状は妥当な設定です。

## Prompt 設計

現在の prompt は短く、候補を JSON で返すことを重視しています。

```txt
あなたは物々交換アプリの交換候補を選ぶAIです。
targetItemの希望条件に合うcandidateItemsをおすすめ順に選んでください。
scoreは0から100の数値、reasonは日本語で短く書いてください。
最大N件だけ返してください。
{input JSON}
```

専門家向けの改善余地:

- `sourceItem` と `goalItem` を明示的に分ける
- 価格差、カテゴリ距離、人気度、成立確率、配送負荷などの重みを prompt に渡す
- `reason` とは別に `risk` や `tradeOff` を返させる
- JSON schema に `confidence`、`routeRole`、`priceGapRate` を追加する
- prompt injection 対策として、商品説明は「ユーザー生成テキスト」と明示する

## Fallback の階層

AI提案には3段階の fallback があります。

```txt
1. Gemini
   GEMINI_API_KEY があり、Gemini が正常な JSON を返す場合。

2. Backend fallback
   APIキーなし、Geminiエラー、candidateなしなどで使用。
   カテゴリ・希望条件・商品名の単純スコアで suggestions を作る。

3. Frontend mock
   /api/trade-requests/suggestions 自体に到達できない場合。
   source / bridge / goal から擬似ルートを作る。
```

この構造により、バックエンドやGeminiが未設定でも画面開発を止めずに進められます。

## Backend fallback scoring

backend fallback は `scoreFallbackCandidate()` で評価します。

初期値:

```txt
score = 50
```

加点:

```txt
candidate.category が targetItem.wantedItem に含まれる: +30
candidate.title が targetItem.wantedItem に含まれる: +25
targetItem.category が candidate.wantedItem に含まれる: +15
```

最後に 0-100 に clamp します。理由文が空の場合は、汎用理由を入れます。

この fallback は軽くて説明しやすい一方、以下の限界があります。

- 日本語表記ゆれに弱い
- 価格帯を見ない
- 画像や状態を見ない
- ルート全体ではなく1ステップ候補を評価する
- `wantedItem` の自然文を単純な `includes()` で見ている

## Frontend local scoring

画面内の候補順序には `scoreCandidate()` も使われます。

```txt
likes / 10
+ categoryBonus
+ priceScore
+ routeUpBonus
```

主な要素:

- goal と candidate のカテゴリ一致
- source と candidate の価格差
- candidate が source 以上の価格か
- candidate の likes

Gemini / backend fallback だけに頼らず、画面側にも最低限の並び替えがあるため、APIが落ちた時もそれっぽい候補表示を維持できます。

## 保存済みルート

ナビモードではルートを保存できます。保存先は localStorage です。

```txt
storage key:
  warashibe.savedAiRoutes.{userId}

max:
  8 routes
```

保存される `SavedAiRoute` は以下を持ちます。

```txt
id
title
summary
matchScore
source
steps
createdAt
updatedAt
```

各 step は `ready -> requested -> approved -> completed` の状態を持ちます。

```txt
ready
  まだ交換申請していない

requested
  交換申請済み

approved
  承認済み

completed
  完了
```

`requested` 以降に進めると、`tradeRequestId` がある場合は `updateTradeRequestStatus()` を呼んで交換申請側の状態も更新します。

## 交換申請との接続

保存済みルートの各ステップから `createTradeRequest()` を呼びます。

```txt
fromItem -> offeredItem
toItem   -> targetItem
```

message:

```txt
{fromItem.title}との交換を希望しています。AI提案ルートの次ステップとして申請しました。
```

現在の frontend `tradeRequestApi.ts` は `/api/trade-requests` を優先して呼び、接続できない場合だけローカル fallback に切り替えます。オートモードの自動申請、承認、完了処理もこの API adapter を通ります。

## オートモードの自動実行モデル

オートモードは、フロントエンド内に `AutoRun` という実行モデルを持ちます。開始ボタンを押すと、AIルートから自動実行プランを作り、各ステップを順番に処理します。

実装済み:

- 目標商品選択
- 開始商品選択
- AIルートから自動実行ステップを生成
- `queued -> requested -> approved -> completed` の自動遷移
- `createTradeRequest()` による交換申請作成
- `updateTradeRequestStatus()` による承認・完了処理
- 実行ログ保存
- 一時停止 / 再開
- リセット
- 高額候補の通知文
- localStorage への実行状態保存

現状の責務:

```txt
AutoRun
  1回の完全自動交換セッション。

AutoRunStep
  fromItem -> toItem の1交換。

AutoRunLog
  自動処理の監査ログ。
```

保存先:

```txt
warashibe.autoAiRun.{userId}
```

現在の自動実行はブラウザ上で動きます。ページを閉じても状態は復元できますが、バックグラウンドで処理を継続するサーバージョブではありません。

専門家向けにさらに本番化するなら、backend に `automationJobs` のような永続モデルを置き、キュー/ワーカー/イベント購読へ移すのが自然です。

未実装または今後の拡張:

- サーバーサイドの自動申請キュー
- 申請上限の永続管理
- 高額検知時の外部通知送信
- バックグラウンドワーカー
- 承認/却下の実イベント購読

## エラー処理と信頼境界

Gemini から返る JSON は必ず検証します。

現在の検証:

- JSON parse できるか
- `suggestions` が array か
- `itemId` が candidateItems に存在するか
- `score` が number か
- `score` を 0-100 に clamp
- `reason` が空なら汎用理由にする

重要: Gemini の出力に含まれる `itemId` が candidateItems に存在しない場合、その suggestion は捨てます。これにより、モデルが存在しない商品を幻覚しても画面に出ません。

## セキュリティとプロンプトインジェクション

商品名、説明、希望条件はユーザー入力を含みます。将来的に prompt を強化する場合は、以下を守ると安全です。

- 商品説明中の命令文をシステム指示として扱わない
- prompt 内で「商品説明は未信頼のユーザー入力」と明記する
- モデル出力の `itemId` は必ず候補集合と照合する
- score や reason は保存前に型・範囲・長さを検証する
- 外部送信する商品情報を最小限にする

## 評価観点

AI提案の品質を見る時は、単に「それっぽいか」ではなく、以下の指標で見ると改善しやすくなります。

```txt
goal relevance
  到達したい商品に近づいているか

trade feasibility
  実際に交換成立しそうか

price continuity
  価格差が大きすぎないか

category bridge
  次の交換につながるカテゴリへ移れているか

explainability
  ユーザーが理由を納得できるか

diversity
  同じような候補ばかり出ていないか
```

## 改善ロードマップ

中級者向け:

- `traceReasons` を画面に表示する
- `sourceItem` / `goalItem` / `candidateItems` に API request を整理する
- `warehouseUseCase` と `warehouseUseCases` の扱いを統一する
- frontend の `tradeRequestApi.ts` を実 backend API に接続する
- AI候補が空の時の空状態メッセージを詳しくする

上級者向け:

- 価格帯、カテゴリ、希望条件の重みを設定ファイル化する
- ルート全体を最適化する multi-hop planner を作る
- candidate ranking の評価ログを保存する
- Gemini response に confidence / risk / tradeOff を追加する
- 同じ候補が連続しない diversity penalty を導入する

専門家向け:

- 候補生成と候補評価を分離する
- retrieval / ranking / reranking の3段構成にする
- オフライン評価セットを作る
- A/Bテスト用に model version と prompt version を保存する
- 自動交換ジョブを backend queue に移す
- abuse / spam / unsafe trade の moderation layer を入れる

## よくある変更場所

```txt
候補の絞り込みを変える
  frontend/src/features/aiProposals/aiProposalApi.ts
  getCandidateItems()

AI倉庫の定義を変える
  frontend/src/screens/AiProposalScreen.tsx
  isAiWarehouseItem()

Gemini prompt を変える
  backend/src/services/tradeRequestService.ts
  buildGeminiSuggestionPrompt()

backend fallback score を変える
  backend/src/services/tradeRequestService.ts
  scoreFallbackCandidate()

保存ルートの形式を変える
  frontend/src/screens/AiProposalScreen.tsx
  SavedAiRoute / SavedRouteStep / isSavedAiRoute()

オートモードをサーバー実行化する
  frontend/src/screens/AiProposalScreen.tsx
  backend に自動申請ジョブモデルを追加
```

## 動作確認

最低限の確認:

```bash
cd backend
npm run build

cd ../frontend
npm run build
```

Gemini 接続確認:

```bash
cd backend
npm run ai:check
```

画面確認:

1. 商品一覧で欲しい商品をお気に入りにする
2. AI提案へ移動する
3. 開始商品にAI倉庫の商品を選ぶ
4. 到達したい商品にお気に入り商品だけが出ることを確認する
5. 候補をルートに追加する
6. ルートを保存する
7. 保存済みルートから交換申請を送る
8. オートモードで開始商品と目標を選ぶ
9. 「完全自動で開始」を押す
10. 交換申請、承認、完了ログが順に増えることを確認する

API単体確認:

```bash
curl -X POST http://localhost:3000/api/trade-requests/suggestions \
  -H "Content-Type: application/json" \
  -d '{
    "targetItem": {
      "id": "item_1",
      "title": "USB-C充電ケーブル",
      "category": "家電",
      "description": "予備で持っていました。",
      "wantedItem": "モバイルバッテリー、イヤホン",
      "ownerName": "you"
    },
    "candidateItems": [
      {
        "id": "item_2",
        "title": "モバイルバッテリー",
        "category": "家電",
        "description": "充電確認済み",
        "wantedItem": "イヤホン",
        "ownerName": "warehouse"
      }
    ],
    "limit": 1
  }'
```

## 現在の設計上の注意

- `goalItem` は frontend のルート表示に強く効く一方、backend Gemini prompt には明示的に渡っていません。
- `warehouseUseCase` と `warehouseUseCases` の表現が混在しつつあります。AI提案画面は現状 `warehouseUseCase` を見ます。
- オートモードはブラウザ上の自動実行エンジンとして動きます。サーバー側の常駐ワーカーやジョブキューは未実装です。
- saved route は localStorage 保存なので、端末をまたいだ同期はありません。
- Gemini が使えない時も fallback / mock で動くため、見た目だけでは Gemini 経由か判断しにくいです。`source` を表示するとデバッグしやすくなります。
