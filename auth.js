const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let currentUser = null;

function renderAuth() {
  document.getElementById('root').innerHTML = `
    <div class="auth-page">
      <div class="auth-box">
        <div class="auth-logo">
          <div class="auth-logo-icon">💰</div>
          <h1>FinançasPro</h1>
          <p>Controle financeiro inteligente</p>
        </div>
        <div class="auth-tabs">
          <button class="auth-tab active" onclick="switchTab('login')">Entrar</button>
          <button class="auth-tab" onclick="switchTab('register')">Criar conta</button>
        </div>
        <div id="auth-name-group" style="display:none">
          <label class="auth-label">Nome completo</label>
          <input class="auth-input" type="text" id="auth-name" placeholder="Seu nome"/>
        </div>
        <label class="auth-label">E-mail</label>
        <input class="auth-input" type="email" id="auth-email" placeholder="seu@email.com"/>
        <label class="auth-label">Senha</label>
        <input class="auth-input" type="password" id="auth-password" placeholder="••••••••"/>
        <button class="btn-auth" id="auth-btn" onclick="doLogin()">Entrar</button>
        <div id="auth-msg"></div>
      </div>
    </div>`;
}

let authMode = 'login';
function switchTab(mode) {
  authMode = mode;
  document.querySelectorAll('.auth-tab').forEach((t,i) => t.classList.toggle('active',(i===0&&mode==='login')||(i===1&&mode==='register')));
  document.getElementById('auth-name-group').style.display = mode==='register'?'block':'none';
  document.getElementById('auth-btn').textContent = mode==='register'?'Criar conta':'Entrar';
  document.getElementById('auth-btn').onclick = mode==='register'?doRegister:doLogin;
  document.getElementById('auth-msg').innerHTML='';
}

async function doLogin() {
  const email=document.getElementById('auth-email').value.trim();
  const password=document.getElementById('auth-password').value;
  if(!email||!password){showAuthMsg('Preencha todos os campos','error');return;}
  document.getElementById('auth-btn').textContent='Entrando...';
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error){showAuthMsg(error.message==='Invalid login credentials'?'E-mail ou senha incorretos':error.message,'error');document.getElementById('auth-btn').textContent='Entrar';return;}
  currentUser=data.user;initApp();
}

async function doRegister() {
  const email=document.getElementById('auth-email').value.trim();
  const password=document.getElementById('auth-password').value;
  const name=document.getElementById('auth-name').value.trim();
  if(!email||!password||!name){showAuthMsg('Preencha todos os campos','error');return;}
  if(password.length<6){showAuthMsg('Senha deve ter ao menos 6 caracteres','error');return;}
  document.getElementById('auth-btn').textContent='Criando...';
  const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name:name}}});
  if(error){showAuthMsg(error.message,'error');document.getElementById('auth-btn').textContent='Criar conta';return;}
  currentUser=data.user;
  showAuthMsg('Conta criada! Verifique seu e-mail.','success');
  setTimeout(()=>initApp(),1500);
}

function showAuthMsg(msg,type){document.getElementById('auth-msg').innerHTML='<div class="auth-msg '+type+'">'+msg+'</div>';}

async function checkAuth(){
  const {data:{session}}=await sb.auth.getSession();
  if(session){currentUser=session.user;initApp();}
  else{renderAuth();}
}

async function logout(){await sb.auth.signOut();currentUser=null;renderAuth();}
window.addEventListener('load',checkAuth);