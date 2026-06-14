# Warashibe

物々交換をベースにしたマーケットアプリです。通常の1対1交換に加えて、同価格帯の商品をランダム交換する「わらしべガチャ」と、倉庫商品を使って目的の商品へ近づく「AI提案」を試せます。

## 主な機能

- ユーザー登録、ログイン状態の保存
- 商品一覧、検索、カテゴリ絞り込み
- 通常出品 / AI提案候補 / ガチャ提案候補の表示切り替え
- 商品詳細、交換申請、受信リクエスト確認
- お気に入り登録
- マイページで自分の出品、お気に入り、受信リクエストを確認
- わらしべガチャ
  - 自分の商品を選び、価格帯とカテゴリに合う倉庫商品からランダム交換
  - 交換前の確認ダイアログと履歴保存
- AI提案
  - ナビモードとオートモード
  - 自分が出品してAI倉庫に保存した商品を開始商品として選択
  - AI倉庫内でお気に入り登録した商品だけを「到達したい商品」として選択
  - 保存済みルートの進捗管理
  - 詳細設計は [docs/ai_proposal_readme.md](docs/ai_proposal_readme.md) を参照

## 技術構成

```txt
frontend/  React + TypeScript + Vite
backend/   Express + TypeScript
docs/      API契約、開発ルール
```

バックエンドは Firestore / Gemini の環境変数がなくても、デモデータやフォールバックロジックで動作します。

## セットアップ

必要なもの:

- Node.js
- npm

依存関係をインストールします。

```bash
cd backend
npm install

cd ../frontend
npm install
```

## 起動方法

ターミナルを2つ使います。

バックエンド:

```bash
cd backend
npm run dev
```

標準では `http://localhost:3000` で起動します。

フロントエンド:

```bash
cd frontend
npm run dev
```

標準では `http://localhost:5173` で起動します。Vite の proxy により、フロントエンドからの `/api` リクエストはバックエンドへ転送されます。

## ビルド確認

```bash
cd backend
npm run build

cd ../frontend
npm run build
```

## 環境変数

`backend/.env` に任意で設定します。未設定でもフォールバックで動きます。

```env
PORT=3000
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_WEB_API_KEY=your-firebase-web-api-key
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash
```

- `FIREBASE_PROJECT_ID` / `FIREBASE_WEB_API_KEY`: Firestore 保存に使用
- `GEMINI_API_KEY`: AI交換候補の生成に使用
- `GEMINI_MODEL`: Gemini のモデル名。未指定時は `gemini-3.5-flash`

Gemini 接続確認:

```bash
cd backend
npm run ai:check
```

## 主要ディレクトリ

```txt
frontend/src/
  App.tsx
  components/
  features/
    aiProposals/
    favorites/
    items/
    tradeRequests/
    users/
  screens/
  styles/

backend/src/
  app.ts
  server.ts
  controllers/
  models/
  routes/
  services/
```

## 主なAPI

バックエンドは `/api/...` と、互換用のルートなしパスの両方を受けます。

```txt
GET    /api/items
GET    /api/items/gacha
GET    /api/items/:id
POST   /api/items

GET    /api/users
GET    /api/users/me
GET    /api/users/:id
POST   /api/users

GET    /api/favorites?userId=:userId&scope=:scope
POST   /api/favorites
DELETE /api/favorites/:itemId?userId=:userId&scope=:scope

GET    /api/trade-requests
GET    /api/trade-requests/:id
POST   /api/trade-requests
PATCH  /api/trade-requests/:id
POST   /api/trade-requests/suggestions
```

`favorites` の `scope` は通常出品用の `market`、AI倉庫用の `ai_warehouse` を指定します。

詳しい契約は [docs/api_contract.md](docs/api_contract.md) を参照してください。

## データ保存について

- 商品、ユーザー、お気に入りは API 接続に失敗した場合、デモデータやブラウザの `localStorage` にフォールバックします。
- お気に入りは通常出品用の `market` とAI倉庫用の `ai_warehouse` scope に分かれます。
- 現在のログインユーザー、お気に入り、ガチャ履歴、AI保存ルートはブラウザ側にも保存されます。
- Firestore 環境変数を設定すると、対応しているバックエンドサービスは Firestore を使います。

## 開発メモ

- `main` は動作確認できる状態を保つ想定です。
- 画面とAPIの約束は `docs/api_contract.md` に追記します。
- フロントだけで進めたい場合も、`features/*/*Api.ts` のフォールバックでデモ動作できます。
