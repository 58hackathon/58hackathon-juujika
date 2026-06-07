# Backend

API、DB、交換申請の状態管理を担当する作業場所。

## 重要な構成

```txt
src/
  server.ts
  app.ts
  routes/
  controllers/
  services/
  repositories/
  models/
  data/
```

## 最初に作るAPI

```txt
GET    /items
GET    /items/:id
POST   /items
GET    /trade-requests
POST   /trade-requests
PATCH  /trade-requests/:id
```

