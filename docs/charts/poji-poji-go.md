# POJI POJI GO

- 動画：https://www.youtube.com/watch?v=F0bagOeDMFc
- 曲ID：`poji-poji-go`、収録譜面ID：`poji001`
- 公開難易度：ふつう。かんたん・むずかしいは準備中。
- 原本：再送された `game-pojigo.mid` を `charts/source/game-POJIGO.mid` として保存。音程置換や重複除去は行っていません。
- 再送前との差分はMIDI内のトラック名 `game-POJIGO` → `game-pojigo` のみです。ノーツの開始・終了tick、音程、テンポ、冒頭の2拍の空白は同一で、再生成した譜面JSONに変更はありません。
- 変換設定：`charts/source/game-POJIGO.config.json`。
- MIDIの0tickを動画の **3.410秒** に合わせます。冒頭に2拍の休符があり、最初のノーツは動画4.025384秒です。
- MIDIテンポは約195 BPM（195.000195）、途中のテンポ変更はありません。長オシは1.5拍以上です。
- 入力791音を保存。箱オシをまとめた判定対象は776ノーツ（通常の単オシ767・長オシ6・箱オシ3）。DD・オシ変はありません。

再生成：

```sh
node scripts/midi-to-chart.mjs charts/source/game-POJIGO.mid charts/source/game-POJIGO.config.json src/charts/poji001.json
```

選曲・見本プレイ・管理者エディター・ランキング・結果共有には既存の共通機能を使います。ランキングの譜面はビルド時に `api/catalog.json` へ組み込まれます。曲追加に専用のSQLやFirebaseルール変更は不要です。

mainへのマージ後はGitHub Pagesで収録譜面を試せます。本番へ反映する際は同じコミットの `rhythm-site` 一式を `api/catalog.json`・`.htaccess` とともにFTP更新してください。実動画との同期は公開後に実機で確認します。

管理者画面から公開したオンライン版がある場合は、そちらが収録版より優先されます。
