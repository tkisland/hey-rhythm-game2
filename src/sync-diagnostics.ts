import './sync-diagnostics.css';
import { stateName, CLOCK_LIMITS } from './sync';
import type { Chart } from './chart';
import { playableNotes } from './note-display';
import { SyncTrace } from './sync-trace';
import type { SyncObservation, SyncTraceRow } from './sync-trace';

/** Opt-in with ?sync=1. No telemetry requests or persistent browser storage. */
export function createSyncDiagnostics(song: { id: string; videoId: string }) {
  const panel = document.createElement('details'); panel.className = 'sync-diagnostics'; panel.open = true;
  panel.innerHTML = `<summary>同期診断 <span>タップで折りたたむ</span></summary>
    <p>広告後のずれは「広告が終わった」「ずれを感じた」で時点を記録できます。開始直後の記録は、曲の最後に保存しても残ります。</p>
    <div class="sync-chart-context"><p>配信版：<output data-build-id></output></p><p><output data-chart-active></output></p><p><output data-chart-bundled></output></p><p data-chart-warning></p><a data-chart-compare hidden></a></div>
    <div class="sync-markers"><button type="button" data-marker="ad-ended">広告が終わった</button><button type="button" data-marker="noticed-drift">ずれを感じた</button></div><p class="sync-marker-status" role="status"></p>
    <dl></dl><button type="button" data-action="download">診断ログを保存</button>
    <p>APIは間欠更新されるため、差が出ること自体は正常です。実際の映像・音の出力遅延は、この数値だけでは測れません。</p>`;
  document.body.append(panel);
  panel.addEventListener('toggle',() => { panel.querySelector('summary span')!.textContent = panel.open ? 'タップで折りたたむ' : 'タップで開く'; });
  const buildId = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'local';
  panel.querySelector('[data-build-id]')!.textContent = buildId.slice(0,12);
  type ChartSummary = { beatOrigin:number|null; firstNoteTime:number; lastNoteTime:number; savedNotes:number; playableNotes:number };
  let charts: {source:string;revision:number|null;difficulty:string;forcedBundled:boolean;active:ChartSummary;bundled:ChartSummary|null}|null=null;
  const summarize=(chart:Chart):ChartSummary=>({beatOrigin:chart.beatOrigin??null,firstNoteTime:Math.min(...chart.notes.map(n=>n.time)),
    lastNoteTime:Math.max(...chart.notes.map(n=>n.type==='hold'?n.endTime:n.time)),savedNotes:chart.notes.length,playableNotes:playableNotes(chart.notes).length});
  const describe=(chart:ChartSummary)=>`拍の基準 ${chart.beatOrigin===null?'未指定':chart.beatOrigin.toFixed(3)+'秒'} / 最初のノーツ ${chart.firstNoteTime.toFixed(3)}秒`;
  const list = panel.querySelector('dl')!;
  const fields = ['状態','API時刻','補間時刻','判定時刻','補間 − API','判定 − API','入力補正','曲とノーツの補正','API更新から','API時刻の進み／指定速度','補間の予測速度','FPS／最大フレーム間隔','長い処理の回数／最長','APIの動画長','APIの読込率','APIの動画ID','ノーツ音の起動／入力／再生／破棄'];
  const values = fields.map(name => {
    const term = document.createElement('dt'), value = document.createElement('dd'); term.textContent = name; value.textContent = '—';
    list.append(term,value); return value;
  });
  const trace = new SyncTrace();
  let latest:SyncTraceRow|null=null;
  const markers:{label:string;atMs:number;lastSample:SyncTraceRow|null}[]=[];
  const mark=(label:string)=>{
    markers.push({label,atMs:performance.now(),lastSample:latest?{...latest}:null});
    if(markers.length>64)markers.shift();
  };
  panel.querySelectorAll<HTMLButtonElement>('[data-marker]').forEach(button=>button.addEventListener('click',()=>{
    mark(button.dataset.marker!);panel.querySelector('.sync-marker-status')!.textContent=`「${button.textContent}」の時点を記録しました。`;
  }));
  const createdAt = new Date().toISOString();
  const context = { buildId, page:{origin:location.origin,path:location.pathname}, song: {id:song.id,videoId:song.videoId}, userAgent:navigator.userAgent,
    language:navigator.language, hardwareConcurrency:navigator.hardwareConcurrency, devicePixelRatio:window.devicePixelRatio,
    initialViewport:{width:innerWidth,height:innerHeight}, clockLimits:{...CLOCK_LIMITS} };
  let observer: PerformanceObserver | null = null, longTaskCount = 0, longestTaskMs = 0;
  if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
    try {
      observer = new PerformanceObserver(entries => {
        for (const entry of entries.getEntries()) { longTaskCount++; longestTaskMs = Math.max(longestTaskMs,entry.duration); }
      });
      observer.observe({type:'longtask'});
    } catch { observer?.disconnect(); observer = null; }
  }
  const seconds = (n: number) => Number.isFinite(n) ? `${n.toFixed(3)} s` : '—';
  const ms = (n: number) => Number.isFinite(n) ? `${n > 0 ? '+' : ''}${n.toFixed(0)} ms` : '—';
  function show(row: SyncTraceRow): void {
    const text = [stateName(row.playerState) + (row.stale ? ' · 更新待ち' : ''),seconds(row.apiTime),seconds(row.clockTime),seconds(row.judgementTime),
      ms(row.clockLeadMs),ms(row.noteLeadMs),ms(row.inputOffsetMs),ms(row.noteOffsetMs ?? 0),`${row.apiUpdateAgeMs.toFixed(0)} ms`,
      `${row.observedRate === null ? '測定中' : row.observedRate.toFixed(2) + 'x'} / ${Number.isFinite(row.reportedRate) ? row.reportedRate.toFixed(2) + 'x' : '—'}`,
      `${row.predictionRate.toFixed(2)}x`,
      `${row.fps.toFixed(0)} / ${row.maxFrameGapMs.toFixed(0)} ms`,
      observer ? `${row.longTaskCount} / ${row.longestTaskMs.toFixed(0)} ms` : '未対応',
      row.videoDuration==null?'—':seconds(row.videoDuration),row.loadedFraction==null?'—':`${(row.loadedFraction*100).toFixed(0)}%`,row.reportedVideoId??'—',row.audio ? `${row.audio.state} / ${row.audio.requested}入力 / ${row.audio.started}再生 / ${row.audio.lateDrops}遅延破棄 / ${row.audio.blocked}未起動` : '—'];
    values.forEach((value,i) => { if (value.textContent !== text[i]) value.textContent = text[i]; });
  }
  const download = () => {
    const body = {schemaVersion:1,createdAt,exportedAt:new Date().toISOString(),...context,charts,
      currentViewport:{width:innerWidth,height:innerHeight},samples:trace.snapshot(),startupSamples:trace.startupSnapshot(),events:trace.eventSnapshot(),markers};
    const url = URL.createObjectURL(new Blob([JSON.stringify(body,null,2)],{type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = `hey-rhythm-sync-${Date.now()}.json`;
    document.body.append(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url),1000);
  };
  panel.querySelector('[data-action="download"]')!.addEventListener('click',download);
  return {
    setCharts(value:{chart:Chart;bundled:Chart|null;source:string;revision:number|null;difficulty:string;forcedBundled:boolean;allowCompare:boolean}) {
      charts={source:value.source,revision:value.revision,difficulty:value.difficulty,forcedBundled:value.forcedBundled,active:summarize(value.chart),bundled:value.bundled?summarize(value.bundled):null};
      const labels:Record<string,string>={published:'オンライン公開',bundled:'収録譜面','draft-preview':'管理者の下書き',custom:'編集譜面',test:'練習譜面'};
      panel.querySelector('[data-chart-active]')!.textContent=`使用中：${labels[value.source]??value.source}${value.revision===null?'':`（改訂${value.revision}）`} / ${describe(charts.active)}`;
      panel.querySelector('[data-chart-bundled]')!.textContent=charts.bundled?`収録版：${describe(charts.bundled)}`:'収録版なし';
      // Grid origins can differ by whole beats without moving absolute note timestamps.
      const different=charts.bundled&&Math.abs(charts.active.firstNoteTime-charts.bundled.firstNoteTime)>=.001;
      panel.querySelector('[data-chart-warning]')!.textContent=value.forcedBundled?'収録版限定の比較中です。ランキング登録・結果共有はできません。':different&&value.source==='published'?'使用中の譜面と収録版で最初のノーツ時刻が異なります。オンライン公開譜面が優先されています。':'';
      const link=panel.querySelector<HTMLAnchorElement>('[data-chart-compare]')!;
      link.hidden=!value.allowCompare||!value.bundled;
      if(!link.hidden){
        const url=new URL(location.href);url.searchParams.set('sync','1');
        if(value.forcedBundled)url.searchParams.delete('bundled');else url.searchParams.set('bundled','1');
        link.href=url.href;link.textContent=value.forcedBundled?'通常の譜面に戻す':'収録譜面だけで比較する';
      }
    },
    mark,
    record(sample: Omit<SyncObservation,'longTaskCount'|'longestTaskMs'|'visibility'>) {
      const row = trace.record({...sample,longTaskCount,longestTaskMs,visibility:document.visibilityState});
      if(row)latest=row;
      if (row && panel.open) show(row);
    },
    destroy() { observer?.disconnect(); panel.remove(); },
  };
}
