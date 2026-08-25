// ====== UTILS ======
function fmt(v,sign=false){
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

// ====== CATEGORIAS ======
const CATS_DESPESA=['Moradia','Alimentação','Restaurantes','Mercado','Transporte','Combustível','Saúde','Academia','Lazer','Viagens','Compras','Assinaturas','Educação','Impostos','Dívidas','Família','Presentes','Investimentos','Outros'];
const CATS_RECEITA=['Salário','Pró-labore','Distribuição de lucros','Comissões','Freelancer','Venda','Aluguel','Investimentos','Reembolso','Outros'];
const FORMAS=['PIX','Débito','Crédito','Dinheiro','Boleto','Transferência','Outro'];
const CAT_COLORS={'Moradia':'#6366F1','Alimentação':'#F59E0B','Restaurantes':'#EF4444','Mercado':'#10B981','Transporte':'#3B82F6','Combustível':'#8B5CF6','Saúde':'#EC4899','Academia':'#14B8A6','Lazer':'#F97316','Viagens':'#06B6D4','Compras':'#84CC16','Assinaturas':'#A855F7','Educação':'#0EA5E9','Impostos':'#64748B','Dívidas':'#DC2626','Família':'#D97706','Presentes':'#BE185D','Investimentos':'#059669','Outros':'#9CA3AF'};

// ====== APP SHELL ======
function initApp(){
  const user=currentUser;
  const name=(user.user_metadata?.full_name||user.email||'Usuário').split(' ')[0];
  document.getElementById('root').innerHTML=`
    <div class="app">
      <aside class="sidebar">
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
          <div class="nav-item" data-view="apagar"><i class="ti ti-clock"></i> Contas a Pagar</div>
          <div class="nav-item" data-view="parcelamentos"><i class="ti ti-receipt"></i> Parcelamentos</div>
          <div class="nav-section">Análise</div>
          <div class="nav-item" data-view="orcamento"><i class="ti ti-target"></i> Orçamento</div>
          <div class="nav-item" data-view="metas"><i class="ti ti-trophy"></i> Metas</div>
          <div class="nav-item" data-view="investimentos"><i class="ti ti-chart-line"></i> Investimentos</div>
          <div class="nav-item" data-view="relatorios"><i class="ti ti-report-analytics"></i> Relatórios</div>
        </nav>
        <div class="sidebar-footer">
          <button class="btn-logout" onclick="logout()"><i class="ti ti-logout"></i> Sair</button>
        </div>
      </aside>
      <div class="main">
        <div class="topbar">
          <span class="topbar-title" id="topbar-title">Dashboard</span>
          <div class="topbar-actions" id="topbar-actions"></div>
        </div>
        <div class="content" id="content"><div class="loading"><div class="spinner"></div> Carregando...</div></div>
      </div>
    </div>
    <button class="fab" onclick="novoLancamentoModal()" title="Novo lançamento">+</button>`;

  document.querySelectorAll('.nav-item').forEach(item=>{
    item.addEventListener('click',()=>{
      document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
      item.classList.add('active');
      const view=item.dataset.view;
      document.getElementById('topbar-title').textContent=item.textContent.trim();
      document.getElementById('topbar-actions').innerHTML='';
      loadView(view);
    });
  });
  loadView('dashboard');
}

async function loadView(view){
  const c=document.getElementById('content');
  c.innerHTML='<div class="loading"><div class="spinner"></div> Carregando...</div>';
  Object.keys(charts).forEach(k=>{destroyChart(k);});
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
    }
  }catch(e){c.innerHTML='<div class="loading" style="color:#FF5C5C">Erro: '+e.message+'</div>';}
}

// ====== DASHBOARD ======
async function renderDashboard(){
  const {mes,ano}=mesAtual();
  const ini=`${ano}-${String(mes).padStart(2,'0')}-01`;
  const fim=`${ano}-${String(mes).padStart(2,'0')}-31`;

  const [
    {data:lanc},
    {data:contas},
    {data:metas},
    {data:invest}
  ] = await Promise.all([
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
  const patrimonio=saldoContas+totalInvest;

  const catData={};
  (lanc||[]).filter(l=>l.tipo==='despesa'&&l.status!=='cancelado').forEach(l=>{
    catData[l.categoria]=(catData[l.categoria]||0)+Number(l.valor);
  });
  const catLabels=Object.keys(catData).sort((a,b)=>catData[b]-catData[a]);
  const topCat=catLabels[0]||'—';

  document.getElementById('content').innerHTML=`
    <div style="margin-bottom:6px;font-size:13px;color:var(--text2)">
      ${nomeMes(mes,ano)} · <strong style="color:var(--text)">${(contas||[]).length} contas cadastradas</strong>
    </div>
    <div class="cards-grid">
      <div class="card">
        <div class="card-icon icon-green"><i class="ti ti-trending-up"></i></div>
        <div class="card-label">Receitas do mês</div>
        <div class="card-value" style="color:var(--green-dark)">${fmt(receitas)}</div>
        <div class="card-sub">Recebido em ${nomeMes(mes,ano).split(' ')[0]}</div>
      </div>
      <div class="card">
        <div class="card-icon icon-red"><i class="ti ti-trending-down"></i></div>
        <div class="card-label">Despesas do mês</div>
        <div class="card-value" style="color:var(--red)">${fmt(despesas)}</div>
        <div class="card-sub">Gasto em ${nomeMes(mes,ano).split(' ')[0]}</div>
      </div>
      <div class="card">
        <div class="card-icon ${saldoMes>=0?'icon-green':'icon-red'}"><i class="ti ti-wallet"></i></div>
        <div class="card-label">Saldo do mês</div>
        <div class="card-value" style="color:${saldoMes>=0?'var(--green-dark)':'var(--red)'}">${fmt(saldoMes)}</div>
        <div class="card-sub ${saldoMes>=0?'up':'down'}">${receitas>0?Math.round(saldoMes/receitas*100):0}% de economia</div>
      </div>
      <div class="card">
        <div class="card-icon icon-blue"><i class="ti ti-building-bank"></i></div>
        <div class="card-label">Saldo disponível</div>
        <div class="card-value">${fmt(saldoContas)}</div>
        <div class="card-sub">${(contas||[]).length} conta${(contas||[]).length!==1?'s':''}</div>
      </div>
      <div class="card">
        <div class="card-icon icon-amber"><i class="ti ti-clock"></i></div>
        <div class="card-label">A pagar</div>
        <div class="card-value" style="color:var(--amber)">${fmt(apagar)}</div>
        <div class="card-sub">Pendente no mês</div>
      </div>
      <div class="card">
        <div class="card-icon icon-green"><i class="ti ti-cash"></i></div>
        <div class="card-label">A receber</div>
        <div class="card-value" style="color:var(--green-dark)">${fmt(areceber)}</div>
        <div class="card-sub">Receitas futuras</div>
      </div>
      <div class="card">
        <div class="card-icon icon-purple"><i class="ti ti-chart-line"></i></div>
        <div class="card-label">Investimentos</div>
        <div class="card-value" style="color:var(--purple)">${fmt(totalInvest)}</div>
        <div class="card-sub">${(invest||[]).length} aplicação${(invest||[]).length!==1?'ões':''}</div>
      </div>
      <div class="card">
        <div class="card-icon icon-blue"><i class="ti ti-building-estate"></i></div>
        <div class="card-label">Patrimônio</div>
        <div class="card-value">${fmtK(patrimonio)}</div>
        <div class="card-sub">Contas + investimentos</div>
      </div>
    </div>
    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">Gastos por categoria <span>este mês</span></div>
        ${catLabels.length?`<div style="position:relative;height:220px"><canvas id="chartCat"></canvas></div>`:'<div style="text-align:center;padding:40px;color:var(--text3)">Nenhuma despesa lançada</div>'}
      </div>
      <div class="chart-card">
        <div class="chart-title">Receitas × Despesas <span>últimos 6 meses</span></div>
        <div style="position:relative;height:220px"><canvas id="chartMensal"></canvas></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div>
        <div class="table-card">
          <div class="table-header">
            <span class="table-title">Últimos lançamentos</span>
            <button class="btn" onclick="document.querySelector('[data-view=lancamentos]').click()">Ver todos</button>
          </div>
          <table>
            <thead><tr><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Status</th></tr></thead>
            <tbody id="tbody-recentes"></tbody>
          </table>
        </div>
      </div>
      <div>
        <div class="table-card">
          <div class="table-header"><span class="table-title">Próximas contas</span></div>
          <table>
            <thead><tr><th>Descrição</th><th>Vence</th><th>Valor</th></tr></thead>
            <tbody id="tbody-apagar"></tbody>
          </table>
        </div>
        ${(metas||[]).length?`
        <div class="chart-card" style="margin-top:14px">
          <div class="chart-title">Metas financeiras</div>
          <div id="metas-dash"></div>
        </div>`:''}
      </div>
    </div>`;

  // Chart categorias
  if(catLabels.length){
    destroyChart('chartCat');
    charts['chartCat']=new Chart(document.getElementById('chartCat'),{
      type:'doughnut',
      data:{labels:catLabels,datasets:[{data:catLabels.map(c=>catData[c]),backgroundColor:catLabels.map(c=>CAT_COLORS[c]||'#9CA3AF'),borderWidth:2,borderColor:'#fff'}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{size:11},boxWidth:12}}}}
    });
  }

  // Chart mensal
  await renderChartMensal();

  // Recentes
  const recentes=(lanc||[]).sort((a,b)=>new Date(b.data)-new Date(a.data)).slice(0,6);
  document.getElementById('tbody-recentes').innerHTML=recentes.length?recentes.map(l=>`
    <tr>
      <td>${l.descricao}</td>
      <td><span style="font-size:11px;color:var(--text2)">${l.categoria||'—'}</span></td>
      <td style="color:${l.tipo==='receita'?'var(--green-dark)':'var(--red)';font-weight:600}">${l.tipo==='receita'?'+':'-'}${fmt(l.valor)}</td>
      <td><span class="badge ${l.status==='recebido'||l.status==='pago'?'badge-green':l.status==='pendente'?'badge-amber':'badge-blue'}">${l.status}</span></td>
    </tr>`).join(''):'<tr><td colspan="4" class="empty-row">Nenhum lançamento</td></tr>';

  // A pagar
  const hoje=new Date(); hoje.setHours(0,0,0,0);
  const proximas=(lanc||[]).filter(l=>l.tipo==='despesa'&&l.status==='pendente').sort((a,b)=>new Date(a.data_vencimento||a.data)-new Date(b.data_vencimento||b.data)).slice(0,5);
  document.getElementById('tbody-apagar').innerHTML=proximas.length?proximas.map(l=>{
    const venc=new Date((l.data_vencimento||l.data)+'T00:00:00');
    const diff=Math.round((venc-hoje)/(1000*60*60*24));
    let alerta='';
    if(diff<0)alerta='badge-red';
    else if(diff===0)alerta='badge-amber';
    else if(diff<=3)alerta='badge-amber';
    else alerta='badge-gray';
    const label=diff<0?'Vencido':diff===0?'Hoje':diff<=3?'Em '+diff+'d':'Em '+diff+'d';
    return`<tr><td>${l.descricao}</td><td><span class="badge ${alerta}">${label}</span></td><td style="color:var(--red);font-weight:600">${fmt(l.valor)}</td></tr>`;
  }).join(''):'<tr><td colspan="3" class="empty-row">Sem contas pendentes</td></tr>';

  // Metas
  if((metas||[]).length){
    document.getElementById('metas-dash').innerHTML=(metas||[]).slice(0,3).map(m=>{
      const pct=Math.min(100,Math.round((m.valor_atual/m.valor_desejado)*100));
      return`<div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
          <span style="font-weight:600">${m.nome}</span>
          <span style="color:var(--text2)">${pct}%</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${pct>=100?'var(--green)':pct>=70?'var(--amber)':'var(--blue)'}"></div></div>
        <div style="font-size:11px;color:var(--text2);margin-top:3px">${fmt(m.valor_atual)} / ${fmt(m.valor_desejado)}</div>
      </div>`;
    }).join('');
  }
}

async function renderChartMensal(){
  const meses=[];
  const labels=[];
  const now=new Date();
  for(let i=5;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    meses.push({mes:d.getMonth()+1,ano:d.getFullYear()});
    labels.push(d.toLocaleDateString('pt-BR',{month:'short'}));
  }
  const recArr=[],despArr=[];
  for(const {mes,ano} of meses){
    const ini=`${ano}-${String(mes).padStart(2,'0')}-01`;
    const fim=`${ano}-${String(mes).padStart(2,'0')}-31`;
    const {data:l}=await sb.from('lancamentos').select('tipo,valor,status').eq('user_id',uid()).gte('data',ini).lte('data',fim);
    recArr.push((l||[]).filter(x=>x.tipo==='receita'&&x.status==='recebido').reduce((s,x)=>s+Number(x.valor),0));
    despArr.push((l||[]).filter(x=>x.tipo==='despesa'&&x.status!=='cancelado').reduce((s,x)=>s+Number(x.valor),0));
  }
  destroyChart('chartMensal');
  const el=document.getElementById('chartMensal');
  if(!el)return;
  charts['chartMensal']=new Chart(el,{
    type:'bar',
    data:{labels,datasets:[
      {label:'Receitas',data:recArr,backgroundColor:'rgba(0,196,140,.7)',borderRadius:4},
      {label:'Despesas',data:despArr,backgroundColor:'rgba(255,92,92,.7)',borderRadius:4}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{font:{size:11}}}},scales:{y:{ticks:{callback:v=>'R$'+(v/1000).toFixed(0)+'k'}}}}
  });
}

// ====== LANÇAMENTOS ======
async function renderLancamentos(){
  document.getElementById('topbar-actions').innerHTML=`
    <button class="btn btn-green" onclick="novoLancamentoModal()"><i class="ti ti-plus"></i> Novo lançamento</button>`;

  const {data:lanc}=await sb.from('lancamentos').select('*').eq('user_id',uid()).order('data',{ascending:false}).limit(200);
  const {data:contasDB}=await sb.from('contas').select('id,nome').eq('user_id',uid());
  const contasMapa=Object.fromEntries((contasDB||[]).map(c=>[c.id,c.nome]));

  const rows=(lanc||[]).map(l=>`
    <tr>
      <td>${new Date(l.data+'T00:00:00').toLocaleDateString('pt-BR')}</td>
      <td>
        <div style="font-weight:600">${l.descricao}</div>
        ${l.parcela_atual?`<div style="font-size:11px;color:var(--text2)">${l.parcela_atual}/${l.total_parcelas}x</div>`:''}
      </td>
      <td><span style="font-size:12px;color:var(--text2)">${l.categoria||'—'}</span></td>
      <td>${contasMapa[l.conta_id]||l.forma_pagamento||'—'}</td>
      <td style="font-weight:700;color:${l.tipo==='receita'?'var(--green-dark)':'var(--red)'}">${l.tipo==='receita'?'+':'-'}${fmt(l.valor)}</td>
      <td><span class="badge ${l.status==='recebido'||l.status==='pago'?'badge-green':l.status==='pendente'?'badge-amber':l.status==='a_receber'?'badge-blue':'badge-gray'}">${l.status}</span></td>
      <td>
        ${l.status==='pendente'?`<button class="btn" onclick="baixarLancamento('${l.id}')" style="padding:4px 8px;font-size:11px"><i class="ti ti-check"></i> Pagar</button>`:''}
        <button class="btn" onclick="deletarLancamento('${l.id}')" style="padding:4px 8px;font-size:11px;margin-left:4px"><i class="ti ti-trash"></i></button>
      </td>
    </tr>`).join('');

  document.getElementById('content').innerHTML=`
    <div class="table-card">
      <div class="table-header">
        <span class="table-title">Todos os lançamentos</span>
        <span style="font-size:13px;color:var(--text2)">${(lanc||[]).length} registros</span>
      </div>
      <table>
        <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Conta/Forma</th><th>Valor</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows||'<tr><td colspan="7" class="empty-row">Nenhum lançamento. Clique em + para adicionar.</td></tr>'}</tbody>
      </table>
    </div>`;
}

async function baixarLancamento(id){
  const statusNovo=confirm('Marcar como PAGO?')?'pago':null;
  if(!statusNovo)return;
  await sb.from('lancamentos').update({status:statusNovo}).eq('id',id).eq('user_id',uid());
  loadView('lancamentos');
}

async function deletarLancamento(id){
  if(!confirm('Excluir este lançamento?'))return;
  await sb.from('lancamentos').delete().eq('id',id).eq('user_id',uid());
  loadView('lancamentos');
}

// ====== MODAL NOVO LANÇAMENTO ======
function novoLancamentoModal(){
  document.body.insertAdjacentHTML('beforeend',`
    <div class="overlay" id="overlay">
      <div class="modal" style="max-width:420px">
        <div class="modal-header">
          <span class="modal-title">Novo lançamento</span>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="tipo-grid">
          <div class="tipo-btn despesa selected" id="tipo-despesa" onclick="selectTipo('despesa')">
            <i class="ti ti-trending-down" style="color:var(--red)"></i><span>Despesa</span>
          </div>
          <div class="tipo-btn receita" id="tipo-receita" onclick="selectTipo('receita')">
            <i class="ti ti-trending-up" style="color:var(--green-dark)"></i><span>Receita</span>
          </div>
        </div>
        <div id="form-lancamento"></div>
      </div>
    </div>`);
  selectTipo('despesa');
}

let tipoAtual='despesa';
async function selectTipo(tipo){
  tipoAtual=tipo;
  document.querySelectorAll('.tipo-btn').forEach(b=>b.classList.remove('selected'));
  document.getElementById('tipo-'+tipo).classList.add('selected');

  const {data:contas}=await sb.from('contas').select('id,nome').eq('user_id',uid());
  const contaOpts=(contas||[]).map(c=>`<option value="${c.id}">${c.nome}</option>`).join('');
  const cats=tipo==='receita'?CATS_RECEITA:CATS_DESPESA;
  const catOpts=cats.map(c=>`<option>${c}</option>`).join('');
  const statusOpts=tipo==='receita'
    ?'<option value="recebido">Recebido</option><option value="a_receber">A receber</option>'
    :'<option value="pago">Pago</option><option value="pendente">Pendente</option>';

  document.getElementById('form-lancamento').innerHTML=`
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Data *</label>
        <input class="form-control" type="date" id="f_data" value="${today()}"/>
      </div>
      <div class="form-group">
        <label class="form-label">Valor (R$) *</label>
        <input class="form-control" type="number" id="f_valor" placeholder="0,00" step="0.01"/>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Descrição *</label>
      <input class="form-control" id="f_desc" placeholder="Ex: Supermercado, Salário..."/>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Categoria</label>
        <select class="form-control" id="f_cat"><option value="">Selecione...</option>${catOpts}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-control" id="f_status">${statusOpts}</select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Conta</label>
        <select class="form-control" id="f_conta"><option value="">Selecione...</option>${contaOpts}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Forma de pagamento</label>
        <select class="form-control" id="f_forma"><option value="">Selecione...</option>${FORMAS.map(f=>`<option>${f}</option>`).join('')}</select>
      </div>
    </div>
    ${tipo==='despesa'?`
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Parcelas</label>
        <input class="form-control" type="number" id="f_parcelas" placeholder="1 (sem parcelamento)" min="1" max="60"/>
      </div>
      <div class="form-group">
        <label class="form-label">Vencimento</label>
        <input class="form-control" type="date" id="f_venc" value="${today()}"/>
      </div>
    </div>`:''}
    <div class="form-group">
      <label class="form-label">Observação</label>
      <input class="form-control" id="f_obs" placeholder="Opcional"/>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-green" onclick="salvarLancamento()"><i class="ti ti-check"></i> Salvar</button>
    </div>`;
}

async function salvarLancamento(){
  const desc=document.getElementById('f_desc').value.trim();
  const valor=parseFloat(document.getElementById('f_valor').value);
  const data=document.getElementById('f_data').value;
  if(!desc||!valor||!data){alert('Preencha: data, valor e descrição');return;}
  const parcelas=parseInt(document.getElementById('f_parcelas')?.value)||1;
  const base={
    user_id:uid(),tipo:tipoAtual,descricao:desc,valor,data,
    categoria:document.getElementById('f_cat').value,
    status:document.getElementById('f_status').value,
    conta_id:document.getElementById('f_conta').value||null,
    forma_pagamento:document.getElementById('f_forma').value,
    observacao:document.getElementById('f_obs').value,
    data_vencimento:document.getElementById('f_venc')?.value||data,
    total_parcelas:parcelas
  };
  if(parcelas>1){
    const inserts=[];
    for(let i=0;i<parcelas;i++){
      const d=new Date(data+'T00:00:00');
      d.setMonth(d.getMonth()+i);
      const dStr=d.toISOString().split('T')[0];
      inserts.push({...base,valor:Math.round(valor/parcelas*100)/100,data:dStr,data_vencimento:dStr,parcela_atual:i+1,status:'pendente',descricao:desc+` (${i+1}/${parcelas})`});
    }
    await sb.from('lancamentos').insert(inserts);
  } else {
    await sb.from('lancamentos').insert(base);
  }
  closeModal();
  const activeView=document.querySelector('.nav-item.active')?.dataset.view||'dashboard';
  loadView(activeView);
}

// ====== CONTAS ======
async function renderContas(){
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-green" onclick="novaConta()"><i class="ti ti-plus"></i> Nova conta</button>`;
  const {data:contas}=await sb.from('contas').select('*').eq('user_id',uid()).order('nome');
  const total=(contas||[]).reduce((s,c)=>s+Number(c.saldo_atual||c.saldo_inicial||0),0);
  const icons={'Conta corrente':'🏦','Conta digital':'📱','Conta poupança':'🐷','Dinheiro':'💵','Carteira':'👛'};
  document.getElementById('content').innerHTML=`
    <div class="card" style="margin-bottom:20px;display:inline-block;min-width:220px">
      <div class="card-label">Saldo total disponível</div>
      <div class="card-value">${fmt(total)}</div>
      <div class="card-sub">${(contas||[]).length} conta${(contas||[]).length!==1?'s':''} cadastrada${(contas||[]).length!==1?'s':''}</div>
    </div>
    <div id="lista-contas">
      ${(contas||[]).length?(contas||[]).map(c=>`
        <div class="conta-card">
          <div class="conta-info">
            <div class="conta-icon" style="background:var(--blue-light);font-size:22px">${icons[c.tipo]||'🏦'}</div>
            <div>
              <div class="conta-name">${c.nome}</div>
              <div class="conta-type">${c.tipo||'Conta'}${c.banco?' · '+c.banco:''}</div>
            </div>
          </div>
          <div class="conta-saldo">
            <div class="conta-saldo-value" style="color:${Number(c.saldo_atual||c.saldo_inicial||0)>=0?'var(--green-dark)':'var(--red)'}">${fmt(c.saldo_atual||c.saldo_inicial||0)}</div>
            <div class="conta-saldo-label">saldo atual</div>
          </div>
          <button class="btn" onclick="deletarConta('${c.id}')" style="padding:6px"><i class="ti ti-trash"></i></button>
        </div>`).join(''):'<div style="text-align:center;padding:40px;color:var(--text3)">Nenhuma conta cadastrada. Clique em + para adicionar.</div>'}
    </div>`;
}

function novaConta(){
  document.body.insertAdjacentHTML('beforeend',`
    <div class="overlay" id="overlay">
      <div class="modal">
        <div class="modal-header"><span class="modal-title">Nova Conta</span><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Nome da conta *</label><input class="form-control" id="f_nome" placeholder="Ex: Nubank, C6 Bank"/></div>
          <div class="form-group"><label class="form-label">Banco</label><input class="form-control" id="f_banco" placeholder="Ex: Nubank"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Tipo *</label>
            <select class="form-control" id="f_tipo">
              <option>Conta corrente</option><option>Conta digital</option><option>Conta poupança</option><option>Dinheiro</option><option>Carteira</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">Saldo inicial (R$)</label><input class="form-control" type="number" id="f_saldo" placeholder="0" step="0.01"/></div>
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
  if(!nome){alert('Nome é obrigatório');return;}
  const saldo=parseFloat(document.getElementById('f_saldo').value)||0;
  await sb.from('contas').insert({user_id:uid(),nome,banco:document.getElementById('f_banco').value,tipo:document.getElementById('f_tipo').value,saldo_inicial:saldo,saldo_atual:saldo});
  closeModal();loadView('contas');
}

async function deletarConta(id){
  if(!confirm('Excluir esta conta?'))return;
  await sb.from('contas').delete().eq('id',id).eq('user_id',uid());
  loadView('contas');
}

// ====== CARTÕES ======
async function renderCartoes(){
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-green" onclick="novoCartao()"><i class="ti ti-plus"></i> Novo cartão</button>`;
  const {data:cartoes}=await sb.from('cartoes').select('*').eq('user_id',uid()).order('nome');
  document.getElementById('content').innerHTML=`
    <div id="lista-cartoes">
      ${(cartoes||[]).length?(cartoes||[]).map(c=>{
        const usado=Number(c.fatura_atual||0);
        const limite=Number(c.limite||0);
        const pct=limite>0?Math.min(100,Math.round(usado/limite*100)):0;
        return`<div class="card" style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div>
              <div style="font-size:16px;font-weight:700">${c.nome}</div>
              <div style="font-size:12px;color:var(--text2)">${c.banco||''} · Fecha dia ${c.dia_fechamento} · Vence dia ${c.dia_vencimento}</div>
            </div>
            <button class="btn" onclick="deletarCartao('${c.id}')" style="padding:6px"><i class="ti ti-trash"></i></button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px">
            <div><div style="font-size:11px;color:var(--text2);text-transform:uppercase">Limite total</div><div style="font-weight:700">${fmt(limite)}</div></div>
            <div><div style="font-size:11px;color:var(--text2);text-transform:uppercase">Utilizado</div><div style="font-weight:700;color:var(--red)">${fmt(usado)}</div></div>
            <div><div style="font-size:11px;color:var(--text2);text-transform:uppercase">Disponível</div><div style="font-weight:700;color:var(--green-dark)">${fmt(limite-usado)}</div></div>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${pct>=90?'var(--red)':pct>=70?'var(--amber)':'var(--green)'}"></div></div>
          <div style="font-size:11px;color:var(--text2);margin-top:4px">${pct}% utilizado</div>
        </div>`;
      }).join(''):'<div style="text-align:center;padding:60px;color:var(--text3)">Nenhum cartão cadastrado.</div>'}
    </div>`;
}

function novoCartao(){
  document.body.insertAdjacentHTML('beforeend',`
    <div class="overlay" id="overlay">
      <div class="modal">
        <div class="modal-header"><span class="modal-title">Novo Cartão</span><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Nome do cartão *</label><input class="form-control" id="f_nome" placeholder="Ex: Nubank Roxinho"/></div>
          <div class="form-group"><label class="form-label">Banco</label><input class="form-control" id="f_banco" placeholder="Ex: Nubank"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Limite (R$)</label><input class="form-control" type="number" id="f_limite" placeholder="0" step="0.01"/></div>
          <div class="form-group"><label class="form-label">Fatura atual (R$)</label><input class="form-control" type="number" id="f_fatura" placeholder="0" step="0.01"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Dia de fechamento</label><input class="form-control" type="number" id="f_fecha" placeholder="25" min="1" max="31"/></div>
          <div class="form-group"><label class="form-label">Dia de vencimento</label><input class="form-control" type="number" id="f_vence" placeholder="3" min="1" max="31"/></div>
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
  if(!nome){alert('Nome é obrigatório');return;}
  await sb.from('cartoes').insert({
    user_id:uid(),nome,banco:document.getElementById('f_banco').value,
    limite:parseFloat(document.getElementById('f_limite').value)||0,
    fatura_atual:parseFloat(document.getElementById('f_fatura').value)||0,
    dia_fechamento:parseInt(document.getElementById('f_fecha').value)||25,
    dia_vencimento:parseInt(document.getElementById('f_vence').value)||3
  });
  closeModal();loadView('cartoes');
}

async function deletarCartao(id){
  if(!confirm('Excluir este cartão?'))return;
  await sb.from('cartoes').delete().eq('id',id).eq('user_id',uid());
  loadView('cartoes');
}

// ====== CONTAS A PAGAR ======
async function renderAPagar(){
  const hoje=new Date();hoje.setHours(0,0,0,0);
  const {data:lanc}=await sb.from('lancamentos').select('*').eq('user_id',uid()).eq('tipo','despesa').eq('status','pendente').order('data_vencimento',{ascending:true});
  const total=(lanc||[]).reduce((s,l)=>s+Number(l.valor),0);
  const proximos7=(lanc||[]).filter(l=>{const d=new Date((l.data_vencimento||l.data)+'T00:00:00');const diff=(d-hoje)/(1000*60*60*24);return diff<=7&&diff>=-1;}).reduce((s,l)=>s+Number(l.valor),0);

  const rows=(lanc||[]).map(l=>{
    const venc=new Date((l.data_vencimento||l.data)+'T00:00:00');
    const diff=Math.round((venc-hoje)/(1000*60*60*24));
    let badge,label;
    if(diff<0){badge='badge-red';label='Vencido há '+Math.abs(diff)+'d';}
    else if(diff===0){badge='badge-amber';label='Vence hoje';}
    else if(diff<=3){badge='badge-amber';label='Vence em '+diff+'d';}
    else{badge='badge-gray';label='Em '+diff+'d';}
    return`<tr>
      <td>${l.descricao}</td>
      <td>${venc.toLocaleDateString('pt-BR')}</td>
      <td>${l.categoria||'—'}</td>
      <td><strong style="color:var(--red)">${fmt(l.valor)}</strong></td>
      <td><span class="badge ${badge}">${label}</span></td>
      <td>
        <button class="btn" onclick="pagarLancamento('${l.id}')" style="padding:5px 10px;font-size:12px"><i class="ti ti-check"></i> Pagar</button>
        <button class="btn" onclick="deletarLancamento('${l.id}')" style="padding:5px 8px;font-size:12px;margin-left:4px"><i class="ti ti-trash"></i></button>
      </td>
    </tr>`;}).join('');

  document.getElementById('content').innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px">
      <div class="card"><div class="card-label">Total pendente</div><div class="card-value" style="color:var(--red)">${fmt(total)}</div></div>
      <div class="card"><div class="card-label">Próximos 7 dias</div><div class="card-value" style="color:var(--amber)">${fmt(proximos7)}</div></div>
      <div class="card"><div class="card-label">Quantidade</div><div class="card-value">${(lanc||[]).length}</div></div>
    </div>
    <div class="table-card">
      <div class="table-header"><span class="table-title">Contas pendentes</span>
        <button class="btn btn-green" onclick="novoLancamentoModal()"><i class="ti ti-plus"></i> Nova despesa</button>
      </div>
      <table>
        <thead><tr><th>Descrição</th><th>Vencimento</th><th>Categoria</th><th>Valor</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows||'<tr><td colspan="6" class="empty-row">Nenhuma conta pendente 🎉</td></tr>'}</tbody>
      </table>
    </div>`;
}

async function pagarLancamento(id){
  await sb.from('lancamentos').update({status:'pago'}).eq('id',id).eq('user_id',uid());
  loadView('apagar');
}

// ====== PARCELAMENTOS ======
async function renderParcelamentos(){
  const {data:lanc}=await sb.from('lancamentos').select('*').eq('user_id',uid()).gt('total_parcelas',1).order('descricao');
  const grupos={};
  (lanc||[]).forEach(l=>{
    const key=l.descricao.replace(/ \(\d+\/\d+\)$/,'');
    if(!grupos[key])grupos[key]={items:[],pago:0,total:0,parcelas:l.total_parcelas};
    grupos[key].items.push(l);
    grupos[key].total++;
    if(l.status==='pago')grupos[key].pago++;
  });

  const html=Object.entries(grupos).map(([nome,g])=>{
    const valor=g.items[0]?Number(g.items[0].valor)*g.parcelas:0;
    const pago=Number(g.items[0]?.valor||0)*g.pago;
    const restante=valor-pago;
    const pct=Math.round(g.pago/g.parcelas*100);
    return`<div class="meta-card">
      <div class="meta-header">
        <span class="meta-title">${nome}</span>
        <span class="meta-values">${g.pago} de ${g.parcelas} pagas</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${pct>=100?'var(--green)':'var(--blue)'}"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text2);margin-top:6px">
        <span>Restante: <strong style="color:var(--red)">${fmt(restante)}</strong></span>
        <span>Total: ${fmt(valor)}</span>
      </div>
    </div>`;}).join('');

  document.getElementById('content').innerHTML=`
    <div style="margin-bottom:16px;font-size:14px;color:var(--text2)">${Object.keys(grupos).length} parcelamento${Object.keys(grupos).length!==1?'s':''} em andamento</div>
    ${html||'<div style="text-align:center;padding:60px;color:var(--text3)">Nenhum parcelamento ativo.</div>'}`;
}

// ====== ORÇAMENTO ======
async function renderOrcamento(){
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-green" onclick="novoOrcamento()"><i class="ti ti-plus"></i> Definir limite</button>`;
  const {mes,ano}=mesAtual();
  const ini=`${ano}-${String(mes).padStart(2,'0')}-01`;
  const fim=`${ano}-${String(mes).padStart(2,'0')}-31`;
  const [{data:orc},{data:lanc}]=await Promise.all([
    sb.from('orcamentos').select('*').eq('user_id',uid()),
    sb.from('lancamentos').select('categoria,valor').eq('user_id',uid()).eq('tipo','despesa').gte('data',ini).lte('data',fim)
  ]);
  const gastos={};
  (lanc||[]).forEach(l=>{ gastos[l.categoria]=(gastos[l.categoria]||0)+Number(l.valor); });

  const html=(orc||[]).map(o=>{
    const gasto=gastos[o.categoria]||0;
    const pct=Math.min(100,Math.round(gasto/o.limite*100));
    const cor=pct>=100?'var(--red)':pct>=90?'var(--red)':pct>=70?'var(--amber)':'var(--green)';
    return`<div class="meta-card">
      <div class="meta-header">
        <span class="meta-title">${o.categoria}</span>
        <span style="font-size:12px;font-weight:700;color:${cor}">${pct}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${cor}"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text2);margin-top:6px">
        <span>Gasto: <strong>${fmt(gasto)}</strong></span>
        <span>Limite: ${fmt(o.limite)}</span>
      </div>
      ${pct>=100?'<div style="font-size:12px;color:var(--red);margin-top:4px;font-weight:600">⚠️ Limite atingido!</div>':''}
    </div>`;}).join('');

  document.getElementById('content').innerHTML=`
    ${html||'<div style="text-align:center;padding:60px;color:var(--text3)">Nenhum limite definido. Clique em + para começar.</div>'}`;
}

function novoOrcamento(){
  const cats=CATS_DESPESA;
  document.body.insertAdjacentHTML('beforeend',`
    <div class="overlay" id="overlay">
      <div class="modal">
        <div class="modal-header"><span class="modal-title">Definir limite de orçamento</span><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div class="form-group"><label class="form-label">Categoria *</label>
          <select class="form-control" id="f_cat"><option value="">Selecione...</option>${cats.map(c=>`<option>${c}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label class="form-label">Limite mensal (R$) *</label>
          <input class="form-control" type="number" id="f_limite" placeholder="0" step="0.01"/>
        </div>
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
  if(!cat||!limite){alert('Preencha todos os campos');return;}
  const {data:exist}=await sb.from('orcamentos').select('id').eq('user_id',uid()).eq('categoria',cat).maybeSingle();
  if(exist){await sb.from('orcamentos').update({limite}).eq('id',exist.id);}
  else{await sb.from('orcamentos').insert({user_id:uid(),categoria:cat,limite});}
  closeModal();loadView('orcamento');
}

// ====== METAS ======
async function renderMetas(){
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-green" onclick="novaMeta()"><i class="ti ti-plus"></i> Nova meta</button>`;
  const {data:metas}=await sb.from('metas').select('*').eq('user_id',uid()).order('nome');
  const html=(metas||[]).map(m=>{
    const pct=Math.min(100,Math.round((m.valor_atual/m.valor_desejado)*100));
    const prazo=m.prazo?new Date(m.prazo+'T00:00:00').toLocaleDateString('pt-BR'):'—';
    return`<div class="meta-card">
      <div class="meta-header">
        <span class="meta-title" style="font-size:15px">${m.nome}</span>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn" onclick="atualizarMeta('${m.id}',${m.valor_atual},${m.valor_desejado})" style="padding:4px 8px;font-size:12px"><i class="ti ti-edit"></i></button>
          <button class="btn" onclick="deletarMeta('${m.id}')" style="padding:4px 8px;font-size:12px"><i class="ti ti-trash"></i></button>
        </div>
      </div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:8px">Prazo: ${prazo}</div>
      <div class="progress-bar" style="height:12px"><div class="progress-fill" style="width:${pct}%;background:${pct>=100?'var(--green)':pct>=70?'var(--amber)':'var(--blue)'}"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:8px">
        <span><strong style="color:var(--green-dark)">${fmt(m.valor_atual)}</strong> <span style="color:var(--text2)">guardado</span></span>
        <span style="font-weight:700;color:${pct>=100?'var(--green)':'var(--text)'}">${pct}%</span>
        <span style="color:var(--text2)">Meta: <strong>${fmt(m.valor_desejado)}</strong></span>
      </div>
    </div>`;}).join('');
  document.getElementById('content').innerHTML=html||'<div style="text-align:center;padding:60px;color:var(--text3)">Nenhuma meta cadastrada. Clique em + para criar.</div>';
}

function novaMeta(){
  document.body.insertAdjacentHTML('beforeend',`
    <div class="overlay" id="overlay">
      <div class="modal">
        <div class="modal-header"><span class="modal-title">Nova Meta</span><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div class="form-group"><label class="form-label">Nome da meta *</label><input class="form-control" id="f_nome" placeholder="Ex: Viagem Europa, Reserva de emergência"/></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Valor desejado (R$) *</label><input class="form-control" type="number" id="f_desejado" placeholder="0" step="0.01"/></div>
          <div class="form-group"><label class="form-label">Valor atual (R$)</label><input class="form-control" type="number" id="f_atual" placeholder="0" step="0.01"/></div>
        </div>
        <div class="form-group"><label class="form-label">Prazo</label><input class="form-control" type="date" id="f_prazo"/></div>
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
  if(!nome||!desejado){alert('Preencha nome e valor desejado');return;}
  await sb.from('metas').insert({user_id:uid(),nome,valor_desejado:desejado,valor_atual:parseFloat(document.getElementById('f_atual').value)||0,prazo:document.getElementById('f_prazo').value||null});
  closeModal();loadView('metas');
}

function atualizarMeta(id,atual,desejado){
  document.body.insertAdjacentHTML('beforeend',`
    <div class="overlay" id="overlay">
      <div class="modal" style="max-width:360px">
        <div class="modal-header"><span class="modal-title">Atualizar valor guardado</span><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div class="form-group"><label class="form-label">Valor atual (R$)</label><input class="form-control" type="number" id="f_atual" value="${atual}" step="0.01"/></div>
        <div class="modal-footer">
          <button class="btn" onclick="closeModal()">Cancelar</button>
          <button class="btn btn-green" onclick="salvarAtualizacaoMeta('${id}')"><i class="ti ti-check"></i> Salvar</button>
        </div>
      </div>
    </div>`);
}

async function salvarAtualizacaoMeta(id){
  const v=parseFloat(document.getElementById('f_atual').value)||0;
  await sb.from('metas').update({valor_atual:v}).eq('id',id).eq('user_id',uid());
  closeModal();loadView('metas');
}

async function deletarMeta(id){
  if(!confirm('Excluir esta meta?'))return;
  await sb.from('metas').delete().eq('id',id).eq('user_id',uid());
  loadView('metas');
}

// ====== INVESTIMENTOS ======
async function renderInvestimentos(){
  document.getElementById('topbar-actions').innerHTML=`<button class="btn btn-green" onclick="novoInvestimento()"><i class="ti ti-plus"></i> Novo investimento</button>`;
  const {data:invest}=await sb.from('investimentos').select('*').eq('user_id',uid()).order('nome');
  const totalInv=(invest||[]).reduce((s,i)=>s+Number(i.valor_investido||0),0);
  const totalAtual=(invest||[]).reduce((s,i)=>s+Number(i.valor_atual||i.valor_investido||0),0);
  const lucro=totalAtual-totalInv;

  document.getElementById('content').innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px">
      <div class="card"><div class="card-label">Total investido</div><div class="card-value">${fmt(totalInv)}</div></div>
      <div class="card"><div class="card-label">Valor atual</div><div class="card-value" style="color:var(--green-dark)">${fmt(totalAtual)}</div></div>
      <div class="card"><div class="card-label">Rentabilidade</div><div class="card-value" style="color:${lucro>=0?'var(--green-dark)':'var(--red)'}">${fmt(lucro,true)}</div></div>
    </div>
    <div class="table-card">
      <div class="table-header"><span class="table-title">Carteira de investimentos</span></div>
      <table>
        <thead><tr><th>Nome</th><th>Categoria</th><th>Instituição</th><th>Investido</th><th>Atual</th><th>Rentab.</th><th></th></tr></thead>
        <tbody>${(invest||[]).length?(invest||[]).map(i=>{
          const inv=Number(i.valor_investido||0);
          const atu=Number(i.valor_atual||inv);
          const diff=atu-inv;
          const pct=inv>0?Math.round(diff/inv*100):0;
          return`<tr>
            <td><strong>${i.nome}</strong></td>
            <td><span class="badge badge-purple">${i.categoria||'—'}</span></td>
            <td>${i.instituicao||'—'}</td>
            <td>${fmt(inv)}</td>
            <td><strong>${fmt(atu)}</strong></td>
            <td style="color:${diff>=0?'var(--green-dark)':'var(--red)';font-weight:600}">${diff>=0?'+':''}${pct}%</td>
            <td>
              <button class="btn" onclick="atualizarInvestimento('${i.id}',${atu})" style="padding:4px 8px;font-size:12px"><i class="ti ti-edit"></i></button>
              <button class="btn" onclick="deletarInvestimento('${i.id}')" style="padding:4px 8px;font-size:12px"><i class="ti ti-trash"></i></button>
            </td>
          </tr>`;}).join(''):'<tr><td colspan="7" class="empty-row">Nenhum investimento cadastrado.</td></tr>'}
        </tbody>
      </table>
    </div>`;
}

function novoInvestimento(){
  const cats=['CDB','Tesouro Direto','Ações','Fundos imobiliários','Fundos','Criptomoedas','Previdência','Outros'];
  document.body.insertAdjacentHTML('beforeend',`
    <div class="overlay" id="overlay">
      <div class="modal">
        <div class="modal-header"><span class="modal-title">Novo Investimento</span><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Nome *</label><input class="form-control" id="f_nome" placeholder="Ex: CDB Nubank 110% CDI"/></div>
          <div class="form-group"><label class="form-label">Instituição</label><input class="form-control" id="f_inst" placeholder="Ex: Nubank, XP, Rico"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Categoria</label>
            <select class="form-control" id="f_cat">${cats.map(c=>`<option>${c}</option>`).join('')}</select>
          </div>
          <div class="form-group"><label class="form-label">Data</label><input class="form-control" type="date" id="f_data" value="${today()}"/></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Valor investido (R$) *</label><input class="form-control" type="number" id="f_inv" placeholder="0" step="0.01"/></div>
          <div class="form-group"><label class="form-label">Valor atual (R$)</label><input class="form-control" type="number" id="f_atual" placeholder="Deixe em branco = igual ao investido" step="0.01"/></div>
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
  if(!nome||!inv){alert('Nome e valor investido são obrigatórios');return;}
  const atual=parseFloat(document.getElementById('f_atual').value)||inv;
  await sb.from('investimentos').insert({user_id:uid(),nome,instituicao:document.getElementById('f_inst').value,categoria:document.getElementById('f_cat').value,data_investimento:document.getElementById('f_data').value,valor_investido:inv,valor_atual:atual});
  closeModal();loadView('investimentos');
}

function atualizarInvestimento(id,atual){
  document.body.insertAdjacentHTML('beforeend',`
    <div class="overlay" id="overlay">
      <div class="modal" style="max-width:360px">
        <div class="modal-header"><span class="modal-title">Atualizar valor atual</span><button class="modal-close" onclick="closeModal()">✕</button></div>
        <div class="form-group"><label class="form-label">Valor atual (R$)</label><input class="form-control" type="number" id="f_atual" value="${atual}" step="0.01"/></div>
        <div class="modal-footer">
          <button class="btn" onclick="closeModal()">Cancelar</button>
          <button class="btn btn-green" onclick="salvarAtualizacaoInv('${id}')"><i class="ti ti-check"></i> Salvar</button>
        </div>
      </div>
    </div>`);
}

async function salvarAtualizacaoInv(id){
  await sb.from('investimentos').update({valor_atual:parseFloat(document.getElementById('f_atual').value)||0}).eq('id',id).eq('user_id',uid());
  closeModal();loadView('investimentos');
}

async function deletarInvestimento(id){
  if(!confirm('Excluir este investimento?'))return;
  await sb.from('investimentos').delete().eq('id',id).eq('user_id',uid());
  loadView('investimentos');
}

// ====== RELATÓRIOS ======
async function renderRelatorios(){
  const {mes,ano}=mesAtual();
  const ini=`${ano}-${String(mes).padStart(2,'0')}-01`;
  const fim=`${ano}-${String(mes).padStart(2,'0')}-31`;
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
    <div class="card" style="margin-bottom:20px;background:linear-gradient(135deg,#0F172A,#1E3A5F);color:#fff">
      <div style="font-size:18px;font-weight:700;margin-bottom:8px">📊 Resumo de ${nomeMes(mes,ano)}</div>
      <div style="font-size:14px;opacity:.85;line-height:1.7">
        Neste mês você <strong>recebeu ${fmt(receitas)}</strong> e <strong>gastou ${fmt(despesas)}</strong>.
        ${economia>=0?`Seu saldo positivo foi de <strong>${fmt(economia)}</strong>.`:`Você ficou <strong>${fmt(Math.abs(economia))}</strong> no negativo.`}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px">
      <div class="card"><div class="card-label">Taxa de economia</div><div class="card-value" style="color:var(--green-dark)">${txEconomia}%</div><div class="card-sub">(Receitas - Desp.) / Rec.</div></div>
      <div class="card"><div class="card-label">Comprometimento</div><div class="card-value" style="color:${txComprom>80?'var(--red)':'var(--amber)'}">${txComprom}%</div><div class="card-sub">Despesas / Receitas</div></div>
      <div class="card"><div class="card-label">Maior gasto</div><div class="card-value" style="font-size:16px">${topCat?topCat[0]:'—'}</div><div class="card-sub">${topCat?fmt(topCat[1]):''}</div></div>
      <div class="card"><div class="card-label">Maior despesa</div><div class="card-value" style="font-size:16px">${maiorDesp?maiorDesp.descricao:'—'}</div><div class="card-sub">${maiorDesp?fmt(maiorDesp.valor):''}</div></div>
    </div>
    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">Gastos por categoria</div>
        ${catOrdenada.length?`<div style="position:relative;height:280px"><canvas id="chartCatRel"></canvas></div>`:'<div style="text-align:center;padding:40px;color:var(--text3)">Sem dados</div>'}
      </div>
      <div class="chart-card">
        <div class="chart-title">Distribuição</div>
        <div id="cat-lista">
          ${catOrdenada.map(([cat,val])=>`
            <div style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
                <span style="font-weight:500">${cat}</span>
                <span style="font-weight:700">${fmt(val)} <span style="color:var(--text2);font-weight:400">(${despesas>0?Math.round(val/despesas*100):0}%)</span></span>
              </div>
              <div class="progress-bar"><div class="progress-fill" style="width:${despesas>0?Math.round(val/despesas*100):0}%;background:${CAT_COLORS[cat]||'#9CA3AF'}"></div></div>
            </div>`).join('')}
        </div>
      </div>
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
