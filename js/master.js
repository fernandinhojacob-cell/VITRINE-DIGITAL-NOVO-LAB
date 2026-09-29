/* Vitrine Digital SaaS 7.5 — planos e limites de telas, baixo egress */
(async()=>{const cfg=window.SUPABASE_CONFIG||{},db=window.supabase?.createClient(cfg.url,cfg.key),$=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));if(!db){alert("Supabase não configurado.");return}const {data:{session}}=await db.auth.getSession();if(!session){location.replace("login.html");return}const {data:adm}=await db.from("app_admins").select("user_id").eq("user_id",session.user.id).maybeSingle();if(!adm){alert("Este acesso não é Administrador Master.");location.replace("index.html");return}
let masterCache={companies:[],members:[],screens:[]};
let masterFilter="all", masterQuery="";
const applyClientFilters=()=>{
 const q=masterQuery.trim().toLowerCase();
 return masterCache.companies.filter(c=>{
   const cs=masterCache.screens.filter(s=>s.company_id===c.id), off=cs.filter(s=>!isOnline(s)).length;
   const matchQ=!q||String(c.name||"").toLowerCase().includes(q)||String(c.slug||"").toLowerCase().includes(q)||String(c.plan_name||"").toLowerCase().includes(q);
   const matchF=masterFilter==="all"||(masterFilter==="active"&&c.active)||(masterFilter==="inactive"&&!c.active)||(masterFilter==="offline"&&off>0);
   return matchQ&&matchF;
 });
};
const modal=on=>$("#modal").classList.toggle("hidden",!on);$("#newClientBtn").onclick=()=>modal(true);$("#closeModal").onclick=()=>modal(false);$("#masterLogout").onclick=async()=>{await db.auth.signOut();location.replace("login.html")};
const lastContact=s=>s.last_contact||s.updated_at||null;
const isOnline=s=>{const t=lastContact(s)?new Date(lastContact(s)).getTime():0;return !!t&&(Date.now()-t)<=60000};
const ago=value=>{if(!value)return "Nunca comunicou";const sec=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/1000));if(sec<60)return `há ${sec}s`;const min=Math.floor(sec/60);if(min<60)return `há ${min} min`;const h=Math.floor(min/60);if(h<24)return `há ${h}h`;const d=Math.floor(h/24);return `há ${d} dia${d===1?'':'s'}`};
const contactText=value=>value?`${ago(value)} • ${new Date(value).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}`:"Nunca comunicou";
async function loadPlans(){
 const host=$("#masterPlans");if(!host)return;
 const {data,error}=await db.from("plans").select("id,name,screen_limit,monthly_price,active,sort_order").order("sort_order",{ascending:true});
 if(error){host.innerHTML=`<p class="muted">Erro ao carregar planos: ${esc(error.message)}</p>`;return}
 host.innerHTML=(data||[]).map(p=>`<div class="master-plan" data-plan-card="${p.id}">
  <div class="master-plan-summary">
   <div class="master-plan-title"><strong>${esc(p.name)}</strong><span class="master-plan-meta">${Number(p.screen_limit||1)} tela${Number(p.screen_limit||1)===1?"":"s"} · R$ ${Number(p.monthly_price||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}/mês</span></div>
   <div class="master-plan-summary-actions"><span class="badge">${p.active?"Ativo":"Inativo"}</span><button class="btn ghost master-plan-edit" type="button" data-plan-edit>Editar</button></div>
  </div>
  <div class="master-plan-editor" hidden>
   <label>Nome<input data-plan-name value="${esc(p.name)}"></label>
   <label>Limite de telas<input data-plan-screens type="number" min="1" max="1000" value="${Number(p.screen_limit||1)}"></label>
   <label>Valor mensal (R$)<input data-plan-price type="number" min="0" step="0.01" value="${Number(p.monthly_price||0).toFixed(2)}"></label>
   <div class="master-plan-actions"><button class="btn" data-plan-save="${p.id}">Salvar</button><button class="btn ghost" type="button" data-plan-cancel>Cancelar</button></div>
  </div>
 </div>`).join("")||'<p class="muted">Nenhum plano cadastrado.</p>';
}
$("#masterPlans").onclick=async e=>{
 const edit=e.target.closest("[data-plan-edit]");if(edit){const card=edit.closest("[data-plan-card]"),editor=card.querySelector(".master-plan-editor");editor.hidden=false;edit.hidden=true;return}
 const cancel=e.target.closest("[data-plan-cancel]");if(cancel){const card=cancel.closest("[data-plan-card]"),editor=card.querySelector(".master-plan-editor"),editBtn=card.querySelector("[data-plan-edit]");editor.hidden=true;editBtn.hidden=false;return}
 const b=e.target.closest("[data-plan-save]");if(!b)return;
 const card=b.closest("[data-plan-card]"),name=card.querySelector("[data-plan-name]").value.trim(),
 limit=Number(card.querySelector("[data-plan-screens]").value),price=Number(card.querySelector("[data-plan-price]").value);
 if(!name||!Number.isInteger(limit)||limit<1||limit>1000||!Number.isFinite(price)||price<0){alert("Confira nome, limite de telas e valor.");return}
 b.disabled=true;b.textContent="Salvando…";
 try{const {error}=await db.from("plans").update({name,screen_limit:limit,monthly_price:price,updated_at:new Date().toISOString()}).eq("id",b.dataset.planSave);if(error)throw error;await loadPlans();alert("Plano atualizado.")}
 catch(err){alert("Erro: "+err.message)}finally{b.disabled=false}
};

async function load(){const [{data:companies,error:ce},{data:members,error:me},{data:screens,error:se},{data:heartbeats,error:he},{data:plans,error:pe}]=await Promise.all([db.from("companies").select("id,name,slug,active,created_at,plan_name,screen_limit,subscription_status,billing_exempt,current_period_end,grace_until,suspended_at").order("created_at",{ascending:false}),db.from("company_members").select("company_id,user_id,role,active"),db.from("screens").select("id,company_id,name,code,active,updated_at"),db.from("screen_heartbeat").select("screen_id,last_ping"),db.from("plans").select("name,screen_limit,monthly_price,active,billing_exempt,sort_order")]);if(ce)throw ce;if(me)throw me;if(se)throw se;if(he)throw he;if(pe)throw pe;const hb={};(heartbeats||[]).forEach(h=>{if(!hb[h.screen_id]||new Date(h.last_ping)>new Date(hb[h.screen_id]))hb[h.screen_id]=h.last_ping});const allScreens=(screens||[]).map(s=>({...s,last_contact:hb[s.id]||null})),online=allScreens.filter(isOnline).length;masterCache={companies:companies||[],members:members||[],screens:allScreens};$("#mCompanies").textContent=companies.length;$("#mActive").textContent=companies.filter(x=>x.active).length;$("#mMembers").textContent=members.filter(x=>x.active).length;$("#mScreens").textContent=allScreens.length;$("#mOnline").textContent=online;$("#mOffline").textContent=allScreens.length-online;const priceByName={};(plans||[]).forEach(p=>priceByName[p.name]=Number(p.monthly_price||0));const oneScreenPlan=(plans||[]).filter(p=>p.active&&!p.billing_exempt&&Number(p.screen_limit)===1).sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0))[0];const activeSubs=(companies||[]).filter(c=>c.active&&c.subscription_status==="active"&&!c.billing_exempt);const mrr=activeSubs.reduce((sum,c)=>{let price=priceByName[c.plan_name];if(price==null&&Number(c.screen_limit||0)===1&&oneScreenPlan)price=Number(oneScreenPlan.monthly_price||0);return sum+Number(price||0)},0);const ms=$("#mSubscriptions");if(ms)ms.textContent=activeSubs.length;const mr=$("#mMRR");if(mr)mr.textContent=mrr.toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const billable=(companies||[]).filter(c=>!c.billing_exempt), bActive=billable.filter(c=>c.subscription_status==="active"), bPast=billable.filter(c=>c.subscription_status==="past_due"), bSusp=billable.filter(c=>c.subscription_status==="suspended");
const ba=$("#bActive"),bp=$("#bPastDue"),bs=$("#bSuspended"),bm=$("#bMRR"),bl=$("#billingList");
if(ba)ba.textContent=bActive.length;if(bp)bp.textContent=bPast.length;if(bs)bs.textContent=bSusp.length;if(bm)bm.textContent=mrr.toLocaleString("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0});
const fmtDate=v=>v?new Date(v).toLocaleDateString("pt-BR"):"—";
if(bl)bl.innerHTML=billable.map(c=>{let price=priceByName[c.plan_name];if(price==null&&Number(c.screen_limit||0)===1&&oneScreenPlan)price=Number(oneScreenPlan.monthly_price||0);const st=c.subscription_status||"active",label=st==="active"?"Ativa":st==="past_due"?"Em atraso":st==="suspended"?"Suspensa":st;return `<div class="billing-row"><div class="billing-top"><div><div class="billing-name">${esc(c.name)}</div><div class="billing-plan">${esc(c.plan_name||"Plano")} · ${Number(price||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}/mês</div></div><span class="billing-status ${esc(st)}">${esc(label)}</span></div><div class="billing-meta">Próximo vencimento: <b>${fmtDate(c.current_period_end)}</b> · Tolerância até: <b>${fmtDate(c.grace_until)}</b>${c.suspended_at?` · Suspensa em: <b>${fmtDate(c.suspended_at)}</b>`:""}</div></div>`}).join("")||'<p class="muted">Nenhuma assinatura faturável.</p>';$("#masterUpdated").textContent="Atualizado "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});$("#clientList").innerHTML=applyClientFilters().map(c=>{const ms=members.filter(m=>m.company_id===c.id&&m.active),cs=allScreens.filter(s=>s.company_id===c.id),on=cs.filter(isOnline),off=cs.filter(s=>!isOnline(s)),latest=cs.map(lastContact).filter(Boolean).sort((a,b)=>new Date(b)-new Date(a))[0];const screenRows=cs.length?cs.map(s=>`<div class="master-screen"><span class="screen-dot ${isOnline(s)?'online':'offline'}"></span><div><b>${esc(s.name||s.code||'Tela')}</b><small>Empresa: ${esc(c.name)} · Código: ${esc(s.code||'—')}</small><small>Status: <strong class="${isOnline(s)?'online-text':'offline-text'}">${isOnline(s)?'Online':'Offline'}</strong> · Último contato: ${esc(contactText(lastContact(s)))}</small></div></div>`).join(''):'<div class="muted master-no-screen">Nenhuma tela cadastrada.</div>';return `<div class="client-row client-row-v74 vd-client-card" data-client-card="${c.id}">
<div class="vd-client-summary">
 <div class="vd-client-summary-main">
  <strong class="vd-client-summary-name">${esc(c.name)}</strong>
  <div class="vd-client-summary-meta">${c.active?"Ativa":"Inativa"} · ${cs.length} tela(s) · ${on.length} online</div>
 </div>
 <div class="vd-client-top-actions">
  <button class="btn ghost vd-client-open" type="button" data-client-open="${c.id}">Abrir</button>
  ${c.slug==="vitrine-digital-interno"?'<button class="btn ghost" type="button" disabled title="Cliente interno protegido">⋮ Opções</button>':`<button class="btn ghost vd-client-options" type="button" data-client-options="${c.id}" aria-expanded="false">⋮ Opções</button>`}
 </div>
</div>
<div class="vd-client-options-menu" data-client-options-menu="${c.id}" hidden>
 ${c.slug==="vitrine-digital-interno"?"":`<button class="btn ghost" type="button" data-toggle="${c.id}" data-active="${c.active}">${c.active?"Desativar cliente":"Reativar cliente"}</button><button class="btn danger" type="button" data-delete="${c.id}" data-name="${esc(c.name)}">Excluir definitivamente</button>`}
</div>
<div class="vd-client-details" hidden>
 <div class="client-main">
  <div class="muted">${esc(c.slug||"")} • ${c.active?"Ativa":"Inativa"} • ${ms.length} usuário(s)</div>
  <div class="client-screen-stats"><span><b>${cs.length}</b> tela(s)</span><span class="online-text"><b>${on.length}</b> online</span><span class="offline-text"><b>${off.length}</b> offline</span></div>
  <div class="muted client-last">Plano: <b>${esc(c.plan_name||((c.screen_limit||1)+" tela(s)"))}</b>${c.plan_name==="Cortesia / Interno"?" · <b>Sem cobrança</b>":""} · Uso: <b>${cs.length}/${Number(c.screen_limit||1)}</b> telas<br>Último contato: ${esc(latest?ago(latest):'—')}</div>
  <button class="btn ghost plan-btn" data-plan="${c.id}" data-plan-limit="${Number(c.screen_limit||1)}">Plano / limite</button>
  <details class="master-screen-details"><summary>Ver telas</summary><div class="master-screen-list">${screenRows}</div></details>
 </div>
 <div class="client-status"><span class="badge">${c.active?"Ativa":"Inativa"}</span>${c.slug==="vitrine-digital-interno"?"<div class=\"muted\">Protegida</div>":""}</div>
</div>
</div>`}).join("")||'<p class="muted">Nenhuma empresa cadastrada.</p>'}
async function manage(body){const {data,error}=await db.functions.invoke("master-manage-client",{body});if(error)throw error;if(data?.error)throw new Error(data.error);return data}
$("#clientList").onclick=async e=>{
const optionsBtn=e.target.closest("[data-client-options]");
if(optionsBtn){
 const id=optionsBtn.dataset.clientOptions,menu=document.querySelector(`[data-client-options-menu="${id}"]`);
 document.querySelectorAll("[data-client-options-menu]").forEach(m=>{if(m!==menu)m.hidden=true});
 if(menu){menu.hidden=!menu.hidden;optionsBtn.setAttribute("aria-expanded",String(!menu.hidden))}
 return;
}
const openBtn=e.target.closest("[data-client-open]");
if(openBtn){
 const companyId=openBtn.dataset.clientOpen;
 if(companyId){
   localStorage.setItem("vd_active_company_id",companyId);
   location.href="index.html?master_company="+encodeURIComponent(companyId);
 }
 return;
}const p=e.target.closest("[data-plan]");if(p){const current=Number(p.dataset.planLimit||1),raw=prompt("Limite de telas deste cliente:",String(current));if(raw===null)return;const limit=Number(raw);if(!Number.isInteger(limit)||limit<1||limit>1000){alert("Informe um número inteiro entre 1 e 1000.");return}p.disabled=true;try{await manage({action:"set_plan",company_id:p.dataset.plan,screen_limit:limit,plan_name:`${limit} tela${limit===1?"":"s"}`});await load();alert("Plano atualizado.")}catch(err){alert("Erro: "+err.message)}finally{p.disabled=false}return}const t=e.target.closest("[data-toggle]");if(t){const active=t.dataset.active==="true";if(!confirm(active?"Desativar este cliente? O acesso será bloqueado, mas os dados serão preservados.":"Reativar este cliente?"))return;t.disabled=true;try{await manage({action:"toggle_active",company_id:t.dataset.toggle,active:!active});await load()}catch(err){alert("Erro: "+err.message)}finally{t.disabled=false}return}const d=e.target.closest("[data-delete]");if(d){const name=d.dataset.name;if(!confirm(`EXCLUIR DEFINITIVAMENTE ${name}? Esta ação remove a empresa, acessos e dados vinculados e não pode ser desfeita.`))return;if(!confirm(`Confirma novamente a exclusão definitiva de ${name}?`))return;d.disabled=true;try{await manage({action:"delete",company_id:d.dataset.delete});await load();alert("Cliente excluído.")}catch(err){alert("Erro: "+err.message)}finally{d.disabled=false}}};
const search=$("#masterClientSearch"),filter=$("#masterClientFilter");
if(search)search.oninput=()=>{masterQuery=search.value||"";load().catch(e=>alert(e.message))};
if(filter)filter.onchange=()=>{masterFilter=filter.value||"all";load().catch(e=>alert(e.message))};
$("#refreshMaster").onclick=()=>load().catch(e=>alert(e.message));$("#newClientForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),btn=e.currentTarget.querySelector('button[type="submit"]'),msg=$("#masterMsg");btn.disabled=true;btn.textContent="Criando…";msg.textContent="";try{const {data,error}=await db.functions.invoke("master-create-client",{body:{name:f.get("name"),email:f.get("email"),password:f.get("password")}});if(error)throw error;if(data?.error)throw new Error(data.error);msg.textContent="✓ Cliente criado com sucesso.";e.currentTarget.reset();await load();setTimeout(()=>modal(false),700)}catch(err){msg.textContent="Erro: "+(err.message||String(err))}finally{btn.disabled=false;btn.textContent="Criar empresa e acesso"}};Promise.all([load(),loadPlans()]).catch(e=>alert("Erro ao carregar Painel Master: "+e.message))})();





;(()=> {
 const normalize=s=>({"dashboard":"dashboard","clientes":"clients","relatórios":"reports","relatorios":"reports","cobrança":"billing","cobranca":"billing","planos":"plans","consumo":"usage"}[String(s||"").trim().toLowerCase()]);
 function setRoute(r){
   r=normalize(r)||r||"dashboard";
   document.body.dataset.masterRoute=r;
   sessionStorage.setItem("vd_master_route",r);
 }
 document.addEventListener("click",e=>{
   const a=e.target.closest("[data-master-route],[data-route],.master-nav a,.master-nav button,.master-drawer a,.master-drawer button");
   if(!a)return;
   const r=normalize(a.dataset.masterRoute||a.dataset.route||a.textContent);
   if(r){e.preventDefault();setRoute(r);}
 },true);
 document.addEventListener("DOMContentLoaded",()=>setRoute(sessionStorage.getItem("vd_master_route")||"dashboard"));
})();


;(()=> {
 const cfg=window.SUPABASE_CONFIG||{},db=window.supabase?.createClient(cfg.url,cfg.key); if(!db)return;
 const fmt=n=>{n=Number(n||0);if(!n)return"0 B";let i=Math.min(Math.floor(Math.log(n)/Math.log(1024)),3),u=["B","KB","MB","GB"];return`${(n/1024**i).toLocaleString("pt-BR",{maximumFractionDigits:2})} ${u[i]}`};
 async function fill(){
  const [c,s,m,p]=await Promise.all([db.from("companies").select("id,name,active"),db.from("screens").select("id,company_id"),db.from("media").select("id,company_id,active,size_bytes"),db.from("playlists").select("id,company_id")]);
  const C=c.data||[],S=s.data||[],M=m.data||[],P=p.data||[], host=document.getElementById("reportsList");
  if(host)host.innerHTML=C.map(x=>{
   const cs=S.filter(y=>y.company_id===x.id), cm=M.filter(y=>y.company_id===x.id&&y.active!==false), cp=P.filter(y=>y.company_id===x.id);
   return `<div class="billing-row vd-report-card" data-report-card="${x.id}"><div class="vd-report-summary"><div><div class="billing-name">${String(x.name||"").replace(/[<>]/g,"")}</div><div class="billing-plan">${cs.length} tela(s) · ${cm.length} conteúdo(s) · ${cp.length} playlist(s)</div></div><button type="button" class="btn ghost" data-report-open="${x.id}">Abrir</button></div><div class="vd-report-details" hidden><div><b>Telas:</b> ${cs.length}</div><div><b>Conteúdos:</b> ${cm.length}</div><div><b>Playlists:</b> ${cp.length}</div></div></div>`;
  }).join("");
  const A=M.filter(x=>x.active!==false),b=A.reduce((t,x)=>t+Number(x.size_bytes||0),0);
  [["uMedia",A.length],["uStorage",fmt(b)],["uScreens",S.length],["uAvg",`${S.filter(s=>s.online===true).length} de ${S.length}`]].forEach(([id,v])=>{let e=document.getElementById(id);if(e)e.textContent=v});
 }
 window.addEventListener("load",()=>fill().catch(()=>{}),{once:true});
 async function fillCacheDiagnostics(){
  const alertEl=document.getElementById("uCacheAlerts"),statusEl=document.getElementById("uCacheStatus"),badge=document.getElementById("uCacheBadge"),detail=document.getElementById("uCacheDetail");
  if(!alertEl||!statusEl)return;
  const since=new Date(Date.now()-3600000).toISOString();
  const {data,error}=await db.from("player_cache_diagnostics").select("screen_id,event_type,media_url,created_at").gte("created_at",since).order("created_at",{ascending:false}).limit(1000);
  if(error){statusEl.textContent="Diagnóstico de cache indisponível.";if(badge){badge.textContent="⚪ Indisponível";badge.style.background="#334155";}return}
  const rows=data||[],groups=new Map();
  rows.filter(x=>x.event_type==="download_success").forEach(x=>{const k=x.screen_id+"|"+x.media_url;groups.set(k,(groups.get(k)||0)+1)});
  const repeated=[...groups.values()].filter(n=>n>1).length,fallbacks=rows.filter(x=>x.event_type==="remote_fallback").length,errors=rows.filter(x=>x.event_type==="download_error").length,blocks=rows.filter(x=>x.event_type==="circuit_block").length;
  const alerts=repeated+fallbacks+errors+blocks;alertEl.textContent=String(alerts);
  const ids=[...new Set(rows.filter(x=>["remote_fallback","download_error","circuit_block"].includes(x.event_type)).map(x=>x.screen_id).filter(Boolean))];
  let names=[];if(ids.length){const {data:ss}=await db.from("screens").select("id,name,code").in("id",ids);names=(ss||[]).map(x=>x.name||x.code).filter(Boolean)}
  if(blocks){if(badge){badge.textContent="🔴 BLOQUEADO";badge.style.background="#7f1d1d";badge.style.borderColor="#ef4444"}statusEl.textContent=`Proteção acionada: ${blocks} bloqueio(s) automático(s) na última hora.`}
  else if(alerts){if(badge){badge.textContent="🟡 ATENÇÃO";badge.style.background="#713f12";badge.style.borderColor="#f59e0b"}statusEl.textContent=`Atenção: ${repeated} repetição(ões), ${fallbacks} fallback(s) e ${errors} erro(s) na última hora.`}
  else{if(badge){badge.textContent="🟢 NORMAL";badge.style.background="#14532d";badge.style.borderColor="#22c55e"}statusEl.textContent="Cache saudável: nenhum download repetido, fallback remoto ou bloqueio detectado na última hora."}
  if(detail)detail.textContent=names.length?`Tela(s) envolvida(s): ${names.join(", ")}`:"Nenhuma tela com alerta na última hora.";
 }
 window.addEventListener("load",()=>fillCacheDiagnostics().catch(()=>{}),{once:true});
 setInterval(()=>fillCacheDiagnostics().catch(()=>{}),60000);
})();



;(()=> {
 async function vd929OnlineKpi(){
   const el=document.getElementById("uAvg");
   if(!el || !window.supabaseClient) return;
   try{
     const {data:screens,error}=await window.supabaseClient
       .from("screens").select("id,active");
     if(error) return;
     const ids=(screens||[]).filter(s=>s.active!==false).map(s=>s.id);
     let online=0;
     if(ids.length){
       const {data:hb}=await window.supabaseClient
         .from("screen_heartbeat").select("screen_id,last_seen_at").in("screen_id",ids);
       const now=Date.now(), latest={};
       (hb||[]).forEach(x=>{
         const t=new Date(x.last_seen_at).getTime();
         if(!latest[x.screen_id] || t>latest[x.screen_id]) latest[x.screen_id]=t;
       });
       online=ids.filter(id=>latest[id] && now-latest[id] <= 90000).length;
     }
     el.textContent=`${online} de ${ids.length}`;
   }catch(_){}
 }
 window.addEventListener("load",()=>setTimeout(vd929OnlineKpi,900),{once:true});
 document.addEventListener("click",e=>{
   const t=(e.target.textContent||"").trim().toLowerCase();
   if(t==="consumo") setTimeout(vd929OnlineKpi,500);
 },true);
})();

;(()=>{document.addEventListener("click",e=>{const b=e.target.closest("[data-report-open]");if(!b)return;const d=b.closest("[data-report-card]")?.querySelector(".vd-report-details"),open=d?.hidden;document.querySelectorAll("#reportsList .vd-report-details").forEach(x=>x.hidden=true);document.querySelectorAll("#reportsList [data-report-open]").forEach(x=>x.textContent="Abrir");if(d&&open){d.hidden=false;b.textContent="Fechar"}},true)})();


;(()=>{
 const st=document.createElement("style");
 st.id="vd-client-options-floating-939";
 st.textContent=`
 .vd-client-card{position:relative}
 .vd-client-top-actions{display:flex;flex-direction:column;gap:6px;align-items:stretch}
 .vd-client-options-menu{
   position:absolute;right:18px;top:88px;z-index:60;
   width:min(290px,calc(100% - 36px));
   padding:10px;border:1px solid #244864;border-radius:16px;
   background:#0b1d2f;box-shadow:0 14px 34px rgba(0,0,0,.38);
 }
 .vd-client-options-menu[hidden]{display:none!important}
 .vd-client-options-menu .btn{display:block;width:100%;margin:0 0 8px;text-align:left}
 .vd-client-options-menu .btn:last-child{margin-bottom:0}
 @media(max-width:600px){
   .vd-client-options-menu{right:12px;top:92px;width:min(285px,calc(100% - 24px))}
 }
 `;
 document.head.appendChild(st);
 document.addEventListener("click",e=>{
   if(e.target.closest("[data-client-options]")||e.target.closest("[data-client-options-menu]"))return;
   document.querySelectorAll("[data-client-options-menu]").forEach(m=>m.hidden=true);
   document.querySelectorAll("[data-client-options]").forEach(b=>b.setAttribute("aria-expanded","false"));
 },true);
})();


;(()=>{
 function placeMenu(btn,menu){
   const r=btn.getBoundingClientRect();
   const w=Math.min(290,window.innerWidth-24);
   let left=Math.min(window.innerWidth-w-12,Math.max(12,r.right-w));
   let top=r.bottom+6;
   menu.style.position="fixed";
   menu.style.width=w+"px";
   menu.style.left=left+"px";
   menu.style.right="auto";
   menu.style.top=top+"px";
   menu.style.zIndex="2147483647";
   menu.style.overflow="visible";
 }
 document.addEventListener("click",e=>{
   const btn=e.target.closest("[data-client-options]");
   if(!btn)return;
   const menu=document.querySelector(`[data-client-options-menu="${btn.dataset.clientOptions}"]`);
   if(!menu)return;
   setTimeout(()=>{if(!menu.hidden)placeMenu(btn,menu)},0);
 },true);
 window.addEventListener("resize",()=>{
   const menu=[...document.querySelectorAll("[data-client-options-menu]")].find(m=>!m.hidden);
   if(!menu)return;
   const btn=document.querySelector(`[data-client-options="${menu.dataset.clientOptionsMenu}"]`);
   if(btn)placeMenu(btn,menu);
 });
 window.addEventListener("scroll",()=>{
   const menu=[...document.querySelectorAll("[data-client-options-menu]")].find(m=>!m.hidden);
   if(!menu)return;
   const btn=document.querySelector(`[data-client-options="${menu.dataset.clientOptionsMenu}"]`);
   if(btn)placeMenu(btn,menu);
 },true);
})();


;(()=>{
 function getDrawer(){
   return document.querySelector(".master-drawer,.master-sidebar,.master-menu,[data-master-drawer]");
 }
 function drawerIsOpen(drawer){
   if(!drawer)return false;
   const r=drawer.getBoundingClientRect();
   return r.width>20 && r.right>0 && r.left<window.innerWidth;
 }
 function closeMasterDrawer(){
   const drawer=getDrawer();
   if(!drawer)return;
   const close=document.querySelector("[data-master-menu-close],.master-drawer-close,.menu-close");
   if(close){ close.click(); return; }
   drawer.classList.remove("open","active","show");
   document.body.classList.remove("master-menu-open","menu-open","drawer-open");
 }
 document.addEventListener("click",e=>{
   const drawer=getDrawer();
   if(!drawer||!drawerIsOpen(drawer))return;
   if(drawer.contains(e.target))return;
   if(e.target.closest(".master-menu-btn,.menu-toggle,[data-master-menu]"))return;
   closeMasterDrawer();
 },true);
})();
