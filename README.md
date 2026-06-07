# Warashibe Team Workspace

このフォルダは、チーム開発で使う「1つの共通プロジェクト」の雛形です。

基本の考え方:

```txt
main
  ├─ feature/frontend-home
  ├─ feature/frontend-trade-request
  ├─ feature/backend-items-api
  └─ feature/backend-trade-requests-api
```

各メンバーは`main`から自分の作業ブランチを作り、作業が終わったらPull Requestで`main`へ戻します。

## フォルダ構成

```txt
warashibe-team-workspace/
  frontend/
  backend/
  docs/
```

- `frontend`: React側。画面、UI、API呼び出しを担当
- `backend`: API、DB、保存処理を担当
- `docs`: チーム開発ルール、API仕様、画面とAPIの対応表

## 最初に共有すること

1. `main`は常に発表できる状態に近づける
2. 作業は必ずブランチを切る
3. 画面とAPIの接続仕様は`docs/api_contract.md`に集める
4. バックエンド未完成でも、フロントはダミーデータで先に進める

