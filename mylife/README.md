# mylife — 統合スーパーアプリ (Stage 1 / Phase 1a)

ぽっち🌟さん専用の Today画面ハブ。

## 機能

- **3軸サマリー**: 今日のメンタル / 純アル / 支出
- **30日 移動平均**: 純アル/日 (全日) + 支出/日 (平日のみ。週末は奥さんとの食事で金額が大きく代表値が歪むため除外) (PWA入力データから自動集計)
- **HIIT Z5 リング**: 今月のHIIT月別状況 (簡易、リング表示)
- **AI気付き枠**: Stage 3 (ヘッドレス自律観察) で実装予定
- **入力PWAへのリンク**: gokigen/alcohol/kakeibo/dashboard

## データ取得

- `data/pwa/{gokigen,alcohol,kakeibo}.json` ← 既存PWAの同期データ
- `data/activities/activities_summary.csv` ← Garmin HIIT
- GitHub Contents API + PAT認証
- 起動時 fetch + 24h localStorage cache (Stage 3で頻度自動化)

## デプロイ

1. Vercel → Add New → Project
2. cc_Garmin リポジトリ import
3. **Root Directory**: `docs/mylife`
4. Framework Preset: Other
5. Deploy

完成URL: `mylife.vercel.app` (希望)

## 設計鉄則 (絶対遵守)

1. 節約提案・推奨アクション禁止 (観察と数字だけ)
2. 説教感ゼロ、「気付いた?」式
3. JNK系は表示しない (家庭/職場で開くことがあるため)
4. 旧4PWA はそのまま並走 (Stage 1.5 で統合)

## ロードマップ

- **Phase 1a (今回)**: Today画面のみ、データ表示
- Phase 1b: HIIT Z5 滞在時間を hiit_hr_zones から正確集計
- Phase 1.5: 旧4PWA を /gokigen 等にサブルート化、localStorage 統合
- **Stage 2**: AIチャット統合 (右下フローティング)
- **Stage 3**: ヘッドレス自律観察 (cron で AI が朝の気付きを生成)

詳細: `reports/mylife_roadmap.md`
