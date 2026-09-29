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
if(bl)bl.innerHTML=billable.map(c=>{let price=priceByName[c.plan_name];if(price==null&&Number(c.screen_limit||0)===1&&oneScreenPlan)price=Number(oneScreenPlan.monthly_price||0);const st=c.subscription_status||"active",label=st==="active"?"Ativa":st==="past_due"?"Em atraso":st==="suspended"?"Suspensa":st;return `<div class="billing-row"><div class="billing-top"><div><div class="billing-name">${esc(c.name)}</div><div class="billing-plan">${esc(c.plan_name||"Plano")} · ${Number(price||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}/mês</div></div><span class="billing-status ${esc(st)}">${esc(label)}</span></div><div class="billing-meta">Próximo vencimento: <b>${fmtDate(c.current_period_end)}</b> · Tolerância até: <b>${fmtDate(c.grace_until)}</b>${c.suspended_at?` · Suspensa em: <b>${fmtDate(c.suspended_at)}</b>`:""}</div></div>`}).join("")||'<p class="muted">Nenhuma assinatura faturável.</p>';$("#masterUpdated").textContent="Atualizado "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});$("#clientList").innerHTML=applyClientFilters().map(c=>{const ms=members.filter(m=>m.company_id===c.id&&m.active),cs=allScreens.filter(s=>s.company_id===c.id),on=cs.filter(isOnline),off=cs.filter(s=>!isOnline(s)),latest=cs.map(lastContact).filter(Boolean).sort((a,b)=>new Date(b)-new Date(a))[0];const screenRows=cs.length?cs.map(s=>`<div class="master-screen"><span class="screen-dot ${isOnline(s)?'online':'offline'}"></span><div><b>${esc(s.name||s.code||'Tela')}</b><small>Empresa: ${esc(c.name)} · Código: ${esc(s.code||'—')}</small><small>Status: <strong class="${isOnline(s)?'online-text':'offline-text'}">${isOnline(s)?'Online':'Offline'}</strong> · Último contato: ${esc(contactText(lastContact(s)))}</small></div></div>`).join(''):'<div class="muted master-no-screen">Nenhuma tela cadastrada.</div>';return `<div class="client-row client-row-v74"><div class="client-main"><strong>${esc(c.name)}</strong><div class="muted">${esc(c.slug||"")} • ${c.active?"Ativa":"Inativa"} • ${ms.length} usuário(s)</div><div class="client-screen-stats"><span><b>${cs.length}</b> tela(s)</span><span class="online-text"><b>${on.length}</b> online</span><span class="offline-text"><b>${off.length}</b> offline</span></div><div class="muted client-last">Plano: <b>${esc(c.plan_name||((c.screen_limit||1)+" tela(s)"))}</b>${c.plan_name==="Cortesia / Interno"?" · <b>Sem cobrança</b>":""} · Uso: <b>${cs.length}/${Number(c.screen_limit||1)}</b> telas<br>Último contato: ${esc(latest?ago(latest):'—')}</div><button class="btn ghost plan-btn" data-plan="${c.id}" data-plan-limit="${Number(c.screen_limit||1)}">Plano / limite</button><details class="master-screen-details"><summary>Ver telas</summary><div class="master-screen-list">${screenRows}</div></details></div><div class="client-status"><span class="badge">${c.active?"Ativa":"Inativa"}</span>${c.slug==="studio-a"?"<div class=\"muted\">Protegida</div>":`<div class="master-actions"><button class="btn ghost" data-toggle="${c.id}" data-active="${c.active}">${c.active?"Desativar":"Reativar"}</button><button class="btn danger" data-delete="${c.id}" data-name="${esc(c.name)}">Excluir</button></div>`}</div></div>`}).join("")||'<p class="muted">Nenhuma empresa cadastrada.</p>'}
async function manage(body){const {data,error}=await db.functions.invoke("master-manage-client",{body});if(error)throw error;if(data?.error)throw new Error(data.error);return data}
$("#clientList").onclick=async e=>{const p=e.target.closest("[data-plan]");if(p){const current=Number(p.dataset.planLimit||1),raw=prompt("Limite de telas deste cliente:",String(current));if(raw===null)return;const limit=Number(raw);if(!Number.isInteger(limit)||limit<1||limit>1000){alert("Informe um número inteiro entre 1 e 1000.");return}p.disabled=true;try{await manage({action:"set_plan",company_id:p.dataset.plan,screen_limit:limit,plan_name:`${limit} tela${limit===1?"":"s"}`});await load();alert("Plano atualizado.")}catch(err){alert("Erro: "+err.message)}finally{p.disabled=false}return}const t=e.target.closest("[data-toggle]");if(t){const active=t.dataset.active==="true";if(!confirm(active?"Desativar este cliente? O acesso será bloqueado, mas os dados serão preservados.":"Reativar este cliente?"))return;t.disabled=true;try{await manage({action:"toggle_active",company_id:t.dataset.toggle,active:!active});await load()}catch(err){alert("Erro: "+err.message)}finally{t.disabled=false}return}const d=e.target.closest("[data-delete]");if(d){const name=d.dataset.name;if(!confirm(`EXCLUIR DEFINITIVAMENTE ${name}? Esta ação remove a empresa, acessos e dados vinculados e não pode ser desfeita.`))return;if(!confirm(`Confirma novamente a exclusão definitiva de ${name}?`))return;d.disabled=true;try{await manage({action:"delete",company_id:d.dataset.delete});await load();alert("Cliente excluído.")}catch(err){alert("Erro: "+err.message)}finally{d.disabled=false}}};
const search=$("#masterClientSearch"),filter=$("#masterClientFilter");
if(search)search.oninput=()=>{masterQuery=search.value||"";load().catch(e=>alert(e.message))};
if(filter)filter.onchange=()=>{masterFilter=filter.value||"all";load().catch(e=>alert(e.message))};
$("#refreshMaster").onclick=()=>load().catch(e=>alert(e.message));$("#newClientForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),btn=e.currentTarget.querySelector('button[type="submit"]'),msg=$("#masterMsg");btn.disabled=true;btn.textContent="Criando…";msg.textContent="";try{const {data,error}=await db.functions.invoke("master-create-client",{body:{name:f.get("name"),email:f.get("email"),password:f.get("password")}});if(error)throw error;if(data?.error)throw new Error(data.error);msg.textContent="✓ Cliente criado com sucesso.";e.currentTarget.reset();await load();setTimeout(()=>modal(false),700)}catch(err){msg.textContent="Erro: "+(err.message||String(err))}finally{btn.disabled=false;btn.textContent="Criar empresa e acesso"}};Promise.all([load(),loadPlans()]).catch(e=>alert("Erro ao carregar Painel Master: "+e.message))})();


;(()=> {
 function compactClients(){
   const host=document.getElementById("clientList"); if(!host)return;
   const cards=[...host.children].filter(el=>el.nodeType===1);
   cards.forEach(card=>{
     if(card.querySelector(":scope > .vd-client-summary")) return;
     card.classList.add("client-card");
     const text=card.innerText||"";
     const lines=text.split("\n").map(x=>x.trim()).filter(Boolean);
     const name=(lines[0]||"Cliente").replace(/^(Ativa|Inativa)\s*/i,"").trim();
     const screenMatch=text.match(/(\d+)\s+tela\(s\)/i);
     const onlineMatch=text.match(/(\d+)\s+online/i);
     const active=/\bAtiva\b/i.test(text)&&!/\bInativa\b/i.test(lines.slice(0,3).join(" "));
     const summary=document.createElement("div");
     summary.className="vd-client-summary";
     summary.innerHTML=`<div class="vd-client-summary-main"><div class="vd-client-summary-name"></div><div class="vd-client-summary-meta"></div></div><button type="button" class="vd-client-open" aria-expanded="false"></button>`;
     summary.querySelector(".vd-client-summary-name").textContent=name;
     summary.querySelector(".vd-client-summary-meta").textContent=`${active?"Ativa":"Inativa"} · ${screenMatch?screenMatch[1]:"0"} tela(s) · ${onlineMatch?onlineMatch[1]:"0"} online`;
     card.prepend(summary);
   });
 }
 function observe(){
   const host=document.getElementById("clientList");if(!host)return;
   compactClients();
   new MutationObserver(()=>compactClients()).observe(host,{childList:true});
   host.addEventListener("click",e=>{
     const b=e.target.closest(".vd-client-open"); if(!b)return;
     const card=b.closest(".client-card"), opening=!card.classList.contains("vd-open");
     host.querySelectorAll(".client-card.vd-open").forEach(c=>{c.classList.remove("vd-open");const x=c.querySelector(".vd-client-open");if(x)x.setAttribute("aria-expanded","false")});
     if(opening){card.classList.add("vd-open");b.setAttribute("aria-expanded","true")}
   });
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",observe);else observe();
})();
