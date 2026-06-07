# ブランチ運用ルール

## 基本ルール

`main`には直接作業しない。

作業するときは、必ず以下のようなブランチを作る。

```txt
feature/担当領域-作るもの
```

例:

```txt
feature/frontend-home
feature/frontend-trade-request
feature/backend-items-api
feature/backend-trade-requests-api
feature/demo-polish
```

## 毎日の流れ

```txt
1. mainを最新にする
2. 自分のブランチを作る
3. 作業する
4. 動作確認する
5. Pull Requestを作る
6. 他の人が確認する
7. mainにマージする
```

## Gitコマンド例

```bash
git checkout main
git pull
git checkout -b feature/frontend-home
```

作業後:

```bash
git add .
git commit -m "Add home screen"
git push origin feature/frontend-home
```

## コンフリクトを減らすコツ

- 同じファイルを複数人で同時に触らない
- `App.tsx`は変更が衝突しやすいので、作業担当を決める
- 画面ごとにファイルを分ける
- API仕様は先に`docs/api_contract.md`へ書く

