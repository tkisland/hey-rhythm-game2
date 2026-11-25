import './ranking.css';
import {chartHash,rankingBoard,rankingEnabled,createSharedResult,startRanking,loadRanking,submitRanking,normalizeRankingName,renderRanking,RankingError} from './ranking-api';
import type {RankingBoard,RankingResult} from './ranking-api';
import type {Difficulty} from './difficulties';

export function mountResultRanking(songId:string,difficulty:Difficulty,json:string) {
  const section=document.getElementById('result-ranking')!;
  const resultPanel=document.getElementById('result')!;
  const openButton=document.querySelector<HTMLButtonElement>('#ranking-name-open')!;
  const panel=document.querySelector<HTMLDialogElement>('#ranking-name-panel')!;
  const form=document.querySelector<HTMLFormElement>('#ranking-form')!;
  const nameDisplay=document.getElementById('ranking-name')!;
  const keyGrid=document.getElementById('ranking-keys')!;
  const deleteButton=document.querySelector<HTMLButtonElement>('#ranking-delete')!;
  const clearButton=document.querySelector<HTMLButtonElement>('#ranking-clear')!;
  const cancelButton=document.querySelector<HTMLButtonElement>('#ranking-cancel')!;
  const button=document.querySelector<HTMLButtonElement>('#ranking-submit')!;
  const status=document.getElementById('ranking-status')!;
  const panelStatus=document.getElementById('ranking-panel-status')!;
  const list=document.getElementById('ranking-entries') as HTMLOListElement;
  const controller=new AbortController();
  const listener={signal:controller.signal};
  const slots=Array.from({length:6},()=>document.createElement('span'));
  nameDisplay.replaceChildren(...slots);
  const keys=Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', character=>{
    const key=document.createElement('button');
    key.type='button';
    key.textContent=character;
    key.addEventListener('click',()=>append(character),listener);
    return key;
  });
  keyGrid.replaceChildren(...keys);
  let draft='';
  let generation=0,alive=true,token:string|null=null,result:RankingResult|null=null,invalid='',submitted=false,busy=false;
  let preparation:Promise<void>=Promise.resolve(),started=false;
  const board:Promise<RankingBoard>=chartHash(json).then(hash=>rankingBoard(songId,difficulty,hash));
  const errorText=(error:unknown)=>error instanceof RankingError?error.message:'ランキングを利用できません。';
  let preparationError='';
  function renderName():void {
    const locked=busy || submitted;
    slots.forEach((slot,index)=>{slot.textContent=draft[index] ?? '';});
    keys.forEach(key=>{key.disabled=locked;});
    deleteButton.disabled=clearButton.disabled=locked || !draft;
    button.disabled=locked || !normalizeRankingName(draft);
    cancelButton.textContent=busy?'閉じる':'キャンセル';
  }
  function append(character:string):void {
    if(busy || submitted || draft.length===slots.length)return;
    draft+=character.toUpperCase();
    renderName();
  }
  function registrationStatus(message:string):void {
    status.textContent=panelStatus.textContent=message;
  }
  openButton.addEventListener('click',()=>{
    if(!panel.open && result && token && !invalid && !submitted)panel.showModal();
  },listener);
  cancelButton.addEventListener('click',()=>panel.close(),listener);
  deleteButton.addEventListener('click',()=>{
    draft=draft.slice(0,-1);
    if(!draft && document.activeElement===deleteButton)keys[0].focus();
    renderName();
  },listener);
  clearButton.addEventListener('click',()=>{
    draft='';
    keys[0].focus();
    renderName();
  },listener);
  panel.addEventListener('keydown',event=>{
    if(event.isComposing || event.altKey || event.ctrlKey || event.metaKey)return;
    if(event.key==='Backspace' || /^[a-zA-Z0-9]$/.test(event.key)){
      event.preventDefault();
      event.stopPropagation();
      if(event.key==='Backspace')deleteButton.click();
      else append(event.key);
    }
  },listener);
  function reset():void {
    generation++;token=null;result=null;invalid='';submitted=false;busy=false;preparationError='';section.hidden=true;
    panel.close();openButton.hidden=true;openButton.disabled=false;draft='';renderName();
    list.replaceChildren();registrationStatus('');
    started=false;preparation=Promise.resolve();
  }
  function start():void {
    if(started || !alive || invalid)return;
    started=true;const current=generation;
    preparation=(async()=>{
      try {
        const [enabled,currentBoard]=await Promise.all([rankingEnabled(),board]);
        if(!enabled)throw new RankingError('not_configured','ランキングは準備中です。');
        if(!alive || current!==generation)return;
        const next=await startRanking(currentBoard);if(alive && current===generation)token=next;
      }catch(error){if(alive && current===generation)preparationError=errorText(error);}
    })();
  }
  async function refresh(current:number,highlight?:string):Promise<void> {
    const previousStatus=status.textContent;
    const entries=await loadRanking(await board);
    if(!alive || current!==generation)return;
    if(submitted && !highlight)return;
    renderRanking(list,entries,highlight);
    if(!busy && !submitted && !entries.length && !invalid && !preparationError && status.textContent===previousStatus)status.textContent='まだ記録がありません。最初の記録を登録しよう！';
  }
  function lockRegistration():void {
    submitted=true;
    panel.close();
    openButton.disabled=true;
    if(document.activeElement===openButton)resultPanel.focus();
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();
    if(!panel.open || busy || submitted || !result || !token || invalid)return;
    const name=normalizeRankingName(draft);
    if(!name)return;
    const current=generation,playResult=result,playToken=token;
    busy=true;
    cancelButton.focus();
    renderName();
    registrationStatus('登録しています…');
    void submitRanking(playToken,name,playResult).then(response=>{
      if(!alive || current!==generation)return;
      lockRegistration();
      registrationStatus(`${response.entry.name} で登録しました！ ${response.rank}位`);
      void refresh(current,response.entry.id).catch(()=>{/* Registration has already succeeded. */});
    }).catch(error=>{
      if(!alive || current!==generation)return;
      registrationStatus(errorText(error));
      if(error instanceof RankingError && ['expired','already_submitted'].includes(error.code))lockRegistration();
    }).finally(()=>{
      if(!alive || current!==generation)return;
      busy=false;
      renderName();
    });
  },listener);
  reset();
  return {
    start,
    restart:reset,
    invalidate(reason:string){if(!result)invalid ||= reason;},
    clear(){panel.close();section.hidden=true;result=null;},
    async show(value:RankingResult,eligible:boolean):Promise<void>{
      const current=generation;result=value;section.hidden=false;openButton.hidden=true;status.textContent='ランキングを確認しています…';
      if(!started)invalid ||= '再生開始を確認できませんでした。もういちどプレイしてください。';
      if(!eligible)invalid ||= 'シークや再生速度の変更があるプレイは登録できません。';
      await preparation;
      if(!alive || current!==generation)return;
      openButton.hidden=!token || !!invalid;
      status.textContent=preparationError || invalid || '英数字3〜6文字の名前で登録できます。';
      const initialStatus=status.textContent;
      if(token){try{await refresh(current);}catch(error){if(alive && current===generation && status.textContent===initialStatus)status.textContent=errorText(error);}}
    },
    async share(value:RankingResult):Promise<string>{
      const current=generation;await preparation;
      if(!alive||current!==generation||!token||invalid)throw new RankingError('share_unavailable','画像付き共有を準備できません。');
      return createSharedResult(token,value);
    },
    destroy(){alive=false;generation++;controller.abort();panel.close();},
  };
}
