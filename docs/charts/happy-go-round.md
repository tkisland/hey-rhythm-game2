# Happy Go Round

- 動画：https://www.youtube.com/watch?v=y5Qz8PcPhYs
- 曲ID：`happy-go-round`、収録譜面ID：`hgr001`
- 公開難易度：ふつう。かんたん・むずかしいは準備中。
- 原本：最終修正版の `charts/source/game-HAPPYGOROUND.mid`。
- 変換設定：`charts/source/game-HAPPYGOROUND.config.json`。
- MIDIの0tickを動画の **1秒** に合わせます。長オシは1.5拍以上です。
- MIDIテンポは約220 BPM（220.00022）。途中のテンポ変更はありません。
- 入力707音から701件の保存データを生成。箱オシをまとめた判定対象は676ノーツ（通常の単オシ659・長オシ10・箱オシ5・オシ変2）。DDはありません。
- 最終ファイルでは未割り当て音と紫の重複が解消されており、追加の音程置換・重複除去は行っていません。以前の未完成MIDIや作業用の正規化ファイルは使用しません。

再生成：

```sh
node scripts/midi-to-chart.mjs charts/source/game-HAPPYGOROUND.mid charts/source/game-HAPPYGOROUND.config.json src/charts/hgr001.json
```

選曲・見本プレイ・管理者エディター・ランキング・結果共有には既存の共通機能を使います。ランキングの譜面はビルド時に `api/catalog.json` へ組み込まれ、初回プレイ時に曲・難易度別のボードが作成されます。今回の曲追加に専用のSQLやFirebaseルール変更は不要です。

mainへのマージ後はGitHub Pagesで収録譜面を試せます。本番へ反映する際は同じコミットの `rhythm-site` 一式を `api/catalog.json`・`.htaccess` とともにFTP更新してください。実動画との同期は公開後に実機で確認します。
