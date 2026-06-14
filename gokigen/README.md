# gokigen — 自作 GOKIGEN アプリ (PWA)

ぽっち🌟さん専用の気分記録カレンダー。GitHub Pages でホストする Web アプリ。

## デプロイ手順

### GitHub Pages 設定 (初回のみ)
1. GitHub リポジトリ → Settings → Pages
2. Source: **Deploy from a branch**
3. Branch: `claude/garmin-data-analysis-V2xrD`(またはmain)、Folder: `/docs`
4. Save → 数分後に `https://hidekiyakushinji.github.io/cc_Garmin/gokigen/` で公開

### iPhone でホーム画面追加 (PWA化)
1. Safari で上記URL開く
2. 共有ボタン → 「ホーム画面に追加」
3. アイコンがネイティブアプリのように動作

## 使い方

### 日々の記録
- 日付セルタップ → 顔文字選択 + メモ入力 → Done
- 緑セル = 未入力日 (今日が緑なら今日も記録しよう)

### 月の移動
- 上部 ← / → ボタン、または前後月のミニビューをタップ

### 既存データの移行 (初回1回だけ)
1. このアプリ下部の「📥 旧形式」ボタン
2. `data/lifestyle/gokigen_diary.txt` をアップロード
3. 全エントリが取り込まれる(localStorage に保存)

### バックアップ / 分析パイプライン連携
- 下部「📤 Export」で JSON ダウンロード
- ファイルを `data/lifestyle/gokigen.json` として commit
- 既存パイプライン側で JSON を読み込むよう parse_gokigen.py を将来更新

## 顔文字とスコア

| 顔文字 | 色 | スコア | 意味 |
|---|---|---:|---|
| ^o^ | マゼンタ | 5 | 絶好調 |
| ^_^ | 淡ピンク | 4 | まあまあ |
| ~.~ | 黄色 | 3 | ダルい |
| *_* | ダーク赤 | 2 | 気持ち悪い |
| >_< | オレンジ | 2 | ツラい |
| ز_ز | 水色 | 1 | 憂鬱 |
| T-T | 青 | 0 | もう無理 |

※ 既存 `parse_gokigen.py` のスコア体系と整合。

## データ保存場所

- ブラウザの localStorage(キー `gokigen_data`)
- iOS Safari の場合、PWAは独立した localStorage を持つ
- ストレージ消失リスク回避のため、**週に1回は Export 推奨**

## 今後の予定 (Phase 2 以降)

- [ ] GitHub Personal Access Token で直接 push 機能
- [ ] iCloud Drive 自動同期 (Apple ショートカット連携)
- [ ] 飲酒量・睡眠時間の構造化入力フィールド
- [ ] メンタル週次グラフ表示
- [ ] アルコール記録アプリ (別 PWA で連携)
