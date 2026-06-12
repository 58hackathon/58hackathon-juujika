# API Contract

フロントエンドとバックエンドの約束事をまとめる場所。

## Items

### GET /items

商品一覧を取得する。

Response:

```json
[
  {
    "id": "item_1",
    "title": "NIKE エアフォース1",
    "description": "数回しか履いていません。",
    "ownerId": "user_1",
    "ownerName": "haru_03",
    "wantedItem": "スニーカー、バッグ、アクセサリー",
    "category": "ファッション",
    "status": "available",
    "imageUrl": "/images/demo/air-force-1.png",
    "likes": 72,
    "price": 25000,
    "createdAt": "2026-06-08T10:00:00.000Z"
  }
]
```

### GET /items/:id

商品詳細を取得する。

### POST /items

商品を出品する。

Request:

```json
{
  "title": "NIKE エアフォース1",
  "description": "数回しか履いていません。",
  "ownerId": "user_1",
  "ownerName": "haru_03",
  "wantedItem": "スニーカー、バッグ、アクセサリー",
  "category": "ファッション",
  "price": 25000,
  "imageUrl": "/images/demo/air-force-1.png"
}
```

## Trade Requests

### GET /trade-requests

交換申請一覧を取得する。

### POST /trade-requests

交換申請を作成する。

Request:

```json
{
  "targetItemId": "item_1",
  "offeredItemId": "item_2",
  "message": "ぜひ交換したいです。"
}
```

### PATCH /trade-requests/:id

交換申請の状態を更新する。

Request:

```json
{
  "status": "approved"
}
```

Status:

```txt
pending
approved
rejected
completed
```
