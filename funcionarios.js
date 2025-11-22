// === Controle inicial ===
const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
const usuariosExistentes = JSON.parse(localStorage.getItem("funcionarios")) || [];
let funcionarioSelecionado = null;

document.addEventListener("DOMContentLoaded", () => {
  const secaoLista = document.querySelector(".lista");
  const botaoVerRegistros = document.querySelector(".header-buttons button");
  const botaoLimpar = document.getElementById("btnLimpar");
  const campoTipo = document.getElementById("tipoUsuario");
  const iconeAdicionar = document.getElementById("iconAdicionar");
  const spanUsuario = document.getElementById("usuarioLogado");

  if (!usuarioLogado){
    mostrarForm();
    document.querySelector(".lista").style.display = "none";
    document.getElementById("iconEditar").style.display = "none";
    document.getElementById("iconSalvar").style.display = "inline";
    document.getElementById("iconExcluir").style.display = "none";
    document.getElementById("iconAdicionar").style.display = "none";
    document.getElementById("btnVerRegistros").style.display = "none";
    return
  }

  // Exibição do usuário logado
  if (usuarioLogado && spanUsuario) {
    let iconeSexo = "../icons/user.png";
    if (usuarioLogado.sexo === "Masculino") iconeSexo = "../icons/homem.png";
    if (usuarioLogado.sexo === "Feminino") iconeSexo = "../icons/mulher.png";

    spanUsuario.innerHTML = `
      <img src="${iconeSexo}" alt="Usuário" class="icon-funcionario" style="vertical-align: middle; margin-right: 6px;">
      ${usuarioLogado.nome}
    `;
  }

  // 🔒 Mostrar campo Tipo SOMENTE para Administradores
  if (usuarioLogado?.tipo === "Administrador") {
    campoTipo.style.display = "block";
    
  } else {
    campoTipo.style.display = "none";
  }
  // Tratamento da visibilidade geral da página
  if (usuariosExistentes.length === 0) {
    campoTipo.style.display = "block";
    if (botaoVerRegistros) botaoVerRegistros.style.display = "none";
    if (botaoLimpar) botaoLimpar.style.display = "none";
  } 
  else if (!usuarioLogado) {
    campoTipo.style.display = "none";
    if (secaoLista) secaoLista.style.display = "none";
    if (botaoVerRegistros) botaoVerRegistros.style.display = "none";
    if (botaoLimpar) botaoLimpar.style.display = "none";
  } 
  else {
    campoTipo.style.display = (usuarioLogado.tipo === "Administrador") ? "block" : "none";
    iconeAdicionar.style.display = (usuarioLogado.tipo === "Administrador") ? "block" : "none";

    carregarFuncionarios();
    esconderForm();
    
  }
});

function esconderForm(){
  document.querySelector(".form").style.display = "none";  // esconde o formulário
  document.getElementById("tituloForm").style.display = "none";
}

function mostrarForm(){
  document.querySelector(".form").style.display = "grid";  // esconde o formulário
  document.getElementById("tituloForm").style.display = "grid";
}

// === Carregar lista de funcionários ===
function carregarFuncionarios() {
  const funcionarios = JSON.parse(localStorage.getItem("funcionarios")) || [];
  const lista = document.getElementById("listaFuncionarios");
  if (!lista) return;
  lista.innerHTML = "";

  funcionarios.forEach(f => {

    // 🔒 Usuário comum vê APENAS o próprio card
    if (usuarioLogado.tipo !== "Administrador" && f.id !== usuarioLogado.id) {
      return;
    }

    const card = document.createElement("div");
    card.classList.add("card-funcionario");

    let iconeSexo = "../icons/user.png";
    if (f.sexo === "Masculino") iconeSexo = "../icons/homem.png";
    if (f.sexo === "Feminino") iconeSexo = "../icons/mulher.png";

    card.innerHTML = `
      <div class="card-header">
        <img src="${iconeSexo}" alt="${f.sexo || "Funcionário"}" class="icon-funcionario">
        <h3>${f.nome}</h3>
      </div>
      <p><strong>E-mail:</strong> ${f.email}</p>
      <p><strong>Sexo:</strong> ${f.sexo || "-"}</p>
      <p><strong>Tipo:</strong>
        <span class="tipo ${f.tipo === "Administrador" ? "admin" : "comum"}">${f.tipo || "Comum"}</span>
      </p>
    `;
    card.addEventListener("click", () => selecionarFuncionario(f.id));
    lista.appendChild(card);
  });
}

// === Selecionar funcionário (preenche campos) ===
function selecionarFuncionario(id) {
  const funcionarios = JSON.parse(localStorage.getItem("funcionarios")) || [];
  const f = funcionarios.find(func => func.id === id);
  if (!f) return;

  funcionarioSelecionado = f;

  document.getElementById("nome").value = f.nome;
  document.getElementById("email").value = f.email;
  document.getElementById("senha").value = f.senha;
  document.getElementById("sexo").value = f.sexo;

  desabilitarCampos(true);

  const campoTipo = document.getElementById("tipoUsuario");

  // 🔒 Administrador vê e edita Tipo
  if (usuarioLogado.tipo === "Administrador") {
    campoTipo.style.display = "block";
    campoTipo.value = f.tipo;

    // 🔥 MOSTRA ÍCONES AO CLICAR NO FUNCIONÁRIO
    document.getElementById("iconEditar").style.display = "inline";
    document.getElementById("iconExcluir").style.display = "inline";
    document.getElementById("iconSalvar").style.display = "none";
  } else {
    campoTipo.style.display = "none";

    // Usuário comum não vê ícones
    document.getElementById("iconEditar").style.display = "inline";
    document.getElementById("iconExcluir").style.display = "none";
    document.getElementById("iconSalvar").style.display = "none";
  }

  mostrarForm();
}

// === Habilitar / desabilitar campos ===
function desabilitarCampos(desabilitar) {
  ["nome", "email", "senha", "sexo","tipoUsuario"].forEach(id => {
    document.getElementById(id).disabled = desabilitar;
  });
}

// === Editar funcionário ===
function editarFuncionario() {
  if (!funcionarioSelecionado) return alert("Selecione um funcionário para editar.");

  desabilitarCampos(false);

  // alterna ícones
  document.getElementById("iconEditar").style.display = "none";
  document.getElementById("iconSalvar").style.display = "inline";
  document.getElementById("iconExcluir").style.display = "none";
}

// === Excluir funcionário ===
function excluirFuncionario() {
  if (!funcionarioSelecionado) return alert("Selecione um funcionário para excluir.");
  if (!confirm("Deseja realmente excluir este funcionário?")) return;

  let funcionarios = JSON.parse(localStorage.getItem("funcionarios")) || [];
  funcionarios = funcionarios.filter(f => f.id !== funcionarioSelecionado.id);
  localStorage.setItem("funcionarios", JSON.stringify(funcionarios));

  funcionarioSelecionado = null;
  limparCampos();
  carregarFuncionarios();
  esconderForm();
  alert("Funcionário removido com sucesso!");
}

// === Salvar funcionário (novo ou atualização) ===
function salvarFuncionario() {
  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();
  const sexo = document.getElementById("sexo").value;
  const campoTipo = document.getElementById("tipoUsuario");

  if (!nome || !email || !senha || !sexo) {
    return alert("Preencha todos os campos antes de salvar.");
  }

  let funcionarios = JSON.parse(localStorage.getItem("funcionarios")) || [];

  if (funcionarioSelecionado) {
    const i = funcionarios.findIndex(f => f.id === funcionarioSelecionado.id);
    if (i !== -1) {
      if(usuarioLogado.tipo==="Administrador"){
      funcionarios[i] = { ...funcionarioSelecionado, nome, email, senha, sexo, tipo:campoTipo.value};
      }else{
      funcionarios[i] = { ...funcionarioSelecionado, nome, email, senha, sexo};
      }
      alert("Dados do funcionário atualizados com sucesso!");
    }
  } else {
    const tipo = (usuariosExistentes.length === 0) ? campoTipo.value : "Comum";
    funcionarios.push({ id: Date.now(), nome, email, senha, tipo, sexo });
    alert("Novo funcionário cadastrado com sucesso!");
    if(!usuarioLogado){
      window.location='login.html'
    }
  }

  localStorage.setItem("funcionarios", JSON.stringify(funcionarios));
  carregarFuncionarios();
  limparCampos();
  document.getElementById("iconEditar").style.display = "inline";
  document.getElementById("iconSalvar").style.display = "none";
  document.getElementById("iconExcluir").style.display = "inline";

  desabilitarCampos(true);
  esconderForm();

  funcionarioSelecionado = null;
}

function adicionarFuncionario(){

  document.getElementById("iconEditar").style.display = "none";
  document.getElementById("iconSalvar").style.display = "inline";
  document.getElementById("iconExcluir").style.display = "none";
  mostrarForm();
}

// === Limpar campos ===
function limparCampos() {
  document.getElementById("nome").value = "";
  document.getElementById("email").value = "";
  document.getElementById("senha").value = "";
  document.getElementById("sexo").value = "";

  desabilitarCampos(false);

  // oculta tudo quando não tem ninguém selecionado
  document.getElementById("iconEditar").style.display = "none";
  document.getElementById("iconSalvar").style.display = "none";
  document.getElementById("iconExcluir").style.display = "none";
}

// === Logout ===
function fazerLogout() {
  if (!confirm("Deseja realmente sair do sistema?")) return;
  localStorage.removeItem("usuarioLogado");
  window.location = "login.html";
}