// === Bloquear acesso se não estiver logado ===
const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
if (!usuarioLogado) {
  window.location = "login.html";
}
let indiceRegistroSelecionado = null;
let modoEdicaoRegistro = false;
let filaOcorrencias = [];
let popupAtiva = false;

// === Ao carregar a página ===
window.onload = function() {
  const nomeUsuario = usuarioLogado.nome || "Usuário";
  let iconeSexo = "../icons/user.png";
  if (usuarioLogado.sexo === "Masculino") iconeSexo = "../icons/homem.png";
  if (usuarioLogado.sexo === "Feminino") iconeSexo = "../icons/mulher.png";

  document.getElementById("usuarioLogado").innerHTML = `
    <img src="${iconeSexo}" alt="Usuário" class="icon-funcionario" style="vertical-align: middle; margin-right: 6px;">
    ${nomeUsuario}
  `;

  document.getElementById("funcionario").value = nomeUsuario;
  const hoje = new Date();
  document.getElementById("data").value = hoje.toISOString().split("T")[0];

  ["entrada1", "saida1", "entrada2", "saida2"].forEach(id => {
    document.getElementById(id).readOnly = true;
    document.getElementById(id).style.backgroundColor = "#f9f9f9";
  });

  carregarRegistros();
  carregarOcorrencias();
  popularAnos();
  popularFiltrosOcorrencias();
  aplicarFiltrosMesAtual();
  aplicarFiltrosDataAtual();
  contarDados();
};
// === Funções utilitárias ===
function contarDados(){
  const nRegistros = JSON.parse(localStorage.getItem("registros")) || [];
  const qtdeRegistros = nRegistros.length;

  document.getElementById("nRegistros").innerText = "N° de registros: "+qtdeRegistros;
}

function horaParaSegundos(hora) {
  if (!hora) return 0;
  const [h, m, s] = hora.split(":").map(Number);
  return (h * 3600) + (m * 60) + (s || 0);
}

function segundosParaHHMMSS(segundos) {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function calcularTotal() {
  const e1 = document.getElementById("entrada1").value;
  const s1 = document.getElementById("saida1").value;
  const e2 = document.getElementById("entrada2").value;
  const s2 = document.getElementById("saida2").value;

  const totalSegundos =
    (horaParaSegundos(s1) - horaParaSegundos(e1)) +
    (horaParaSegundos(s2) - horaParaSegundos(e2));

  document.getElementById("total").value = totalSegundos > 0 ? segundosParaHHMMSS(totalSegundos) : "";
}

function atualizarStatus() {
  const status = document.getElementById("status");
  const iconStatus = document.getElementById("iconStatus");

  const e1 = document.getElementById("entrada1").value;
  const s1 = document.getElementById("saida1").value;
  const e2 = document.getElementById("entrada2").value;
  const s2 = document.getElementById("saida2").value;

  // Lógica refinada de status
  if (e1 && s1 && e2 && s2) {
    status.value = "Finalizado";
  } else if (e1 || s1 || e2 || s2) {
    status.value = "Em andamento";
  } else {
    status.value = "Aberto";
  }

  // Atualiza o ícone
  if (iconStatus) {
    switch (status.value) {
      case "Finalizado":
        iconStatus.src = "../icons/status_finalizado.png"; // cadeado fechado
        break;
      case "Em andamento":
        iconStatus.src = "../icons/status_parcial.png"; // ícone intermediário (opcional)
        break;
      default:
        iconStatus.src = "../icons/status_aberto.png"; // cadeado aberto
    }
  }
}

function limparCampos() {
  const campos = ["entrada1", "saida1", "entrada2", "saida2"];
  campos.forEach(id => {
    document.getElementById(id).value = "";
    document.getElementById(id).readOnly = true;
    document.getElementById(id).style.backgroundColor = "#f9f9f9";
  });
  document.getElementById("total").value = "";
  document.getElementById("status").value = "Aberto";
  document.getElementById("iconStatus").src = "../icons/status_aberto.png";
  document.getElementById("modoManual").checked = false;
}
// === Alterna entre modo automático e manual ===
function alternarModoManual() {
  const modoManual = document.getElementById("modoManual").checked;
  const campos = ["entrada1", "saida1", "entrada2", "saida2"];

  campos.forEach(id => {
    const campo = document.getElementById(id);
    campo.readOnly = !modoManual;
    campo.style.backgroundColor = modoManual ? "#fffef0" : "#f9f9f9";
    campo.style.cursor = modoManual ? "text" : "not-allowed";

  });

  // 🔹 Atualiza texto do botão
  const btn = document.getElementById("btnRegistrar");
  if (btn) btn.textContent = modoManual ? "Salvar" : "Registrar Horário";

  // 🔹 NÃO limpar campos ao ativar ou desativar se o usuário estiver editando
  const toggleVisivel = document.querySelector(".toggle-container").style.display !== "none";

  if (!modoManual && toggleVisivel) {
    limparCampos();
  }
}
// === Registrar horário (automático ou manual) ===
function registrarHorario() {
  const funcionario = document.getElementById("funcionario").value;
  const data = document.getElementById("data").value;
  const modoManual = document.getElementById("modoManual").checked;

  const e1 = document.getElementById("entrada1");
  const s1 = document.getElementById("saida1");
  const e2 = document.getElementById("entrada2");
  const s2 = document.getElementById("saida2");
  const total = document.getElementById("total");
  const status = document.getElementById("status");

  const horaAtual = new Date().toLocaleTimeString("pt-BR", { hour12: false });

  // Carregar registros salvos
  let registros = JSON.parse(localStorage.getItem("registros")) || [];

  // Encontrar ou criar registro do dia
  let registro = registros.find(r => r.funcionario === funcionario && r.data === data);

  if (!registro) {
      registro = {
          id: crypto.randomUUID(),
          funcionario,
          data,
          e1: "",
          s1: "",
          e2: "",
          s2: "",
          total: "",
          status: "Aberto"
      };
      registros.push(registro);
  }

  // -------------------------------------
  // 🔹 MODO MANUAL
  // -------------------------------------
  if (modoManual) {

      if (!e1.value || !s1.value || !e2.value || !s2.value) {
          alert("Preencha todos os horários corretamente.");
          return;
      }

      // Atualiza registro
      registro.e1 = e1.value;
      registro.s1 = s1.value;
      registro.e2 = e2.value;
      registro.s2 = s2.value;

      // Recalcular total e status
      calcularTotal();
      atualizarStatus();
      registro.total = total.value;
      registro.status = status.value;

      // 🔥 Cria ocorrências baseadas nos horários
      verificarOcorrencia("entrada", registro.e1, registro);
      verificarOcorrencia("saida", registro.s2, registro);

      localStorage.setItem("registros", JSON.stringify(registros));
      carregarRegistros();

      // Após salvar → abrir popups (se existirem)
      if (filaOcorrencias.length > 0) {
          abrirProximaPopup();
          limparCampos();
          document.getElementById("modoManual").checked = false;
          return;
      }

      alert("Registro manual salvo!");
      limparCampos();
      document.getElementById("modoManual").checked = false;
      return;
  }

  // -------------------------------------
  // 🔹 MODO AUTOMÁTICO SEQUENCIAL
  // -------------------------------------

  if (!registro.e1) {
      registro.e1 = horaAtual;
      e1.value = registro.e1;

      verificarOcorrencia("entrada", registro.e1, registro);

      status.value = "Em andamento";
  }
  else if (!registro.s1) {
      registro.s1 = horaAtual;
      s1.value = registro.s1;

      status.value = "Em andamento";
  }
  else if (!registro.e2) {
      registro.e2 = horaAtual;
      e2.value = registro.e2;

      status.value = "Em andamento";
  }
  else if (!registro.s2) {
      registro.s2 = horaAtual;
      s2.value = registro.s2;

      // Registrar saída → agora finaliza
      verificarOcorrencia("saida", registro.s2, registro);

      calcularTotal();
      registro.total = total.value;
      registro.status = "Finalizado";

      localStorage.setItem("registros", JSON.stringify(registros));
      carregarRegistros();
      limparCampos();

      // Popups (se houver)
      if (filaOcorrencias.length > 0) {
          abrirProximaPopup();
          return;
      }

      alert("Registro finalizado!");
      return;
  }
  else {
      alert("Todas as marcações do dia já foram preenchidas.");
      return;
  }

  // Atualização parcial salva
  localStorage.setItem("registros", JSON.stringify(registros));
}
// === Calcula diferença entre horários (HH:MM) ===
function calcularDiferencaHoras(horaInicio, horaFim) {
  const [hi, mi] = horaInicio.split(":").map(Number);
  const [hf, mf] = horaFim.split(":").map(Number);
  const inicioMin = hi * 60 + mi;
  const fimMin = hf * 60 + mf;
  const diff = fimMin - inicioMin;
  const horas = Math.floor(diff / 60);
  const minutos = diff % 60;
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}
// === Edição e exclusão de registros ===
function carregarRegistros(lista = null) {

    const tbody = document.getElementById("listaRegistros");

    // 🔷 Se vier filtrado, usa ele — senão pega todos
    let registros = lista || JSON.parse(localStorage.getItem("registros")) || [];

    // 🔥 Se não for filtrado, aplica filtro só do usuário
    if (!lista) {
        registros = registros.filter(r => r.funcionario === usuarioLogado.nome);
        registros.sort((a, b) => new Date(b.data) - new Date(a.data));
    }

    tbody.innerHTML = "";

    registros.forEach(r => {

        const partesData = r.data.split("-");
        const dataFormatada = `${partesData[2]}/${partesData[1]}/${partesData[0]}`;

        const estado = r.status 
            ? r.status.charAt(0).toUpperCase() + r.status.slice(1).toLowerCase()
            : "-";

        // 🔥 Classe dinâmica do status (NÃO SOME MAIS)
        const classeStatus = r.status
            ? "status-" + r.status.toLowerCase().replace(" ", "-")
            : "status-desconhecido";

        const tr = document.createElement("tr");

        tr.setAttribute("data-id", "Id: "+r.id);

        tr.innerHTML = `
            <td>${dataFormatada}</td>
            <td class="status-col ${classeStatus}">${estado}</td>
            <td>${r.e1 || "-"}</td>
            <td>${r.s1 || "-"}</td>
            <td>${r.e2 || "-"}</td>
            <td>${r.s2 || "-"}</td>
            <td><strong>${r.total || "-"}</strong></td>
        `;

        tr.addEventListener("click", () => {
            selecionarRegistro(r.id);
            [...tbody.children].forEach(l => l.classList.remove("linha-selecionada"));
            tr.classList.add("linha-selecionada");
        });

        tbody.appendChild(tr);
    });
    contarDados();
}

function selecionarRegistro(id) {
  const registros = JSON.parse(localStorage.getItem("registros")) || [];
  const registro = registros.find(r => r.id === id);
  
  if (!registro) return;

  indiceRegistroSelecionado = id;

  // Preenche os campos do formulário
  document.getElementById("data").value = registro.data;
  document.getElementById("entrada1").value = registro.e1 || "";
  document.getElementById("saida1").value = registro.s1 || "";
  document.getElementById("entrada2").value = registro.e2 || "";
  document.getElementById("saida2").value = registro.s2 || "";
  document.getElementById("total").value = registro.total || "";
  document.getElementById("status").value = registro.status || "Aberto";

  // Destacar linha
  const tbody = document.getElementById("listaRegistros");

  // Oculta alternancia automática
  document.querySelector(".toggle-container").style.display = "none";

  // Mostra ícones de edição
  document.getElementById("btnExcluirReg").style.display = "block";
  document.getElementById("btnEditarReg").style.display = "block";
}

function mostrarBotoesEdicao(index) {
  const linhaBotao = document.querySelector(".linha-botao");
  linhaBotao.innerHTML = `
    <div class="botoes-edicao">
      <button class="btn-editar" indexReal="btnEditar">
        <img src="../icons/editar.png" alt="">Editar
      </button>
      <button class="btn-salvar" id="btnSalvar">
        <img src="../icons/salvar.png" alt="">Salvar
      </button>
      <button class="btn-excluir" id="btnExcluir">
        <img src="../icons/excluir.png" alt="">Excluir
      </button>
    </div>
  `;

  document.getElementById("btnEditar").onclick = () => habilitarEdicao();
  document.getElementById("btnSalvar").onclick = () => salvarEdicao();
  document.getElementById("btnExcluir").onclick = () => excluirRegistro();
}

function habilitarEdicao() {
  ["entrada1", "saida1", "entrada2", "saida2"].forEach(id => {
    const campo = document.getElementById(id);
    campo.readOnly = false;
    campo.style.backgroundColor = "#fffef0";
  });
}

function excluirRegistro() {
  if (!confirm("Deseja realmente excluir este registro?")) return;

  const registros = JSON.parse(localStorage.getItem("registros")) || [];

  // 🔍 Remove o registro cujo ID corresponde ao selecionado
  const novos = registros.filter(r => r.id !== indiceRegistroSelecionado);

  // Salva lista atualizada
  localStorage.setItem("registros", JSON.stringify(novos));

  // Atualiza interface
  
  carregarRegistros();
  restaurarInterfacePadrao();
 

  alert("🗑️ Registro removido com sucesso!");
}

function limparTodosRegistros() {
  const confirmar = confirm("Tem certeza que deseja apagar TODOS os registros? Esta ação não pode ser desfeita.");

  if (!confirmar) return;

  localStorage.removeItem("registros");
  carregarRegistros();

  alert("Todos os registros foram apagados com sucesso!");
}
// === Restaura interface para o padrão dos registros de horário
function restaurarInterfacePadrao() {
  limparCampos();
  document.querySelector(".toggle-container").style.display = "flex";

  // Resetar botões
  document.getElementById("btnExcluirReg").style.display = "none";
  document.getElementById("btnEditarReg").style.display = "none";

  const iconEditar = document.getElementById("iconEditarReg");
  iconEditar.src = "../icons/editar.png";
  modoEdicaoRegistro = false;

  const linhaBotao = document.querySelector(".linha-botao");
  linhaBotao.innerHTML = `<button id="btnRegistrar" onclick="registrarHorario()">Registrar Horário</button>`;
}
// === Restaura interface para o padrão dos registros de ocorrências
function restaurarInterfaceOcorrencias() {
  // Esconder botões
  document.getElementById("btnExcluirOc").style.display = "none";
  document.getElementById("btnEditarOc").style.display = "none";

  // Resetar ícone editar → salvar
  const iconEditar = document.getElementById("iconEditarOc");
  if (iconEditar) {
      iconEditar.src = "../icons/editar.png";
  }

  // Resetar flags
  modoEdicaoOcorrencia = false;
  indiceOcorrenciaSelecionada = null;

  // Remover destaque da linha
  const tbody = document.getElementById("listaOcorrencias");
  if (tbody) {
      [...tbody.children].forEach(l => {
          l.style.backgroundColor = "";
      });
  }
}
// === Exportar registros do usuário logado em XLSX ===
function obterRegistrosFiltrados() {
  const mes = document.getElementById("selectMes").value;
  const ano = document.getElementById("selectAno").value;

  const registros = JSON.parse(localStorage.getItem("registros")) || [];
  const registrosUsuario = registros.filter(r => r.funcionario === usuarioLogado.nome);

  return registrosUsuario.filter(r => {
      if (!r.data) return false;

      const [anoReg, mesReg] = r.data.split("-");

      const filtroAno = ano === "" || ano === anoReg;
      const filtroMes = mes === "" || mes === mesReg;

      return filtroAno && filtroMes;
  });
}
//Aplica os filtros de mês e ano nos registros de horário
function aplicarFiltros() {
  const mesSelecionado = document.getElementById("selectMes").value;
  const anoSelecionado = document.getElementById("selectAno").value;

  const registros = JSON.parse(localStorage.getItem("registros")) || [];

  // 🔥 Filtrar apenas do usuário logado
  let filtrados = registros.filter(r => r.funcionario === usuarioLogado.nome);

  // 🔷 Filtro por mês
  if (mesSelecionado) {
      filtrados = filtrados.filter(r => r.data.split("-")[1] === mesSelecionado);
  }

  // 🔷 Filtro por ano
  if (anoSelecionado) {
      filtrados = filtrados.filter(r => r.data.split("-")[0] === anoSelecionado);
  }

  // 🔷 Ordenar por data DESC
  //filtrados.sort((a, b) => new Date(b.data) - new Date(a.data));

  // 🔥 Enviar para a função que EXIBE os registros
  carregarRegistros(filtrados);
}
function aplicarFiltrosMesAtual() {
  const hoje = new Date();
  const anoAtual = hoje.getFullYear().toString();
  const mesAtual = String(hoje.getMonth() + 1).padStart(2, "0");

  // Define os selects automaticamente
  document.getElementById("selectAno").value = anoAtual;
  document.getElementById("selectMes").value = mesAtual;
  // Aplica os filtros
  aplicarFiltros();
}
function aplicarFiltrosDataAtual() {
  const hoje = new Date();

  const ano = hoje.getFullYear().toString();
  const mes = (hoje.getMonth() + 1).toString().padStart(2, "0");
  const dia = hoje.getDate().toString().padStart(2, "0");

  const filtroAno  = document.getElementById("filtroAnoOc");
  const filtroMes  = document.getElementById("filtroMesOc");
  const filtroDia  = document.getElementById("filtroDiaOc");

  if (filtroAno) filtroAno.value = ano;
  if (filtroMes) filtroMes.value = mes;
  if (filtroDia) filtroDia.value = dia;

  // Atualiza lista após aplicar os filtros
  filtrarOcorrencias();
}
function exportarRegistrosFiltrados() {
  const filtrados = obterRegistrosFiltrados();

  if (filtrados.length === 0) {
      alert("Não há registros filtrados para exportar.");
      return;
  }

  // Montar dados para exportação
  const dadosXLSX = filtrados.map(r => {
      const [ano, mes, dia] = r.data.split("-");
      const dataBR = `${dia}/${mes}/${ano}`;

      return {
          "Id": r.id || "",
          "Funcionário":r.funcionario,
          "Data": dataBR,
          "Status": r.status || "",
          "Entrada": r.e1 || "",
          "Saída Almoço": r.s1 || "",
          "Retorno Almoço": r.e2 || "",
          "Saída": r.s2 || "",
          "Total": r.total || ""
      };
  });

  // Criar planilha
  const ws = XLSX.utils.json_to_sheet(dadosXLSX);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Registros Filtrados");

  // Nome do arquivo
  const nomeArquivo = `Registros_${usuarioLogado.nome.replace(/\s+/g, "_")}_filtros.xlsx`;

  XLSX.writeFile(wb, nomeArquivo);
}
// === Exportar ocorrências em XLSX ===
function exportarOcorrencias() {
  const ocorrencias = JSON.parse(localStorage.getItem("ocorrencias")) || [];

  // Capturar filtros selecionados
  const tipoSel = document.getElementById("filtroTipo").value;
  const mesSel  = document.getElementById("filtroMesOc").value;
  const anoSel  = document.getElementById("filtroAnoOc").value;
  const diaSel  = document.getElementById("filtroDiaOc").value;

  // Filtrar igual ao filtrarOcorrencias()
  let filtradas = ocorrencias.filter(o => o.usuario === usuarioLogado.nome);

  if (tipoSel) filtradas = filtradas.filter(o => o.tipo === tipoSel);
  if (mesSel)  filtradas = filtradas.filter(o => o.data.split("/")[1] === mesSel);
  if (anoSel)  filtradas = filtradas.filter(o => o.data.split("/")[2] === anoSel);
  if (diaSel)  filtradas = filtradas.filter(o => o.data.split("/")[0] === diaSel);

  if (filtradas.length === 0) {
      alert("Não há ocorrências dentro dos filtros selecionados.");
      return;
  }

  // Montar planilha
  const dados = filtradas.map(o => ({
      Id: o.id,
      Usuário: o.usuario,
      Data: o.data,
      Tipo: o.tipo,
      Início: o.inicio,
      Fim: o.fim,
      Total: o.total,
      Justificativa: o.justificativa || ""
  }));

  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ocorrencias");

  const nomeArquivo = `Ocorrencias_${usuarioLogado.nome.replace(/\s+/g, "_")}_filtros.xlsx`;
  XLSX.writeFile(wb, nomeArquivo);
}
//Formata data de AAAA-MM-DD para DD/MM/AAAA
function formatarDataExport(dataStr) {
  if (!dataStr) return "";
  const partes = dataStr.split("-");
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}
//Função principal → Verifica atraso/Hora extra e chama popup
function verificarOcorrencia(tipoMarcacao, horario, registro) {
  const data = registro.data;
  const diaSemana = new Date(data + "T00:00:00").getDay();

  let tipo = "";
  let inicio = "";
  let fim = "";
  let total = "";

  // 🔹 ID REAL DO REGISTRO
  const registroId = registro.id;

  // === DOMINGO (hora extra do dia inteiro)
  if (diaSemana === 0) {
      if (tipoMarcacao === "saida") {
          const entrada = registro.e1;
          if (!entrada) return;

          const saida = horario;
          const total = calcularDiferencaHoras(entrada, saida);

          filaOcorrencias.push({
              registroId,
              data,
              tipo: "Hora Extra",
              inicio: entrada,
              fim: saida,
              total,
              marcacao: "saida"
          });
      }
      return;
  }

  // Limites
  let limiteEntrada = "";
  let limiteSaida = "";

  if (diaSemana === 6) {         
      limiteEntrada = "08:00:00";
      limiteSaida = "12:00:00";
  } 
  else if (diaSemana === 5) {    
      limiteEntrada = "07:00:00";
      limiteSaida = "16:00:00";
  } 
  else {                         
      limiteEntrada = "07:00:00";
      limiteSaida = "17:00:00";
  }

  // 🔹 ENTRADA
  if (tipoMarcacao === "entrada") {
      if (horario < limiteEntrada) {
          tipo = "Hora Extra";
          inicio = horario;
          fim = limiteEntrada;
      }
      else if (horario > limiteEntrada) {
          tipo = "Atraso";
          inicio = limiteEntrada;
          fim = horario;
      } else return;
  }

  // 🔹 SAÍDA
  if (tipoMarcacao === "saida") {
      if (horario < limiteSaida) {
          tipo = "Atraso";
          inicio = horario;
          fim = limiteSaida;
      }
      else if (horario > limiteSaida) {
          tipo = "Hora Extra";
          inicio = limiteSaida;
          fim = horario;
      } else return;
  }

  total = calcularDiferencaHoras(inicio, fim);

  filaOcorrencias.push({
      registroId,
      data,
      tipo,
      inicio,
      fim,
      total,
      marcacao: tipoMarcacao
  });
}
//Cria fila para ocorrencias
function abrirProximaPopup() {
  // já existe popup aberta?
  if (popupAtiva) return;

  // fila vazia?
  if (filaOcorrencias.length === 0) return;

  // pega a primeira
  const oc = filaOcorrencias.shift();

  popupAtiva = true;
  abrirPopupOcorrencia(oc);
}
//Cria popup dinamicamente
function abrirPopupOcorrencia(oc) {

  popupAtiva = true;

  // 🔹 Ocorrências salvas
  const ocorrenciasSalvas = JSON.parse(localStorage.getItem("ocorrencias")) || [];

  // 🔹 Buscar ocorrência do mesmo registro + mesma marcação
  let ocExistente = ocorrenciasSalvas.find(o =>
      o.registroId === oc.registroId &&
      o.marcacao === oc.marcacao
  );

  if (ocExistente) {
      oc.tipo = ocExistente.tipo;
      oc.inicio = ocExistente.inicio;
      oc.fim = ocExistente.fim;
      oc.total = ocExistente.total;
  }

  // === CRIA POPUP ===
  const popup = document.createElement("div");
  popup.className = "popup-justificativa";

  popup.innerHTML = `
      <div class="popup-box">
          <h3>Ocorrência</h3>

          <table>
              <tr><td><strong>Data:</strong></td><td>${formatarDataExport(oc.data)}</td></tr>
              <tr><td><strong>Tipo:</strong></td>
                  <td style="color:${oc.tipo === "Atraso" ? "red" : "green"}">
                      ${oc.tipo}
                  </td>
              </tr>
              <tr><td><strong>Período:</strong></td><td>${oc.inicio} a ${oc.fim}</td></tr>
              <tr><td><strong>Total:</strong></td><td>${oc.total}</td></tr>
          </table>

          <textarea id="justificativa" placeholder="Justificativa"></textarea>

          <button class="btn-ok" id="btnSalvarPopup">Salvar</button>
          <button class="btn-cancelar" id="btnFecharPopup">Cancelar</button>
      </div>
  `;

  document.body.appendChild(popup);

  // Preenche justificativa existente
  if (ocExistente) {
      setTimeout(() => {
          document.getElementById("justificativa").value = ocExistente.justificativa || "";
      }, 30);
  }

  // === SALVAR ===
  document.getElementById("btnSalvarPopup").onclick = function () {
      const justificativa = document.getElementById("justificativa").value;

      let ocorrencias = JSON.parse(localStorage.getItem("ocorrencias")) || [];

      let existente = ocorrencias.find(o =>
          o.registroId === oc.registroId &&
          o.marcacao === oc.marcacao
      );

      if (existente) {
          // UPDATE
          existente.tipo = oc.tipo;
          existente.inicio = oc.inicio;
          existente.fim = oc.fim;
          existente.total = oc.total;
          existente.justificativa = justificativa;
      } else {
          // CREATE
          ocorrencias.push({
              id: crypto.randomUUID(),
              registroId: oc.registroId,
              marcacao: oc.marcacao,
              data: formatarDataExport(oc.data),
              tipo: oc.tipo,
              inicio: oc.inicio,
              fim: oc.fim,
              total: oc.total,
              usuario: usuarioLogado.nome,
              justificativa
          });
      }

      localStorage.setItem("ocorrencias", JSON.stringify(ocorrencias));
      carregarOcorrencias();
      popularFiltrosOcorrencias();

      popup.remove();
      popupAtiva = false;
      abrirProximaPopup();
  };

  // === CANCELAR ===
  document.getElementById("btnFecharPopup").onclick = function () {
      popup.remove();
      popupAtiva = false;
      abrirProximaPopup();
  };
}
//Salva na tabela de ocorrências(localStorage)
function salvarOcorrencia(oc) {
  const justificativa = document.getElementById("justificativa").value;

  let ocorrencias = JSON.parse(localStorage.getItem("ocorrencias")) || [];

  let existente = ocorrencias.find(o => o.registroId === indiceRegistroSelecionado);

  if (existente) {
      // 🔥 ATUALIZAR OCORRÊNCIA EXISTENTE
      existente.tipo = oc.tipo;
      existente.inicio = oc.inicio;
      existente.fim = oc.fim;
      existente.total = oc.total;
      existente.justificativa = justificativa;
  } else {
      // 🔥 CRIAR NOVA OCORRÊNCIA
      ocorrencias.push({
          id: crypto.randomUUID(),
          registroId: indiceRegistroSelecionado,
          data: formatarDataExport(oc.data),
          tipo: oc.tipo,
          inicio: oc.inicio,
          fim: oc.fim,
          total: oc.total,
          usuario: usuarioLogado.nome,
          justificativa
      });
  }

  localStorage.setItem("ocorrencias", JSON.stringify(ocorrencias));

  carregarOcorrencias();
  popularFiltrosOcorrencias();

  alert("Ocorrência salva com sucesso!");
}
function popularFiltrosOcorrencias() {
  const ocorrencias = JSON.parse(localStorage.getItem("ocorrencias")) || [];
  const usuario = usuarioLogado.nome;

  const anos = new Set();
  const dias = new Set();

  ocorrencias
      .filter(o => o.usuario === usuario)
      .forEach(o => {
          const [dia, mes, ano] = o.data.split("/");

          anos.add(ano);
          dias.add(dia);
      });

  // Popular anos
  const selectAno = document.getElementById("filtroAnoOc");
  selectAno.innerHTML = `<option value="">Todos</option>`;
  [...anos].sort().forEach(ano => {
      selectAno.innerHTML += `<option value="${ano}">${ano}</option>`;
  });

  // Popular dias
  const selectDia = document.getElementById("filtroDiaOc");
  selectDia.innerHTML = `<option value="">Todos</option>`;
  [...dias].sort().forEach(dia => {
      selectDia.innerHTML += `<option value="${dia}">${dia}</option>`;
  });
}
function filtrarOcorrencias() {
  const todas = JSON.parse(localStorage.getItem("ocorrencias")) || [];

  const tipo = document.getElementById("filtroTipo").value;
  const mesSel = document.getElementById("filtroMesOc").value;
  const anoSel = document.getElementById("filtroAnoOc").value;
  const diaSel = document.getElementById("filtroDiaOc").value;

  let filtradas = todas.filter(o => o.usuario === usuarioLogado.nome);

  if (tipo) filtradas = filtradas.filter(o => o.tipo === tipo);

  filtradas = filtradas.filter(o => {
      const [dia, mes, ano] = o.data.split("/");

      const okAno = anoSel === "" || anoSel === ano;
      const okMes = mesSel === "" || mesSel === mes;
      const okDia = diaSel === "" || diaSel === dia;

      return okAno && okMes && okDia;
  });

  carregarOcorrencias(filtradas);
}
function limparTodasOcorrencias() {
  const confirmar = confirm("Apagar TODAS as ocorrências?");

  if (!confirmar) return;

  localStorage.removeItem("ocorrencias");
  carregarOcorrencias();
  popularFiltrosOcorrencias();
  alert("Todas as ocorrências foram apagadas!");
}
//Carrega a tabela de ocorrências
function carregarOcorrencias(filtradas = null) {
  const todas = filtradas || JSON.parse(localStorage.getItem("ocorrencias")) || [];
  const ocorrencias = todas.filter(o => o.usuario === usuarioLogado.nome);
  const tbody = document.getElementById("listaOcorrencias");

  tbody.innerHTML = "";
  indiceOcorrenciaSelecionada = null;
  modoEdicaoOcorrencia = false;

  ocorrencias.forEach((oc, index) => {
      const tr = document.createElement("tr");
      tr.setAttribute("data-id", "Id: "+oc.id);
      tr.classList.add(oc.tipo.toLowerCase().replace(" ", "-"));

      tr.innerHTML = `
          <td>${oc.data}</td>
          <td style="font-weight:bold; color:${oc.tipo === "Atraso" ? "red" : "green"}">${oc.tipo}</td>
          <td>${oc.inicio}</td>
          <td>${oc.fim}</td>
          <td>${oc.total}</td>
          <td>${oc.usuario || "-"}</td>
          <td class="just">${oc.justificativa || "-"}</td>
      `;

      tr.onclick = () => {
        indiceOcorrenciaSelecionada = oc.id;
        atualizarBotoesOcorrencias(true);

        [...tbody.children].forEach(l => l.classList.remove("linha-selecionada"));
        tr.classList.add("linha-selecionada");

      };

      tbody.appendChild(tr);
  });
}
let indiceOcorrenciaSelecionada = null;
let modoEdicaoOcorrencia = false;
// 🔹 Controla visibilidade dos botões
function atualizarBotoesOcorrencias(ativo) {
    document.getElementById("btnExcluirOc").style.display = ativo ? "block" : "none";
    document.getElementById("btnEditarOc").style.display = ativo ? "block" : "none";
}
function importarRegistrosExcel() {
  document.getElementById("inputExcel").click();
}
function processarExcel(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Lê todos os registros da planilha
      const rows = XLSX.utils.sheet_to_json(sheet);

      let registros = JSON.parse(localStorage.getItem("registros")) || [];

      rows.forEach(row => {

          const registro = {

              id: crypto.randomUUID(),
              funcionario: row["Funcionário"] || "",
              data: converterDataExcel(row["Data"]),  // normaliza formato ISO
              e1: excelTimeToString(row["Entrada"]),
              s1: excelTimeToString(row["Saída Almoço"]),
              e2: excelTimeToString(row["Retorno Almoço"]),
              s2: excelTimeToString(row["Saída"]),
              total: excelTimeToString(row["Total"]),
              status: row["Status"] || "Finalizado"
          };

          // Verifica duplicação (mesmo funcionario + mesma data)
          const existe = registros.some(r =>
              r.funcionario === registro.funcionario &&
              r.data === registro.data
          );

          if (!existe) {
              registros.push(registro);
          }
      });

      localStorage.setItem("registros", JSON.stringify(registros));
      carregarRegistros();

      alert("Registros importados com sucesso!");
      popularAnos();
      aplicarFiltrosMesAtual();
      contarDados();
  };

  reader.readAsArrayBuffer(file);
}
function excelTimeToString(value) {
  if (typeof value !== "number") return value; // já está em string

  let totalSegundos = Math.round(value * 24 * 60 * 60);

  let horas = Math.floor(totalSegundos / 3600);
  let minutos = Math.floor((totalSegundos % 3600) / 60);
  let segundos = totalSegundos % 60;

  return [
      String(horas).padStart(2, "0"),
      String(minutos).padStart(2, "0"),
      String(segundos).padStart(2, "0")
  ].join(":");
}
function converterDataExcel(valor) {

  // 1) Se já for Date
  if (valor instanceof Date) {
      return valor.toISOString().split("T")[0];
  }

  // 2) Se vier no formato ISO (yyyy-mm-dd)
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      return valor;
  }

  // 3) Se vier como texto BR (dd/mm/yyyy)
  if (typeof valor === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
      const [d, m, a] = valor.split("/");
      return `${a}-${m}-${d}`;
  }

  // 4) Se vier como número do Excel
  if (typeof valor === "number") {
      const base = new Date(Date.UTC(1903, 11, 32)); // base correta Excel
      const dt = new Date(base.getTime() + valor * 86400000);

      const ano = dt.getUTCFullYear();
      const mes = String(dt.getUTCMonth() + 1).padStart(2, "0");
      const dia = String(dt.getUTCDate()).padStart(2, "0");

      return `${ano}-${mes}-${dia}`;
  }

  return ""; // fallback
}
function popularAnos() {
  const registros = JSON.parse(localStorage.getItem("registros")) || [];
  const usuario = usuarioLogado.nome;

  const anos = new Set();

  registros
      .filter(r => r.funcionario === usuario)
      .forEach(r => {
          if (r.data) {
              const ano = r.data.split("-")[0];
              anos.add(ano);
          }
      });

  const selectAno = document.getElementById("selectAno");
  selectAno.innerHTML = `<option value="">Todos</option>`;

  [...anos].sort().forEach(ano => {
      selectAno.innerHTML += `<option value="${ano}">${ano}</option>`;
  });
}
function processarFilaOcorrenciasSemPopup(registro) {

  let ocorrencias = JSON.parse(localStorage.getItem("ocorrencias")) || [];
  const dataBR = formatarDataExport(registro.data);
  const usuario = usuarioLogado.nome;

  // Remover ocorrências antigas desse dia
  ocorrencias = ocorrencias.filter(o => !(o.data === dataBR && o.usuario === usuario));

  // Se não tem ocorrências novas → só salvar a limpeza
  if (filaOcorrencias.length === 0) {
      localStorage.setItem("ocorrencias", JSON.stringify(ocorrencias));
      carregarOcorrencias();
      return;
  }

  // Inserir novas ocorrências (mas sem popup)
  filaOcorrencias.forEach(oc => {
      ocorrencias.push({
          id: crypto.randomUUID(),
          data: dataBR,
          tipo: oc.tipo,
          inicio: oc.inicio,
          fim: oc.fim,
          total: oc.total,
          usuario: usuario,
          justificativa: ""
      });
  });

  localStorage.setItem("ocorrencias", JSON.stringify(ocorrencias));
  carregarOcorrencias();
}
// === Logout ===
function fazerLogout() {
  const confirmar = confirm("Deseja realmente sair do sistema?");
  if (!confirmar) return;
  localStorage.removeItem("usuarioLogado");
  window.location = "login.html";
}
//Botão excluir ocorrências
document.getElementById("btnExcluirOc").onclick = function () {
  if (indiceOcorrenciaSelecionada === null) return;

  if (!confirm("Deseja excluir esta ocorrência?")) return;

  let ocorrencias = JSON.parse(localStorage.getItem("ocorrencias")) || [];

  ocorrencias = ocorrencias.filter(o => o.id !== indiceOcorrenciaSelecionada);

  localStorage.setItem("ocorrencias", JSON.stringify(ocorrencias));

  carregarOcorrencias();
  restaurarInterfaceOcorrencias();
};
//Botão editar/salvar ocorrências
document.getElementById("btnEditarOc").onclick = function () {
  if (indiceOcorrenciaSelecionada === null) return;

  const tabela = document.getElementById("listaOcorrencias");
  const linhas = tabela.querySelectorAll("tr");

  // 🔍 Encontra a linha selecionada visualmente
  const linhaSelecionada = [...linhas].find(l => l.classList.contains("linha-selecionada"));
  if (!linhaSelecionada) return alert("Nenhuma linha selecionada.");

  // 🔍 Coluna da justificativa na tabela
  const celJust = linhaSelecionada.querySelector(".just");

  const iconEditar = document.getElementById("iconEditarOc");

  // ==========================
  // 🔹 MODO → EDITAR
  // ==========================
  if (!modoEdicaoOcorrencia) {

      celJust.contentEditable = true;
      celJust.style.background = "#fff9d6";
      celJust.focus();

      iconEditar.src = "../icons/salvar.png";
      document.getElementById("btnEditarOc").title = "Salvar";
      modoEdicaoOcorrencia = true;
      return;
  }

  // ==========================
  // 🔹 MODO → SALVAR
  // ==========================
  let ocorrencias = JSON.parse(localStorage.getItem("ocorrencias")) || [];

  // 🔍 Encontra a ocorrência correta usando UUID
  const indexReal = ocorrencias.findIndex(o => o.id === indiceOcorrenciaSelecionada);
  if (indexReal === -1) {
      alert("Erro: ocorrência não encontrada.");
      return;
  }

  // 🔥 Salva a justificativa editada
  ocorrencias[indexReal].justificativa = celJust.innerText.trim();

  // 🔧 Salva no localStorage
  localStorage.setItem("ocorrencias", JSON.stringify(ocorrencias));

  // Finaliza edição visual
  celJust.contentEditable = false;
  celJust.style.background = "transparent";

  iconEditar.src = "../icons/editar.png";
  document.getElementById("btnEditarOc").title = "Editar";
  modoEdicaoOcorrencia = false;

  // Recarrega estado visual
  carregarOcorrencias();
  restaurarInterfaceOcorrencias();
};
//Botão excluir registros
document.getElementById("btnExcluirReg").onclick = function () {
  if (indiceRegistroSelecionado === null) return;

  if (!confirm("Deseja realmente excluir este registro?")) return;

  let registros = JSON.parse(localStorage.getItem("registros")) || [];

  // 🔍 Remove o registro certo pelo ID
  registros = registros.filter(r => r.id !== indiceRegistroSelecionado);

  localStorage.setItem("registros", JSON.stringify(registros));

  carregarRegistros();
  restaurarInterfacePadrao();

  alert("Registro removido com sucesso!");
};
//Botão editar/salvar registros
document.getElementById("btnEditarReg").onclick = function () {
  if (indiceRegistroSelecionado === null) return;

  const iconEditar = document.getElementById("iconEditarReg");

  // =========================
  // 🔹 MODO EDITAR
  // =========================
  if (!modoEdicaoRegistro) {

      // Guardar valores originais antes da edição
      window.valoresOriginais = {
          e1: document.getElementById("entrada1").value,
          s1: document.getElementById("saida1").value,
          e2: document.getElementById("entrada2").value,
          s2: document.getElementById("saida2").value,
      };

      ["entrada1", "saida1", "entrada2", "saida2"].forEach(id => {
          const campo = document.getElementById(id);
          campo.readOnly = false;
          campo.style.background = "#fff9d6";
      });

      modoEdicaoRegistro = true;
      iconEditar.src = "../icons/salvar.png";
      this.title = "Salvar registro";
      return;
  }

  // =========================
  // 🔹 MODO SALVAR
  // =========================
  let registros = JSON.parse(localStorage.getItem("registros")) || [];

  const indexReal = registros.findIndex(r => r.id === indiceRegistroSelecionado);
  if (indexReal === -1) {
      alert("Erro: registro não encontrado.");
      return;
  }

  const registro = registros[indexReal];

  // Valores novos da edição
  const novos = {
      e1: document.getElementById("entrada1").value,
      s1: document.getElementById("saida1").value,
      e2: document.getElementById("entrada2").value,
      s2: document.getElementById("saida2").value,
  };

  // =============================
  // 🎯 DETECTAR ALTERAÇÕES INDIVIDUAIS
  // =============================
  const alterouEntrada =
      novos.e1 !== valoresOriginais.e1 ||
      novos.s1 !== valoresOriginais.s1;

  const alterouSaida =
      novos.e2 !== valoresOriginais.e2 ||
      novos.s2 !== valoresOriginais.s2;

  // Atualiza registro
  registro.e1 = novos.e1;
  registro.s1 = novos.s1;
  registro.e2 = novos.e2;
  registro.s2 = novos.s2;

  calcularTotal();
  registro.total = document.getElementById("total").value;

  atualizarStatus();
  registro.status = document.getElementById("status").value;

  // =============================
  // 🔥 REPROCESSAR APENAS OCORRÊNCIAS ALTERADAS
  // =============================
  filaOcorrencias = []; // limpar fila

  let ocorrencias = JSON.parse(localStorage.getItem("ocorrencias")) || [];

  const dataBR = formatarDataExport(registro.data);

  // 🔹 Remover ocorrências antigas da ENTRADA
  if (alterouEntrada) {
      ocorrencias = ocorrencias.filter(o => 
          !(o.registroId === registro.id && o.marcacao === "entrada")
      );

      // Recriar
      verificarOcorrencia("entrada", registro.e1, registro);
  }

  // 🔹 Remover ocorrências antigas da SAÍDA
  if (alterouSaida) {
      ocorrencias = ocorrencias.filter(o => 
          !(o.registroId === registro.id && o.marcacao === "saida")
      );

      // Recriar
      verificarOcorrencia("saida", registro.s2, registro);
  }

  // Salvar ocorrências atualizadas
  localStorage.setItem("ocorrencias", JSON.stringify(ocorrencias));

  // =============================
  // 🔥 ABRIR POPUPS APENAS DO QUE MUDOU
  // =============================
  if (filaOcorrencias.length > 0) {
      abrirProximaPopup();
  }

  // Salvar registro atualizado
  localStorage.setItem("registros", JSON.stringify(registros));

  // Atualizar interface
  carregarRegistros(obterRegistrosFiltrados());
  restaurarInterfacePadrao();

  alert("Registro atualizado com sucesso!");
};