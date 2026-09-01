// ====== UTILS ======
function fmt(v,sign=false){
  const n=Number(v||0);
  const s=n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  return sign?(n>=0?'+ R$ '+s:'- R$ '+Math.abs(n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})):'R$ '+s;
}
function fmtK(v){const n=Number(v||0);return n>=1000000?'R$ '+(n/1000000).toFixed(1)+'M':n>=1000?'R$ '+(n/1000).toFixed(0)+'k':fmt(n);}
function today(){return new Date().toISOString().split('T')[0];}
function mesAtual(){const d=new Date();return{mes:d.getMonth()+1,ano:d.getFullYear()};}
function nomeMes(m,a){return new Date(a,m-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});}
function closeModal(){const m=document.getElementById('overlay');if(m)m.remove();}
function uid(){return currentUser.id;}
let charts={};
function destroyChart(id){if(charts[id]){charts[id].destroy();delete charts[id];}}

// TOAST
function toast(msg,type='success'){
  let c=document.getElementById('toast-container');
  if(!c){c=document.createElement('div');c.id='toast-container';c.className='toast-container';document.body.appendChild(c);}
  const t=document.createElement('div');
  const icons={success:'ti-check',error:'ti-x',warning:'ti-alert-triangle'};
  t.className='toast '+type;
  t.innerHTML='<i class="ti '+icons[type]+'" style="color:var(--'+(type==='success'?'green':type==='error'?'red':'amber')+')"></i>'+msg;
  c.appendChild(t);
  setTimeout(()=>t.remove(),3500);
}

// DARK MODE
function initTheme(){
  const saved=localStorage.getItem('theme')||'light';
  document.documentElement.setAttribute('data-theme',saved);
}
function toggleTheme(){
  const cur=document.documentElement.getAttribute('data-theme');
  const next=cur==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',next);
  localStorage.setItem('theme',next);
  const btn=document.getElementById('btn-theme');
  if(btn)btn.innerHTML='<i class="ti ti-'+(next==='dark'?'sun':'moon')+'"></i> '+(next==='dark'?'Modo claro':'Modo escuro');
}
initTheme();

// CATEGORIAS (carregadas do banco + padrão)
let CATS_DESPESA=['Moradia','Alimentação','Restaurantes','Mercado','Transporte','Combustível','Saúde','Academia','Lazer','Viagens','Compras','Assinaturas','Educação','Impostos','Dívidas','Família','Presentes','Outros'];
let CATS_RECEITA=['Salário','Pró-labore','Distribuição de lucros','Comissões','Freelancer','Venda','Aluguel','Investimentos','Reembolso','Outros'];
const FORMAS=['PIX','Débito','Crédito','Dinheiro','Boleto','Transferência','Outro'];
const CAT_COLORS={'Moradia':'#6366F1','Alimentação':'#F59E0B','Restaurantes':'#EF4444','Mercado':'#10B981','Transporte':'#3B82F6','Combustível':'#8B5CF6','Saúde':'#EC4899','Academia':'#14B8A6','Lazer':'#F97316','Viagens':'#06B6D4','Compras':'#84CC16','Assinaturas':'#A855F7','Educação':'#0EA5E9','Impostos':'#64748B','Dívidas':'#DC2626','Família':'#D97706','Presentes':'#BE185D','Investimentos':'#059669','Outros':'#9CA3AF'};

async function loadCategorias(){
  try{
    const {data}=await sb.from('categorias').select('*').eq('user_id',uid()).order('nome');
    if(data&&data.length){
      const d=data.filter(c=>c.tipo==='despesa').map(c=>c.nome);
      const r=data.filter(c=>c.tipo==='receita').map(c=>c.nome);
      if(d.length)CATS_DESPESA=[...new Set([...CATS_DESPESA,...d])];
      if(r.length)CATS_RECEITA=[...new Set([...CATS_RECEITA,...r])];
    }
  }catch(e){}
}

// ====== APP SHELL ======
let currentView='dashboard';
let filterMes=new Date().getMonth()+1;
let filterAno=new Date().getFullYear();

async function initApp(){
  initTheme();
  await loadCategorias();
  const user=currentUser;
  const name=(user.user_metadata?.full_name||user.email||'Usuário').split(' ')[0];
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';

  document.getElementById('root').innerHTML=`
    <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeSidebar()"></div>
    <div class="app">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-logo">
          <div class="sidebar-logo-wrap">
            <div class="sidebar-logo-icon">💰</div>
            <span class="sidebar-logo-name">FinançasPro</span>
          </div>
        </div>
        <div class="sidebar-user">Olá, <strong>${name}</strong></div>
        <nav class="nav">
          <div class="nav-section">Principal</div>
          <div class="nav-item active" data-view="dashboard"><i class="ti ti-layout-dashboard"></i> Dashboard</div>
          <div class="nav-item" data-view="lancamentos"><i class="ti ti-list"></i> Lançamentos</div>
          <div class="nav-section">Financeiro</div>
          <div class="nav-item" data-view="contas"><i class="ti ti-building-bank"></i> Contas</div>
          <div class="nav-item" data-view="cartoes"><i class="ti ti-credit-card"></i> Cartões</div>
          <div class="nav-item" data-view="apagar"><i class="ti ti-clock"></i> A Pagar <span class="nav-badge" id="badge-apagar" style="display:none">!</span></div>
          <div class="nav-item" data-view="parcelamentos"><i class="ti ti-receipt"></i> Parcelamentos</div>
          <div class="nav-section">Análise</div>
          <div class="nav-item" data-view="orcamento"><i class="ti ti-target"></i> Orçamento</div>
          <div class="nav-item" data-view="metas"><i class="ti ti-trophy"></i> Metas</div>
          <div class="nav-item" data-view="investimentos"><i class="ti ti-chart-line"></i> Investimentos</div>
          <div class="nav-item" data-view="relatorios"><i class="ti ti-report-analytics"></i> Relatórios</div>
          <div class="nav-section">Config.</div>
          <div class="nav-item" data-view="categorias"><i class="ti ti-tag"></i> Categorias</div>
        </nav>
        <div class="sidebar-footer">
          <button class="btn-theme" id="btn-theme" onclick="toggleTheme()">
            <i class="ti ti-${isDark?'sun':'moon'}"></i> ${isDark?'Modo claro':'Modo escuro'}
          </button>
          <button class="btn-logout" onclick="logout()"><i class="ti ti-logout"></i> Sair</button>
        </div>
      </aside>
      <div class="main">
        <div class="topbar">
          <div class="topbar-left">
            <button class="btn-menu" onclick="toggleSidebar()"><i class="ti ti-menu-2"></i></button>
            <span class="topbar-title" id="topbar-title">Dashboard</span>
          </div>
          <div class="topbar-actions" id="topbar-actions"></div>
        </div>
        <div class="content" id="content"><div class="loading"><div class="spinner"></div><span>Carregando...</span></div></div>
      </div>
    </div>
    <div class="bottom-nav">
      <div class="bottom-nav-items">
        <button class="bottom-nav-item active" data-view="dashboard"><i class="ti ti-layout-dashboard"></i>Início</button>
        <button class="bottom-nav-item" data-view="lancamentos"><i class="ti ti-list"></i>Lançamentos</button>
        <button class="bottom-nav-item" data-view="apagar"><i class="ti ti-clock"></i>A Pagar</button>
        <button class="bottom-nav-item" data-view="relatorios"><i class="ti ti-chart-bar"></i>Relatórios</button>
        <button class="bottom-nav-item" data-view="categorias"><i class="ti ti-settings"></i>Config.</button>
      </div>
    </div>
    <button class="fab" onclick="novoLancamentoModal()" title="Novo lançamento">+</button>`;

  document.querySelectorAll('.nav-item[data-view]').forEach(item=>{
    item.addEventListener('click',()=>{setView(item.dataset.view);closeSidebar();});
  });
  document.querySelectorAll('.bottom-nav-item[data-view]').forEach(item=>{
    item.addEventListener('click',()=>setView(item.dataset.view));
  });

  checkVencimentos();
  loadView('dashboard');
}

function setView(view){
  currentView=view;
  document.querySelectorAll('.nav-item[data-view]').forEach(n=>n.classList.toggle('active',n.dataset.view===view));
  document.querySelectorAll('.bottom-nav-item[data-view]').forEach(n=>n.classList.toggle('active',n.dataset.view===view));
  const titles={dashboard:'Dashboard',lancamentos:'Lançamentos',contas:'Contas',cartoes:'Cartões',apagar:'Contas a Pagar',parcelamentos:'Parcelamentos',orcamento:'Orçamento',metas:'Metas',investimentos:'Investimentos',relatorios:'Relatórios',categorias:'Categorias'};
  document.getElementById('topbar-title').textContent=titles[view]||view;
  document.getElementById('topbar-actions').innerHTML='';
  loadView(view);
}

function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('show');
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

async function loadView(view){
  const c=document.getElementById('content');
  c.innerHTML='<div class="loading"><div class="spinner"></div><span>Carregando...</span></div>';
  Object.keys(charts).forEach(k=>destroyChart(k));
  try{
    switch(view){
      case 'dashboard': await renderDashboard(); break;
      case 'lancamentos': await renderLancamentos(); break;
      case 'contas': await renderContas(); break;
      case 'cartoes': await renderCartoes(); break;
      case 'apagar': await renderAPagar(); break;
      case 'parcelamentos': await renderParcelamentos(); break;
      case 'orcamento': await renderOrcamento(); break;
      case 'metas': await renderMetas(); break;
      case 'investimentos': await renderInvestimentos(); break;
      case 'relatorios': await renderRelatorios(); break;
      case 'categorias': await renderCategorias(); break;
    }
  }catch(e){c.innerHTML='<div class="loading" style="color:var(--red)">Erro: '+e.message+'</div>';}
}

async function checkVencimentos(){
  try{
    const hoje=new Date();hoje.setHours(0,0,0,0);
    const em3=new Date(hoje);em3.setDate(em3.getDate()+3);
    const fim3=em3.toISOString().split('T')[0];
    const {data}=await sb.from('lancamentos').select('id').eq('user_id',uid()).eq('tipo','despesa').eq('status','pendente').lte('data_vencimento',fim3);
    const badge=document.getElementById('badge-apagar');
    if(badge&&data&&data.length>0){badge.style.display='inline';badge.textContent=data.length;}
  }catch(e){}
}

// ====== FILTRO MÊS ======
function filterBar(){
  const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const anos=[2023,2024,2025,2026,2027];
  return`<div class="filter-bar">
    <select class="filter-select" id="filter-mes" onchange="updateFilter()">
      ${meses.map((m,i)=>'<option value="'+(i+1)+'" '+(filterMes===i+1?'selected':'')+'>'+m+'</option>').join('')}
    </select>
    <select class="filter-select" id="filter-ano" onchange="updateFilter()">
      ${anos.map(a=>'<option value="'+a+'" '+(filterAno===a?'selected':'')+'>'+a+'</option>').join('')}
    </select>
  </div>`;
}

function updateFilter(){
  filterMes=parseInt(document.getElementById('filter-mes').value);
  filterAno=parseInt(document.getElementById('filter-ano').value);
  loadView(currentView);
}

function getPeriodo(){
  const ini=filterAno+'-'+String(filterMes).padStart(2,'0')+'-01';
  const fim=filterAno+'-'+String(filterMes).padStart(2,'0')+'-31';
  return{ini,fim};
}

// ====== DASHBOARD ======
async function renderDashboard(){
  const {ini,fim}=getPeriodo();
  const [{data:lanc},{data:contas},{data:metas},{data:invest}]=await Promise.all([
    sb.from('lancamentos').select('*').eq('user_id',uid()).gte('data',ini).lte('data',fim),
    sb.from('contas').select('*').eq('user_id',uid()),
    sb.from('metas').select('*').eq('user_id',uid()),
    sb.from('investimentos').select('*').eq('user_id',uid())
  ]);
  const receitas=(lanc||[]).filter(l=>l.tipo==='receita'&&l.status==='recebido').reduce((s,l)=>s+Number(l.valor),0);
  const despesas=(lanc||[]).filter(l=>l.tipo==='despesa'&&l.status!=='cancelado').reduce((s,l)=>s+Number(l.valor),0);
  const saldoMes=receitas-despesas;
  const apagar=(lanc||[]).filter(l=>l.tipo==='despesa'&&l.status==='pendente').reduce((s,l)=>s+Number(l.valor),0);
  const areceber=(lanc||[]).filter(l=>l.tipo==='receita'&&l.status==='a_receber').reduce((s,l)=>s+Number(l.valor),0);
  const saldoContas=(contas||[]).reduce((s,c)=>s+Number(c.saldo_atual||c.saldo_inicial||0),0);
  const totalInvest=(invest||[]).reduce((s,i)=>s+Number(i.valor_atual||i.valor_investido||0),0);
  const catData={};
  (lanc||[]).filter(l=>l.tipo==='despesa'&&l.status!=='cancelado').forEach(l=>{catData[l.categoria]=(catData[l.categoria]||0)+Number(l.valor);});
  const catLabels=Object.keys(catData).sort((a,b)=>catData[b]-catData[a]);
  const topCat=catLabels[0];
  const economia=receitas>0?Math.round(saldoMes/receitas*100):0;

  // Alertas vencimento
  const hoje=new Date();hoje.setHours(0,0,0,0);
  const vencidos=(lanc||[]).filter(l=>{if(l.tipo!=='despesa'||l.status!=='pendente')return false;const v=new Date((l.data_vencimento||l.data)+'T00:00:00');return v<hoje;});
  const vencendo=(lanc||[]).filter(l=>{if(l.tipo!=='despesa'||l.status!=='pendente')return false;const v=new Date((l.data_vencimento||l.data)+'T00:00:00');const d=(v-hoje)/(864e5);return d>=0&&d<=3;});

  let alertas='';
  if(vencidos.length)alertas+='<div class="alert-banner alert-danger"><i class="ti ti-alert-circle"></i> '+vencidos.length+' conta'+( vencidos.length>1?'s':'')+' vencida'+( vencidos.length>1?'s':'')+' — total '+fmt(vencidos.reduce((s,l)=>s+Number(l.valor),0))+'</div>';
  if(vencendo.length)alertas+='<div class="alert-banner alert-warning"><i class="ti ti-clock"></i> '+vencendo.length+' conta'+( vencendo.length>1?'s':'')+' vencendo em até 3 dias</div>';

  const resumoTexto=receitas>0
    ?'Você recebeu <strong>'+fmt(receitas)+'</strong> e gastou <strong>'+fmt(despesas)+'</strong>. '+(saldoMes>=0?'Economia de <strong>'+fmt(saldoMes)+'</strong> ('+economia+'% da renda).':'Déficit de <strong>'+fmt(Math.abs(saldoMes))+'</strong>.')+(topCat?' Maior gasto: <strong>'+topCat+'</strong>.':'')
    :'Nenhuma receita lançada ainda este mês.';

  document.getElementById('content').innerHTML=`
    ${filterBar()}
    ${alertas}
    <div class="resumo-card">
      <h3>📊 ${nomeMes(filterMes,filterAno)}</h3>
      <p>${resumoTexto}</p>
    </div>
    <div class="cards-grid">
      <div class="card"><div class="card-icon icon-green"><i class="ti ti-trending-up"></i></div><div class="card-label">Receitas</div><div class="card-value" style="color:var(--green-dark)">${fmt(receitas)}</div></div>
      <div class="card"><div class="card-icon icon-red"><i class="ti ti-trending-down"></i></div><div class="card-label">Despesas</div><div class="card-value" style="color:var(--red)">${fmt(despesas)}</div></div>
      <div class="card"><div class="card-icon ${saldoMes>=0?'icon-green':'icon-red'}"><i class="ti ti-wallet"></i></div><div class="card-label">Saldo do mês</div><div class="card-value" style="color:${saldoMes>=0?'var(--green-dark)':'var(--red)'}">${fmt(saldoMes)}</div><div class="card-sub ${economia>=0?'up':'down'}">${economia}% de economia</div></div>
      <div class="card"><div class="card-icon icon-blue"><i class="ti ti-building-bank"></i></div><div class="card-label">Saldo disponível</div><div class="card-value">${fmt(saldoContas)}</div></div>
      <div class="card"><div class="card-icon icon-amber"><i class="ti ti-clock"></i></div><div class="card-label">A pagar</div><div class="card-value" style="color:var(--amber)">${fmt(apagar)}</div></div>
      <div class="card"><div class="card-icon icon-green"><i class="ti ti-cash"></i></div><div class="card-label">A receber</div><div class="card-value" style="color:var(--green-dark)">${fmt(areceber)}</div></div>
      <div class="card"><div class="card-icon icon-purple"><i class="ti ti-chart-line"></i></div><div class="card-label">Investimentos</div><div class="card-value" style="color:var(--purple)">${fmtK(totalInvest)}</div></div>
      <div class="card"><div class="card-icon icon-blue"><i class="ti ti-building-estate"></i></div><div class="card-label">Patrimônio</div><div class="card-value">${fmtK(saldoContas+totalInvest)}</div></div>
    </div>
    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">Gastos por categoria</div>
        ${catLabels.length?'<div style="position:relative;height:200px"><canvas id="chartCat"></canvas></div>':'<div style="text-align:center;padding:32px;color:var(--text3)">Nenhuma despesa lançada</div>'}
      </div>
      <div class="chart-card">
        <div class="chart-title">Evolução mensal <span>6 meses</span></div>
        <div style="position:relative;height:200px"><canvas id="chartMensal"></canvas></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="table-card">
        <div class="table-header"><span class="table-title">Últimos lançamentos</span><button class="btn btn-sm" onclick="setView('lancamentos')">Ver todos</button></div>
        <table><thead><tr><th>Descrição</th><th>Valor</th><th>Status</th></tr></thead><tbody id="tbody-recentes"></tbody></table>
      </div>
      <div>
        <div class="table-card">
          <div class="table-header"><span class="table-title">Próximas contas</span></div>
          <table><thead><tr><th>Descrição</th><th>Vence</th><th>Valor</th></tr></thead><tbody id="tbody-apagar"></tbody></table>
        </div>
        ${(metas||[]).length?'<div class="chart-card"><div class="chart-title">Metas</div><div id="metas-dash"></div></div>':''}
      </div>
    </div>`;

  if(catLabels.length){
    charts['chartCat']=new Chart(document.getElementById('chartCat'),{
      type:'doughnut',
      data:{labels:catLabels,datasets:[{data:catLabels.map(c=>catData[c]),backgroundColor:catLabels.map(c=>CAT_COLORS[c]||'#9CA3AF'),borderWidth:2,borderColor:'transparent'}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{size:10},boxWidth:10}}}}
    });
  }
  await renderChartMensal();

  const recentes=(lanc||[]).sort((a,b)=>new Date(b.data)-new Date(a.data)).slice(0,6);
  document.getElementById('tbody-recentes').innerHTML=recentes.length?recentes.map(l=>`
    <tr>
      <td><div style="font-weight:600;font-size:12px">${l.descricao}</div><div style="font-size:10px;color:var(--text2)">${l.categoria||'—'}</div></td>
      <td style="color:${l.tipo==='receita'?'var(--green-dark)':'var(--red)'};font-weight:600;white-space:nowrap">${l.tipo==='receita'?'+':'-'}${fmt(l.valor)}</td>
      <td><span class="badge ${l.status==='recebido'||l.status==='pago'?'badge-green':l.status==='pendente'?'badge-amber':'badge-blue'}">${l.status}</span></td>
    </tr>`).join(''):'<tr><td colspan="3" class="empty-row">Nenhum lançamento</td></tr>';

  const proximas=(lanc||[]).filter(l=>l.tipo==='despesa'&&l.status==='pendente').sort((a,b)=>new Date(a.data_vencimento||a.data)-new Date(b.data_vencimento||b.data)).slice(0,5);
  document.getElementById('tbody-apagar').innerHTML=proximas.length?proximas.map(l=>{
    const venc=new Date((l.data_vencimento||l.data)+'T00:00:00');
    const diff=Math.round((venc-hoje)/(864e5));
    const badge=diff<0?'badge-red':diff<=3?'badge-amber':'badge-gray';
    return'<tr><td style="font-size:12px">'+l.descricao+'</td><td><span class="badge '+badge+'">'+(diff<0?'Vencido':diff===0?'Hoje':'Em '+diff+'d')+'</span></td><td style="color:var(--red);font-weight:600;white-space:nowrap">'+fmt(l.valor)+'</td></tr>';
  }).join(''):'<tr><td colspan="3" class="empty-row">Sem pendências</td></tr>';

  if((metas||[]).length){
    document.getElementById('metas-dash').innerHTML=(metas||[]).slice(0,3).map(m=>{
      const pct=Math.min(100,Math.round(m.valor_atual/m.valor_desejado*100));
      return'<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="font-weight:600">'+m.nome+'</span><span style="color:var(--text2)">'+pct+'%</span></div><div class="progress-bar"><div class="progress-fill" style="width:'+pct+'%;background:'+(pct>=100?'var(--green)':pct>=70?'var(--amber)':'var(--blue)')+'"></div></div></div>';
    }).join('');
  }
}

async function renderChartMensal(){
  const meses=[],labels=[],now=new Date();
  for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);meses.push({mes:d.getMonth()+1,ano:d.getFullYear()});labels.push(d.toLocaleDateString('pt-BR',{month:'short'}));}
  const recArr=[],despArr=[];
  for(const {mes,ano} of meses){
    const ini=ano+'-'+String(mes).padStart(2,'0')+'-01';
    const fim=ano+'-'+String(mes).padStart(2,'0')+'-31';
    const {data:l}=await sb.from('lancamentos').select('tipo,valor,status').eq('user_id',uid()).gte('data',ini).lte('data',fim);
    recArr.push((l||[]).filter(x=>x.tipo==='receita'&&x.status==='recebido').reduce((s,x)=>s+Number(x.valor),0));
    despArr.push((l||[]).filter(x=>x.tipo==='despesa'&&x.status!=='cancelado').reduce((s,x)=>s+Number(x.valor),0));
  }
  destroyChart('chartMensal');
  const el=document.getElementById('chartMensal');
  if(!el)return;
  charts['chartMensal']=new Chart(el,{
    type:'bar',
    data:{labels,datasets:[{label:'Receitas',data:recArr,backgroundColor:'rgba(0,196,140,.7)',borderRadius:4},{label:'Despesas',data:despArr,backgroundColor:'rgba(255,92,92,.7)',borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{font:{size:10},boxWidth:10}}},scales:{y:{ticks:{callback:v=>'R$'+(v/1000).toFixed(0)+'k'}}}}
  });
}

// ====== LANÇAMENTOS ======
async function renderLancamentos(){
  document.getElementById('topbar-actions').innerHTML='<button class="btn btn-green btn-sm" onclick="novoLancamentoModal()"><i class="ti ti-plus"></i> Novo</button>';
  const {ini,fim}=getPeriodo();
  const {data:lanc}=await sb.from('lancamentos').select('*').eq('user_id',uid()).gte('data',ini).lte('data',fim).order('data',{ascending:false});
  const {data:contasDB}=await sb.from('contas').select('id,nome').eq('user_id',uid());
  const contasMapa=Object.fromEntries((contasDB||[]).map(c=>[c.id,c.nome]));

  const rows=(lanc||[]).map(l=>`
    <tr>
      <td style="white-space:nowrap">${new Date(l.data+'T00:00:00').toLocaleDateString('pt-BR')}</td>
      <td><div style="font-weight:600">${l.descricao}</div>${l.parcela_atual?'<div style="font-size:10px;color:var(--text2)">'+l.parcela_atual+'/'+l.total_parcelas+'x</div>':''}</td>
      <td style="display:none;white-space:nowrap">${l.categoria||'—'}</td>
      <td style="font-weight:700;color:${l.tipo==='receita'?'var(--green-dark)':'var(--red)'};white-space:nowrap">${l.tipo==='receita'?'+':'-'}${fmt(l.valor)}</td>
      <td><span class="badge ${l.status==='recebido'||l.status==='pago'?'badge-green':l.status==='pendente'?'badge-amber':l.status==='a_receber'?'badge-blue':'badge-gray'}">${l.status}</span></td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm" onclick="editarLancamento('${l.id}')" title="Editar"><i class="ti ti-edit"></i></button>
        ${l.status==='pendente'?'<button class="btn btn-sm" onclick="baixarLancamento(\''+l.id+'\')" title="Pagar"><i class="ti ti-check"></i></button>':''}
        <button class="btn btn-sm" onclick="deletarLancamento('${l.id}')" title="Excluir"><i class="ti ti-trash"></i></button>
      </td>
    </tr>`).join('');

  document.getElementById('content').innerHTML=`
    ${filterBar()}
    <div class="table-card">
      <div class="table-header">
        <span class="table-title">${(lanc||[]).length} lançamentos</span>
      </div>
      <table><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows||'<tr><td colspan="5" class="empty-row">Nenhum lançamento. Clique em + para adicionar.</td></tr>'}</tbody></table>
    </div>`;
}

async function baixarLancamento(id){
  if(!confirm('Marcar como PAGO?'))return;
  await sb.from('lancamentos').update({status:'pago'}).eq('id',id).eq('user_id',uid());
  toast('Marcado como pago!');loadView(currentView);
}

async function deletarLancamento(id){
  if(!confirm('Excluir este lançamento?'))return;
  await sb.from('lancamentos').delete().eq('id',id).eq('user_id',uid());
  toast('Lançamento excluído','warning');loadView(currentView);
}

async function editarLancamento(id){
  const {data:l}=await sb.from('lancamentos').select('*').eq('id',id).single();
  if(!l)return;
  const {data:contas}=await sb.from('contas').select('id,nome').eq('user_id',uid());
  const contaOpts=(contas||[]).map(c=>'<option value="'+c.id+'" '+(l.conta_id===c.id?'selected':'')+'>'+c.nome+'</option>').join('');
  const cats=l.tipo==='receita'?CATS_RECEITA:CATS_DESPESA;
  const catOpts=cats.map(c=>'<option '+(l.categoria===c?'selected':'')+'>'+c+'</option>').join('');
  document.body.insertAdjacentHTML('beforeend',`
    <div class="overlay" id="overlay">
      <div class="modal">
        <div class="modal-drag"></div>
        <div class="modal-header"><span class="modal-title">Editar Lançamento</span><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div class="form-row">
          <div class="form-group"><label>Data</label><input type="date" id="f_data" value="${l.data}"/></div>
          <div class="form-group"><label>Valor (R$)</label><input type="number" id="f_valor" value="${l.valor}" step="0.01"/></div>
        </div>
        <div class="form-group"><label>Descrição</label><input id="f_desc" value="${l.descricao}"/></div>
        <div class="form-row">
          <div class="form-group"><label>Categoria</label><select id="f_cat"><option value="">—</option>${catOpts}</select></div>
          <div class="form-group"><label>Status</label>
            <select id="f_status">
              <option value="pago" ${l.status==='pago'?'selected':''}>Pago</option>
              <option value="recebido" ${l.status==='recebido'?'selected':''}>Recebido</option>
              <option value="pendente" ${l.status==='pendente'?'selected':''}>Pendente</option>
              <option value="a_receber" ${l.status==='a_receber'?'selected':''}>A receber</option>
            </select>
          </div>
        </div>
        <div class="form-group"><label>Conta</label><select id="f_conta"><option value="">—</option>${contaOpts}</select></div>
        <div class="modal-footer">
          <button class="btn" onclick="closeModal()">Cancelar</button>
          <button class="btn btn-green" onclick="salvarEdicaoLancamento('${id}')"><i class="ti ti-check"></i> Salvar</button>
        </div>
      </div>
    </div>`);
}

async function salvarEdicaoLancamento(id){
  const desc=document.getElementById('f_desc').value.trim();
  const valor=parseFloat(document.getElementById('f_valor').value);
  if(!desc||!valor){alert('Preencha descrição e valor');return;}
  await sb.from('lancamentos').update({
    descricao:desc,valor,data:document.getElementById('f_data').value,
    categoria:document.getElementById('f_cat').value,status:document.getElementById('f_status').value,
    conta_id:document.getElementById('f_conta').value||null
  }).eq('id',id).eq('user_id',uid());
  closeModal();toast('Lançamento atualizado!');loadView(currentView);
}

// ====== MODAL NOVO LANÇAMENTO ======
function novoLancamentoModal(){
  document.body.insertAdjacentHTML('beforeend',`
    <div class="overlay" id="overlay">
      <div class="modal">
        <div class="modal-drag"></div>
        <div class="modal-header"><span class="modal-title">Novo lançamento</span><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div class="tipo-grid">
          <div class="tipo-btn selected" id="tipo-despesa" onclick="selectTipo('despesa')"><i class="ti ti-trending-down" style="color:var(--red)"></i><span>Despesa</span></div>
          <div class="tipo-btn" id="tipo-receita" onclick="selectTipo('receita')"><i class="ti ti-trending-up" style="color:var(--green-dark)"></i><span>Receita</span></div>
        </div>
        <div id="form-lancamento"></div>
      </div>
    </div>`);
  selectTipo('despesa');
}

let tipoAtual='despesa';
async function selectTipo(tipo){
  tipoAtual=tipo;
  document.getElementById('tipo-despesa').classList.toggle('selected',tipo==='despesa');
  document.getElementById('tipo-receita').classList.toggle('selected',tipo==='receita');
  const {data:contas}=await sb.from('contas').select('id,nome').eq('user_id',uid());
  const contaOpts=(contas||[]).map(c=>'<option value="'+c.id+'">'+c.nome+'</option>').join('');
  const cats=tipo==='receita'?CATS_RECEITA:CATS_DESPESA;
  const catOpts=cats.map(c=>'<option>'+c+'</option>').join('');
  const statusOpts=tipo==='receita'
    ?'<option value="recebido">Recebido</option><option value="a_receber">A receber</option>'
    :'<option value="pago">Pago</option><option value="pendente">Pendente</option>';
  document.getElementById('form-lancamento').innerHTML=`
    <div class="form-row">
      <div class="form-group"><label>Data *</label><input type="date" id="f_data" value="${today()}"/></div>
      <div class="form-group"><label>Valor (R$) *</label><input type="number" id="f_valor" placeholder="0,00" step="0.01"/></div>
    </div>
    <div class="form-group"><label>Descrição *</label><input id="f_desc" placeholder="Ex: Supermercado, Salário..."/></div>
    <div class="form-row">
      <div class="form-group"><label>Categoria</label>
        <select id="f_cat">
          <option value="">Selecione...</option>
          ${catOpts}
          <option value="__nova__">+ Nova categoria</option>
        </select>
      </div>
      <div class="form-group"><label>Status</label><select id="f_status">${statusOpts}</select></div>
    </div>
    <div id="nova-cat-group" style="display:none" class="form-group"><label>Nome da nova categoria</label><input id="f_nova_cat" placeholder="Ex: Pet, Streaming..."/></div>
    <div class="form-row">
      <div class="form-group"><label>Conta</label><select id="f_conta"><option value="">—</option>${contaOpts}</select></div>
      <div class="form-group"><label>Forma pgto</label><select id="f_forma"><option value="">—</option>${FORMAS.map(f=>'<option>'+f+'</option>').join('')}</select></div>
    </div>
    ${tipo==='despesa'?'<div class="form-row"><div class="form-group"><label>Parcelas</label><input type="number" id="f_parcelas" placeholder="1" min="1" max="60"/></div><div class="form-group"><label>Vencimento</label><input type="date" id="f_venc" value="'+today()+'"/></div></div>':''}
    <div class="form-group"><label>Observação</label><input id="f_obs" placeholder="Opcional"/></div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-green" onclick="salvarLancamento()"><i class="ti ti-check"></i> Salvar</button>
    </div>`;
  document.getElementById('f_cat').addEventListener('change',function(){
    document.getElementById('nova-cat-group').style.display=this.value==='__nova__'?'block':'none';
  });
}

async function salvarLancamento(){
  const desc=document.getElementById('f_desc').value.trim();
  const valor=parseFloat(document.getElementById('f_valor').value);
  const data=document.getElementById('f_data').value;
  if(!desc||!valor||!data){toast('Preencha data, valor e descrição','error');return;}

  let categoria=document.getElementById('f_cat').value;
  if(categoria==='__nova__'){
    const nova=document.getElementById('f_nova_cat').value.trim();
    if(!nova){toast('Digite o nome da nova categoria','error');return;}
    categoria=nova;
    await sb.from('categorias').upsert({user_id:uid(),nome:nova,tipo:tipoAtual},{onConflict:'user_id,nome,tipo'});
    if(tipoAtual==='despesa')CATS_DESPESA=[...new Set([...CATS_DESPESA,nova])];
    else CATS_RECEITA=[...new Set([...CATS_RECEITA,nova])];
  }

  const parcelas=parseInt(document.getElementById('f_parcelas')?.value)||1;
  const base={user_id:uid(),tipo:tipoAtual,descricao:desc,valor,data,categoria,
    status:document.getElementById('f_status').value,
    conta_id:document.getElementById('f_conta').value||null,
    forma_pagamento:document.getElementById('f_forma').value,
    observacao:document.getElementById('f_obs').value,
    data_vencimento:document.getElementById('f_venc')?.value||data,
    total_parcelas:parcelas};

  if(parcelas>1){
    const inserts=[];
    for(let i=0;i<parcelas;i++){
      const d=new Date(data+'T00:00:00');d.setMonth(d.getMonth()+i);
      inserts.push({...base,valor:Math.round(valor/parcelas*100)/100,data:d.toISOString().split('T')[0],data_vencimento:d.toISOString().split('T')[0],parcela_atual:i+1,status:'pendente',descricao:desc+' ('+(i+1)+'/'+parcelas+')'});
    }
    await sb.from('lancamentos').insert(inserts);
    toast(parcelas+'x parcelas criadas!');
  } else {
    await sb.from('lancamentos').insert(base);
    toast('Lançamento salvo!');
  }
  closeModal();loadView(currentView);
}

// ====== CONTAS ======
async function renderContas(){
  document.getElementById('topbar-actions').innerHTML='<button class="btn btn-green btn-sm" onclick="novaConta()"><i class="ti ti-plus"></i> Nova conta</button>';
  const {data:contas}=await sb.from('contas').select('*').eq('user_id',uid()).order('nome');
  const total=(contas||[]).reduce((s,c)=>s+Number(c.saldo_atual||c.saldo_inicial||0),0);
  const icons={'Conta corrente':'🏦','Conta digital':'📱','Conta poupança':'🐷','Dinheiro':'💵','Carteira':'👛'};
  document.getElementById('content').innerHTML=`
    <div class="card" style="margin-bottom:14px;display:inline-block;min-width:200px">
      <div class="card-label">Saldo total</div><div class="card-value">${fmt(total)}</div>
      <div class="card-sub">${(contas||[]).length} conta${(contas||[]).length!==1?'s':''}</div>
    </div>
    ${(contas||[]).map(c=>`
      <div class="conta-card">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:26px">${icons[c.tipo]||'🏦'}</div>
          <div><div style="font-weight:600">${c.nome}</div><div style="font-size:11px;color:var(--text2)">${c.tipo||'Conta'}${c.banco?' · '+c.banco:''}</div></div>
        </div>
        <div style="text-align:right">
          <div style="font-size:17px;font-weight:700;color:${Number(c.saldo_atual||c.saldo_inicial||0)>=0?'var(--green-dark)':'var(--red)'}">${fmt(c.saldo_atual||c.saldo_inicial||0)}</div>
          <div style="font-size:10px;color:var(--text2)">saldo atual</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm" onclick="editarConta('${c.id}','${c.nome}',${c.saldo_atual||c.saldo_inicial||0})"><i class="ti ti-edit"></i></button>
          <button class="btn btn-sm" onclick="deletarConta('${c.id}')"><i class="ti ti-trash"></i></button>
        </div>
      </div>`).join('')||'<div style="text-align:center;padding:40px;color:var(--text3)">Nenhuma conta cadastrada.</div>'}`;
}

function novaConta(){
  document.body.insertAdjacentHTML('beforeend',`
    <div class="overlay" id="overlay">
      <div class="modal">
        <div class="modal-drag"></div>
        <div class="modal-header"><span class="modal-title">Nova Conta</span><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div class="form-row">
          <div class="form-group"><label>Nome *</label><input id="f_nome" placeholder="Ex: Nubank"/></div>
          <div class="form-group"><label>Banco</label><input id="f_banco"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Tipo</label><select id="f_tipo"><option>Conta corrente</option><option>Conta digital</option><option>Conta poupança</option><option>Dinheiro</option><option>Carteira</option></select></div>
          <div class="form-group"><label>Saldo inicial (R$)</label><input type="number" id="f_saldo" placeholder="0" step="0.01"/></div>
        </div>
        <div class="modal-footer">
          <button class="btn" onclick="closeModal()">Cancelar</button>
          <button class="btn btn-green" onclick="salvarConta()"><i class="ti ti-check"></i> Salvar</button>
        </div>
      </div>
    </div>`);
}

async function salvarConta(){
  const nome=document.getElementById('f_nome').value.trim();
  if(!nome){toast('Nome é obrigatório','error');return;}
  const saldo=parseFloat(document.getElementById('f_saldo').value)||0;
  await sb.from('contas').insert({user_id:uid(),nome,banco:document.getElementById('f_banco').value,tipo:document.getElementById('f_tipo').value,saldo_inicial:saldo,saldo_atual:saldo});
  closeModal();toast('Conta criada!');loadView('contas');
}

function editarConta(id,nome,saldoAtual){
  document.body.insertAdjacentHTML('beforeend',`
    <div class="overlay" id="overlay">
      <div class="modal" style="max-width:360px">
        <div class="modal-drag"></div>
        <div class="modal-header"><span class="modal-title">Atualizar saldo</span><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:12px">${nome}</div>
        <div class="form-group"><label>Saldo atual (R$)</label><input type="number" id="f_saldo" value="${saldoAtual}" step="0.01"/></div>
        <div class="modal-footer">
          <button class="btn" onclick="closeModal()">Cancelar</button>
          <button class="btn btn-green" onclick="atualizarSaldoConta('${id}')"><i class="ti ti-check"></i> Salvar</button>
        </div>
      </div>
    </div>`);
}

async function atualizarSaldoConta(id){
  await sb.from('contas').update({saldo_atual:parseFloat(document.getElementById('f_saldo').value)||0}).eq('id',id).eq('user_id',uid());
  closeModal();toast('Saldo atualizado!');loadView('contas');
}

async function deletarConta(id){
  if(!confirm('Excluir esta conta?'))return;
  await sb.from('contas').delete().eq('id',id).eq('user_id',uid());
  toast('Conta excluída','warning');loadView('contas');
}

// ====== TRANSFERÊNCIA ======
async function novaTransferencia(){
  const {data:contas}=await sb.from('contas').select('id,nome').eq('user_id',uid());
  if((contas||[]).length<2){toast('Você precisa ter ao menos 2 contas','error');return;}
  const opts=(contas||[]).map(c=>'<option value="'+c.id+'">'+c.nome+'</option>').join('');
  document.body.insertAdjacentHTML('beforeend',`
    <div class="overlay" id="overlay">
      <div class="modal">
        <div class="modal-drag"></div>
        <div class="modal-header"><span class="modal-title">Transferência entre contas</span><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div class="form-group"><label>De *</label><select id="f_de">${opts}</select></div>
        <div class="form-group"><label>Para *</label><select id="f_para">${opts}</select></div>
        <div class="form-row">
          <div class="form-group"><label>Valor (R$) *</label><input type="number" id="f_valor" placeholder="0" step="0.01"/></div>
          <div class="form-group"><label>Data</label><input type="date" id="f_data" value="${today()}"/></div>
        </div>
        <div class="modal-footer">
          <button class="btn" onclick="closeModal()">Cancelar</button>
          <button class="btn btn-green" onclick="salvarTransferencia()"><i class="ti ti-check"></i> Transferir</button>
        </div>
      </div>
    </div>`);
}

async function salvarTransferencia(){
  const de=document.getElementById('f_de').value;
  const para=document.getElementById('f_para').value;
  const valor=parseFloat(document.getElementById('f_valor').value);
  const data=document.getElementById('f_data').value;
  if(!de||!para||!valor){toast('Preencha todos os campos','error');return;}
  if(de===para){toast('Selecione contas diferentes','error');return;}
  const {data:contaDe}=await sb.from('contas').select('saldo_atual,nome').eq('id',de).single();
  const {data:contaPara}=await sb.from('contas').select('saldo_atual,nome').eq('id',para).single();
  await sb.from('contas').update({saldo_atual:(Number(contaDe.saldo_atual||0)-valor)}).eq('id',de);
  await sb.from('contas').update({saldo_atual:(Number(contaPara.saldo_atual||0)+valor)}).eq('id',para);
  await sb.from('lancamentos').insert([
    {user_id:uid(),tipo:'despesa',descricao:'Transferência para '+contaPara.nome,valor,data,categoria:'Transferência',status:'pago',conta_id:de,total_parcelas:1},
    {user_id:uid(),tipo:'receita',descricao:'Transferência de '+contaDe.nome,valor,data,categoria:'Transferência',status:'recebido',conta_id:para,total_parcelas:1}
  ]);
  closeModal();toast('Transferência realizada!');loadView('contas');
}

// ====== CARTÕES ======
async function renderCartoes(){
  document.getElementById('topbar-actions').innerHTML='<button class="btn btn-green btn-sm" onclick="novoCartao()"><i class="ti ti-plus"></i> Novo cartão</button>';
  const {data:cartoes}=await sb.from('cartoes').select('*').eq('user_id',uid()).order('nome');
  document.getElementById('content').innerHTML=(cartoes||[]).length?(cartoes||[]).map(c=>{
    const usado=Number(c.fatura_atual||0),limite=Number(c.limite||0);
    const pct=limite>0?Math.min(100,Math.round(usado/limite*100)):0;
    const cor=pct>=90?'var(--red)':pct>=70?'var(--amber)':'var(--green)';
    return'<div class="card" style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div><div style="font-size:15px;font-weight:700">'+c.nome+'</div><div style="font-size:11px;color:var(--text2)">'+(c.banco||'')+' · Fecha '+c.dia_fechamento+' · Vence '+c.dia_vencimento+'</div></div><button class="btn btn-sm" onclick="deletarCartao(\''+c.id+'\')"><i class="ti ti-trash"></i></button></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px"><div><div style="font-size:10px;color:var(--text2);text-transform:uppercase">Limite</div><div style="font-weight:700;font-size:14px">'+fmt(limite)+'</div></div><div><div style="font-size:10px;color:var(--text2);text-transform:uppercase">Usado</div><div style="font-weight:700;font-size:14px;color:var(--red)">'+fmt(usado)+'</div></div><div><div style="font-size:10px;color:var(--text2);text-transform:uppercase">Disponível</div><div style="font-weight:700;font-size:14px;color:var(--green-dark)">'+fmt(limite-usado)+'</div></div></div><div class="progress-bar" style="height:8px"><div class="progress-fill" style="width:'+pct+'%;background:'+cor+'"></div></div><div style="font-size:11px;color:var(--text2);margin-top:3px">'+pct+'% utilizado</div></div>';
  }).join(''):'<div style="text-align:center;padding:60px;color:var(--text3)">Nenhum cartão cadastrado.</div>';
}

function novoCartao(){
  document.body.insertAdjacentHTML('beforeend',`
    <div class="overlay" id="overlay">
      <div class="modal">
        <div class="modal-drag"></div>
        <div class="modal-header"><span class="modal-title">Novo Cartão</span><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div class="form-row">
          <div class="form-group"><label>Nome *</label><input id="f_nome" placeholder="Ex: Nubank Roxinho"/></div>
          <div class="form-group"><label>Banco</label><input id="f_banco"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Limite (R$)</label><input type="number" id="f_limite" placeholder="0" step="0.01"/></div>
          <div class="form-group"><label>Fatura atual (R$)</label><input type="number" id="f_fatura" placeholder="0" step="0.01"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Dia fechamento</label><input type="number" id="f_fecha" placeholder="25" min="1" max="31"/></div>
          <div class="form-group"><label>Dia vencimento</label><input type="number" id="f_vence" placeholder="3" min="1" max="31"/></div>
        </div>
        <div class="modal-footer">
          <button class="btn" onclick="closeModal()">Cancelar</button>
          <button class="btn btn-green" onclick="salvarCartao()"><i class="ti ti-check"></i> Salvar</button>
        </div>
      </div>
    </div>`);
}

async function salvarCartao(){
  const nome=document.getElementById('f_nome').value.trim();
  if(!nome){toast('Nome é obrigatório','error');return;}
  await sb.from('cartoes').insert({user_id:uid(),nome,banco:document.getElementById('f_banco').value,limite:parseFloat(document.getElementById('f_limite').value)||0,fatura_atual:parseFloat(document.getElementById('f_fatura').value)||0,dia_fechamento:parseInt(document.getElementById('f_fecha').value)||25,dia_vencimento:parseInt(document.getElementById('f_vence').value)||3});
  closeModal();toast('Cartão criado!');loadView('cartoes');
}

async function deletarCartao(id){
  if(!confirm('Excluir este cartão?'))return;
  await sb.from('cartoes').delete().eq('id',id).eq('user_id',uid());
  toast('Cartão excluído','warning');loadView('cartoes');
}

// ====== CONTAS A PAGAR ======
async function renderAPagar(){
  const hoje=new Date();hoje.setHours(0,0,0,0);
  const {data:lanc}=await sb.from('lancamentos').select('*').eq('user_id',uid()).eq('tipo','despesa').eq('status','pendente').order('data_vencimento',{ascending:true});
  const total=(lanc||[]).reduce((s,l)=>s+Number(l.valor),0);
  const proximos7=(lanc||[]).filter(l=>{const d=new Date((l.data_vencimento||l.data)+'T00:00:00');return(d-hoje)/864e5<=7&&(d-hoje)/864e5>=-1;}).reduce((s,l)=>s+Number(l.valor),0);
  const vencidos=(lanc||[]).filter(l=>new Date((l.data_vencimento||l.data)+'T00:00:00')<hoje);

  const rows=(lanc||[]).map(l=>{
    const venc=new Date((l.data_vencimento||l.data)+'T00:00:00');
    const diff=Math.round((venc-hoje)/864e5);
    let badge,label;
    if(diff<0){badge='badge-red';label='Vencido';}
    else if(diff===0){badge='badge-amber';label='Hoje';}
    else if(diff<=3){badge='badge-amber';label='Em '+diff+'d';}
    else{badge='badge-gray';label='Em '+diff+'d';}
    return'<tr><td style="font-size:12px;font-weight:600">'+l.descricao+'</td><td style="font-size:11px;white-space:nowrap">'+venc.toLocaleDateString('pt-BR')+'</td><td style="color:var(--red);font-weight:600;white-space:nowrap">'+fmt(l.valor)+'</td><td><span class="badge '+badge+'">'+label+'</span></td><td style="white-space:nowrap"><button class="btn btn-sm" onclick="pagarLancamento(\''+l.id+'\')"><i class="ti ti-check"></i></button> <button class="btn btn-sm" onclick="deletarLancamento(\''+l.id+'\')"><i class="ti ti-trash"></i></button></td></tr>';
  }).join('');

  document.getElementById('content').innerHTML=`
    ${vencidos.length?'<div class="alert-banner alert-danger"><i class="ti ti-alert-circle"></i> '+vencidos.length+' conta'+( vencidos.length>1?'s':'')+'vencida'+( vencidos.length>1?'s':'')+' — total '+fmt(vencidos.reduce((s,l)=>s+Number(l.valor),0))+'</div>':''}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
      <div class="card"><div class="card-label">Total pendente</div><div class="card-value" style="color:var(--red)">${fmt(total)}</div></div>
      <div class="card"><div class="card-label">Próx. 7 dias</div><div class="card-value" style="color:var(--amber)">${fmt(proximos7)}</div></div>
      <div class="card"><div class="card-label">Qtd. pendente</div><div class="card-value">${(lanc||[]).length}</div></div>
    </div>
    <div class="table-card">
      <div class="table-header"><span class="table-title">Contas pendentes</span><button class="btn btn-green btn-sm" onclick="novoLancamentoModal()"><i class="ti ti-plus"></i> Nova despesa</button></div>
      <table><thead><tr><th>Descrição</th><th>Vencimento</th><th>Valor</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows||'<tr><td colspan="5" class="empty-row">Nenhuma conta pendente 🎉</td></tr>'}</tbody></table>
    </div>`;
}

async function pagarLancamento(id){
  await sb.from('lancamentos').update({status:'pago'}).eq('id',id).eq('user_id',uid());
  toast('Pago!');checkVencimentos();loadView('apagar');
}

// ====== PARCELAMENTOS ======
async function renderParcelamentos(){
  const {data:lanc}=await sb.from('lancamentos').select('*').eq('user_id',uid()).gt('total_parcelas',1).order('descricao');
  const grupos={};
  (lanc||[]).forEach(l=>{
    const key=l.descricao.replace(/ \(\d+\/\d+\)$/,'');
    if(!grupos[key])grupos[key]={items:[],pago:0,parcelas:l.total_parcelas,valor_parcela:Number(l.valor)};
    grupos[key].items.push(l);
    if(l.status==='pago')grupos[key].pago++;
  });
  const html=Object.entries(grupos).map(([nome,g])=>{
    const total=g.valor_parcela*g.parcelas;
    const pago=g.valor_parcela*g.pago;
    const pct=Math.round(g.pago/g.parcelas*100);
    return'<div class="meta-card"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-weight:600">'+nome+'</span><span style="font-size:12px;color:var(--text2)">'+g.pago+' de '+g.parcelas+'</span></div><div class="progress-bar"><div class="progress-fill" style="width:'+pct+'%;background:'+(pct>=100?'var(--green)':'var(--blue)')+'"></div></div><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text2);margin-top:5px"><span>Restante: <strong style="color:var(--red)">'+fmt(total-pago)+'</strong></span><span>Total: '+fmt(total)+'</span></div></div>';
  }).join('');
  document.getElementById('content').innerHTML='<div style="margin-bottom:12px;font-size:13px;color:var(--text2)">'+Object.keys(grupos).length+' parcelamento'+(Object.keys(grupos).length!==1?'s':'')+' em andamento</div>'+(html||'<div style="text-align:center;padding:60px;color:var(--text3)">Nenhum parcelamento ativo.</div>');
}

// ====== ORÇAMENTO ======
async function renderOrcamento(){
  document.getElementById('topbar-actions').innerHTML='<button class="btn btn-green btn-sm" onclick="novoOrcamento()"><i class="ti ti-plus"></i> Definir limite</button>';
  const {ini,fim}=getPeriodo();
  const [{data:orc},{data:lanc}]=await Promise.all([
    sb.from('orcamentos').select('*').eq('user_id',uid()),
    sb.from('lancamentos').select('categoria,valor').eq('user_id',uid()).eq('tipo','despesa').gte('data',ini).lte('data',fim)
  ]);
  const gastos={};
  (lanc||[]).forEach(l=>{gastos[l.categoria]=(gastos[l.categoria]||0)+Number(l.valor);});
  const html=(orc||[]).map(o=>{
    const gasto=gastos[o.categoria]||0;
    const pct=Math.min(100,Math.round(gasto/o.limite*100));
    const cor=pct>=90?'var(--red)':pct>=70?'var(--amber)':'var(--green)';
    return'<div class="meta-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-weight:600">'+o.categoria+'</span><div style="display:flex;align-items:center;gap:8px"><span style="font-size:12px;font-weight:700;color:'+cor+'">'+pct+'%</span><button class="btn btn-sm" onclick="deletarOrcamento(\''+o.id+'\')"><i class="ti ti-trash"></i></button></div></div><div class="progress-bar"><div class="progress-fill" style="width:'+pct+'%;background:'+cor+'"></div></div><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text2);margin-top:4px"><span>Gasto: <strong>'+fmt(gasto)+'</strong></span><span>Limite: '+fmt(o.limite)+'</span></div>'+(pct>=100?'<div style="font-size:11px;color:var(--red);margin-top:3px;font-weight:600">⚠️ Limite atingido!</div>':'')+'</div>';
  }).join('');
  document.getElementById('content').innerHTML=filterBar()+( html||'<div style="text-align:center;padding:60px;color:var(--text3)">Nenhum limite definido. Clique em + para começar.</div>');
}

function novoOrcamento(){
  document.body.insertAdjacentHTML('beforeend',`
    <div class="overlay" id="overlay">
      <div class="modal">
        <div class="modal-drag"></div>
        <div class="modal-header"><span class="modal-title">Definir limite</span><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div class="form-group"><label>Categoria *</label><select id="f_cat"><option value="">Selecione...</option>${CATS_DESPESA.map(c=>'<option>'+c+'</option>').join('')}</select></div>
        <div class="form-group"><label>Limite mensal (R$) *</label><input type="number" id="f_limite" placeholder="0" step="0.01"/></div>
        <div class="modal-footer">
          <button class="btn" onclick="closeModal()">Cancelar</button>
          <button class="btn btn-green" onclick="salvarOrcamento()"><i class="ti ti-check"></i> Salvar</button>
        </div>
      </div>
    </div>`);
}

async function salvarOrcamento(){
  const cat=document.getElementById('f_cat').value;
  const limite=parseFloat(document.getElementById('f_limite').value);
  if(!cat||!limite){toast('Preencha todos os campos','error');return;}
  const {data:exist}=await sb.from('orcamentos').select('id').eq('user_id',uid()).eq('categoria',cat).maybeSingle();
  if(exist){await sb.from('orcamentos').update({limite}).eq('id',exist.id);}
  else{await sb.from('orcamentos').insert({user_id:uid(),categoria:cat,limite});}
  closeModal();toast('Limite definido!');loadView('orcamento');
}

async function deletarOrcamento(id){
  if(!confirm('Remover este limite?'))return;
  await sb.from('orcamentos').delete().eq('id',id).eq('user_id',uid());
  toast('Limite removido','warning');loadView('orcamento');
}

// ====== METAS ======
async function renderMetas(){
  document.getElementById('topbar-actions').innerHTML='<button class="btn btn-green btn-sm" onclick="novaMeta()"><i class="ti ti-plus"></i> Nova meta</button>';
  const {data:metas}=await sb.from('metas').select('*').eq('user_id',uid()).order('nome');
  const html=(metas||[]).map(m=>{
    const pct=Math.min(100,Math.round(m.valor_atual/m.valor_desejado*100));
    const prazo=m.prazo?new Date(m.prazo+'T00:00:00').toLocaleDateString('pt-BR'):'—';
    return'<div class="meta-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-size:14px;font-weight:700">'+m.nome+'</span><div style="display:flex;gap:6px"><button class="btn btn-sm" onclick="atualizarMeta(\''+m.id+'\','+m.valor_atual+')"><i class="ti ti-edit"></i></button><button class="btn btn-sm" onclick="deletarMeta(\''+m.id+'\')"><i class="ti ti-trash"></i></button></div></div><div style="font-size:11px;color:var(--text2);margin-bottom:8px">Prazo: '+prazo+'</div><div class="progress-bar" style="height:10px"><div class="progress-fill" style="width:'+pct+'%;background:'+(pct>=100?'var(--green)':pct>=70?'var(--amber)':'var(--blue)')+'"></div></div><div style="display:flex;justify-content:space-between;font-size:12px;margin-top:6px"><span><strong style="color:var(--green-dark)">'+fmt(m.valor_atual)+'</strong> guardado</span><span style="font-weight:700">'+pct+'%</span><span>Meta: <strong>'+fmt(m.valor_desejado)+'</strong></span></div></div>';
  }).join('');
  document.getElementById('content').innerHTML=html||'<div style="text-align:center;padding:60px;color:var(--text3)">Nenhuma meta cadastrada.</div>';
}

function novaMeta(){
  document.body.insertAdjacentHTML('beforeend',`
    <div class="overlay" id="overlay">
      <div class="modal">
        <div class="modal-drag"></div>
        <div class="modal-header"><span class="modal-title">Nova Meta</span><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div class="form-group"><label>Nome *</label><input id="f_nome" placeholder="Ex: Viagem Europa"/></div>
        <div class="form-row">
          <div class="form-group"><label>Valor desejado (R$) *</label><input type="number" id="f_desejado" placeholder="0" step="0.01"/></div>
          <div class="form-group"><label>Valor atual (R$)</label><input type="number" id="f_atual" placeholder="0" step="0.01"/></div>
        </div>
        <div class="form-group"><label>Prazo</label><input type="date" id="f_prazo"/></div>
        <div class="modal-footer">
          <button class="btn" onclick="closeModal()">Cancelar</button>
          <button class="btn btn-green" onclick="salvarMeta()"><i class="ti ti-check"></i> Salvar</button>
        </div>
      </div>
    </div>`);
}

async function salvarMeta(){
  const nome=document.getElementById('f_nome').value.trim();
  const desejado=parseFloat(document.getElementById('f_desejado').value);
  if(!nome||!desejado){toast('Preencha nome e valor desejado','error');return;}
  await sb.from('metas').insert({user_id:uid(),nome,valor_desejado:desejado,valor_atual:parseFloat(document.getElementById('f_atual').value)||0,prazo:document.getElementById('f_prazo').value||null});
  closeModal();toast('Meta criada!');loadView('metas');
}

function atualizarMeta(id,atual){
  document.body.insertAdjacentHTML('beforeend',`
    <div class="overlay" id="overlay">
      <div class="modal" style="max-width:360px">
        <div class="modal-drag"></div>
        <div class="modal-header"><span class="modal-title">Atualizar meta</span><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div class="form-group"><label>Valor atual (R$)</label><input type="number" id="f_atual" value="${atual}" step="0.01"/></div>
        <div class="modal-footer">
          <button class="btn" onclick="closeModal()">Cancelar</button>
          <button class="btn btn-green" onclick="salvarAtualizacaoMeta('${id}')"><i class="ti ti-check"></i> Salvar</button>
        </div>
      </div>
    </div>`);
}

async function salvarAtualizacaoMeta(id){
  await sb.from('metas').update({valor_atual:parseFloat(document.getElementById('f_atual').value)||0}).eq('id',id).eq('user_id',uid());
  closeModal();toast('Meta atualizada!');loadView('metas');
}

async function deletarMeta(id){
  if(!confirm('Excluir esta meta?'))return;
  await sb.from('metas').delete().eq('id',id).eq('user_id',uid());
  toast('Meta excluída','warning');loadView('metas');
}

// ====== INVESTIMENTOS ======
async function renderInvestimentos(){
  document.getElementById('topbar-actions').innerHTML='<button class="btn btn-green btn-sm" onclick="novoInvestimento()"><i class="ti ti-plus"></i> Novo</button>';
  const {data:invest}=await sb.from('investimentos').select('*').eq('user_id',uid()).order('nome');
  const totalInv=(invest||[]).reduce((s,i)=>s+Number(i.valor_investido||0),0);
  const totalAtual=(invest||[]).reduce((s,i)=>s+Number(i.valor_atual||i.valor_investido||0),0);
  const lucro=totalAtual-totalInv;
  const rows=(invest||[]).map(i=>{
    const inv=Number(i.valor_investido||0),atu=Number(i.valor_atual||inv),diff=atu-inv;
    const pct=inv>0?Math.round(diff/inv*100):0;
    return'<tr><td><strong>'+i.nome+'</strong></td><td><span class="badge badge-purple">'+(i.categoria||'—')+'</span></td><td style="display:none">'+(i.instituicao||'—')+'</td><td>'+fmt(inv)+'</td><td><strong>'+fmt(atu)+'</strong></td><td style="color:'+(diff>=0?'var(--green-dark)':'var(--red)')+';font-weight:600">'+(diff>=0?'+':'')+pct+'%</td><td><button class="btn btn-sm" onclick="atualizarInvestimento(\''+i.id+'\','+atu+')"><i class="ti ti-edit"></i></button> <button class="btn btn-sm" onclick="deletarInvestimento(\''+i.id+'\')"><i class="ti ti-trash"></i></button></td></tr>';
  }).join('');
  document.getElementById('content').innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
      <div class="card"><div class="card-label">Total investido</div><div class="card-value">${fmt(totalInv)}</div></div>
      <div class="card"><div class="card-label">Valor atual</div><div class="card-value" style="color:var(--green-dark)">${fmt(totalAtual)}</div></div>
      <div class="card"><div class="card-label">Rentabilidade</div><div class="card-value" style="color:${lucro>=0?'var(--green-dark)':'var(--red)'}">${fmt(lucro,true)}</div></div>
    </div>
    <div class="table-card">
      <div class="table-header"><span class="table-title">Carteira</span></div>
      <table><thead><tr><th>Nome</th><th>Tipo</th><th>Investido</th><th>Atual</th><th>Rentab.</th><th></th></tr></thead>
      <tbody>${rows||'<tr><td colspan="6" class="empty-row">Nenhum investimento cadastrado.</td></tr>'}</tbody></table>
    </div>`;
}

function novoInvestimento(){
  const cats=['CDB','Tesouro Direto','Ações','Fundos imobiliários','Fundos','Criptomoedas','Previdência','Outros'];
  document.body.insertAdjacentHTML('beforeend',`
    <div class="overlay" id="overlay">
      <div class="modal">
        <div class="modal-drag"></div>
        <div class="modal-header"><span class="modal-title">Novo Investimento</span><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div class="form-row">
          <div class="form-group"><label>Nome *</label><input id="f_nome" placeholder="Ex: CDB Nubank"/></div>
          <div class="form-group"><label>Instituição</label><input id="f_inst" placeholder="Ex: Nubank, XP"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Categoria</label><select id="f_cat">${cats.map(c=>'<option>'+c+'</option>').join('')}</select></div>
          <div class="form-group"><label>Data</label><input type="date" id="f_data" value="${today()}"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Valor investido (R$) *</label><input type="number" id="f_inv" placeholder="0" step="0.01"/></div>
          <div class="form-group"><label>Valor atual (R$)</label><input type="number" id="f_atual" placeholder="Igual ao investido" step="0.01"/></div>
        </div>
        <div class="modal-footer">
          <button class="btn" onclick="closeModal()">Cancelar</button>
          <button class="btn btn-green" onclick="salvarInvestimento()"><i class="ti ti-check"></i> Salvar</button>
        </div>
      </div>
    </div>`);
}

async function salvarInvestimento(){
  const nome=document.getElementById('f_nome').value.trim();
  const inv=parseFloat(document.getElementById('f_inv').value);
  if(!nome||!inv){toast('Nome e valor são obrigatórios','error');return;}
  const atual=parseFloat(document.getElementById('f_atual').value)||inv;
  await sb.from('investimentos').insert({user_id:uid(),nome,instituicao:document.getElementById('f_inst').value,categoria:document.getElementById('f_cat').value,data_investimento:document.getElementById('f_data').value,valor_investido:inv,valor_atual:atual});
  closeModal();toast('Investimento salvo!');loadView('investimentos');
}

function atualizarInvestimento(id,atual){
  document.body.insertAdjacentHTML('beforeend',`
    <div class="overlay" id="overlay">
      <div class="modal" style="max-width:360px">
        <div class="modal-drag"></div>
        <div class="modal-header"><span class="modal-title">Atualizar valor</span><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div class="form-group"><label>Valor atual (R$)</label><input type="number" id="f_atual" value="${atual}" step="0.01"/></div>
        <div class="modal-footer">
          <button class="btn" onclick="closeModal()">Cancelar</button>
          <button class="btn btn-green" onclick="salvarAtualizacaoInv('${id}')"><i class="ti ti-check"></i> Salvar</button>
        </div>
      </div>
    </div>`);
}

async function salvarAtualizacaoInv(id){
  await sb.from('investimentos').update({valor_atual:parseFloat(document.getElementById('f_atual').value)||0}).eq('id',id).eq('user_id',uid());
  closeModal();toast('Valor atualizado!');loadView('investimentos');
}

async function deletarInvestimento(id){
  if(!confirm('Excluir este investimento?'))return;
  await sb.from('investimentos').delete().eq('id',id).eq('user_id',uid());
  toast('Excluído','warning');loadView('investimentos');
}

// ====== RELATÓRIOS ======
async function renderRelatorios(){
  const {ini,fim}=getPeriodo();
  const {data:lanc}=await sb.from('lancamentos').select('*').eq('user_id',uid()).gte('data',ini).lte('data',fim);
  const receitas=(lanc||[]).filter(l=>l.tipo==='receita'&&l.status==='recebido').reduce((s,l)=>s+Number(l.valor),0);
  const despesas=(lanc||[]).filter(l=>l.tipo==='despesa').reduce((s,l)=>s+Number(l.valor),0);
  const economia=receitas-despesas;
  const txEconomia=receitas>0?Math.round(economia/receitas*100):0;
  const txComprom=receitas>0?Math.round(despesas/receitas*100):0;
  const catData={};
  (lanc||[]).filter(l=>l.tipo==='despesa').forEach(l=>{catData[l.categoria]=(catData[l.categoria]||0)+Number(l.valor);});
  const catOrdenada=Object.entries(catData).sort((a,b)=>b[1]-a[1]);
  const topCat=catOrdenada[0];
  const maiorDesp=(lanc||[]).filter(l=>l.tipo==='despesa').sort((a,b)=>Number(b.valor)-Number(a.valor))[0];

  document.getElementById('content').innerHTML=`
    ${filterBar()}
    <div class="resumo-card">
      <h3>📊 Resumo — ${nomeMes(filterMes,filterAno)}</h3>
      <p>Você recebeu <strong>${fmt(receitas)}</strong> e gastou <strong>${fmt(despesas)}</strong>. ${economia>=0?'Economia de <strong>'+fmt(economia)+'</strong> ('+txEconomia+'% da renda).':'Déficit de <strong>'+fmt(Math.abs(economia))+'</strong>.'} ${txComprom}% da renda foi comprometida.${topCat?' Maior gasto: <strong>'+topCat[0]+'</strong> ('+fmt(topCat[1])+').':''}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px">
      <div class="card"><div class="card-label">Taxa de economia</div><div class="card-value" style="color:var(--green-dark)">${txEconomia}%</div></div>
      <div class="card"><div class="card-label">Comprometimento</div><div class="card-value" style="color:${txComprom>80?'var(--red)':'var(--amber)'}">${txComprom}%</div></div>
      <div class="card"><div class="card-label">Maior categoria</div><div class="card-value" style="font-size:15px">${topCat?topCat[0]:'—'}</div><div class="card-sub">${topCat?fmt(topCat[1]):''}</div></div>
      <div class="card"><div class="card-label">Maior despesa</div><div class="card-value" style="font-size:15px">${maiorDesp?maiorDesp.descricao:'—'}</div><div class="card-sub">${maiorDesp?fmt(maiorDesp.valor):''}</div></div>
    </div>
    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">Gastos por categoria</div>
        ${catOrdenada.length?'<div style="position:relative;height:260px"><canvas id="chartCatRel"></canvas></div>':'<div style="text-align:center;padding:32px;color:var(--text3)">Sem dados</div>'}
      </div>
      <div class="chart-card">
        <div class="chart-title">Distribuição</div>
        <div>${catOrdenada.map(([cat,val])=>'<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="font-weight:500">'+cat+'</span><span style="font-weight:700">'+fmt(val)+' <span style="color:var(--text2)">('+( despesas>0?Math.round(val/despesas*100):0)+'%)</span></span></div><div class="progress-bar"><div class="progress-fill" style="width:'+(despesas>0?Math.round(val/despesas*100):0)+'%;background:'+(CAT_COLORS[cat]||'#9CA3AF')+'"></div></div></div>').join('')}</div>
      </div>
    </div>
    <div style="text-align:right;margin-top:12px">
      <button class="btn btn-green" onclick="exportarPDF()"><i class="ti ti-file-type-pdf"></i> Exportar PDF</button>
    </div>`;

  if(catOrdenada.length){
    destroyChart('chartCatRel');
    charts['chartCatRel']=new Chart(document.getElementById('chartCatRel'),{
      type:'bar',
      data:{labels:catOrdenada.map(([c])=>c),datasets:[{data:catOrdenada.map(([,v])=>v),backgroundColor:catOrdenada.map(([c])=>CAT_COLORS[c]||'#9CA3AF'),borderRadius:4}]},
      options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{callback:v=>'R$'+(v/1000).toFixed(0)+'k'}}}}
    });
  }
}

function exportarPDF(){
  window.print();
}

// ====== CATEGORIAS (ADMIN) ======
async function renderCategorias(){
  document.getElementById('topbar-actions').innerHTML='<button class="btn btn-green btn-sm" onclick="novaCategoria()"><i class="ti ti-plus"></i> Nova categoria</button>';
  const {data:cats}=await sb.from('categorias').select('*').eq('user_id',uid()).order('tipo').order('nome');

  const despesas=[...new Set([...CATS_DESPESA,...((cats||[]).filter(c=>c.tipo==='despesa').map(c=>c.nome))])];
  const receitas=[...new Set([...CATS_RECEITA,...((cats||[]).filter(c=>c.tipo==='receita').map(c=>c.nome))])];
  const customIds=Object.fromEntries((cats||[]).map(c=>[c.nome+'|'+c.tipo,c.id]));

  document.getElementById('content').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="table-card">
        <div class="table-header"><span class="table-title">Categorias de Despesa</span></div>
        <div style="padding:8px">
          ${despesas.map(nome=>'<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:8px;margin-bottom:4px;background:var(--bg)"><span style="font-size:13px">'+nome+'</span>'+(customIds[nome+'|despesa']?'<button class="btn btn-sm" onclick="deletarCategoria(\''+customIds[nome+'|despesa']+'\')"><i class="ti ti-trash"></i></button>':'<span style="font-size:10px;color:var(--text3)">Padrão</span>')+'</div>').join('')}
        </div>
      </div>
      <div class="table-card">
        <div class="table-header"><span class="table-title">Categorias de Receita</span></div>
        <div style="padding:8px">
          ${receitas.map(nome=>'<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:8px;margin-bottom:4px;background:var(--bg)"><span style="font-size:13px">'+nome+'</span>'+(customIds[nome+'|receita']?'<button class="btn btn-sm" onclick="deletarCategoria(\''+customIds[nome+'|receita']+'\')"><i class="ti ti-trash"></i></button>':'<span style="font-size:10px;color:var(--text3)">Padrão</span>')+'</div>').join('')}
        </div>
      </div>
    </div>`;
}

function novaCategoria(){
  document.body.insertAdjacentHTML('beforeend',`
    <div class="overlay" id="overlay">
      <div class="modal" style="max-width:360px">
        <div class="modal-drag"></div>
        <div class="modal-header"><span class="modal-title">Nova Categoria</span><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div class="form-group"><label>Nome *</label><input id="f_nome" placeholder="Ex: Pet, Farmácia..."/></div>
        <div class="form-group"><label>Tipo *</label>
          <select id="f_tipo">
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>
        </div>
        <div class="modal-footer">
          <button class="btn" onclick="closeModal()">Cancelar</button>
          <button class="btn btn-green" onclick="salvarCategoria()"><i class="ti ti-check"></i> Salvar</button>
        </div>
      </div>
    </div>`);
}

async function salvarCategoria(){
  const nome=document.getElementById('f_nome').value.trim();
  const tipo=document.getElementById('f_tipo').value;
  if(!nome){toast('Nome é obrigatório','error');return;}
  await sb.from('categorias').upsert({user_id:uid(),nome,tipo},{onConflict:'user_id,nome,tipo'});
  if(tipo==='despesa')CATS_DESPESA=[...new Set([...CATS_DESPESA,nome])];
  else CATS_RECEITA=[...new Set([...CATS_RECEITA,nome])];
  closeModal();toast('Categoria criada!');loadView('categorias');
}

async function deletarCategoria(id){
  if(!confirm('Excluir esta categoria?'))return;
  await sb.from('categorias').delete().eq('id',id).eq('user_id',uid());
  await loadCategorias();
  toast('Categoria excluída','warning');loadView('categorias');
}