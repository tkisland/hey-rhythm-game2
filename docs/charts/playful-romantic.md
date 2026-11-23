# PLAYFUL ROMANTIC

- 動画：https://www.youtube.com/watch?v=94DtjMOtbP4
- 曲ID：`playful-romantic`、収録譜面ID：`playful001`
- 公開難易度：ふつう。かんたん・むずかしいは準備中。
- 原本：`charts/source/game-PLAYFUL.mid`（修正版）。旧 `game-PLR.mid` は使用しません。
- 変換設定：`charts/source/game-PLAYFUL.config.json`
- MIDIの0tickを動画の **1.13秒** に合わせます。長オシは1.5拍以上です。
- MIDIのテンポトラックを保持し、約98 → 195 → 196 BPM。変化時刻は動画の10.925904秒・20.772048秒です。
- 入力568音から559件の譜面データを生成。箱オシをまとめた判定対象は539ノーツ（通常の単オシ506・長オシ23・箱オシ4・DD3・オシ変3）。
- 未割り当て番号の追加や、楽曲固有の音程置換はありません。

再生成：

```sh
node scripts/midi-to-chart.mjs charts/source/game-PLAYFUL.mid charts/source/game-PLAYFUL.config.json src/charts/playful001.json
```

通常プレイ・見本プレイ・管理者エディター・ランキング・結果共有には既存の共通機能を使います。ランキングの権威譜面はビルド時に `api/catalog.json` へ組み込まれ、初回プレイ時に曲・難易度別のボードが作成されます。今回の追加専用のSQLやFirebaseルールの変更は不要です。

ビルドが完了した同一の `rhythm-site` 一式をFTPで `/rhythm/` へ更新します。HTML・JSだけでなく `api/catalog.json` も含めて更新し、既存ページは再読み込みしてください。既存曲の譜面・開始位置・記録は変更しません。実際の動画との同期は、反映後に実機で確認してください。
