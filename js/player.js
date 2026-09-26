(function(){'use strict';
const PLAYER_VERSION='4.32.2-HEARTBEAT-FINAL';
const cfg=window.SUPABASE_CONFIG||{}, hasConfig=!!(cfg.url&&cfg.key&&!String(cfg.url).includes('SEU-PROJETO'));
const root=document.getElementById('playerRoot'),stage=document.getElementById('stage'),status=document.getElementById('status'),empty=document.getElementById('empty'),emptyMessage=document.getElementById('emptyMessage'),startBtn=document.getElementById('startBtn'),fullscreenBtn=document.getElementById('fullscreenBtn');
const p=new URLSearchParams(location.search), code=(p.get('code')||localStorage.getItem('vitrine_screen_code')||'TV-0001').trim(); localStorage.setItem('vitrine_screen_code',code);
const pathOrientation=location.pathname.toLowerCase().includes('/portrait/')?'portrait':'';
let db=null,screen=null,items=[],index=0,timer=null,heartbeatTimer=null,reloadTimer=null,reconnectTimer=null,watchdogTimer=null,lastPlaybackActivity=Date.now(),started=false,playlistSignature='',activePlaylistId=null,currentProof=null,syncBusy=false,blackout=false,activeSyncGroup=null;
const platform=/Tizen|SMART-TV|SamsungBrowser/i.test(navigator.userAgent)?'Samsung/Tizen':(/Android|TCL|AFT|GoogleTV/i.test(navigator.userAgent)?'Android/Google TV/TCL':'Web');
const isSamsungTizen=/Tizen|SMART-TV|SamsungBrowser/i.test(navigator.userAgent), tvMode=isSamsungTizen||p.get('tv')==='1'||p.get('kiosk')==='1';
if(tvMode){document.documentElement.classList.add('tv-mode');root.classList.add('kiosk');}
function applyOrientation(v){v=String(v||'landscape').toLowerCase();v=(v==='portrait'||v==='vertical'||v==='9:16')?'portrait':'landscape';root.classList.remove('portrait','landscape');root.classList.add(v);document.documentElement.dataset.orientation=v}
function setStatus(t,show=true){status.textContent=t+(code?' • '+code:'');status.classList.toggle('visible',show&&!blackout)} function showEmpty(m){emptyMessage.textContent=m;empty.hidden=false} function hideEmpty(){empty.hidden=true}
function clearStage(){if(timer)clearTimeout(timer);timer=null;stage.innerHTML='';lastPlaybackActivity=Date.now()}
async function fs(){try{if(document.fullscreenElement)return;if(root.requestFullscreen)await root.requestFullscreen();else if(root.webkitRequestFullscreen)root.webkitRequestFullscreen()}catch(e){}}
async function start(){started=true;startBtn.textContent='Reproduzindo';startBtn.disabled=true;await fs();playNext()} startBtn.onclick=start;fullscreenBtn.onclick=fs;document.onkeydown=e=>{if(e.key==='Enter'&&!started)start()};
function normalize(rows){return(rows||[]).map(r=>{const m=r.media||r;return{id:m.id,type:m.type||'text',url:m.file_url||'',text:m.text_content||m.name||'',duration:Number(r.duration||m.duration||8),transition:r.transition||'fade'}}).filter(x=>(x.type==='text')||x.url)}
const REMOTE_MEDIA_DB='vitrine_remote_media_v1',REMOTE_MEDIA_STORE='files';
function remoteMediaDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(REMOTE_MEDIA_DB,1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains(REMOTE_MEDIA_STORE))d.createObjectStore(REMOTE_MEDIA_STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function idbGetRemote(url){try{const d=await remoteMediaDb();const v=await new Promise((resolve,reject)=>{const r=d.transaction(REMOTE_MEDIA_STORE,'readonly').objectStore(REMOTE_MEDIA_STORE).get(url);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});d.close();return v||null}catch(e){return null}}
async function idbPutRemote(url,blob){try{const d=await remoteMediaDb();await new Promise((resolve,reject)=>{const r=d.transaction(REMOTE_MEDIA_STORE,'readwrite').objectStore(REMOTE_MEDIA_STORE).put(blob,url);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)});d.close();return true}catch(e){return false}}
async function cachedUrl(url){if(!url)return url;try{const saved=await idbGetRemote(url);if(saved)return URL.createObjectURL(saved);const cache=await caches.open('vitrine-media-v432');let res=await cache.match(url);if(!res){res=await fetch(url,{mode:'cors',cache:'force-cache'});if(res.ok)await cache.put(url,res.clone())}if(res&&res.ok){const blob=await res.blob();await idbPutRemote(url,blob);return URL.createObjectURL(blob)}}catch(e){console.warn('media cache',e)}return url}
async function prepareItems(rows){const normalized=normalize(rows);for(const x of normalized){if(String(x.url||'').startsWith('idb://'))x.playUrl=await localMediaUrl(x.url);else x.playUrl=x.url&&/^https?:/i.test(x.url)?await cachedUrl(x.url):x.url}return normalized.filter(x=>x.type==='text'||x.playUrl||x.url)}
async function finishProof(){if(!db||!currentProof)return;try{await db.from('proof_of_play').update({ended_at:new Date().toISOString(),duration_seconds:Math.max(0,Math.round((Date.now()-currentProof.started)/1000))}).eq('id',currentProof.id)}catch(e){}currentProof=null}
async function beginProof(x){await finishProof();if(!db||!screen||!x?.id)return;try{const {data}=await db.from('proof_of_play').insert({screen_id:screen.id,media_id:x.id,playlist_id:activePlaylistId,started_at:new Date().toISOString(),status:'played'}).select('id').maybeSingle();if(data?.id)currentProof={id:data.id,started:Date.now()}}catch(e){}}
function syncPosition(){if(!activeSyncGroup||!items.length)return null;const durations=items.map(x=>Math.max(2,Number(x.duration||8))),total=durations.reduce((a,b)=>a+b,0);if(!total)return null;let pos=(Date.now()/1000)%total;for(let i=0;i<durations.length;i++){if(pos<durations[i])return {index:i,offset:pos,remaining:Math.max(.25,durations[i]-pos)};pos-=durations[i]}return {index:0,offset:0,remaining:durations[0]}}
function playNext(){if(blackout){clearStage();hideEmpty();return}lastPlaybackActivity=Date.now();clearStage();if(!items.length){showEmpty('Nenhum conteúdo disponível para esta tela.');timer=setTimeout(playNext,5000);return}hideEmpty();const sp=syncPosition();if(sp)index=sp.index;const x=items[index%items.length];index=(index+1)%items.length;beginProof(x);const next=async()=>{await finishProof();playNext()};const syncedMs=sp?Math.max(250,sp.remaining*1000):null;
 if(x.type==='video'){const v=document.createElement('video');v.src=x.playUrl||x.url;v.autoplay=true;v.muted=true;v.playsInline=true;v.setAttribute('playsinline','');stage.appendChild(v);let done=false;const once=()=>{if(done)return;done=true;next()};v.onended=once;v.onerror=()=>setTimeout(once,1000);v.play().catch(()=>{startBtn.disabled=false;startBtn.textContent='Toque/OK para iniciar'});if(sp&&sp.offset>0)v.addEventListener('loadedmetadata',()=>{try{if(Number.isFinite(v.duration)&&v.duration>sp.offset)v.currentTime=sp.offset}catch(e){}},{once:true});timer=setTimeout(once,syncedMs||Math.max(5,x.duration||30)*1000)}
 else if(x.type==='image'){const img=document.createElement('img');img.src=x.playUrl||x.url;img.alt=x.text||'Conteúdo';stage.appendChild(img);timer=setTimeout(next,syncedMs||Math.max(2,x.duration||8)*1000)}
 else if(x.type==='web'){const f=document.createElement('iframe');f.src=x.playUrl||x.url;f.allow='autoplay; fullscreen';f.style.border='0';stage.appendChild(f);timer=setTimeout(next,syncedMs||Math.max(5,x.duration||15)*1000)}
 else{const d=document.createElement('div');d.className='slide-text';d.textContent=x.text||'Vitrine Digital';stage.appendChild(d);timer=setTimeout(next,syncedMs||Math.max(2,x.duration||8)*1000)}}
function dayToken(d){return ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'][d.getDay()]}
function timeHHMM(d){return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
function scheduleMatches(s,now){const iso=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0'),t=timeHHMM(now);if(s.active===false)return false;if(s.start_date&&iso<s.start_date)return false;if(s.end_date&&iso>s.end_date)return false;const st=String(s.start_time||'').slice(0,5),et=String(s.end_time||'').slice(0,5);if(st&&et&&st<=et){if(t<st||t>et)return false}else if(st&&et&&st>et){if(t>et&&t<st)return false}else{if(st&&t<st)return false;if(et&&t>et)return false}const days=String(s.days||'').split(',').map(x=>x.trim()).filter(Boolean);return !days.length||days.includes(dayToken(now))}
async function resolvePlaylist(){if(!db||!screen)return {pid:screen?.playlist_id||null,blackout:false,syncGroup:null};try{let group=null;if(screen.group_id){const {data:g}=await db.from('groups').select('*').eq('id',screen.group_id).maybeSingle();group=g||null}const {data,error}=await db.from('schedules').select('*').eq('active',true);if(error)throw error;const relevant=(data||[]).filter(s=>s.screen_id===screen.id||(screen.group_id&&s.group_id===screen.group_id));if(!relevant.length){const pid=group?.playlist_id||screen.playlist_id||null;return {pid,blackout:false,syncGroup:group?.playlist_id?group:null}}const now=new Date();const matches=relevant.filter(s=>scheduleMatches(s,now));matches.sort((a,b)=>Number(b.screen_id===screen.id)-Number(a.screen_id===screen.id)||new Date(b.created_at)-new Date(a.created_at));if(!matches.length)return {pid:null,blackout:true,syncGroup:null};const chosen=matches[0],pid=chosen.playlist_id||group?.playlist_id||screen.playlist_id||null;return {pid,blackout:false,syncGroup:chosen.group_id?group:null}}catch(e){return {pid:screen.playlist_id||null,blackout:false,syncGroup:null}}}
async function heartbeat(){
 if(!db||!screen)return false;
 const now=new Date().toISOString();
 let screenOk=false, logOk=false;
 try{
  const {error}=await db.from('screens')
   .update({status:'online',ultima_conexao:now,updated_at:now})
   .eq('id',screen.id);
  if(error)throw error;
  screen={...screen,status:'online',ultima_conexao:now,updated_at:now};
  screenOk=true;
 }catch(e){
  console.error('HEARTBEAT screens',e);
 }
 try{
  const {error}=await db.from('screen_heartbeat').insert({
   screen_id:screen.id,
   player_version:PLAYER_VERSION,
   created_at:now
  });
  if(error)throw error;
  logOk=true;
 }catch(e){
  console.error('HEARTBEAT log',e);
 }
 if(!screenOk && !logOk){
  setStatus('Sem heartbeat • '+platform+' • v'+PLAYER_VERSION,true);
  return false;
 }
 return true;
}
async function loadPlaylist(){
 if(!db||!screen)return false;
 const resolved=await resolvePlaylist();
 const pid=resolved.pid;
 activeSyncGroup=resolved.syncGroup||null;
 if(resolved.blackout){
   blackout=true;root.classList.add('blackout');items=[];activePlaylistId=null;playlistSignature='BLACKOUT';await finishProof();clearStage();hideEmpty();status.classList.remove('visible');document.getElementById('controls')?.classList.remove('visible');return false
 }
 if(blackout){blackout=false;root.classList.remove('blackout');playlistSignature='';}
 if(!pid){items=[];activePlaylistId=null;playlistSignature='';showEmpty('Nenhuma playlist vinculada à tela '+code+'.');return false}
 const {data:pi,error:piError}=await db.from('playlist_items').select('id,playlist_id,media_id,sort_order,duration,transition').eq('playlist_id',pid).order('sort_order',{ascending:true});
 if(piError)throw new Error('playlist_items: '+piError.message);
 const ids=[...new Set((pi||[]).map(x=>x.media_id).filter(Boolean))];
 if(!ids.length){items=[];showEmpty('A playlist vinculada está vazia.');return false}
 const {data:med,error:medError}=await db.from('media').select('id,type,file_url,text_content,name,duration,active').in('id',ids);
 if(medError)throw new Error('media: '+medError.message);
 const byId=new Map((med||[]).map(m=>[m.id,m]));
 const rows=(pi||[]).map(r=>({...r,media:byId.get(r.media_id)})).filter(r=>r.media&&r.media.active!==false);
 const sig=pid+'|'+(activeSyncGroup?.id||'solo')+'|'+JSON.stringify(rows.map(r=>[r.id,r.sort_order,r.duration,r.media.id,r.media.file_url]));
 if(sig===playlistSignature)return true;
 playlistSignature=sig;activePlaylistId=pid;index=0;items=await prepareItems(rows);
 localStorage.setItem('vitrine_manifest_'+code,JSON.stringify({saved_at:Date.now(),playlist_id:pid,items:normalize(rows),orientation:screen.orientation}));
 if(!items.length){showEmpty('Nenhum conteúdo ativo disponível.');return false}
 hideEmpty(); if(started)playNext(); return true;
}
async function loadCached(){try{const x=JSON.parse(localStorage.getItem('vitrine_manifest_'+code)||'null');if(x?.items?.length){applyOrientation(pathOrientation||x.orientation||'landscape');activePlaylistId=x.playlist_id||null;items=await prepareItems(x.items);setStatus('Offline • conteúdo em cache • '+platform,true);return true}}catch(e){}return false}
function readDemo(key){try{return JSON.parse(localStorage.getItem('vd3_'+key)||'[]')}catch(e){return []}}
const LOCAL_MEDIA_DB='vitrine_local_media_v1',LOCAL_MEDIA_STORE='files';
function localMediaDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(LOCAL_MEDIA_DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(LOCAL_MEDIA_STORE))r.result.createObjectStore(LOCAL_MEDIA_STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function localMediaUrl(url){if(!String(url||'').startsWith('idb://'))return url;try{const d=await localMediaDb(),id=String(url).slice(6);const file=await new Promise((resolve,reject)=>{const r=d.transaction(LOCAL_MEDIA_STORE,'readonly').objectStore(LOCAL_MEDIA_STORE).get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});d.close();return file?URL.createObjectURL(file):''}catch(e){console.error('local media',e);return ''}}
async function loadDemo(){
 const screens=readDemo('screens'), playlists=readDemo('playlists'), media=readDemo('media'), pi=readDemo('playlist_items');
 screen=screens.find(x=>String(x.code||'').trim()===code);
 if(!screen){showEmpty('Tela '+code+' não encontrada no Demo local.');return false}
 applyOrientation(screen.orientation||pathOrientation||p.get('orientation')||'landscape');
 activePlaylistId=screen.playlist_id||null;
 if(!activePlaylistId){showEmpty('Nenhuma playlist vinculada à tela '+code+'.');return false}
 const rows=pi.filter(x=>x.playlist_id===activePlaylistId).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)).map(r=>{const m=media.find(x=>x.id===r.media_id);return m?{...r,media:m}:null}).filter(Boolean);
 items=await prepareItems(rows); playlistSignature='demo|'+activePlaylistId+'|'+rows.length;
 const pl=playlists.find(x=>x.id===activePlaylistId); setStatus('Demo local • '+(pl?.name||'Playlist')+' • '+platform,true);
 if(!items.length){showEmpty('A playlist vinculada está vazia.');return false}
 return true
}

async function syncRemote(){
 if(syncBusy||!db||!screen)return; syncBusy=true;
 try{await loadPlaylist();setStatus((navigator.onLine===false?'Offline':'Online')+' • '+platform+' • v'+PLAYER_VERSION,true)}
 catch(e){console.error('SYNC',e);setStatus('Sem sincronização • cache ativo • '+platform+' • v'+PLAYER_VERSION,true)}
 finally{syncBusy=false}
}
async function reconnect(){
 if(!hasConfig||navigator.onLine===false)return;
 try{
  if(!db)db=window.supabase.createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false}});
  if(!screen){const {data,error}=await db.from('screens').select('*').eq('code',code).eq('active',true).maybeSingle();if(error)throw error;if(data){screen=data;applyOrientation(data.orientation||pathOrientation||p.get('orientation')||'landscape')}}
  if(screen){await syncRemote();await heartbeat()}
 }catch(e){console.error('RECONNECT',e)}
}
function installResilience(){
 window.addEventListener('offline',()=>setStatus('Offline • conteúdo em cache • '+platform+' • v'+PLAYER_VERSION,true));
 window.addEventListener('online',()=>{setStatus('Reconectando • '+platform+' • v'+PLAYER_VERSION,true);reconnect()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)reconnect()});
 reconnectTimer=setInterval(()=>{if(navigator.onLine!==false)reconnect()},60000);
}


function installWatchdog(){
 watchdogTimer=setInterval(()=>{
  if(document.hidden)return;
  const stale=Date.now()-lastPlaybackActivity>120000;
  if(stale&&items.length){console.warn('WATCHDOG: reprodução sem atividade; reiniciando player');index=0;playNext()}
 },30000);
}
function registerServiceWorker(){
 if(!('serviceWorker' in navigator)||location.protocol==='file:')return;
 navigator.serviceWorker.register('../sw.js').catch(e=>console.warn('SW',e));
}

async function enableTvMode(){
 if(!tvMode)return;
 document.documentElement.classList.add('tv-mode');root.classList.add('kiosk');
 try{if(screen?.orientation!=='portrait'&&screen?.orientation!=='vertical')applyOrientation('landscape')}catch(e){}
 try{if(document.documentElement.requestFullscreen&&!document.fullscreenElement)await document.documentElement.requestFullscreen()}catch(e){}
 try{if('wakeLock' in navigator)await navigator.wakeLock.request('screen')}catch(e){}
}
function installTvControls(){
 if(!tvMode)return;
 const activate=()=>enableTvMode();
 document.addEventListener('click',activate,{once:true});
 document.addEventListener('keydown',e=>{if(['Enter','MediaPlayPause','ColorF0Red'].includes(e.key))activate()});
 window.addEventListener('resize',()=>{root.style.width='100vw';root.style.height='100vh'});
}

async function boot(){
 applyOrientation(pathOrientation||p.get('orientation')||'landscape');
 installTvControls();
 setStatus('Conectando • '+platform+' • v'+PLAYER_VERSION,true);
 if(!hasConfig){const ok=await loadDemo();if(ok)start();return}
 try{
   if(!window.supabase)throw new Error('Biblioteca Supabase não carregou');
   db=window.supabase.createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false}});
   const {data,error}=await db.from('screens').select('*').eq('code',code).eq('active',true).maybeSingle();
   if(error)throw new Error('screens: '+error.message);
   if(!data)throw new Error('Tela '+code+' não encontrada/ativa');
   screen=data; applyOrientation(data.orientation||pathOrientation||p.get('orientation')||'landscape'); await enableTvMode();
   const ok=await loadPlaylist();
   setStatus('Online • '+platform+' • v'+PLAYER_VERSION,true);
   heartbeat(); heartbeatTimer=setInterval(heartbeat,15000);
   reloadTimer=setInterval(syncRemote,30000);
   if(ok)start();
 }catch(e){
   console.error('PLAYER BOOT',e);
   setStatus('Erro remoto • '+platform+' • v'+PLAYER_VERSION,true);
   const ok=await loadCached();
   if(!ok)showEmpty('Falha ao sincronizar: '+(e?.message||'erro desconhecido'));
   if(ok)setTimeout(()=>{if(!started)start()},300);
 }
}
window.addEventListener('beforeunload',finishProof);registerServiceWorker();installResilience();installWatchdog();boot();
})();
