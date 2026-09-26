/* Vitrine Digital PRO 5.0.3 — Upload resumível TUS para vídeos grandes; Player preservado */
/* Vitrine Digital PRO 4.41.1 — Editor IA · chamada direta + diagnóstico */
const cfg=window.SUPABASE_CONFIG||{};const hasSupabase=!!(cfg.url&&cfg.key&&!cfg.url.includes('SEU-PROJETO'));const db=hasSupabase&&window.supabase?window.supabase.createClient(cfg.url,cfg.key):null;
const blank={screens:[],media:[],playlists:[],playlist_items:[],schedules:[],groups:[],events:[],scenes:[]};
const demo={};for(const k of Object.keys(blank))demo[k]=JSON.parse(localStorage.getItem('vd3_'+k)||'[]');
const save=()=>Object.keys(demo).forEach(k=>localStorage.setItem('vd3_'+k,JSON.stringify(demo[k])));
const qs=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
let vdLastSuccessfulSync=0,vdHadLoadError=false;
function updateConnectionState(){const b=qs('#connectionBadge');if(!b)return;if(!db){b.textContent='Demo local';b.classList.remove('connection-stale');return}if(vdHadLoadError){const ago=vdLastSuccessfulSync?Math.max(0,Math.floor((Date.now()-vdLastSuccessfulSync)/60000)):null;b.textContent=ago===null?'Supabase • sem atualização':`Supabase • dados de há ${ago} min`;b.classList.add('connection-stale')}else{b.textContent='Supabase conectado';b.classList.remove('connection-stale')}}
function vdToast(message,type='info'){let n=qs('#vdToast');if(!n){n=document.createElement('div');n.id='vdToast';n.className='vd-toast';n.setAttribute('role','status');n.setAttribute('aria-live','polite');document.body.appendChild(n)}n.className='vd-toast '+type;n.textContent=message;n.classList.add('show');clearTimeout(vdToast._t);vdToast._t=setTimeout(()=>n.classList.remove('show'),3200)}
function vdBusy(btn,busy,label='Processando…'){if(!btn)return;if(busy){if(!btn.dataset.vdLabel)btn.dataset.vdLabel=btn.textContent;btn.disabled=true;btn.setAttribute('aria-busy','true');btn.textContent=label}else{btn.disabled=false;btn.removeAttribute('aria-busy');btn.textContent=btn.dataset.vdLabel||btn.textContent;delete btn.dataset.vdLabel}}
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random();
const LOCAL_MEDIA_DB='vitrine_local_media_v1',LOCAL_MEDIA_STORE='files';
function localMediaDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(LOCAL_MEDIA_DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(LOCAL_MEDIA_STORE))r.result.createObjectStore(LOCAL_MEDIA_STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function putLocalMedia(id,file){const d=await localMediaDb();return new Promise((resolve,reject)=>{const tx=d.transaction(LOCAL_MEDIA_STORE,'readwrite');tx.objectStore(LOCAL_MEDIA_STORE).put(file,id);tx.oncomplete=()=>{d.close();resolve()};tx.onerror=()=>{d.close();reject(tx.error)}})}
async function getLocalMediaUrl(id){try{const d=await localMediaDb();const file=await new Promise((resolve,reject)=>{const r=d.transaction(LOCAL_MEDIA_STORE,'readonly').objectStore(LOCAL_MEDIA_STORE).get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});d.close();return file?URL.createObjectURL(file):''}catch(e){return ''}}
async function resolveLocalMediaUrls(){if(db)return;for(const m of demo.media){if(String(m.file_url||'').startsWith('idb://'))m.file_url_runtime=await getLocalMediaUrl(String(m.file_url).slice(6));else m.file_url_runtime=m.file_url}}
function mediaSrc(m){return m?.file_url_runtime||m?.file_url||''}
async function bootLocalPlayer(){
 const qp=new URLSearchParams(location.search),code=String(qp.get('localPlayer')||'').trim();if(!code||db)return;
 const screen=demo.screens.find(x=>String(x.code||'').trim()===code);if(!screen)return alert('Tela '+code+' não encontrada.');
 function dayToken(d){return ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'][d.getDay()]}
 function hhmm(d){return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
 function scheduleMatches(sc,now){const iso=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0'),t=hhmm(now);if(sc.active===false)return false;if(sc.start_date&&iso<sc.start_date)return false;if(sc.end_date&&iso>sc.end_date)return false;const st=String(sc.start_time||'').slice(0,5),et=String(sc.end_time||'').slice(0,5);if(st&&et&&st<=et){if(t<st||t>et)return false}else if(st&&et&&st>et){if(t>et&&t<st)return false}else{if(st&&t<st)return false;if(et&&t>et)return false}const days=String(sc.days||'').split(',').map(x=>x.trim()).filter(Boolean);return !days.length||days.includes(dayToken(now))}
 function resolveLocalPlaylist(){const now=new Date(),matches=(demo.schedules||[]).filter(sc=>(sc.screen_id===screen.id||(screen.group_id&&sc.group_id===screen.group_id))&&scheduleMatches(sc,now));matches.sort((a,b)=>Number(b.screen_id===screen.id)-Number(a.screen_id===screen.id)||String(b.created_at||'').localeCompare(String(a.created_at||'')));return {pid:matches[0]?.playlist_id||screen.playlist_id||null,schedule:matches[0]||null}}
 let resolved=resolveLocalPlaylist(),pid=resolved.pid,pl=demo.playlists.find(x=>x.id===pid),rows=demo.playlist_items.filter(x=>x.playlist_id===pid).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
 let media=rows.map(r=>demo.media.find(m=>m.id===r.media_id)).filter(Boolean);await resolveLocalMediaUrls();
 const wrap=document.createElement('div');wrap.id='localPlayerOverlay';wrap.style.cssText='position:fixed;inset:0;z-index:999999;background:#05070b;color:#fff;display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;overflow:hidden';
 wrap.innerHTML='<div id="lpStage" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#000"></div><div id="lpStatus" style="position:absolute;left:14px;bottom:12px;font-size:12px;background:#0009;padding:7px 10px;border-radius:7px"></div><button id="lpStart" style="position:absolute;right:14px;bottom:12px;padding:9px 13px;border:0;border-radius:8px">Iniciar</button><button id="lpClose" style="position:absolute;right:14px;top:12px;padding:7px 11px;border:0;border-radius:8px">Fechar</button>';
 document.body.appendChild(wrap);const stage=wrap.querySelector('#lpStage'),status=wrap.querySelector('#lpStatus'),start=wrap.querySelector('#lpStart');status.textContent='Demo local • '+(pl?.name||'Playlist')+(resolved.schedule?' • Agenda: '+resolved.schedule.name:' • Playlist padrão')+' • '+code+' • v4.11';
 let i=0,t=null,obj=[];const cleanup=()=>{if(t)clearTimeout(t);obj.forEach(URL.revokeObjectURL);wrap.remove()};wrap.querySelector('#lpClose').onclick=cleanup;
 async function show(){if(t)clearTimeout(t);stage.innerHTML='';if(!media.length){stage.innerHTML='<div>Playlist vazia</div>';return}const m=media[i++%media.length],src=mediaSrc(m);if(!src&&m.type!=='text'){stage.innerHTML='<div style="text-align:center"><b>Mídia não encontrada no armazenamento local.</b><br><small>Reenvie este conteúdo nesta versão.</small></div>';status.textContent='ERRO • arquivo local não encontrado • '+m.name;return}
  if(m.type==='video'){const v=document.createElement('video');v.src=src;v.autoplay=true;v.muted=true;v.playsInline=true;v.style.cssText='width:100%;height:100%;object-fit:contain;background:#000';stage.appendChild(v);v.onended=show;v.onerror=()=>{status.textContent='ERRO DE VÍDEO • '+m.name+' • '+(v.error?.message||'formato/arquivo');};try{await v.play();start.style.display='none'}catch(e){status.textContent='Clique em Iniciar • '+m.name;start.style.display='block';start.onclick=async()=>{try{await v.play();start.style.display='none'}catch(err){status.textContent='Falha ao iniciar: '+err.message}}}t=setTimeout(show,Math.max(10,Number(m.duration||30))*1000)}
  else if(m.type==='image'){const im=new Image();im.src=src;im.style.cssText='width:100%;height:100%;object-fit:contain';stage.appendChild(im);t=setTimeout(show,Math.max(2,Number(m.duration||8))*1000)}
  else if(m.type==='web'){const f=document.createElement('iframe');f.src=src;f.style.cssText='width:100%;height:100%;border:0';stage.appendChild(f);t=setTimeout(show,Math.max(5,Number(m.duration||15))*1000)}
  else{const d=document.createElement('div');d.textContent=m.text_content||m.name;d.style.cssText='font-size:5vw;text-align:center;padding:5vw';stage.appendChild(d);t=setTimeout(show,Math.max(2,Number(m.duration||8))*1000)} }
 show();
 setInterval(async()=>{const next=resolveLocalPlaylist();if(next.pid!==pid){pid=next.pid;resolved=next;pl=demo.playlists.find(x=>x.id===pid);rows=demo.playlist_items.filter(x=>x.playlist_id===pid).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));media=rows.map(r=>demo.media.find(m=>m.id===r.media_id)).filter(Boolean);await resolveLocalMediaUrls();i=0;status.textContent='Demo local • '+(pl?.name||'Playlist')+(resolved.schedule?' • Agenda: '+resolved.schedule.name:' • Playlist padrão')+' • '+code+' • v4.11';show()}},15000);
}
async function load(table){
 if(!db)return demo[table]||[];
 const {data,error}=await db.from(table).select('*').order('created_at',{ascending:false});
 if(error){console.error('load '+table,error);vdHadLoadError=true;updateConnectionState();vdToast('Falha ao atualizar '+table+'. Mantendo os últimos dados carregados.','error');return demo[table]||[]}
 vdLastSuccessfulSync=Date.now();return data||[]
}
async function insert(table,row){if(db){const {data,error}=await db.from(table).insert(row).select().single();if(error)throw error;return data}const x={id:uid(),created_at:new Date().toISOString(),...row};(demo[table]||(demo[table]=[])).push(x);save();return x}
async function update(table,id,patch){
 if(db){
  const {data,error}=await db.from(table).update(patch).eq('id',id).select('*');
  if(error)throw error;
  if(!data||data.length!==1)throw new Error('A alteração não foi confirmada pelo servidor. Atualize a página e tente novamente.');
  return data[0];
 }
 const a=demo[table]||[],i=a.findIndex(x=>x.id===id);
 if(i<0)throw new Error('Registro não encontrado para edição.');
 a[i]={...a[i],...patch};save();return a[i]
}
async function remove(table,id){if(db){const {error}=await db.from(table).delete().eq('id',id);if(error)throw error}else{demo[table]=(demo[table]||[]).filter(x=>x.id!==id);save()}}
function storageMediaPath(url){try{const u=new URL(String(url||'')),mark='/storage/v1/object/public/media/';const i=u.pathname.indexOf(mark);return i>=0?decodeURIComponent(u.pathname.slice(i+mark.length)):''}catch{return''}}
async function removeMediaSafely(id){const m=demo.media.find(x=>String(x.id)===String(id));if(!m)throw new Error('Conteúdo não encontrado. Atualize a página.');const u=mediaUsage(id);if(u.links.length)throw new Error('Este conteúdo está em uso. Remova-o das playlists antes de excluir.');await remove('media',id);if(db){const path=storageMediaPath(m.file_url);if(path){const {error}=await db.storage.from('media').remove([path]);if(error){console.warn('storage cleanup',error);vdToast('Conteúdo excluído, mas o arquivo do Storage precisa de limpeza.','error')}}}vdToast('Conteúdo excluído.','success')}
function playlistUsage(id){return {screens:(demo.screens||[]).filter(x=>String(x.playlist_id)===String(id)),schedules:(demo.schedules||[]).filter(x=>String(x.playlist_id)===String(id)),groups:(demo.groups||[]).filter(x=>String(x.playlist_id)===String(id)),items:(demo.playlist_items||[]).filter(x=>String(x.playlist_id)===String(id))}}
async function removePlaylistSafely(id){const u=playlistUsage(id);if(u.screens.length||u.schedules.length||u.groups.length)throw new Error(`Playlist em uso: ${u.screens.length} tela(s), ${u.schedules.length} programação(ões), ${u.groups.length} grupo(s). Remova esses vínculos antes de excluir.`);for(const item of u.items)await remove('playlist_items',item.id);await remove('playlists',id);vdToast('Playlist excluída.','success')}
function groupUsage(id){return {screens:(demo.screens||[]).filter(x=>String(x.group_id)===String(id)),schedules:(demo.schedules||[]).filter(x=>String(x.group_id)===String(id))}}
async function removeGroupSafely(id){const u=groupUsage(id);if(u.schedules.length)throw new Error(`Este grupo possui ${u.schedules.length} programação(ões). Remova ou altere essas programações antes de excluir.`);for(const scr of u.screens)await update('screens',scr.id,{group_id:null});await remove('groups',id);vdToast('Grupo excluído e telas desvinculadas.','success')}
function openModal(title,body){qs('#modalTitle').textContent=title;qs('#modalBody').innerHTML=body;qs('#modal').classList.remove('hidden')}
function closeModal(){qs('#modal').classList.add('hidden')}
qs('#closeModal').onclick=closeModal;qs('#modal').onclick=e=>{if(e.target.id==='modal')closeModal()};
function go(section){document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.section===section));document.querySelectorAll('.section').forEach(s=>s.classList.toggle('active',s.id===section));render()}
document.querySelectorAll('.nav').forEach(n=>n.onclick=()=>go(n.dataset.section));document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g)go(g.dataset.go)});qs('#refreshBtn').onclick=render;
async function loadLatestSyncStatus(){
 if(!db)return {};
 try{
  const {data,error}=await db.from('screen_heartbeat').select('screen_id,player_version,created_at').order('created_at',{ascending:false}).limit(100);
  if(error)throw error;
  const out={};for(const h of (data||[])){if(!out[h.screen_id])out[h.screen_id]=h}return out;
 }catch(e){console.warn('sync status',e);return {}}
}
function parseSyncStatus(h){
 const raw=String(h?.player_version||''),parts=raw.split('|'),kv={};parts.slice(1).forEach(p=>{const i=p.indexOf('=');if(i>0)kv[p.slice(0,i)]=p.slice(i+1)});
 return {version:parts[0]||'—',state:kv.state||'unknown',files:Number(kv.files||0),playlist:kv.playlist||'',created_at:h?.created_at||null};
}
async function render(){
 vdHadLoadError=false;
 await resolveLocalMediaUrls();
 const [screens,media,playlists,schedules,groups,items,scenes,syncStatus]=await Promise.all([load('screens'),load('media'),load('playlists'),load('schedules'),load('groups'),load('playlist_items'),load('scenes'),loadLatestSyncStatus()]);
 // Keep the in-memory state synchronized with Supabase. Modal editors and actions use `demo` as the current UI state.
 if(db){demo.screens=screens;demo.media=media;demo.playlists=playlists;demo.schedules=schedules;demo.groups=groups;demo.playlist_items=items;demo.scenes=scenes;}
 const online=screens.filter(s=>s.status==='online').length;qs('#statScreens').textContent=screens.length;qs('#statScreensSub').textContent=`${online} online`;qs('#statMedia').textContent=media.length;qs('#statPlaylists').textContent=playlists.length;qs('#statSchedules').textContent=schedules.length;qs('#modeLabel').textContent=db?'SUPABASE':'DEMO LOCAL';updateConnectionState();
 renderScreens(screens,playlists);renderMedia(media);renderPlaylists(playlists,media,items);renderSchedules(schedules,playlists,screens,groups);renderGroups(groups,screens,playlists);renderDashboard(screens,playlists,media,items,schedules);renderMonitor(screens,playlists,media,items,schedules,syncStatus);renderCampaigns(screens,playlists,media,items,schedules,groups);renderReports();
}

function renderCampaigns(screens,playlists,media,items,schedules,groups){
 const host=qs('#campaignGrid');if(!host)return;const now=new Date();
 const live=(schedules||[]).filter(sc=>(screens||[]).some(scr=>monitorScheduleMatches(sc,scr,now)));
 const today=now.toISOString().slice(0,10);const upcoming=(schedules||[]).filter(sc=>sc.active!==false&&sc.start_date&&sc.start_date>today);
 const covered=new Set();live.forEach(sc=>{if(sc.screen_id)covered.add(String(sc.screen_id));if(sc.group_id)(screens||[]).filter(x=>String(x.group_id)===String(sc.group_id)).forEach(x=>covered.add(String(x.id)))});
 const online=(screens||[]).filter(monitorIsOnline).length,health=screens.length?Math.round(online/screens.length*100):0;
 const set=(id,v)=>{const e=qs(id);if(e)e.textContent=v};set('#campaignLive',live.length);set('#campaignNext',upcoming.length);set('#campaignCoverage',covered.size);set('#networkHealth',screens.length?health+'%':'—');
 const statusOf=sc=>{if(sc.active===false)return ['Pausada','paused'];if(sc.end_date&&sc.end_date<today)return ['Encerrada','ended'];if(sc.start_date&&sc.start_date>today)return ['Próxima','next'];if((screens||[]).some(scr=>monitorScheduleMatches(sc,scr,now)))return ['Em exibição','live'];return ['Programada','scheduled']};
 host.innerHTML=(schedules||[]).slice().sort((a,b)=>String(b.start_date||'').localeCompare(String(a.start_date||''))).map(sc=>{const pl=(playlists||[]).find(p=>String(p.id)===String(sc.playlist_id));const count=(items||[]).filter(i=>String(i.playlist_id)===String(sc.playlist_id)).length;const target=sc.screen_id?(screens||[]).find(x=>String(x.id)===String(sc.screen_id))?.name:(groups||[]).find(x=>String(x.id)===String(sc.group_id))?.name;const [label,cls]=statusOf(sc);return `<article class="campaign-card"><div class="campaign-card-head"><div><b>${esc(sc.name||'Campanha')}</b><small>${esc(pl?.name||'Playlist não encontrada')}</small></div><span class="campaign-status ${cls}">${label}</span></div><div class="campaign-meta"><span>▣ ${esc(target||'Destino não definido')}</span><span>▶ ${count} conteúdo(s)</span><span>◷ ${esc(String(sc.start_time||'—').slice(0,5))}–${esc(String(sc.end_time||'—').slice(0,5))}</span></div><div class="campaign-actions"><button class="btn small ghost" data-go="schedules">Programação</button><button class="btn small ghost" data-go="playlists">Playlist</button><button class="btn small ghost" data-go="monitor">Monitorar</button></div></article>`}).join('')||'<div class="future-empty"><b>Nenhuma campanha programada.</b><span>Crie conteúdo, monte uma playlist e programe a primeira campanha.</span><button class="btn" data-go="schedules">Criar programação</button></div>';
 const readiness=qs('#futureReadiness');if(readiness){const checks=[['Telas comunicando',screens.length?online+'/'+screens.length:'Nenhuma tela',screens.length&&online===screens.length],['Playlists com conteúdo',(playlists||[]).filter(p=>(items||[]).some(i=>String(i.playlist_id)===String(p.id))).length+'/'+playlists.length,playlists.length>0&&(playlists||[]).every(p=>(items||[]).some(i=>String(i.playlist_id)===String(p.id)))],['Programações válidas',(schedules||[]).filter(sc=>sc.playlist_id&&(sc.screen_id||sc.group_id)).length+'/'+schedules.length,schedules.length>0&&(schedules||[]).every(sc=>sc.playlist_id&&(sc.screen_id||sc.group_id))],['Proof-of-play','Relatórios habilitados',true]];readiness.innerHTML=checks.map(([a,b,ok])=>`<div class="readiness-row"><span class="readiness-dot ${ok?'ok':'warn'}"></span><div><b>${a}</b><small>${b}</small></div></div>`).join('')}
}
function monitorIsOnline(s){const raw=s.ultima_conexao||s.last_seen||s.updated_at;const t=raw?new Date(raw).getTime():0;return !!t&&(Date.now()-t)<=45000}
function monitorAgo(raw){if(!raw)return 'Nunca conectado';const sec=Math.max(0,Math.floor((Date.now()-new Date(raw).getTime())/1000));if(sec<60)return 'agora';const min=Math.floor(sec/60);if(min<60)return `há ${min} min`;const h=Math.floor(min/60);if(h<24)return `há ${h} h`;return `há ${Math.floor(h/24)} dia(s)`}
function monitorScheduleMatches(sc,screen,now){if(sc.active===false)return false;if(sc.screen_id!==screen.id&&!(screen.group_id&&sc.group_id===screen.group_id))return false;const iso=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');if(sc.start_date&&iso<sc.start_date)return false;if(sc.end_date&&iso>sc.end_date)return false;const day=['Dom','Seg','Ter','Qua','Qui','Sex','Sab'][now.getDay()],days=String(sc.days||'').split(',').map(x=>x.trim()).filter(Boolean);if(days.length&&!days.includes(day))return false;const t=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0'),st=String(sc.start_time||'').slice(0,5),et=String(sc.end_time||'').slice(0,5);if(st&&et&&st<=et)return t>=st&&t<=et;if(st&&et)return t>=st||t<=et;if(st&&t<st)return false;if(et&&t>et)return false;return true}
let monitorPreviewTimers=[];
function stopMonitorPreviewTimers(){monitorPreviewTimers.forEach(clearTimeout);monitorPreviewTimers=[];}
function monitorPreviewSequence(pid,items,media){
 const mmap=new Map((media||[]).map(m=>[String(m.id),m]));
 return (items||[]).filter(i=>String(i.playlist_id)===String(pid)).sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0)).map(i=>({m:mmap.get(String(i.media_id)),duration:Number(i.duration)||0})).filter(x=>x.m);
}
function startMonitorPreview(box,seq){
 // LOW EGRESS: Monitoramento nunca abre arquivos do Storage automaticamente.
 // O player real continua disponível no botão "Abrir Player".
 if(!box)return;
 box.innerHTML='<div class="monitor-placeholder" title="Prévia desativada para economizar dados">▣</div>';
}
function startAllMonitorPreviews(previews){
 stopMonitorPreviewTimers();
 // Intencionalmente sem vídeo/imagem: evita GET/Range no Supabase Storage.
 requestAnimationFrame(()=>previews.forEach(x=>{const box=document.querySelector(`[data-monitor-live="${CSS.escape(String(x.screenId))}"]`);if(box)startMonitorPreview(box,x.seq)}));
}
function renderMonitor(screens,playlists,media,items,schedules,syncStatus={}){const grid=qs('#monitorGrid');if(!grid)return;stopMonitorPreviewTimers();const term=(qs('#monitorSearch')?.value||'').toLowerCase(),filter=qs('#monitorFilter')?.value||'all',now=new Date();const states=screens.map(s=>({s,online:monitorIsOnline(s)}));const onlineCount=states.filter(x=>x.online).length;qs('#monitorTotal').textContent=screens.length;qs('#monitorOnline').textContent=onlineCount;qs('#monitorOffline').textContent=screens.length-onlineCount;qs('#monitorUpdated').textContent=now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});const alertBox=qs('#monitorAlert');const offlineCount=screens.length-onlineCount;if(alertBox){alertBox.classList.toggle('hidden',offlineCount===0);alertBox.innerHTML=offlineCount?`⚠ <b>${offlineCount} tela(s) offline</b> — verifique energia ou conexão do dispositivo.`:'';}const arr=states.filter(({s,online})=>(filter==='all'||filter===(online?'online':'offline'))&&`${s.name} ${s.code} ${s.location||''}`.toLowerCase().includes(term)).sort((a,b)=>Number(a.online)-Number(b.online)||String(a.s.name||'').localeCompare(String(b.s.name||''),'pt-BR'));const previews=[];grid.innerHTML=arr.map(({s,online})=>{const active=(schedules||[]).filter(sc=>monitorScheduleMatches(sc,s,now)).sort((a,b)=>Number(b.screen_id===s.id)-Number(a.screen_id===s.id))[0];const pid=active?.playlist_id||s.playlist_id;const pl=playlists.find(p=>p.id===pid);const seq=monitorPreviewSequence(pid,items,media);const m=seq[0]?.m;if(seq.length)previews.push({screenId:s.id,seq});const preview=seq.length?`<div class="monitor-live-box" data-monitor-live="${esc(s.id)}"><div class="monitor-placeholder">▶</div></div>`:'<div class="monitor-placeholder">▣</div>';const last=s.ultima_conexao||s.last_seen||s.updated_at;const sy=parseSyncStatus(syncStatus[s.id]);const syncLabel=sy.state==='ok'?'🟢 Sincronizada':sy.state==='downloading'?'🟡 Baixando':'⚪ Aguardando status';const syncInfo=sy.created_at?`${syncLabel} · ${sy.files} arquivo(s) locais<br><span class="muted">Player ${esc(sy.version)} · sync ${esc(monitorAgo(sy.created_at))}</span>`:`${syncLabel}`;return `<div class="card monitor-card ${s.orientation==='portrait'?'portrait':''}"><div class="monitor-preview">${preview}<span class="monitor-state ${online?'online':'offline'}">${online?'● ONLINE':'● OFFLINE'}</span></div><div class="monitor-info"><div class="monitor-title">${esc(s.name)}</div><div class="monitor-meta"><b>${esc(s.code)}</b>${s.location?' · '+esc(s.location):''}<br>Última comunicação: ${esc(monitorAgo(last))}<br>${s.orientation==='portrait'?'Vertical 9:16':'Horizontal 16:9'}</div><div class="monitor-now"><b>Conteúdo:</b> ${esc(pl?.name||m?.name||'Sem conteúdo')}<br><span class="muted">${active?'Programação: '+esc(active.name):'Playlist: '+esc(pl?.name||'—')}</span></div><div class="monitor-now monitor-sync"><b>Sincronização:</b> ${syncInfo}</div><div class="monitor-actions"><button class="btn small ghost" data-screen-diagnostic="${s.id}">Diagnóstico</button><button class="btn small ghost" data-screen-test="${s.id}">Abrir Player</button><button class="btn small" data-screen-edit="${s.id}">Configurar</button></div></div></div>`}).join('')||'<div class="card"><p class="muted">Nenhuma tela encontrada.</p></div>';startAllMonitorPreviews(previews)}
function openScreenDiagnostic(id){
 const s=demo.screens.find(x=>String(x.id)===String(id));if(!s)return;
 const now=new Date(),last=s.ultima_conexao||s.last_seen||s.updated_at,online=monitorIsOnline(s);
 const active=(demo.schedules||[]).filter(sc=>monitorScheduleMatches(sc,s,now)).sort((a,b)=>Number(b.screen_id===s.id)-Number(a.screen_id===s.id))[0];
 const pid=active?.playlist_id||s.playlist_id,pl=(demo.playlists||[]).find(p=>String(p.id)===String(pid));
 const group=(demo.groups||[]).find(g=>String(g.id)===String(s.group_id));
 const age=last?Math.max(0,Math.floor((Date.now()-new Date(last).getTime())/1000)):null;
 const health=online?'Operação normal':(last?'Sem heartbeat recente':'Nunca comunicou');
 openModal('Diagnóstico — '+esc(s.name||s.code),`<div class="card"><div class="mini"><span><b>Status</b></span><span class="${online?'status-online':'status-offline'}">${online?'● ONLINE':'● OFFLINE'}</span></div><p><b>Saúde:</b> ${esc(health)}</p><p><b>Código:</b> <code>${esc(s.code||'—')}</code></p><p><b>Local:</b> ${esc(s.location||'—')}</p><p><b>Orientação:</b> ${s.orientation==='portrait'?'Vertical 9:16':'Horizontal 16:9'}</p><p><b>Última comunicação:</b> ${esc(monitorAgo(last))}${age!==null?' ('+age+'s)':''}</p><p><b>Playlist efetiva:</b> ${esc(pl?.name||'—')}</p><p><b>Programação ativa:</b> ${esc(active?.name||'Nenhuma — usando playlist padrão')}</p><p><b>Grupo:</b> ${esc(group?.name||'Sem grupo')}</p><p class="muted">Online exige heartbeat recebido nos últimos 45 segundos. O painel atualiza automaticamente a cada 15 segundos.</p></div>`);
}
function renderDashboard(screens,playlists,media,items,schedules){
 const host=qs('#dashboardScreens');if(!host)return;const now=new Date();
 const attention=qs('#opsAttention'),lastUpdate=qs('#opsLastUpdate');
 const itemCount=new Map();(items||[]).forEach(i=>itemCount.set(String(i.playlist_id),(itemCount.get(String(i.playlist_id))||0)+1));
 const offlineScreens=(screens||[]).filter(s=>!monitorIsOnline(s));
 const noPlaylist=(screens||[]).filter(s=>!s.playlist_id&&!s.group_id);
 const emptyPlaylists=(playlists||[]).filter(p=>!(itemCount.get(String(p.id))||0));
 const invalidSchedules=(schedules||[]).filter(sc=>!sc.playlist_id||(!(sc.screen_id)&&!(sc.group_id)));
 if(lastUpdate)lastUpdate.textContent='Atualizado '+now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
 if(attention){const issues=[];
  if(offlineScreens.length)issues.push(`<button class="ops-issue danger" data-go="monitor"><b>${offlineScreens.length}</b><span>Tela(s) offline<small>Verificar conexão ou energia</small></span><i>›</i></button>`);
  if(noPlaylist.length)issues.push(`<button class="ops-issue warn" data-go="screens"><b>${noPlaylist.length}</b><span>Tela(s) sem conteúdo padrão<small>Vincule playlist ou grupo</small></span><i>›</i></button>`);
  if(emptyPlaylists.length)issues.push(`<button class="ops-issue warn" data-go="playlists"><b>${emptyPlaylists.length}</b><span>Playlist(s) vazia(s)<small>Adicione pelo menos um conteúdo</small></span><i>›</i></button>`);
  if(invalidSchedules.length)issues.push(`<button class="ops-issue warn" data-go="schedules"><b>${invalidSchedules.length}</b><span>Programação(ões) incompleta(s)<small>Revise playlist e alvo</small></span><i>›</i></button>`);
  attention.innerHTML=issues.join('')||'<div class="ops-ok"><b>✓ Operação sem pendências críticas</b><span>Telas, playlists e programações básicas estão consistentes.</span></div>';
 }
 const online=screens.filter(monitorIsOnline).length,offline=Math.max(0,screens.length-online);
 const activeSchedules=(schedules||[]).filter(sc=>(screens||[]).some(s=>monitorScheduleMatches(sc,s,now)));
 const quick=`<div class="dash-ops"><div class="dash-summary"><button class="dash-kpi" data-go="monitor"><b>${online}</b><span>TVs online</span></button><button class="dash-kpi ${offline?'warn':''}" data-go="monitor"><b>${offline}</b><span>TVs offline</span></button><button class="dash-kpi" data-go="schedules"><b>${activeSchedules.length}</b><span>Programações ativas</span></button><button class="dash-kpi" data-go="media"><b>${(media||[]).length}</b><span>Conteúdos</span></button></div><div class="dash-actions"><button class="btn" data-go="monitor">▣ Abrir Central</button><button class="btn ghost" data-go="schedules">◷ Programações</button><button class="btn ghost" data-go="media">＋ Conteúdos</button><button class="btn ghost" data-go="playlists">▶ Playlists</button></div></div>`;
 const cards=screens.length?screens.slice().sort((a,b)=>Number(monitorIsOnline(b))-Number(monitorIsOnline(a))||String(a.name||'').localeCompare(String(b.name||''),'pt-BR')).slice(0,8).map(s=>{const isOnline=monitorIsOnline(s);const active=(schedules||[]).filter(sc=>monitorScheduleMatches(sc,s,now)).sort((a,b)=>Number(b.screen_id===s.id)-Number(a.screen_id===s.id))[0];const pid=active?.playlist_id||s.playlist_id;const pl=(playlists||[]).find(p=>String(p.id)===String(pid));const seq=monitorPreviewSequence(pid,items,media),current=seq[0]?.m;return `<div class="dash-screen"><div><b>${esc(s.name)}</b><small>${esc(s.code)}${s.location?' · '+esc(s.location):''}</small><span>${active?'Programação: '+esc(active.name):'Playlist: '+esc(pl?.name||'—')}</span><span>Conteúdo: ${esc(current?.name||pl?.name||'Sem conteúdo')}</span></div><div class="dash-screen-side"><span class="${isOnline?'status-online':'status-offline'}">${isOnline?'● Online':'○ Offline'}</span><small>${esc(monitorAgo(s.ultima_conexao||s.last_seen||s.updated_at))}</small><button class="btn small ghost" data-screen-diagnostic="${s.id}">Diagnóstico</button></div></div>`}).join(''):'<p class="muted">Cadastre a primeira tela.</p>';
 host.innerHTML=quick+`<div class="dash-screen-list">${cards}</div>`;
}
function renderScreens(screens,playlists){const term=(qs('#screenSearch')?.value||'').toLowerCase(),filter=qs('#screenFilter')?.value||'all';const arr=screens.filter(s=>(filter==='all'||s.status===filter)&&`${s.name} ${s.code} ${s.location||''}`.toLowerCase().includes(term));qs('#screensBody').innerHTML=arr.map(s=>`<tr><td data-label="Tela"><b>${esc(s.name)}</b><br><small class="muted">${esc(s.resolution||'Auto')}</small></td><td data-label="Código"><code>${esc(s.code)}</code></td><td data-label="Local">${esc(s.location||'—')}</td><td data-label="Orientação">${s.orientation==='portrait'?'↕ Vertical':'↔ Horizontal'}</td><td data-label="Status" class="${s.status==='online'?'status-online':'status-offline'}">${s.status==='online'?'● Online':'○ Offline'}</td><td data-label="Playlist">${esc((playlists.find(p=>p.id===s.playlist_id)||{}).name||'—')}</td><td data-label="Ações"><div class="action-row"><button class="btn small" data-screen-edit="${s.id}">Editar</button><button class="btn small ghost" data-screen-test="${s.id}">Abrir</button></div></td></tr>`).join('')||`<tr><td colspan="7" class="muted">Nenhuma tela encontrada.</td></tr>`}
function mediaUsage(id){const links=(demo.playlist_items||[]).filter(i=>String(i.media_id)===String(id));const pids=[...new Set(links.map(i=>String(i.playlist_id)))];const pls=pids.map(pid=>demo.playlists.find(p=>String(p.id)===pid)).filter(Boolean);const sids=[...new Set((demo.schedules||[]).filter(sc=>pids.includes(String(sc.playlist_id))).map(sc=>String(sc.id)))];return {links,pls,schedules:sids.length}}
function renderMedia(media){const term=(qs('#mediaSearch')?.value||'').toLowerCase(),type=qs('#mediaTypeFilter')?.value||'all';const arr=media.filter(m=>(type==='all'||m.type===type)&&`${m.name} ${m.type}`.toLowerCase().includes(term));qs('#mediaGrid').innerHTML=arr.map(m=>{let src=mediaSrc(m),thumb=m.type==='image'?`<img src="${esc(src)}" loading="lazy">`:m.type==='video'?`<span class="video-low-egress-thumb">▶ VÍDEO</span>`:m.type==='web'?`<span>🌐 WEB</span>`:`<span>▤ TEXTO</span>`;const u=mediaUsage(m.id),used=u.pls.length?`<button class="media-usage used" data-media-usage="${m.id}">Em uso · ${u.pls.length} playlist${u.pls.length>1?'s':''}</button>`:`<span class="media-usage free">Livre</span>`;return `<div class="card media-card"><div class="thumb media-preview-trigger" data-media-preview="${m.id}" role="button" tabindex="0" title="Visualizar conteúdo">${mediaSrc(m)?thumb:'Sem prévia'}<span class="media-preview-badge">Visualizar</span></div><div class="media-info"><strong>${esc(m.name)}</strong><span class="tag">${esc(m.type)}</span> <span class="tag">${esc(m.duration||10)}s</span>${used}<div class="action-row" style="margin-top:10px"><button class="btn small" data-media-edit="${m.id}">Editar</button><button class="btn small danger" data-media-del="${m.id}">Excluir</button></div></div></div>`}).join('')||'<div class="card"><p class="muted">Nenhum conteúdo encontrado.</p></div>'}
function showMediaUsage(id){const m=demo.media.find(x=>String(x.id)===String(id));if(!m)return;const u=mediaUsage(id);const rows=u.pls.map(p=>`<div class="usage-row"><strong>${esc(p.name)}</strong><span>${(demo.playlist_items||[]).filter(i=>String(i.playlist_id)===String(p.id)&&String(i.media_id)===String(id)).length} vínculo</span></div>`).join('');openModal('Onde este conteúdo é usado',`<div class="form"><div class="card"><strong>${esc(m.name)}</strong><p class="muted">${u.pls.length} playlist(s) · ${u.schedules} programação(ões) relacionadas</p></div>${rows||'<div class="card"><p class="muted">Este conteúdo não está vinculado a nenhuma playlist.</p></div>'}<div class="mobile-form-actions"><button type="button" class="btn" data-modal-cancel>Fechar</button></div></div>`)}
function previewMedia(id){
 const m=demo.media.find(x=>x.id===id);if(!m)return;
 const src=mediaSrc(m);let body;
 if(m.type==='image')body=`<img src="${esc(src)}" style="width:100%;max-height:70vh;object-fit:contain;background:#000">`;
 else if(m.type==='video')body=`<div class="video-preview-wrap"><div id="vdVideoGate" style="min-height:220px;display:flex;align-items:center;justify-content:center;background:#000;padding:24px;text-align:center"><button type="button" class="btn" id="vdLoadVideo">▶ Carregar prévia do vídeo</button></div><div id="vdVideoStatus" class="video-status">Prévia bloqueada para economizar dados. O vídeo só será baixado se você tocar em “Carregar prévia”.</div></div>`;
 else if(m.type==='web')body=`<div class="card"><p class="muted">Página Web</p><p>${esc(m.file_url||'Sem URL')}</p></div>`;
 else body=`<div class="card" style="font-size:22px;line-height:1.5">${esc(m.text_content||m.name||'Texto')}</div>`;
 openModal(esc(m.name||'Pré-visualização'),`<div class="media-preview-modal">${body}<div class="media-preview-meta"><span class="tag">${esc(m.type)}</span><span class="tag">${esc(m.duration||10)}s</span></div></div>`);
 if(m.type==='video'){
  const b=qs('#vdLoadVideo'),gate=qs('#vdVideoGate'),st=qs('#vdVideoStatus');
  if(b&&gate&&st)b.addEventListener('click',()=>{
   gate.innerHTML=`<video id="vdVideoPreview" src="${esc(src)}" muted controls playsinline preload="metadata" style="width:100%;max-height:70vh;object-fit:contain;background:#000"></video>`;
   const v=qs('#vdVideoPreview');st.textContent='Carregando prévia sob demanda…';
   v.addEventListener('loadedmetadata',()=>{st.textContent=`✓ Prévia carregada · ${v.videoWidth||'?'}×${v.videoHeight||'?'} · ${Number(v.duration||0).toFixed(1)}s`;st.classList.add('ok')});
   v.addEventListener('error',()=>{st.textContent='⚠ Não foi possível carregar a prévia deste vídeo.';st.classList.add('bad')});
  },{once:true});
 }
}
function hydrateVideoThumbs(){document.querySelectorAll('.playlist-item-thumb video,.thumb video').forEach(v=>{if(v.dataset.thumbReady)return;v.dataset.thumbReady='1';v.muted=true;v.playsInline=true;v.preload='metadata';v.addEventListener('loadedmetadata',()=>{try{v.currentTime=Math.min(.35,Math.max(0,(v.duration||1)/10))}catch(_){}});v.addEventListener('seeked',()=>v.classList.add('frame-ready'));v.addEventListener('error',()=>v.closest('.playlist-item-thumb,.thumb')?.classList.add('video-thumb-error'))})}
function renderPlaylists(playlists,media,items){qs('#playlistGrid').innerHTML=playlists.map(p=>{const its=items.filter(i=>i.playlist_id===p.id).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));const total=its.reduce((sum,i)=>{const m=media.find(x=>x.id===i.media_id);return sum+Math.max(1,Number(i.duration||m?.duration||10))},0);return `<div class="card playlist-card"><div class="section-head playlist-head" style="margin:0"><div><h2>${esc(p.name)}</h2><small class="muted">${its.length} itens · ${total}s por ciclo</small></div><button class="btn small" data-playlist-add="${p.id}">+ Item</button></div><div class="playlist-items" data-playlist="${p.id}">${its.map((i,pos)=>{const m=media.find(x=>x.id===i.media_id);const src=m?mediaSrc(m):'';const thumb=m?.type==='image'?`<img src="${esc(src)}" alt="">`:m?.type==='video'?`<span class="video-low-egress-thumb">▶</span>`:`<span>${m?.type==='text'?'T':'▣'}</span>`;const dur=Math.max(1,Number(i.duration||m?.duration||10));return `<div class="drag-item playlist-mobile-item" draggable="true" data-item="${i.id}"><div class="playlist-order">${pos+1}</div><div class="playlist-item-thumb media-preview-trigger" ${m?`data-media-preview="${m.id}" role="button" tabindex="0" title="Visualizar ${esc(m.name||'conteúdo')}"`:''}>${thumb}<span class="playlist-play-badge">▶</span></div><div class="playlist-item-copy media-preview-trigger" ${m?`data-media-preview="${m.id}" role="button" tabindex="0"`:''}><strong>${esc(m?.name||'Conteúdo removido')}</strong><small>${esc(m?.type||'—')} · ${dur}s</small><small class="playlist-preview-hint">Toque para visualizar</small></div><div class="playlist-item-actions"><button class="btn small ghost mobile-order-btn" data-item-up="${i.id}" title="Mover para cima">↑</button><button class="btn small ghost mobile-order-btn" data-item-down="${i.id}" title="Mover para baixo">↓</button><button class="btn small danger" data-item-del="${i.id}" title="Remover">×</button></div></div>`}).join('')||'<div class="dropzone">Arraste conteúdos para esta playlist</div>'}</div><div class="action-row playlist-actions" style="margin-top:10px"><button class="btn small ghost" data-playlist-preview="${p.id}">▶ Pré-visualizar</button><button class="btn small ghost" data-playlist-duplicate="${p.id}">⧉ Duplicar</button><button class="btn small danger" data-playlist-del="${p.id}">Excluir</button></div></div>`}).join('')||'<div class="card"><p class="muted">Crie sua primeira playlist.</p></div>';wireDrag();setTimeout(hydrateVideoThumbs,0)}
function renderSchedules(schedules,playlists,screens,groups){qs('#schedulesBody').innerHTML=schedules.map(s=>`<tr><td data-label="Programação"><b>${esc(s.name)}</b></td><td data-label="Playlist">${esc(playlists.find(p=>p.id===s.playlist_id)?.name||'—')}</td><td data-label="Alvo">${s.group_id?'Grupo: '+esc(groups.find(g=>g.id===s.group_id)?.name||'—'):'Tela: '+esc(screens.find(x=>x.id===s.screen_id)?.name||'—')}</td><td data-label="Período">${esc(s.start_date||'Hoje')} → ${esc(s.end_date||'Sem fim')}</td><td data-label="Horário">${esc(s.start_time||'')}–${esc(s.end_time||'')}</td><td data-label="Dias">${esc(s.days||'Todos')}</td><td data-label="Ações"><div class="action-row"><button class="btn small" data-schedule-edit="${s.id}">Editar</button><button class="btn small ghost" data-schedule-duplicate="${s.id}">⧉ Duplicar</button><button class="btn small danger" data-schedule-del="${s.id}">Excluir</button></div></td></tr>`).join('')||'<tr><td colspan="7" class="muted">Nenhuma programação.</td></tr>'}
function renderGroups(groups,screens,playlists){qs('#groupsGrid').innerHTML=groups.map(g=>{const ss=screens.filter(s=>s.group_id===g.id),pl=playlists.find(p=>p.id===g.playlist_id);return `<div class="card group-card"><div class="section-head" style="margin:0"><div><h2>${esc(g.name)}</h2><p class="muted">${ss.length} telas · ${pl?'▶ '+esc(pl.name):'Sem conteúdo sincronizado'}</p></div><span class="tag">${pl?'SINCRONIZADO':'GRUPO'}</span></div><div class="mini-list">${ss.map(s=>`<div class="mini"><span>${esc(s.name)}</span><span>${esc(s.code)}</span></div>`).join('')||'<p class="muted">Nenhuma tela no grupo.</p>'}</div><div class="action-row" style="margin-top:12px"><button class="btn small" data-group-edit="${g.id}">Gerenciar</button><button class="btn small ghost" data-group-sync="${g.id}">↻ Sincronizar agora</button><button class="btn small danger" data-group-del="${g.id}">Excluir</button></div></div>`}).join('')||'<div class="card"><p class="muted">Crie um grupo, selecione as telas e escolha a playlist que todas devem exibir juntas.</p></div>'}
async function renderReports(){let ev=[];if(db){const [hb,pop]=await Promise.all([load('screen_heartbeat').catch(()=>[]),load('proof_of_play').catch(()=>[])]);ev=[...hb.map(x=>({...x,_event:'heartbeat'})),...pop.map(x=>({...x,_event:'reprodução'}))].sort((a,b)=>new Date(b.created_at||b.last_ping||0)-new Date(a.created_at||a.last_ping||0))}else ev=(demo.events||[]).map(x=>({...x,_event:x.event||'evento'}));const arr=ev.slice(0,100);qs('#reportCount').textContent=arr.length;qs('#reportLast').textContent=arr[0]?new Date(arr[0].created_at||arr[0].last_ping).toLocaleTimeString('pt-BR'):'—';qs('#reportsBody').innerHTML=arr.map(e=>`<tr><td>${new Date(e.created_at||e.last_ping).toLocaleString('pt-BR')}</td><td>${esc(e.screen_id||e.screen_code||'')}</td><td>${esc(e._event||'evento')}</td><td>${esc(e.media_id||e.player_version||e.detail||'')}</td></tr>`).join('')||'<tr><td colspan="4" class="muted">Sem eventos.</td></tr>'}
if(qs('#monitorRefreshBtn'))qs('#monitorRefreshBtn').onclick=()=>render();const monitorFocusBtn=qs('#monitorFocusBtn');if(monitorFocusBtn)monitorFocusBtn.onclick=()=>{document.body.classList.toggle('monitor-focus');monitorFocusBtn.textContent=document.body.classList.contains('monitor-focus')?'← Sair do Modo Central':'▣ Modo Central';};if(qs('#monitorSearch'))qs('#monitorSearch').oninput=()=>renderMonitor(demo.screens,demo.playlists,demo.media,demo.playlist_items,demo.schedules);if(qs('#monitorFilter'))qs('#monitorFilter').onchange=()=>renderMonitor(demo.screens,demo.playlists,demo.media,demo.playlist_items,demo.schedules);
qs('#addScreenBtn').onclick=()=>openScreen();qs('#addMediaBtn').onclick=()=>openMedia();qs('#addPlaylistBtn').onclick=()=>openPlaylist();qs('#addScheduleBtn').onclick=()=>openSchedule();qs('#addGroupBtn').onclick=()=>openGroup();
function openScreen(id){const s=id?(demo.screens.find(x=>x.id===id)||null):null;openModal(s?'Editar tela':'Adicionar tela',`<form id="screenForm" class="form"><input type="hidden" name="id" value="${esc(s?.id||'')}"><label>Nome<input name="name" required value="${esc(s?.name||'')}" placeholder="Totem 01"></label><label>Código<input name="code" required value="${esc(s?.code||'')}" placeholder="TV-0001"></label><label>Local<input name="location" value="${esc(s?.location||'')}" placeholder="Loja São Fernandes"></label><label>Orientação<select name="orientation"><option value="landscape" ${s?.orientation!=='portrait'?'selected':''}>Horizontal 16:9</option><option value="portrait" ${s?.orientation==='portrait'?'selected':''}>Vertical 9:16</option></select></label><label>Playlist<select name="playlist_id"><option value="">Sem playlist</option>${demo.playlists.map(p=>`<option value="${p.id}" ${s?.playlist_id===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label><label>Grupo<select name="group_id"><option value="">Sem grupo</option>${demo.groups.map(g=>`<option value="${g.id}" ${s?.group_id===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}</select></label><div class="mobile-form-actions"><button type="button" class="btn ghost" data-modal-cancel>Cancelar</button><button class="btn" type="submit">Salvar tela</button></div></form>`);const form=qs('#screenForm');if(form){form.addEventListener('submit',async ev=>{ev.preventDefault();ev.stopPropagation();if(form.dataset.saving==='1')return;form.dataset.saving='1';const btn=form.querySelector('button[type=submit],button.btn');const original=btn?.textContent||'Salvar tela';if(btn){btn.disabled=true;btn.textContent='Salvando…'}try{const f=new FormData(form);const row={name:String(f.get('name')||'').trim(),code:String(f.get('code')||'').trim().toUpperCase(),location:String(f.get('location')||'').trim(),orientation:f.get('orientation')||'landscape',playlist_id:f.get('playlist_id')||null,group_id:f.get('group_id')||null,status:'offline',active:true};if(!row.name||!row.code)throw new Error('Nome e código são obrigatórios.');const existing=f.get('id');if(existing)await update('screens',existing,row);else await insert('screens',row);closeModal();await render();alert('Tela salva com sucesso!');}catch(err){console.error('screen save',err);alert('Erro ao salvar tela: '+(err.message||String(err)));}finally{form.dataset.saving='0';if(btn){btn.disabled=false;btn.textContent=original}}},{capture:true})}}
function openMedia(id){
 const m=id?(demo.media.find(x=>x.id===id)||null):null;
 openModal(m?'Editar conteúdo':'Adicionar conteúdo',`<form id="mediaForm" class="form" onsubmit="return false"><input type="hidden" name="id" value="${esc(m?.id||'')}"><label>Nome<input name="name" required value="${esc(m?.name||'')}" placeholder="Campanha 01"></label><label>Tipo<select name="type"><option value="image" ${m?.type==='image'?'selected':''}>Imagem</option><option value="video" ${m?.type==='video'?'selected':''}>Vídeo</option><option value="web" ${m?.type==='web'?'selected':''}>Página Web</option><option value="text" ${m?.type==='text'?'selected':''}>Texto</option></select></label><label>Arquivo do aparelho<input name="file" type="file" accept="image/*,video/*"></label><label>URL opcional<input name="url" value="${esc(m?.file_url||'')}" placeholder="https://..."></label><label>Texto (se tipo Texto)<textarea name="text_content">${esc(m?.text_content||'')}</textarea></label><label>Duração (segundos)<input name="duration" type="number" min="1" value="${esc(m?.duration||10)}"></label><div class="mobile-form-actions"><button type="button" class="btn ghost" data-modal-cancel>Cancelar</button><button class="btn" type="submit">${m?'Salvar alterações':'Enviar e salvar'}</button></div><small class="muted" id="mediaSaveHint"></small></form>`);
 const form=qs('#mediaForm'); if(!form)return;
 form.addEventListener('submit',async ev=>{
  ev.preventDefault();ev.stopPropagation();
  if(form.dataset.saving==='1')return;form.dataset.saving='1';
  const btn=form.querySelector('button[type="submit"]'),hint=qs('#mediaSaveHint'),original=btn.textContent;
  btn.disabled=true;btn.textContent='Salvando…';if(hint)hint.textContent='';
  try{
   const f=new FormData(form),existing=f.get('id');let url=String(f.get('url')||'').trim();const file=f.get('file');let sessionOnly=false;
   if(file&&file.size){
    if(db) url=await uploadFile(file);
    else if(file.type.startsWith('image/')&&file.size<=2*1024*1024) url=await fileToDataUrl(file);
    else {const localId='media-'+uid();await putLocalMedia(localId,file);url='idb://'+localId;sessionOnly=false;}
   }
   if(!url&&f.get('type')!=='text')throw new Error('Selecione um arquivo ou informe uma URL.');
   const row={name:String(f.get('name')||'').trim(),type:f.get('type'),file_url:url||null,text_content:f.get('text_content')||null,duration:Number(f.get('duration')||10),active:true,local_session_only:sessionOnly};
   if(!row.name)throw new Error('Informe o nome do conteúdo.');
   if(existing)await update('media',existing,row);else await insert('media',row);
   closeModal();await render();
   alert(sessionOnly?'Conteúdo salvo para teste nesta sessão. Para persistir o vídeo e enviá-lo às TVs, conecte o Supabase.':'Conteúdo salvo com sucesso!');
  }catch(err){console.error('media save',err);if(hint)hint.textContent='Erro: '+(err.message||String(err));alert('Erro ao salvar conteúdo: '+(err.message||String(err)));}
  finally{form.dataset.saving='0';btn.disabled=false;btn.textContent=original;}
 },{capture:true});
}
function openPlaylist(){openModal('Nova playlist',`<form id="playlistForm" class="form"><label>Nome<input name="name" required placeholder="Campanha Loja"></label><label>Descrição<textarea name="description" placeholder="Ex.: campanha de setembro"></textarea></label><div class="mobile-form-actions"><button type="button" class="btn ghost" data-modal-cancel>Cancelar</button><button class="btn" type="submit">Criar playlist</button></div></form>`)}
function openSchedule(id){
 const sc=id?(demo.schedules.find(x=>x.id===id)||null):null;
 const target=sc?.group_id?'group':'screen';
 const checkedDays=String(sc?.days||'Seg,Ter,Qua,Qui,Sex,Sab,Dom').split(',').map(x=>x.trim());
 const targetHtml=target==='group'?`Grupo<select name="group_id">${demo.groups.map(g=>`<option value="${g.id}" ${sc?.group_id===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}</select>`:`Tela<select name="screen_id">${demo.screens.map(x=>`<option value="${x.id}" ${sc?.screen_id===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select>`;
 openModal(sc?'Editar programação':'Nova programação',`<form id="scheduleForm" class="form"><input type="hidden" name="id" value="${esc(sc?.id||'')}"><label>Nome<input name="name" required value="${esc(sc?.name||'')}" placeholder="Campanha manhã"></label><label>Playlist<select name="playlist_id" required>${demo.playlists.map(p=>`<option value="${p.id}" ${sc?.playlist_id===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label><label>Destino<select name="target" id="targetType"><option value="screen" ${target==='screen'?'selected':''}>Tela</option><option value="group" ${target==='group'?'selected':''}>Grupo</option></select></label><label id="targetField">${targetHtml}</label><label>Data inicial<input name="start_date" type="date" value="${esc(sc?.start_date||'')}"></label><label>Data final<input name="end_date" type="date" value="${esc(sc?.end_date||'')}"></label><label>Início<input name="start_time" type="time" value="${esc(String(sc?.start_time||'08:00').slice(0,5))}"></label><label>Fim<input name="end_time" type="time" value="${esc(String(sc?.end_time||'18:00').slice(0,5))}"></label><div><span class="muted">Dias da semana</span><div class="check-row">${['Seg','Ter','Qua','Qui','Sex','Sab','Dom'].map(d=>`<label><input type="checkbox" name="days" value="${d}" ${checkedDays.includes(d)?'checked':''}>${d}</label>`).join('')}</div></div><div class="mobile-form-actions"><button type="button" class="btn ghost" data-modal-cancel>Cancelar</button><button class="btn" type="submit">${sc?'Salvar alterações':'Salvar programação'}</button></div></form>`);
 qs('#targetType').onchange=e=>{qs('#targetField').innerHTML=e.target.value==='group'?`Grupo<select name="group_id">${demo.groups.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select>`:`Tela<select name="screen_id">${demo.screens.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select>`}
 const form=qs('#scheduleForm');
 form.addEventListener('submit',async ev=>{
   ev.preventDefault();ev.stopPropagation();
   if(form.dataset.saving==='1')return;
   form.dataset.saving='1';
   const btn=form.querySelector('button.btn'),old=btn.textContent;btn.disabled=true;btn.textContent='Salvando…';
   try{
     const f=new FormData(form), scheduleId=String(f.get('id')||'').trim();
     const days=[...form.querySelectorAll('input[name="days"]:checked')].map(x=>x.value).join(',');
     const target=f.get('target'),screenId=target==='screen'?(f.get('screen_id')||null):null,groupId=target==='group'?(f.get('group_id')||null):null;
     const row={name:String(f.get('name')||'').trim(),playlist_id:f.get('playlist_id')||null,screen_id:screenId,group_id:groupId,start_date:f.get('start_date')||null,end_date:f.get('end_date')||null,start_time:String(f.get('start_time')||'').slice(0,5),end_time:String(f.get('end_time')||'').slice(0,5),days,active:true};
     if(!row.start_time||!row.end_time)throw new Error('Informe os horários de início e fim.');
     let saved;
     if(db){
       if(scheduleId){
         const {data,error}=await db.from('schedules').update(row).eq('id',scheduleId).select('*').single();
         if(error)throw error;saved=data;
       }else{
         const {data,error}=await db.from('schedules').insert(row).select('*').single();
         if(error)throw error;saved=data;
       }
       if(!saved)throw new Error('O Supabase não retornou a programação salva.');
       const {data:fresh,error:freshError}=await db.from('schedules').select('*').eq('id',saved.id).single();
       if(freshError)throw freshError;
       const a=String(fresh.start_time||'').slice(0,5),b=String(fresh.end_time||'').slice(0,5);
       if(a!==row.start_time||b!==row.end_time)throw new Error(`Horário não persistiu no servidor. Solicitado ${row.start_time}–${row.end_time}; servidor retornou ${a}–${b}.`);
     }else{
       saved=scheduleId?await update('schedules',scheduleId,row):await insert('schedules',row);
     }
     closeModal();await render();
     alert(`Programação salva: ${row.start_time}–${row.end_time}`);
   }catch(err){console.error('schedule save 4.19.3',err);alert('Erro ao salvar programação: '+(err.message||String(err)));}
   finally{form.dataset.saving='0';btn.disabled=false;btn.textContent=old;}
 },{capture:true});
}
function openGroup(id){const g=id?(demo.groups.find(x=>x.id===id)||null):null;openModal(g?'Gerenciar grupo':'Novo grupo',`<form id="groupForm" class="form"><input type="hidden" name="id" value="${esc(g?.id||'')}"><label>Nome<input name="name" required value="${esc(g?.name||'')}" placeholder="Loja / Totens"></label><label>Conteúdo sincronizado (playlist)<select name="playlist_id"><option value="">Nenhuma</option>${demo.playlists.map(p=>`<option value="${p.id}" ${g?.playlist_id===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select><small class="muted">Todas as telas marcadas usarão esta playlist e serão alinhadas pelo mesmo relógio.</small></label><div><span class="muted">Telas do grupo</span><div class="check-row">${demo.screens.map(s=>`<label><input type="checkbox" name="screen_ids" value="${s.id}" ${s.group_id===g?.id?'checked':''}>${esc(s.name)}</label>`).join('')}</div></div><div class="mobile-form-actions"><button type="button" class="btn ghost" data-modal-cancel>Cancelar</button><button class="btn" type="submit">Salvar grupo</button></div></form>`)}
function tusB64(v){return btoa(unescape(encodeURIComponent(String(v||''))))}
async function uploadFileResumable(file,path){
 const {data:{session}}=await db.auth.getSession();
 const token=session?.access_token||cfg.key;
 if(!token)throw new Error('Sessão do Supabase indisponível. Entre novamente e tente o envio.');
 const projectUrl=new URL(cfg.url),host=projectUrl.hostname.replace('.supabase.co','.storage.supabase.co');
 const endpoint=`${projectUrl.protocol}//${host}/storage/v1/upload/resumable`;
 const metadata=[['bucketName','media'],['objectName',path],['contentType',file.type||'application/octet-stream'],['cacheControl','3600']].map(([k,v])=>`${k} ${tusB64(v)}`).join(',');
 const create=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${token}`,apikey:cfg.key,'Tus-Resumable':'1.0.0','Upload-Length':String(file.size),'Upload-Metadata':metadata,'x-upsert':'false'}});
 if(!create.ok)throw new Error(`Não foi possível iniciar o envio do vídeo (${create.status}).`);
 let location=create.headers.get('Location');if(!location)throw new Error('O servidor não retornou o endereço do upload resumível.');if(location.startsWith('/'))location=`${projectUrl.protocol}//${host}${location}`;
 const chunkSize=6*1024*1024;let offset=0;
 const hint=qs('#mediaSaveHint'),btn=qs('#mediaForm button[type=\"submit\"]');
 const showProgress=(pct)=>{const t=`Enviando vídeo… ${pct}%`;if(hint)hint.textContent=t;if(btn)btn.textContent=t;};
 showProgress(0);
 while(offset<file.size){const end=Math.min(offset+chunkSize,file.size),chunk=file.slice(offset,end);const r=await fetch(location,{method:'PATCH',headers:{Authorization:`Bearer ${token}`,apikey:cfg.key,'Tus-Resumable':'1.0.0','Upload-Offset':String(offset),'Content-Type':'application/offset+octet-stream'},body:chunk});if(!r.ok)throw new Error(`Falha durante o envio do vídeo (${r.status}). Tente novamente; nenhum conteúdo foi salvo.`);offset=Number(r.headers.get('Upload-Offset')||end);showProgress(Math.min(100,Math.round(offset/file.size*100)))}
 if(hint)hint.textContent='Upload concluído. Salvando cadastro…';if(btn)btn.textContent='Finalizando…';return db.storage.from('media').getPublicUrl(path).data.publicUrl
}
async function uploadFile(file){if(!file)return '';if(!db){if(file.type.startsWith('image/')&&file.size<=2*1024*1024)return await fileToDataUrl(file);throw new Error('No modo local, apenas imagens até 2 MB podem ser armazenadas. Conecte o Supabase para vídeos e arquivos maiores.')}const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const path=`${Date.now()}-${uid()}-${safe}`;try{if(file.type.startsWith('video/')&&file.size>6*1024*1024)return await uploadFileResumable(file,path);const {error}=await db.storage.from('media').upload(path,file,{upsert:false,contentType:file.type});if(error)throw error;return db.storage.from('media').getPublicUrl(path).data.publicUrl}catch(e){const msg=String(e?.message||e||'');if(/maximum allowed size|exceeded|413|too large/i.test(msg))throw new Error('O vídeo é maior que o limite do envio simples. A Vitrine tentou o modo para arquivos grandes; atualize a página e tente novamente.');throw e}}
async function fileToDataUrl(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}

document.addEventListener('submit',async e=>{const id=e.target.id;if(id==='screenForm')return;if(id==='mediaForm')return;if(id==='scheduleForm')return;if(!['playlistForm','groupForm'].includes(id))return;e.preventDefault();const f=new FormData(e.target);try{
 if(id==='screenForm'){const row={name:f.get('name'),code:f.get('code'),location:f.get('location'),orientation:f.get('orientation'),playlist_id:f.get('playlist_id')||null,group_id:f.get('group_id')||null,status:'offline',active:true};const existing=f.get('id');if(existing)await update('screens',existing,row);else await insert('screens',row)}
 if(id==='mediaForm'){const existing=f.get('id');let url=(f.get('url')||'').trim();const file=f.get('file');if(file&&file.size)url=await uploadFile(file);if(!url&&f.get('type')!=='text')throw new Error('Selecione um arquivo ou informe uma URL.');const row={name:f.get('name'),type:f.get('type'),file_url:url||null,text_content:f.get('text_content')||null,duration:Number(f.get('duration')||10),active:true};if(existing)await update('media',existing,row);else await insert('media',row)}
 if(id==='playlistForm')await insert('playlists',{name:f.get('name'),description:f.get('description'),active:true});
 if(id==='scheduleForm'){
 const days=[...e.target.querySelectorAll('input[name="days"]:checked')].map(x=>x.value).join(',');
 const target=f.get('target');
 const screenId=target==='screen'?f.get('screen_id'):null;
 const groupId=target==='group'?f.get('group_id'):null;
 let playlistId=f.get('playlist_id')||null;
 // 4.15.1: valida os IDs contra o estado remoto atual antes do INSERT.
 // Evita FK quando uma aba/formulário antigo ficou aberto com UUID de playlist já substituído.
 if(db){
   const remotePlaylists=await load('playlists');
   if(!remotePlaylists.some(p=>p.id===playlistId)){
     const remoteScreens=await load('screens');
     const targetScreen=remoteScreens.find(x=>x.id===screenId);
     if(targetScreen?.playlist_id && remotePlaylists.some(p=>p.id===targetScreen.playlist_id)){
       playlistId=targetScreen.playlist_id;
     }else{
       throw new Error('A playlist selecionada não existe mais no servidor. Feche esta janela, clique Atualizar e abra a programação novamente.');
     }
   }
 }
 const scheduleRow={name:f.get('name'),playlist_id:playlistId,screen_id:screenId,group_id:groupId,start_date:f.get('start_date')||null,end_date:f.get('end_date')||null,start_time:f.get('start_time'),end_time:f.get('end_time'),days,active:true};
 const scheduleId=f.get('id');
 if(scheduleId){
   const saved=await update('schedules',scheduleId,scheduleRow);
   // Confirma especificamente os horários retornados pelo Supabase antes de fechar a janela.
   const wantStart=String(scheduleRow.start_time||'').slice(0,5),wantEnd=String(scheduleRow.end_time||'').slice(0,5);
   const gotStart=String(saved?.start_time||'').slice(0,5),gotEnd=String(saved?.end_time||'').slice(0,5);
   if(gotStart!==wantStart||gotEnd!==wantEnd)throw new Error('O servidor não confirmou a mudança de horário.');
 }else await insert('schedules',scheduleRow)
}
 if(id==='groupForm'){const gid=f.get('id');let g;if(gid){await update('groups',gid,{name:f.get('name'),playlist_id:f.get('playlist_id')||null});g=gid}else{g=(await insert('groups',{name:f.get('name'),playlist_id:f.get('playlist_id')||null,active:true})).id}const selected=[...e.target.querySelectorAll('input[name="screen_ids"]:checked')].map(x=>x.value);for(const s of demo.screens){if(db){if(selected.includes(s.id))await update('screens',s.id,{group_id:g});else if(s.group_id===g)await update('screens',s.id,{group_id:null})}else{if(selected.includes(s.id))s.group_id=g;else if(s.group_id===g)s.group_id=null}}save()}
 alert('Salvo com sucesso!');
 closeModal();await render();
 }catch(err){console.error(err);alert('Erro ao salvar: '+(err.message||String(err)))}});

document.addEventListener('click',e=>{if(e.target.closest('[data-modal-cancel]')){e.preventDefault();closeModal();}});
document.addEventListener('click',async e=>{try{
  const cancel=e.target.closest('[data-modal-cancel]');if(cancel){closeModal();return;}
 const diag=e.target.closest('[data-screen-diagnostic]');if(diag)return openScreenDiagnostic(diag.dataset.screenDiagnostic);const se=e.target.closest('[data-screen-edit]');if(se)return openScreen(se.dataset.screenEdit);const st=e.target.closest('[data-screen-test]');if(st){const s=demo.screens.find(x=>x.id===st.dataset.screenTest);if(s){const u=db?`../player/index.html?code=${encodeURIComponent(s.code)}`:`index.html?localPlayer=${encodeURIComponent(s.code)}&orientation=${encodeURIComponent(s.orientation||'landscape')}`;window.open(u,'_blank')}return}
 const mp=e.target.closest('[data-media-preview]');if(mp)return previewMedia(mp.dataset.mediaPreview);const mu=e.target.closest('[data-media-usage]');if(mu)return showMediaUsage(mu.dataset.mediaUsage); const md=e.target.closest('[data-media-edit]');if(md)return openMedia(md.dataset.mediaEdit);const delm=e.target.closest('[data-media-del]');if(delm){const u=mediaUsage(delm.dataset.mediaDel);if(u.links.length){alert('Este conteúdo está em uso em '+u.pls.length+' playlist(s). Remova-o das playlists antes de excluir.');showMediaUsage(delm.dataset.mediaDel);return}if(confirm('Excluir este conteúdo? O arquivo associado também será removido do armazenamento quando possível.')){await removeMediaSafely(delm.dataset.mediaDel);await render()}return}
 const pdup=e.target.closest('[data-playlist-duplicate]');if(pdup){const p=demo.playlists.find(x=>String(x.id)===String(pdup.dataset.playlistDuplicate));if(!p)return;try{const copy=await insert('playlists',{name:(p.name||'Playlist')+' - cópia',description:p.description||''});const rows=(demo.playlist_items||[]).filter(i=>String(i.playlist_id)===String(p.id)).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));for(const i of rows)await insert('playlist_items',{playlist_id:copy.id,media_id:i.media_id,sort_order:i.sort_order||0,duration:i.duration||null});await render();alert('Playlist duplicada com '+rows.length+' item(ns).');}catch(err){console.error('duplicate playlist',err);alert('Erro ao duplicar playlist: '+(err.message||String(err)))}return}const pd=e.target.closest('[data-playlist-del]');if(pd&&confirm('Excluir esta playlist?')){await removePlaylistSafely(pd.dataset.playlistDel);await render();return}const pa=e.target.closest('[data-playlist-add]');if(pa)return addPlaylistItem(pa.dataset.playlistAdd);const di=e.target.closest('[data-item-del]');if(di&&confirm('Remover este item da playlist?')){await remove('playlist_items',di.dataset.itemDel);await render();return}const iu=e.target.closest('[data-item-up]');if(iu){await movePlaylistItem(iu.dataset.itemUp,-1);return}const idn=e.target.closest('[data-item-down]');if(idn){await movePlaylistItem(idn.dataset.itemDown,1);return}const pv=e.target.closest('[data-playlist-preview]');if(pv)return previewPlaylist(pv.dataset.playlistPreview);
 const sed=e.target.closest('[data-schedule-edit]');if(sed)return openSchedule(sed.dataset.scheduleEdit);
 const sdup=e.target.closest('[data-schedule-duplicate]');if(sdup){const sc=demo.schedules.find(x=>String(x.id)===String(sdup.dataset.scheduleDuplicate));if(!sc)return;try{await insert('schedules',{name:(sc.name||'Programação')+' - cópia',playlist_id:sc.playlist_id||null,screen_id:sc.screen_id||null,group_id:sc.group_id||null,start_date:sc.start_date||null,end_date:sc.end_date||null,start_time:sc.start_time||null,end_time:sc.end_time||null,days:sc.days||'',active:sc.active!==false});await render();alert('Programação duplicada. Abra a cópia para ajustar datas, horários ou destino.');}catch(err){console.error('duplicate schedule',err);alert('Erro ao duplicar programação: '+(err.message||String(err)))}return}const sd=e.target.closest('[data-schedule-del]');if(sd&&confirm('Excluir esta programação?')){await remove('schedules',sd.dataset.scheduleDel);await render();return}
 const gs=e.target.closest('[data-group-sync]');if(gs){const g=demo.groups.find(x=>x.id===gs.dataset.groupSync);if(!g?.playlist_id){alert('Escolha uma playlist no grupo antes de sincronizar.');return}const members=demo.screens.filter(x=>x.group_id===g.id);if(!members.length){alert('Adicione pelo menos uma tela ao grupo.');return}for(const scr of members){if(db)await update('screens',scr.id,{group_id:g.id});}await render();alert('Sincronização enviada para '+members.length+' tela(s). Em até 15 segundos elas alinham o mesmo conteúdo.');return}const ge=e.target.closest('[data-group-edit]');if(ge)return openGroup(ge.dataset.groupEdit);const gd=e.target.closest('[data-group-del]');if(gd&&confirm('Excluir este grupo? As telas serão desvinculadas.')){await removeGroupSafely(gd.dataset.groupDel);await render();return}
 }catch(err){alert(err.message||String(err))}});
async function movePlaylistItem(id,dir){const item=demo.playlist_items.find(i=>i.id===id);if(!item)return;const rows=demo.playlist_items.filter(i=>i.playlist_id===item.playlist_id).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));const idx=rows.findIndex(i=>i.id===id),j=idx+dir;if(idx<0||j<0||j>=rows.length)return;const a=rows[idx],b=rows[j],ao=Number(a.sort_order||idx),bo=Number(b.sort_order||j);a.sort_order=bo;b.sort_order=ao;save();if(db){await update('playlist_items',a.id,{sort_order:a.sort_order});await update('playlist_items',b.id,{sort_order:b.sort_order})}await render()}
async function addPlaylistItem(pid){
 if(!demo.media.length){alert('Adicione um conteúdo primeiro.');return}
 const playlist=demo.playlists.find(p=>String(p.id)===String(pid));
 if(!playlist){alert('Playlist não encontrada. Clique em Atualizar e tente novamente.');return}
 openModal('Adicionar conteúdo à playlist',`<div class="form">${demo.media.map(m=>`<button type="button" class="quick button-media" data-add-media="${m.id}" data-pid="${pid}">${esc(m.name)} <span class="muted">${esc(m.type)}</span></button>`).join('')}</div>`);
 document.querySelectorAll('[data-add-media]').forEach(b=>b.onclick=async()=>{
  if(b.disabled)return;
  const playlistId=String(b.dataset.pid||''),mediaId=String(b.dataset.addMedia||'');
  const existing=(demo.playlist_items||[]).find(i=>String(i.playlist_id)===playlistId&&String(i.media_id)===mediaId);
  if(existing){alert('Esse conteúdo já está na playlist.');return}
  const original=b.innerHTML;b.disabled=true;b.textContent='Adicionando…';
  try{
   let rows=db?await load('playlist_items'):(demo.playlist_items||[]);
   const n=rows.filter(i=>String(i.playlist_id)===playlistId).length;
   const saved=await insert('playlist_items',{playlist_id:playlistId,media_id:mediaId,sort_order:n});
   if(!saved||!saved.id)throw new Error('O servidor não confirmou o vínculo do conteúdo com a playlist.');
   if(db){
    const {data,error}=await db.from('playlist_items').select('*').eq('id',saved.id).single();
    if(error)throw error;
    if(!data||String(data.playlist_id)!==playlistId||String(data.media_id)!==mediaId)throw new Error('O vínculo não foi confirmado pelo Supabase.');
   }
   closeModal();
   await render();
   vdToast('Conteúdo adicionado à playlist.','success');
  }catch(err){
   console.error('playlist item save',err);
   const msg=String(err?.message||err||'Erro desconhecido');
   if(/row-level security|RLS/i.test(msg))alert('O Supabase bloqueou a inclusão do item pela política RLS da tabela playlist_items. É necessário liberar INSERT/SELECT para o usuário autenticado nessa tabela.');
   else if(/column.*sort_order|sort_order.*schema cache/i.test(msg))alert('A tabela playlist_items não possui a coluna sort_order esperada pelo sistema. É necessário corrigir o schema do Supabase.');
   else alert('Erro ao adicionar conteúdo à playlist: '+msg);
  }finally{b.disabled=false;b.innerHTML=original}
 })
}
function wireDrag(){document.querySelectorAll('.drag-item').forEach(el=>{el.ondragstart=e=>e.dataTransfer.setData('text/plain',el.dataset.item)});document.querySelectorAll('[data-playlist]').forEach(zone=>{zone.ondragover=e=>e.preventDefault();zone.ondrop=async e=>{e.preventDefault();const id=e.dataTransfer.getData('text/plain');const item=demo.playlist_items.find(i=>i.id===id);if(!item)return;item.playlist_id=zone.dataset.playlist;item.sort_order=demo.playlist_items.filter(i=>i.playlist_id===zone.dataset.playlist).length;save();if(db)await update('playlist_items',id,{playlist_id:item.playlist_id,sort_order:item.sort_order});render()}})}
function previewPlaylist(pid){const p=demo.playlists.find(x=>x.id===pid),its=demo.playlist_items.filter(i=>i.playlist_id===pid).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));const m=its.map(i=>demo.media.find(x=>x.id===i.media_id)).filter(Boolean);openModal('Pré-visualização',`<div class="card" style="padding:0;overflow:hidden"><div id="previewBox" style="aspect-ratio:16/9;background:#000;display:flex;align-items:center;justify-content:center"></div></div><p class="muted" style="margin-top:10px">${esc(p?.name||'Playlist')} · ${m.length} itens</p>`);let idx=0;const box=qs('#previewBox');const show=()=>{if(!m.length){box.innerHTML='<span class="muted">Playlist vazia</span>';return}const x=m[idx%m.length];box.innerHTML=x.type==='image'?`<img src="${esc(mediaSrc(x))}" style="width:100%;height:100%;object-fit:contain">`:x.type==='video'?`<video src="${esc(mediaSrc(x))}" autoplay muted controls style="width:100%;height:100%;object-fit:contain"></video>`:`<div style="padding:30px;font-size:22px;text-align:center">${esc(x.text_content||x.file_url||x.name)}</div>`;idx++;setTimeout(show,Math.max(2,Number(x.duration||5))*1000)};show()}
['screenSearch','screenFilter','mediaSearch','mediaTypeFilter'].forEach(id=>{const el=qs('#'+id);if(el)el.addEventListener('input',render)});
render();bootLocalPlayer();

// V4.8 - Editor visual local (preserva o core V3.1.1)
(function(){
 const canvas=qs('#sceneCanvas'),props=qs('#sceneProps'); if(!canvas||!props)return;
 let scene=JSON.parse(localStorage.getItem('vd48_scene')||'{"orientation":"portrait","elements":[]}'), selected=null; if(!scene.orientation)scene.orientation='portrait';
 const sid=()=>uid();
 function draw(){canvas.classList.toggle('portrait',scene.orientation==='portrait');qs('#sceneOrientation').value=scene.orientation;canvas.innerHTML=scene.elements.map(el=>{const mobileSize=Math.max(9,Math.min(42,Number(el.size||32)*(canvas.clientWidth||320)/(scene.orientation==='portrait'?360:760)));return `<div class="scene-element ${selected===el.id?'selected':''}" data-scene-id="${el.id}" style="left:${el.x}%;top:${el.y}%;width:${el.w}%;height:${el.h}%;${el.type==='text'?'font-size:'+el.size+'px;--mobile-font-size:'+mobileSize+'px;color:'+el.color+';':''}">${el.type==='text'?`<div class="scene-text">${esc(el.content)}</div>`:el.type==='image'?`<img src="${esc(el.content)}" alt="Imagem">`:el.type==='video'?`<div>▶ VÍDEO</div>`:el.type==='qrcode'?`<div style="font-size:34px">▦<br><small>QR</small></div>`:`<div class="scene-text">${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>`}</div>`}).join('');wire();renderProps()}
 function add(type){const defaults={text:'Sua mensagem',image:'https://placehold.co/800x450?text=Imagem',video:'video.mp4',qrcode:'https://exemplo.com',clock:'Relógio'};const el={id:sid(),type,content:defaults[type],x:10,y:10,w:type==='text'?45:35,h:type==='text'?18:35,size:36,color:'#ffffff'};scene.elements.push(el);selected=el.id;draw()}
 function wire(){canvas.querySelectorAll('[data-scene-id]').forEach(node=>{node.onclick=e=>{e.stopPropagation();selected=node.dataset.sceneId;draw()};node.onpointerdown=e=>{if(e.button!==0)return;selected=node.dataset.sceneId;const el=scene.elements.find(x=>x.id===selected),r=canvas.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,ox=el.x,oy=el.y;node.setPointerCapture?.(e.pointerId);node.onpointermove=ev=>{if(!node.hasPointerCapture?.(e.pointerId))return;el.x=Math.max(0,Math.min(100-el.w,ox+(ev.clientX-sx)/r.width*100));el.y=Math.max(0,Math.min(100-el.h,oy+(ev.clientY-sy)/r.height*100));node.style.left=el.x+'%';node.style.top=el.y+'%'};node.onpointerup=()=>{draw()}}})}
 function renderProps(){const el=scene.elements.find(x=>x.id===selected);if(!el){props.innerHTML='<p class="muted">Selecione um elemento.</p>';return}props.innerHTML=`<label>Conteúdo<input id="propContent" value="${esc(el.content)}"></label><label>Largura %<input id="propW" type="number" min="5" max="100" value="${el.w}"></label><label>Altura %<input id="propH" type="number" min="5" max="100" value="${el.h}"></label>${el.type==='text'?`<label>Tamanho<input id="propSize" type="number" min="12" max="120" value="${el.size}"></label><label>Cor<input id="propColor" type="color" value="${el.color}"></label>`:''}<button id="deleteElementBtn" class="btn danger">Excluir elemento</button>`;['propContent','propW','propH','propSize','propColor'].forEach(id=>{const n=qs('#'+id);if(n)n.oninput=()=>{if(id==='propContent')el.content=n.value;if(id==='propW')el.w=Number(n.value);if(id==='propH')el.h=Number(n.value);if(id==='propSize')el.size=Number(n.value);if(id==='propColor')el.color=n.value;draw()}});qs('#deleteElementBtn').onclick=()=>{scene.elements=scene.elements.filter(x=>x.id!==selected);selected=null;draw()}}
 function aiText(prompt){
  const t=String(prompt||'').trim();
  let title='OFERTA ESPECIAL',sub='Aproveite por tempo limitado',cta='SAIBA MAIS';
  const price=(t.match(/R\$\s?[\d.,]+/i)||[])[0]||'';
  if(/institucional|empresa|marca|servi[cç]o/i.test(t)){title='SUA MARCA EM DESTAQUE';sub='Uma mensagem clara para seu público';cta='CONHEÇA MAIS';}
  if(/card[aá]pio|menu|refei|lanche/i.test(t)){title='DESTAQUE DO DIA';sub='Confira nossas opções';cta='PEÇA AGORA';}
  if(/promo|oferta|desconto|pre[cç]o/i.test(t)){title='OFERTA ESPECIAL';sub='Aproveite esta oportunidade';cta='COMPRE AGORA';}
  return {title,sub,cta,price};
 }
 function applyAiLayout(layout){
  const portrait=scene.orientation==='portrait';
  const safe=layout&&typeof layout==='object'?layout:{};
  const els=Array.isArray(safe.elements)?safe.elements:[];
  if(els.length){
   scene.elements=els.slice(0,10).map((x,i)=>{const w=Math.max(5,Math.min(100,Number(x.w??80))),h=Math.max(5,Math.min(100,Number(x.h??12)));return {id:sid(),type:['text','image'].includes(x.type)?x.type:'text',content:String(x.content||''),x:Math.max(0,Math.min(100-w,Number(x.x??10))),y:Math.max(0,Math.min(100-h,Number(x.y??(10+i*15)))),w,h,size:Math.max(12,Math.min(scene.orientation==='portrait'?72:84,Number(x.size??32))),color:/^#[0-9a-f]{6}$/i.test(x.color||'')?x.color:'#ffffff'}});
  }else{
   const copy=safe.copy||aiText(safe.prompt||'');scene.elements=[];
   scene.elements.push({id:sid(),type:'text',content:copy.title||'OFERTA ESPECIAL',x:8,y:portrait?10:12,w:84,h:16,size:portrait?48:42,color:'#ffffff'});
   scene.elements.push({id:sid(),type:'text',content:copy.sub||'',x:10,y:portrait?29:34,w:80,h:12,size:portrait?28:25,color:'#ffffff'});
   if(copy.price)scene.elements.push({id:sid(),type:'text',content:copy.price,x:10,y:portrait?48:54,w:80,h:15,size:portrait?54:46,color:'#ffffff'});
   scene.elements.push({id:sid(),type:'text',content:copy.cta||'SAIBA MAIS',x:20,y:portrait?76:74,w:60,h:12,size:portrait?30:26,color:'#ffffff'});
  }
  selected=scene.elements[0]?.id||null;draw();localStorage.setItem('vd483_scene',JSON.stringify(scene));
 }
 async function callEditorAI(action,prompt,selectedText='',orientationOverride='',referenceImage='',variant=1){
  if(!hasSupabase||!cfg.url||!cfg.key)throw new Error('Configuração do Supabase não encontrada no painel.');
  const endpoint=String(cfg.url).replace(/\/$/,'')+'/functions/v1/editor-ai';
  let response;
  try{
   const {data:{session}}=await db.auth.getSession();const bearer=session?.access_token||cfg.key;response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.key,'Authorization':'Bearer '+bearer},body:JSON.stringify({action,prompt,selectedText,orientation:orientationOverride||scene.orientation,referenceImage,variant})});
  }catch(e){throw new Error('Falha de rede ao acessar editor-ai: '+(e?.message||e));}
  let data=null;const raw=await response.text();
  try{data=raw?JSON.parse(raw):null}catch(e){throw new Error('Resposta inválida da editor-ai (HTTP '+response.status+').');}
  if(!response.ok||!data?.ok){const e=new Error(data?.error||('editor-ai retornou HTTP '+response.status));e.code=data?.code||'';e.status=response.status;throw e;}
  return data;
 }
 async function buildAiLayout(){
  const prompt=qs('#aiEditorPrompt')?.value||'';if(!prompt.trim()){alert('Descreva o que você quer criar.');return}
  const st=qs('#aiEditorStatus'),btn=qs('#aiBuildLayoutBtn');if(btn){btn.disabled=true;btn.textContent='✦ Criando…'}if(st)st.textContent='Preparando sua arte…';
  try{const data=await callEditorAI('layout',prompt);applyAiLayout(data.layout);if(st)st.textContent='✦ Layout criado pela IA. Revise, arraste os elementos e salve a cena.';}
  catch(err){console.error('Editor IA',err);const copy=aiText(prompt);applyAiLayout({copy,prompt});if(st)st.textContent='IA indisponível: '+(err?.message||err)+' · modo local aplicado.';}
  finally{if(btn){btn.disabled=false;btn.textContent='✦ Criar com IA'}}
 }
 let aiDirectorPlan=null;
 async function callCreativeDirector(prompt){
  if(!hasSupabase||!cfg.url||!cfg.key)throw new Error('Configuração do Supabase não encontrada.');
  const endpoint=String(cfg.url).replace(/\/$/,'')+'/functions/v1/creative-director';
  const {data:{session}}=await db.auth.getSession();const bearer=session?.access_token||cfg.key;
  const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','apikey':cfg.key,'Authorization':'Bearer '+bearer},body:JSON.stringify({prompt,orientation:scene.orientation,hasReference:!!aiReference})});
  const d=await r.json().catch(()=>null);if(!r.ok||!d?.ok)throw new Error(d?.error||('Diretor Criativo HTTP '+r.status));return d;
 }
 function renderDirectorPlan(data){const p=data?.plan||{};aiDirectorPlan=p;const box=qs('#aiDirectorPlan');if(box){box.style.display='block';box.innerHTML=`<strong>Direção criativa</strong><div class="ai-plan-concept">${esc(p.concept||'Campanha planejada')}</div><div><b>${esc(p.headline||'')}</b></div><div>${esc(p.support||'')}</div><small>${esc(p.reference_strategy||'')}</small>`;}const st=qs('#aiEditorStatus');if(st)st.textContent=`✓ Campanha planejada por ${data.provider==='gemini'?'Gemini':'Diretor Criativo'}. Agora gere a arte/foto ou vídeo com o provedor visual.`;}
 async function planAiCampaign(){const prompt=qs('#aiEditorPrompt')?.value||'';if(!prompt.trim()){vdToast('Descreva a campanha primeiro.','error');return}const btn=qs('#aiPlanCampaignBtn'),st=qs('#aiEditorStatus');vdBusy(btn,true,'Planejando…');if(st)st.textContent='Diretor Criativo analisando a campanha…';try{const data=await callCreativeDirector(prompt);renderDirectorPlan(data);if(data?.plan?.headline){const p=data.plan;scene.elements=[{id:sid(),type:'text',content:p.headline,x:Number(p.layout?.headline?.x??8),y:Number(p.layout?.headline?.y??8),w:Number(p.layout?.headline?.w??84),h:Number(p.layout?.headline?.h??14),size:46,color:'#ffffff'},{id:sid(),type:'text',content:p.support||'',x:Number(p.layout?.support?.x??10),y:Number(p.layout?.support?.y??72),w:Number(p.layout?.support?.w??80),h:Number(p.layout?.support?.h??10),size:26,color:'#ffffff'},{id:sid(),type:'text',content:p.cta||'',x:Number(p.layout?.cta?.x??20),y:Number(p.layout?.cta?.y??86),w:Number(p.layout?.cta?.w??60),h:Number(p.layout?.cta?.h??8),size:28,color:'#ffffff'}].filter(e=>e.content);selected=scene.elements[0]?.id||null;draw();}vdToast('Direção criativa pronta.','success')}catch(e){console.error(e);if(st)st.textContent='Diretor Criativo: '+(e?.message||e);vdToast(e?.message||'Falha no Diretor Criativo.','error')}finally{vdBusy(btn,false)}}
 let aiReference=null;
 function resizeReferenceFile(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));r.onload=()=>{const im=new Image();im.onerror=()=>reject(new Error('Formato de imagem inválido.'));im.onload=()=>{const max=480,scale=Math.min(1,max/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*scale)),h=Math.max(1,Math.round(im.height*scale));const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(im,0,0,w,h);resolve(c.toDataURL('image/jpeg',.86))};im.src=String(r.result)};r.readAsDataURL(file)})}
 async function setAiReference(file){if(!file)return;if(!/^image\/(jpeg|png|webp)$/i.test(file.type||'')){vdToast('Escolha uma imagem JPG, PNG ou WebP.','error');return}const st=qs('#aiEditorStatus');if(st)st.textContent='Preparando foto/folder…';try{const dataUrl=await resizeReferenceFile(file);aiReference={dataUrl,name:file.name||'referencia.jpg'};const img=qs('#aiReferenceImage'),box=qs('#aiReferencePreview'),name=qs('#aiReferenceName'),btn=qs('#aiTransformReferenceBtn');if(img)img.src=dataUrl;if(name)name.textContent=aiReference.name;if(box)box.style.display='grid';if(btn)btn.disabled=false;if(st)st.textContent='✓ Referência pronta. Descreva o que deseja criar ou alterar.';}catch(e){aiReference=null;vdToast(e?.message||'Erro ao preparar imagem.','error')}}
 function clearAiReference(){aiReference=null;const input=qs('#aiReferenceInput'),box=qs('#aiReferencePreview'),btn=qs('#aiTransformReferenceBtn');if(input)input.value='';if(box)box.style.display='none';if(btn)btn.disabled=true}
 function loadDataImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Não foi possível montar a composição.'));im.src=src})}
 function campaignTitle(prompt){let t=String(prompt||'').trim().replace(/^fa[cç]a\s+(uma\s+)?(campanha|arte|folder|post(er)?)\s+(sobre|do|da|de|para)\s+/i,'').trim();if(!t)t='Campanha institucional';return t.charAt(0).toUpperCase()+t.slice(1)}
 async function composeReferenceArt(backgroundSrc,referenceSrc,prompt){const [bg,ref]=await Promise.all([loadDataImage(backgroundSrc),loadDataImage(referenceSrc)]);const c=document.createElement('canvas');c.width=576;c.height=1024;const x=c.getContext('2d');x.fillStyle='#071421';x.fillRect(0,0,c.width,c.height);const scale=Math.max(c.width/bg.width,c.height/bg.height),bw=bg.width*scale,bh=bg.height*scale;x.drawImage(bg,(c.width-bw)/2,(c.height-bh)/2,bw,bh);x.fillStyle='rgba(0,0,0,.28)';x.fillRect(0,0,c.width,c.height);const rw=c.width*.62,rh=rw*(ref.height/ref.width),maxH=c.height*.34,rs=rh>maxH?maxH/rh:1,fw=rw*rs,fh=rh*rs,rx=(c.width-fw)/2,ry=c.height*.39-fh/2;x.save();x.shadowColor='rgba(0,0,0,.35)';x.shadowBlur=24;x.fillStyle='white';x.fillRect(rx-10,ry-10,fw+20,fh+20);x.shadowBlur=0;x.drawImage(ref,rx,ry,fw,fh);x.restore();const title=campaignTitle(prompt);x.textAlign='center';x.fillStyle='#fff';x.font='700 42px Arial, sans-serif';const words=title.split(/\s+/),lines=[];let line='';for(const w of words){const test=(line+' '+w).trim();if(x.measureText(test).width>c.width*.82&&line){lines.push(line);line=w}else line=test}if(line)lines.push(line);const shown=lines.slice(0,4),lh=50,ty=110;shown.forEach((l,i)=>x.fillText(l,c.width/2,ty+i*lh));x.font='500 22px Arial, sans-serif';x.fillStyle='rgba(255,255,255,.9)';x.fillText('Uma homenagem a quem cuida da saúde todos os dias',c.width/2,820);return c.toDataURL('image/jpeg',.92)}
 async function transformAiReference(){if(!aiReference){vdToast('Escolha uma foto ou folder primeiro.','error');return}const prompt=qs('#aiEditorPrompt')?.value||'';if(!prompt.trim()){vdToast('Descreva o que você quer fazer com a imagem.','error');return}const st=qs('#aiEditorStatus'),btn=qs('#aiTransformReferenceBtn');vdBusy(btn,true,'Criando…');if(st)st.textContent='Criando fundo com IA e preservando sua imagem original…';try{scene.orientation='portrait';draw();const visualPrompt=directorVisualPrompt(prompt);const data=await callEditorAI('reference',visualPrompt,'','portrait',aiReference.dataUrl);const bg=folderSrc(data.folder);if(!bg)throw new Error('A IA não retornou um fundo utilizável.');const src=await composeReferenceArt(bg,aiReference.dataUrl,prompt);aiGenerated={src,mime:'image/jpeg',prompt,kind:'reference-composite'};const img=qs('#aiGeneratedImage'),box=qs('#aiGeneratedPreview');if(img)img.src=src;if(box)box.style.display='block';if(st)st.textContent='✦ Arte montada: sua imagem original foi preservada e o fundo foi criado pela IA.';vdToast('Arte criada preservando sua imagem original.','success')}catch(err){console.error('Editor IA referência',err);if(err?.code==='REFERENCE_FLAGGED'){aiGenerated={src:aiReference.dataUrl,mime:'image/jpeg',prompt,kind:'reference-original'};const img=qs('#aiGeneratedImage'),box=qs('#aiGeneratedPreview');if(img)img.src=aiReference.dataUrl;if(box)box.style.display='block';if(st)st.textContent='A IA recusou a criação do fundo. Sua imagem original foi mantida sem alterações.';vdToast('Sua imagem original foi preservada.','error')}else{if(st)st.textContent='Não foi possível criar a composição: '+(err?.message||err);vdToast('Não foi possível criar a composição.','error')}}finally{vdBusy(btn,false);if(btn)btn.textContent='✦ Criar com foto / folder'}}
 let aiGenerated=null;
 function directorVisualPrompt(userPrompt){
  const p=aiDirectorPlan||{};
  return [
   `CAMPAIGN CONCEPT (visual subject only): ${p.concept||''}`,
   `USER REQUEST / BUSINESS CONTEXT: ${userPrompt}`,
   `RAW COMMERCIAL PHOTOGRAPH ONLY. This is NOT a poster, flyer, advertisement layout, social post, sign or graphic design. The Vitrine Digital application adds all typography later.`,
   `ABSOLUTE TYPOGRAPHY BAN: zero visible text-like marks anywhere. No words, letters, numbers, captions, headlines, CTA, signage, menu, price, logo, watermark, brand mark, pseudo-text, gibberish, fake letters or typographic symbols.`,
   `Any signs, screens, labels, posters, packaging or printed surfaces must be blank, abstract, unreadable, out of focus, turned away, or outside the frame.`,
   `Clearly represent the campaign subject and business with a strong relevant focal subject. Do not use an empty generic room when the campaign is about a person, service, product or transformation.`,
   `Portrait 9:16 premium commercial photography. Reserve clean negative space near the top and bottom for typography that will be added later by the application.`
  ].filter(Boolean).join('\n');
 }
 function folderSrc(folder){if(!folder)return'';if(folder.uri)return folder.uri;if(folder.data)return `data:${folder.mime||'image/png'};base64,${folder.data}`;return''}
 async function forcePortrait916(src){return loadDataImage(src).then(im=>{const scan=document.createElement('canvas'),sw=Math.min(360,im.width),sh=Math.max(1,Math.round(im.height*(sw/im.width)));scan.width=sw;scan.height=sh;const sx=scan.getContext('2d',{willReadFrequently:true});sx.drawImage(im,0,0,sw,sh);const data=sx.getImageData(0,0,sw,sh).data;const rowBlack=y=>{let dark=0,samples=0;const step=Math.max(1,Math.floor(sw/120));for(let xx=0;xx<sw;xx+=step){const i=(y*sw+xx)*4,r=data[i],g=data[i+1],b=data[i+2];if(r<18&&g<18&&b<18)dark++;samples++}return dark/samples>.94};let top=0,bottom=sh-1;while(top<sh*.42&&rowBlack(top))top++;while(bottom>sh*.58&&rowBlack(bottom))bottom--;const cropTop=Math.max(0,Math.floor(top*(im.height/sh))),cropBottom=Math.min(im.height,Math.ceil((bottom+1)*(im.height/sh)));const cropH=Math.max(1,cropBottom-cropTop);const c=document.createElement('canvas');c.width=1080;c.height=1920;const x=c.getContext('2d');const scale=Math.max(c.width/im.width,c.height/cropH),w=im.width*scale,h=cropH*scale;x.drawImage(im,0,cropTop,im.width,cropH,(c.width-w)/2,(c.height-h)/2,w,h);return c.toDataURL('image/jpeg',.94)})}
 async function generateAiImage(kind){
  const prompt=qs('#aiEditorPrompt')?.value||'';if(!prompt.trim()){alert('Descreva o conteúdo que você quer criar.');return}
  const st=qs('#aiEditorStatus'),btn=qs(kind==='image'?'#aiCreatePhotoBtn':'#aiCreateFolderBtn');const original=btn?.textContent||'';
  vdBusy(btn,true,kind==='image'?'Gerando…':'Criando 3 opções…');if(st)st.textContent=kind==='image'?'Criando foto com IA…':'Criando 3 conceitos visuais para você escolher…';
  try{
   if(kind!=='image'){scene.orientation='portrait';draw();localStorage.setItem('vd483_scene',JSON.stringify(scene));}
   const visualPrompt=directorVisualPrompt(prompt);
   if(kind==='image'){
    const data=await callEditorAI('image',visualPrompt,'',scene.orientation,'',1);let src=folderSrc(data.folder);if(!src)throw new Error('A IA não retornou uma imagem utilizável.');aiGenerated={src,mime:data.folder?.mime||'image/jpeg',prompt,kind,model:data.model};showSingleAiResult(src);if(st)st.textContent='✦ Foto criada. Revise e salve em Conteúdos.';vdToast('Foto criada com sucesso.','success');
   }else{
    const results=[];
    for(let variant=1;variant<=3;variant++){
     if(st)st.textContent=`Criando conceito visual ${variant} de 3…`;
     const data=await callEditorAI('image',visualPrompt,'','portrait','',variant);let src=folderSrc(data.folder);if(!src)continue;src=await forcePortrait916(src);const rawSrc=src;src=await composeDirectorOverlay(rawSrc);results.push({src,rawSrc,mime:'image/jpeg',prompt,kind:'folder',variant,model:data.model});
    }
    if(!results.length)throw new Error('A IA não retornou opções utilizáveis.');showAiChoices(results);selectAiChoice(results[0],0);if(st)st.textContent=`✦ ${results.length} conceitos criados com FLUX.2 Klein. Toque na opção que melhor representa a campanha.`;vdToast('Conceitos visuais prontos para escolher.','success');
   }
  }catch(err){console.error('Editor IA imagem',err);if(st)st.textContent='Erro ao gerar imagem: '+(err?.message||err);vdToast('Não foi possível gerar os conceitos.','error')}
  finally{vdBusy(btn,false);if(btn&&original)btn.textContent=original}
 }
 function showSingleAiResult(src){const box=qs('#aiGeneratedPreview'),img=qs('#aiGeneratedImage');const choices=qs('#aiGeneratedChoices');if(choices)choices.remove();if(img){img.style.display='block';img.src=src}if(box)box.style.display='block'}
 function selectAiChoice(item,index){aiGenerated=item;const img=qs('#aiGeneratedImage');if(img){img.src=item.src;img.style.display='block'}document.querySelectorAll('.ai-choice').forEach((b,i)=>b.classList.toggle('selected',i===index))}
 function showAiChoices(items){const box=qs('#aiGeneratedPreview'),img=qs('#aiGeneratedImage');if(!box||!img)return;box.style.display='block';let old=qs('#aiGeneratedChoices');if(old)old.remove();const wrap=document.createElement('div');wrap.id='aiGeneratedChoices';wrap.className='ai-generated-choices';items.forEach((item,i)=>{const b=document.createElement('button');b.type='button';b.className='ai-choice'+(i===0?' selected':'');b.innerHTML=`<img src="${item.src}" alt="Conceito ${i+1}"><span>Opção ${i+1}</span>`;b.onclick=()=>selectAiChoice(item,i);wrap.appendChild(b)});img.parentNode.insertBefore(wrap,img);img.src=items[0].src}
 async function composeDirectorOverlay(photoSrc){
  const p=aiDirectorPlan||{};if(!p.headline&&!p.support&&!p.cta)return photoSrc;
  const im=await loadDataImage(photoSrc),c=document.createElement('canvas');c.width=1080;c.height=1920;const x=c.getContext('2d');
  const sc=Math.max(c.width/im.width,c.height/im.height),dw=im.width*sc,dh=im.height*sc;x.drawImage(im,(c.width-dw)/2,(c.height-dh)/2,dw,dh);
  const topH=420,bottomH=270;x.fillStyle='rgba(5,15,24,.82)';x.fillRect(0,0,c.width,topH);x.fillStyle='rgba(5,15,24,.78)';x.fillRect(0,c.height-bottomH,c.width,bottomH);
  function lines(text,maxWidth,font,maxLines=3){x.font=font;const words=String(text||'').split(/\s+/),out=[];let line='';for(const w of words){const t=(line+' '+w).trim();if(x.measureText(t).width>maxWidth&&line){out.push(line);line=w;if(out.length>=maxLines-1)break}else line=t}if(line&&out.length<maxLines)out.push(line);return out}
  x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff';let ls=lines(p.headline,c.width*.86,'700 70px Arial, sans-serif',3);ls.forEach((t,i)=>{x.font='700 70px Arial, sans-serif';x.fillText(t,c.width/2,105+i*82)});
  if(p.support){x.fillStyle='rgba(255,255,255,.92)';ls=lines(p.support,c.width*.84,'400 38px Arial, sans-serif',2);ls.forEach((t,i)=>{x.font='400 38px Arial, sans-serif';x.fillText(t,c.width/2,330+i*48)})}
  if(p.cta){x.fillStyle='#fff';x.font='700 48px Arial, sans-serif';x.fillText(String(p.cta).slice(0,80),c.width/2,c.height-135)}
  return c.toDataURL('image/jpeg',.94)
 }
 function directorSceneElements(rawSrc){const p=aiDirectorPlan||{},lay=p.layout||{};return [{id:sid(),type:'image',content:rawSrc,x:0,y:0,w:100,h:100,size:32,color:'#ffffff'},{id:sid(),type:'text',content:p.headline||'',x:Number(lay.headline?.x??8),y:Number(lay.headline?.y??5),w:Number(lay.headline?.w??84),h:Number(lay.headline?.h??15),size:46,color:'#ffffff'},{id:sid(),type:'text',content:p.support||'',x:Number(lay.support?.x??10),y:Number(lay.support?.y??20),w:Number(lay.support?.w??80),h:Number(lay.support?.h??10),size:26,color:'#ffffff'},{id:sid(),type:'text',content:p.cta||'',x:Number(lay.cta?.x??20),y:Number(lay.cta?.y??86),w:Number(lay.cta?.w??60),h:Number(lay.cta?.h??8),size:28,color:'#ffffff'}].filter((e,i)=>i===0||e.content)}
 function dataUrlToFile(dataUrl,name){const [head,b64]=dataUrl.split(',');const mime=(head.match(/data:([^;]+)/)||[])[1]||'image/png';const bin=atob(b64);const bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return new File([bytes],name,{type:mime})}
 function openAiPublishModal(defaultName){
  const playlists=(demo.playlists||[]).slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
  openModal('Salvar conteúdo da IA',`<form id="aiPublishForm" class="form"><label>Nome do conteúdo<input name="name" maxlength="120" required value="${esc(defaultName)}"></label><label>Adicionar à playlist agora<select name="playlist_id"><option value="">Somente salvar em Conteúdos</option>${playlists.map(p=>`<option value="${esc(p.id)}">${esc(p.name||'Playlist')}</option>`).join('')}</select></label><p class="muted">Você pode salvar somente em Conteúdos ou já colocar a nova arte em uma playlist.</p><div class="mobile-form-actions"><button type="button" class="btn ghost" data-modal-cancel>Cancelar</button><button class="btn" type="submit">Salvar conteúdo</button></div></form>`);
  const form=qs('#aiPublishForm');if(!form)return;
  form.onsubmit=async e=>{e.preventDefault();const fd=new FormData(form),name=String(fd.get('name')||'').trim(),playlistId=String(fd.get('playlist_id')||'');if(!name)return;const submit=form.querySelector('button[type="submit"]');vdBusy(submit,true,'Salvando…');const st=qs('#aiEditorStatus');try{
    let url=aiGenerated.src;if(url.startsWith('data:')&&db){const file=dataUrlToFile(url,'ia-'+Date.now()+'.png');url=await uploadFile(file)}
    const media=await insert('media',{name,type:'image',file_url:url,text_content:null,duration:10,active:true,local_session_only:false});
    if(playlistId){const rows=db?await load('playlist_items'):(demo.playlist_items||[]);const n=rows.filter(i=>String(i.playlist_id)===playlistId).length;await insert('playlist_items',{playlist_id:playlistId,media_id:media.id,sort_order:n});}
    closeModal();await render();if(st)st.textContent=playlistId?'✓ Conteúdo salvo e adicionado à playlist.':'✓ Conteúdo salvo em Conteúdos.';vdToast(playlistId?'Conteúdo salvo e adicionado à playlist.':'Conteúdo salvo com sucesso.','success');
  }catch(err){console.error(err);if(st)st.textContent='Erro ao salvar: '+(err?.message||err);vdToast('Erro ao salvar conteúdo: '+(err?.message||err),'error');}finally{vdBusy(submit,false)}};
 }
 async function saveAiContent(){
  if(!aiGenerated){vdToast('Gere uma imagem primeiro.','error');return}openAiPublishModal('Conteúdo IA '+new Date().toLocaleDateString('pt-BR'));
 }
 function useAiInScene(){if(!aiGenerated)return alert('Gere uma imagem primeiro.');scene.orientation='portrait';scene.elements=directorSceneElements(aiGenerated.rawSrc||aiGenerated.src);selected=scene.elements.find(e=>e.type==='text')?.id||scene.elements[0]?.id||null;draw();localStorage.setItem('vd483_scene',JSON.stringify(scene));vdToast('Arte aberta com fotografia e textos em camadas editáveis.','success');}
 async function improveSelectedText(){
  const el=scene.elements.find(x=>x.id===selected);if(!el||el.type!=='text'){alert('Selecione um elemento de texto no editor.');return}let v=String(el.content||'').trim();if(!v)return;
  const st=qs('#aiEditorStatus'),btn=qs('#aiImproveTextBtn');if(btn){btn.disabled=true;btn.textContent='Melhorando…'}
  try{const data=await callEditorAI('improve','Melhore este texto para digital signage, curto e impactante.',v);el.content=String(data.text||v);draw();if(st)st.textContent='✦ Texto melhorado pela IA.';}
  catch(err){console.error('Editor IA texto',err);v=v.replace(/\s+/g,' ');if(v.length<42&&!/[.!?]$/.test(v))v+='!';el.content=v;draw();if(st)st.textContent='IA indisponível: '+(err?.message||err)+' · texto ajustado localmente.';}
  finally{if(btn){btn.disabled=false;btn.textContent='Melhorar texto selecionado'}}
 }
 window.VD_AI_444={generate:generateAiImage,build:buildAiLayout,improve:improveSelectedText,save:saveAiContent,use:useAiInScene};window.VD_AI_4422=window.VD_AI_444;
 document.querySelectorAll('[data-ai-preset]').forEach(b=>b.onclick=()=>{const p=qs('#aiEditorPrompt');if(!p)return;const x=b.dataset.aiPreset;p.value=x==='promo'?'Crie uma promoção vertical com título forte, preço em destaque e chamada Compre agora':x==='institucional'?'Crie uma arte institucional elegante com título, mensagem curta e chamada Saiba mais':'Crie uma oferta visual com nome do item, destaque principal e chamada Peça agora';p.focus()});
 const aiPlan=qs('#aiPlanCampaignBtn');if(aiPlan)aiPlan.onclick=planAiCampaign;
 const aiBuild=qs('#aiBuildLayoutBtn');if(aiBuild)aiBuild.onclick=buildAiLayout;const aiFolder=qs('#aiCreateFolderBtn');if(aiFolder)aiFolder.onclick=()=>generateAiImage('folder');const aiPhoto=qs('#aiCreatePhotoBtn');if(aiPhoto)aiPhoto.onclick=()=>generateAiImage('image');const aiRefInput=qs('#aiReferenceInput');if(aiRefInput)aiRefInput.onchange=e=>setAiReference(e.target.files?.[0]);const aiRefRemove=qs('#aiRemoveReferenceBtn');if(aiRefRemove)aiRefRemove.onclick=clearAiReference;const aiRefTransform=qs('#aiTransformReferenceBtn');if(aiRefTransform)aiRefTransform.onclick=transformAiReference;const aiSave=qs('#aiSaveContentBtn');if(aiSave)aiSave.onclick=saveAiContent;const aiUse=qs('#aiUseInSceneBtn');if(aiUse)aiUse.onclick=useAiInScene;const aiImprove=qs('#aiImproveTextBtn');if(aiImprove)aiImprove.onclick=improveSelectedText;
 document.querySelectorAll('[data-add-element]').forEach(b=>b.onclick=()=>add(b.dataset.addElement));canvas.onclick=()=>{selected=null;draw()};qs('#sceneOrientation').onchange=e=>{scene.orientation=e.target.value;draw()};qs('#saveSceneBtn').onclick=async()=>{localStorage.setItem('vd483_scene',JSON.stringify(scene));try{if(db){const name=prompt('Nome da cena:','Cena '+new Date().toLocaleDateString('pt-BR'))||'Cena';await insert('scenes',{name,orientation:scene.orientation,content:scene,duration:10,active:true});alert('Cena salva no Supabase e no cache local.')}else alert('Cena salva localmente. Conecte o Supabase para sincronizar.')}catch(err){console.error(err);alert('Cena salva localmente, mas houve erro ao sincronizar: '+err.message)}};qs('#newSceneBtn').onclick=()=>{if(confirm('Criar nova cena?')){scene={orientation:'portrait',elements:[]};selected=null;draw()}};qs('#clearSceneBtn').onclick=()=>{if(confirm('Limpar todos os elementos?')){scene.elements=[];selected=null;draw()}};qs('#previewSceneBtn').onclick=()=>{localStorage.setItem('vd483_scene',JSON.stringify(scene));window.open('../player/scene.html','_blank')};draw();
})();

setInterval(()=>{const monitorActive=qs('#monitor')?.classList.contains('active'),dashboardActive=qs('#dashboard')?.classList.contains('active');if((monitorActive||dashboardActive)&&!document.querySelector('#modal:not(.hidden)'))render().catch(console.warn)},15000);


// 4.21 — logout real do painel remoto
const logoutBtn=qs('#logoutBtn');
if(logoutBtn)logoutBtn.onclick=async()=>{
  try{
    if(db){const {error}=await db.auth.signOut();if(error)throw error;}
    location.replace('login.html');
  }catch(e){console.error('logout',e);alert('Não foi possível sair: '+(e?.message||e));}
};


// 4.25 — atalho "Mais" da barra inferior abre o menu completo
const mobileMoreBtn=qs('#mobileMoreBtn');
if(mobileMoreBtn) mobileMoreBtn.onclick=()=>{
  document.body.classList.add('mobile-nav-open');
  const b=qs('#mobileMenuBtn'); if(b) b.setAttribute('aria-expanded','true');
};
