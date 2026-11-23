import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/pages',workers:1,outputDir:'test-results/pages',
  reporter:process.env.CI?[['list'],['github']]:[['list']],
  use:{
    baseURL:'http://127.0.0.1:4186/hey-rtm-game/',
    storageState:{cookies:[],origins:[{origin:'http://127.0.0.1:4186',localStorage:[{name:'hey-rhythm-onboarding-v1',value:JSON.stringify({seen:true,tutorial:true,timing:true})}]}]},
    launchOptions:{executablePath:process.env.CHROMIUM_PATH || (process.env.CI?undefined:'/usr/bin/chromium'),args:['--no-sandbox']},
  },
  webServer:{command:'npm run preview -- --host 127.0.0.1 --port 4186 --base /hey-rtm-game/ --strictPort',url:'http://127.0.0.1:4186/hey-rtm-game/',reuseExistingServer:false},
  projects:[
    {name:'desktop',use:{browserName:'chromium',viewport:{width:1280,height:900}}},
    {name:'mobile-touch',use:{browserName:'chromium',viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
  ],
});
