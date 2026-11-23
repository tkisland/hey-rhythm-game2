import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
function inspect(directory){
  for(const item of readdirSync(directory,{withFileTypes:true})){
    const path=join(directory,item.name);
    if(item.isDirectory()){
      if(['api','.vite'].includes(item.name))throw new Error(`Server/build-only directory in Pages output: ${path}`);
      inspect(path);
    }else{
      if(/\.(?:php|sql|pem|key)$/i.test(item.name)||/^\.env(?:\.|$)/.test(item.name))throw new Error(`Server/private file in Pages output: ${path}`);
      if(item.name.endsWith('.html')){
        const html=readFileSync(path,'utf8');
        if(!html.includes('id="pages-preview-notice"')||!html.includes('noindex, nofollow'))throw new Error(`Pages preview markers missing: ${path}`);
      }
    }
  }
}
inspect('dist');
writeFileSync('dist/.nojekyll','');
console.log('Pages preview verified: static-only output with preview label and noindex.');
