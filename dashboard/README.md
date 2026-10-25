# dashboard — 統合ダッシュボード (PWA)

ぽっち🌟さんの **gokigen / alcohol / kakeibo** 3アプリのデータを GitHub から取得して統合表示。

## 機能

- **📅 カレンダータブ**: 月別カレンダーに3軸を同時表示 (メンタル絵文字 / 純アル(g) / 支出(¥))。月サマリー付き
- **📋 タイムラインタブ**: 日別1行表示、コメント展開
- **📊 分析タブ**:
  - 月別メンタル平均(過去12ヶ月、折れ線)
  - 月別 純アル(棒グラフ)
  - 月別 支出(棒グラフ)
  - 相関: 酒×メンタル / 酒×翌日メンタル / 酒×支出 / メンタル×支出
  - 直近7日サマリー

## データ取得

- 起動時に GitHub Contents API 経由で `data/pwa/{gokigen,alcohol,kakeibo}.json` を fetch
- localStorage にキャッシュ → 次回起動高速化 + オフライン閲覧対応
- 「🔄 更新」ボタンで手動再取得

## PAT

- gokigen/alcohol/kakeibo と**同じPATが使えます** (cc_garmin リポジトリの Contents 読み取り権限)
- 初回のみ設定モーダルで入力 → localStorage 保存

## デプロイ (GitHub Pages, 2026-06 Vercel から移行)

`docs/**` を push すると `mirror-pwa.yml` が `ttyf27/pwa` へミラーし GitHub Pages が再配信する。**手動操作は不要**。

- 公開URL: https://ttyf27.github.io/pwa/dashboard/
- 端末に新コードを配るには `sw.js` の `CACHE` 版数を bump する
