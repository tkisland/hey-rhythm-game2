# 夜空ウィズユー

- 動画：https://www.youtube.com/watch?v=5Z6C4Zhbkl0
- 曲ID：`yozora-with-you`、収録譜面ID：`yozora001`
- 公開難易度：ふつう。かんたん・むずかしいは準備中。
- 原本：アップロードされた `game-yozorawithyou.mid` を `charts/source/game-YOZORAWITHYOU.mid` に保存。音程の置換やノーツの追加修正はありません。
- 変換設定：`charts/source/game-YOZORAWITHYOU.config.json`。MIDIの0tickを動画の **3.5秒（仮）** に合わせ、最初のノーツも3.5秒です。
- MIDIテンポは200 BPM固定。長オシは1.5拍以上。低い音がピンク側です。
- 入力505音を変換し、504個のマーカーを保存。箱オシとオシ変をまとめた判定対象は499ノーツ（単オシ477・長オシ20・箱オシ1・オシ変1）。DDはありません。最後のノーツは動画220.7秒です。
- 未割り当て音・同一レーンの区間重複はありません。オシ変は動画100.7〜107.9秒、104.3秒にピンクから黄緑へ移動します。

再生成：

```sh
node scripts/midi-to-chart.mjs charts/source/game-YOZORAWITHYOU.mid charts/source/game-YOZORAWITHYOU.config.json src/charts/yozora001.json
```

曲カタログへ登録することで、選曲・見本プレイ・管理者編集・ランキング・結果共有の共通機能を使います。ランキング用の譜面・ハッシュはビルド時に `api/catalog.json` に組み込まれます。専用SQL・Firebaseルールの追加は不要です。

mainへのマージ後はGitHub Pagesで確認できます。本番サイトへは同じビルドの `rhythm-site` 全体を `api/catalog.json`・`.htaccess` を含めてFTP更新してください。開始位置は仮指定のため、実動画との同期を実機で確認し、必要なら管理者画面の開始位置調整で合わせてください。

管理者が公開したオンライン譜面がある場合は、そちらが収録版より優先されます。
