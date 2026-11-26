import { defineConfig, loadEnv } from 'vite';
import { readFileSync } from 'node:fs';
import securityHeaders from './server/security-headers.json';
import { parseCloudConfig } from './src/cloud-schema';

export default defineConfig(({ mode }) => {
  const admin = mode === 'admin';
  const pages = mode === 'pages';
  const env = loadEnv(mode, process.cwd(), '');
  const cloudTest = mode === 'cloud-test';
  const cloud = parseCloudConfig(cloudTest ? {apiKey:'demo-key', authDomain:'demo-hey-rtm.firebaseapp.com', projectId:'demo-hey-rtm', appId:'1:123:web:demo'} : env.VITE_FIREBASE_CONFIG);
  const template = readFileSync('src/editor-template.html', 'utf8');
  const playerSettings = readFileSync('src/player-settings-controls.html', 'utf8');
  return {
    base: './',
    appType: 'mpa',
    preview: {headers:securityHeaders},
    define: { __ADMIN__: JSON.stringify(admin), __FIREBASE_CONFIG__:JSON.stringify(cloud), __FIREBASE_EMULATORS__:JSON.stringify(cloudTest) },
    plugins: [{
      name: 'separate-player-and-admin',
      transformIndexHtml(html) {
        html = html.replace('<!-- editor:template -->', template).replace('<!-- player-settings:controls -->', playerSettings);
        if (pages) {
          html = html.replace('<div id="admin-session"', '<p id="pages-admin-warning" style="padding:10px 14px;background:#392c1c;color:#fff0cd;font-size:13px;line-height:1.8">本番と同じFirebaseを使う場合、下書きと公開譜面は共通です。「公開する」は本番のオンライン譜面にも反映されます。</p><div id="admin-session"');
          html = html.replace('href="./moderation.html">ランキング管理', 'href="https://hey.jpn.org/rhythm/moderation.html">本番のランキング管理');
          html = html.replace('</head>', '<meta name="robots" content="noindex, nofollow" /></head>');
          html = html.replace(/(<body[^>]*>)/, '$1<aside id="pages-preview-notice" style="padding:4px 10px;text-align:center;font-size:11px;line-height:1.6;background:#30213e;color:#f5e9ff">テストプレイ環境 · <a href="https://hey.jpn.org/rhythm/" style="color:inherit">本番サイト</a></aside>');
        }
        return admin ? html : html.replace(/<!-- admin:start -->[\s\S]*?<!-- admin:end -->/g, '');
      },
      configureServer(server) {
        if (admin) return;
        server.middlewares.use((request, response, next) => {
          let path: string;
          try { path = decodeURIComponent(new URL((request.url ?? '/').replace(/^\/+/, '/'), 'http://localhost').pathname).replaceAll('\\', '/'); }
          catch { response.statusCode = 400; response.end(); return; }
          // Include Vite's extensionless pages and JS-to-TS source aliases.
          if (/(?:^|\/)(?:editor(?:\.html)?\/?|src\/editor(?:\.[jt]s)?)$/i.test(path)) {
            response.statusCode = 404; response.end('Not found'); return;
          }
          next();
        });
      },
    }],
    build: {
      manifest: true,
      outDir: admin ? 'dist-admin' : 'dist',
      rollupOptions: { input: admin ? { menu: 'index.html', game: 'game.html', editor: 'editor.html', admin: 'admin.html', rankings:'rankings.html',moderation:'moderation.html' } : { menu: 'index.html', game: 'game.html', admin: 'admin.html', rankings:'rankings.html',moderation:'moderation.html' } },
    },
  };
});
