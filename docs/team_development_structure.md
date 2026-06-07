# チーム開発構造

## 1つの作業スペースから分岐するイメージ

チーム開発では、全員が別々のファイルを直接持ち寄るというより、1つの共通リポジトリを中心に進める。

```txt
GitHub上の共通リポジトリ
  ↓ clone
各メンバーのPC
  ↓ branch
担当ごとの作業ブランチ
  ↓ pull request
mainに統合
```

## ブランチの分け方

```txt
main
  ├─ feature/frontend-home
  ├─ feature/frontend-item-detail
  ├─ feature/frontend-trade-request
  ├─ feature/backend-items-api
  ├─ feature/backend-trade-requests-api
  └─ feature/demo-polish
```

## 4人チームの分担例

### フロントエンド1

- `frontend/src/screens/HomeScreen.tsx`
- `frontend/src/screens/ItemDetailScreen.tsx`
- `frontend/src/components/ItemCard.tsx`

### フロントエンド2

- `frontend/src/screens/TradeRequestScreen.tsx`
- `frontend/src/screens/RequestListScreen.tsx`
- `frontend/src/screens/RequestDetailScreen.tsx`

### バックエンド1

- `backend/src/routes/itemRoutes.ts`
- `backend/src/controllers/itemController.ts`
- `backend/src/services/itemService.ts`

### バックエンド2

- `backend/src/routes/tradeRequestRoutes.ts`
- `backend/src/controllers/tradeRequestController.ts`
- `backend/src/services/tradeRequestService.ts`

## リーダーが見る場所

```txt
docs/api_contract.md
docs/branch_strategy.md
frontend/src/features/
backend/src/routes/
```

特に`docs/api_contract.md`は、フロントとバックエンドの約束事なので毎日確認する。

