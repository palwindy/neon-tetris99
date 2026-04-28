# Neon Tetris 99

A neon-styled mobile Tetris game built with React 19, Vite, TypeScript, and Firebase Realtime Database.

## Tech Stack
- **Frontend:** React 19 + TypeScript
- **Build tool:** Vite 6
- **Styling:** Tailwind CSS (CDN)
- **Backend services:** Firebase Realtime Database (for multiplayer/leaderboard)
- **Icons:** lucide-react

## Project Layout
- `index.html` — App entry point
- `index.tsx` — React mount point
- `App.tsx` — Root component
- `components/` — UI components
- `hooks/` — Custom React hooks
- `services/` — Firebase and other service integrations
- `utils/` — Utility functions
- `constants.ts` / `types.ts` — Shared constants and types
- `firebase.ts` — Firebase initialization
- `public/` — Static assets

## Replit Setup
- Vite dev server runs on host `0.0.0.0`, port `5000`, with `allowedHosts: true` to support the Replit iframe proxy.
- Workflow `Start application` runs `npm run dev`.

## Deployment
Configured as a static site:
- Build: `npm run build`
- Public directory: `dist`

## Version History
- **5.10** — (1) ゲーム画面を全画面強制横向き表示化（縦持ち端末は CSS 90° 回転、`PortraitLayout` 廃止し `LandscapeLayout` 単独運用）。(2) カウントダウン後の最初のミノが NEXT 先頭と一致するよう修正（`resetGame` で初手をボードに置かず、`startGame` で NEXT 先頭を spawn）。(3) ハードドロップ後の操作猶予を廃止し、本家 TETRIS 99 同様に着地即確定（`hardDrop` 内で `lockPiece` を即時呼び出し）。
- **5.02** — VS MULTI 複数人バグ修正。ホスト「部屋を作る」押下時に Firebase 上の未使用 4 桁 ROOM ID を毎回発行し、別の人の進行中ルームを偶然踏み潰さないようにした（複数人が同時に別部屋でプレイ可能）。
- **5.00** — VS MULTI を 3 人対戦対応に拡張。ホストが各枠を HUMAN/CPU(Lv1-5) で個別指定。攻撃は全相手に同火力同時送信、最後の 1 人になるまで継続（T99 形式）。VS CPU 1on1 を VS MULTI 内へ統合（GameMode `MULTI_CPU` 廃止）。VS MULTI 中は PAUSE 無効化。
- **4.00** — VS MULTI に CPU 対戦機能を追加（5段階のレベル選択、攻防・勝敗連動）
- **3.00** — 初期版（VS MULTI のオンライン対戦）

## CPU AI (VS MULTI)
- `services/cpuAi/cpuOpponentInstance.ts` — 個別 CPU プレイヤー（盤面・bag・コンボ・B2B・思考タイマー独立保持）
- `services/cpuOpponentManager.ts` — 複数 CPU の一括管理（add/start/stop/pause/resume/receiveAttack）
- `services/cpuAi/cpuTypes.ts` — テトロミノ型定義と回転形状テーブル
- `services/cpuAi/cpuBoard.ts` — 盤面操作（衝突判定、配置、ライン消去、ガベージ追加、7-bag）
- `services/cpuAi/cpuEvaluator.ts` — Pierre Dellacherie 風評価関数による最善手探索
- レベル別の思考間隔とランダム手率（1=5秒/50%ランダム → 5=1秒/最善手）
- T99 同等の攻撃テーブル（Single 0/Double 1/Triple 2/Tetris 4 +B2B +REN +PC）

## VS MULTI Architecture (v5.00)
- ルームは `rooms/{roomId}/config = { hostId, slots[] }` を持ち、各枠は `{ kind: 'HUMAN' | 'CPU', cpuLevel? }`
- ホストはルーム作成時に CPU 枠分の `cpu_{slotIndex}` プレイヤーを Firebase 上に書き込み、ローカルで `cpuOpponentManager` が駆動
- 攻撃は `multiplayerService.sendAttack(lines, fromId?)` が自分以外の生存プレイヤー全員の `pendingGarbage` に同火力を加算
- CPU プレイヤーへの攻撃はホストクライアントの `useMultiSync` が差分検知してローカル CPU instance に渡し、Firebase 側を 0 リセット
- 勝敗は「自分以外が全員 defeated」になったら勝利アニメーション
