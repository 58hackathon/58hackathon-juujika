# 引き継ぎノート

## 1. 現在地
- AI提案機能のフロント実装フェーズが一区切り完了。
- バックエンド担当は別にいるため、このセッションではバックエンドには触らない方針。
- `frontend/src/screens/AiProposalScreen.tsx` と `frontend/src/screens/AiProposalScreen.css` に、2つのモードを持つAI提案画面を実装済み。
- `npm run build` は成功済み。
- Vite dev server は `http://127.0.0.1:5174/` で確認していた。
- UIモックは `outputs/ai-mode-mockups/` に作成済み。

## 2. 進行中の作業
- 進行中の未完タスクはなし。
- 作業中ファイル:
  - `frontend/src/screens/AiProposalScreen.tsx`
  - `frontend/src/screens/AiProposalScreen.css`
  - `outputs/ai-mode-mockups/`
- `git status --short` では上記のフロント画面ファイル変更と `outputs/` の未追跡が残っていた。

## 3. 次にやること
- まずユーザーに実画面を確認してもらう。
- 修正が入る場合は、バックエンドを書かずにフロントだけで対応する。
- 変更後は以下を実行する:
  - `cd frontend`
  - `npm run build`
- 表示確認が必要な場合は Browser plugin で `http://127.0.0.1:5174/` を開き、PC幅とモバイル幅の両方を確認する。
- バックエンドAPI接続が必要になった場合は、実装せずに必要なprops/API契約だけをフロント側コメントまたは型として整理する。

## 4. 重要な決定事項
- AI提案は2モード構成:
  - ナビモード: AIが商品を1つずつ提案し、ユーザーが確認しながらルートを決める。
  - オートモード: AIが自動で交換申請を進める。有料コンテンツ想定。
- オートモードでは、高額商品との自動交換を検知しても勝手に停止しない。
- オートモードが止まる条件は、ユーザーが手動で停止ボタンを押した時だけ。
- 「倉庫」はユーザー所有品の置き場ではなく、AI提案やガチャ交換で使うサービス管理の商品倉庫を指す。
- 倉庫を使う目的は、交換ルートが長くなった時に毎回発送対応が発生する煩わしさを避けること。
- ユーザー同士の1対1取引では倉庫を使わない。
- 商品一覧では通常出品と倉庫内商品を分けて見られるようにする方針。

## 5. ハマりポイント
- バックエンドは他担当なので、新規API・DB・サーバー処理を書かないこと。
- Vite dev server 起動時に `frontend/node_modules/.vite/deps/_metadata.json` が書き換わることがある。これは実装差分ではないのでコミット対象にしない。
- この環境では `.git` が読み取り専用寄りで、`git restore` が `.git/index.lock` 作成失敗で落ちることがあった。作業ツリー上の不要差分だけなら手動で戻す。
- モバイルの fullPage スクリーンショットでは固定ボトムナビが途中の内容に重なって見えることがある。実操作ではスクロール可能かを確認する。

## 6. 参照すべきドキュメント
- `update.md`、`detail.md`、`todo.md` はこの時点ではリポジトリ内に見つからなかった。
- 参照すべき実装ファイル:
  - `frontend/src/screens/AiProposalScreen.tsx`
  - `frontend/src/screens/AiProposalScreen.css`
  - `outputs/ai-mode-mockups/ai-mode-mockups.html`
