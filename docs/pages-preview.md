# GitHub Pagesで試してから本番へ反映する

テストURL：**https://tkisland.github.io/hey-rtm-game/**

本番URL：**https://hey.jpn.org/rhythm/**

## いつもの流れ

1. 修正のPRを確認してmainへマージします。
2. Actionsの **GitHub Pages test play** が成功すると、テストURLが最新の内容へ更新されます。通常のプレイ・見本プレイ・遊び方・音量／同期調整をスマホとPCで確認します。
3. 必要な調整を繰り返し、公開したいコミットを決めます。
4. **同じコミット** の **Build site for Sakura FTP** が成功した実行から、Artifacts → **rhythm-site** をダウンロードします。
5. ZIPの中身を `.htaccess`・`api/catalog.json` も含めて本番 `/rhythm/` へFTP転送します。本番ビルドにはテスト表示がなく、既存のFirebase・PHP・MySQLを使います。

**mainへのマージで更新されるのはPagesの静的ファイルです。自サーバーへの自動FTP送信はしません。** ただし、本番と同じFirebaseを使う管理画面の「公開する」は、FTPとは別に本番のオンライン譜面へも反映されます。 公開したZIPとコミット番号を保管すると、同じ内容へ戻せます。PRのチェックはPagesを上書きせず、マージ後のmainだけを配信します。

## Pagesで確認できる範囲

GitHub Pagesは静的ファイルのみのため、PHPとMySQLは動きません。Pages用は別モードでビルドし、次のように本番と区別します。

- 画面に「テストプレイ環境」と表示し、検索エンジンへnoindexを指定します。公開URLなので、URLを知っている人はアクセスできます。
- Firebaseが設定済みなら公開済みのオンライン譜面を読み込み、なければ収録版を使います。Pagesと本番が同じFirebaseを使う場合、公開譜面は共通です。
- 本番用と同じGitHub変数 `FIREBASE_WEB_CONFIG` を使い、Google管理者ログイン・下書き編集・保存・管理者プレビュー・公開を利用できます。未設定ならログインは準備中のままです。登録済みの管理者判定やFirestoreルールは変えません。
- PHPのAPIへリクエストせず、リザルトのランキング登録・X共有を出しません。スコアと判定、再プレイは確認できます。ランキング管理のリンクはPHPが動く本番の管理画面へ移動します。
- PHP・SQL・鍵・APIカタログ・ビルドmanifestはPagesの成果物へ含めません。
- 設定は各URLのブラウザ保存です。Pagesで調整した数値は本番へ自動移行しないため、同期確認には同じ数値を本番でも設定してください。

ランキング登録・結果画像の共有、公開後の本番側の譜面、本物の広告を含むYouTubeの挙動は、本番側でも確認してください。異なる譜面や端末設定を比較しないようにします。

## Pagesから管理者ログインする

1. GitHubのSettings → Secrets and variables → Actions → Variablesに、既存の **FIREBASE_WEB_CONFIG** が登録されていることを確認します。本番の管理者ログインが動いていれば、通常は同じ設定を使えます。
2. そのFirebaseプロジェクトのコンソールで **Authentication → 設定 → 承認済みドメイン** を開き、**tkisland.github.io** がなければ追加します。`https://` や `/hey-rtm-game/` は付けません。既存の `hey.jpn.org` は残します。Googleログインのプロバイダー設定と管理者UIDは既存のものを使います。
3. APIキーにHTTPリファラー制限を付けている場合は、Google Cloud側で `https://tkisland.github.io/*` からも既存のFirebase APIを利用できるか確認します。サービスアカウント鍵やGoogleのパスワードをサイトへ置く必要はありません。
4. この変更をmainへマージし、GitHub Pages test playの配信完了後に **https://tkisland.github.io/hey-rtm-game/admin.html** を開きます。トップの「管理者ログイン」からも開けます。
5. 登録済みの管理者Googleアカウントでログインします。Pagesと本番は異なるサイトなので、ログイン状態はそれぞれで確認します。

**テスト中の譜面は「下書きを保存」→「保存してゲームで試す」で確認してください。** 下書きは管理者だけが利用し、通常プレーヤーには反映されません。「公開する」を押すと、同じFirebaseを利用するPages・本番の両方にオンライン版が反映されます。この注意はPagesの管理画面と既存の公開確認ダイアログにも表示します。静的なHTML・JSや収録MIDIの更新は、引き続き本番へのFTPが必要です。

Firebaseの本番設定・承認済みドメインはこの作業環境から変更していません。ログイン時にドメイン未登録と表示された場合は、上記の手順2を確認してください。

## 初回設定と再実行

リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にします。現在のPages設定はこの方式です。この変更をマージすると **GitHub Pages test play** がビルド・ブラウザ検証・配信を行います。初回の `github-pages` environment に承認待ちが出た場合は、Actions上でその環境の配信を承認します。

手動で再実行する場合はActions → GitHub Pages test play → Run workflow → **main** を選びます。Pagesを閉じる場合はSettings → Pages → Unpublish siteから停止できます。

本番のFTP ZIPを作るワークフローは維持します。Pagesの配信用 `github-pages` 成果物と、本番用 **rhythm-site** を取り違えないでください。FTPの詳細は [sakura-deployment.md](sakura-deployment.md) を参照してください。

## ローカル確認

```sh
npm ci
npm run build:pages
npm run test:pages
```

Pagesの動作確認後に本番用ファイルを作る場合は、改めて `npm run build` を実行してください。両モードともローカルの出力先は `dist/` です。GitHub Actionsでは別の実行環境でそれぞれ作成します。
