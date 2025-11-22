function fazerLogin() {
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();
  const msg = document.getElementById("msgErro");

  // Primeiro, busca funcionários cadastrados
  const funcionarios = JSON.parse(localStorage.getItem("funcionarios")) || [];

  // Depois, usuários padrão (fallback)
  const usuariosPadrao = [
    { email: "admin@ypetro.com", senha: "1234", nome: "Administrador", sexo: "Masculino" },
    { email: "gleidson.fig@gmail.com", senha: "1234", nome: "Gleidson Silva dos Santos", sexo: "Masculino" }
  ];

  // Junta tudo (funcionários + padrão)
  const usuarios = [...funcionarios, ...usuariosPadrao];

  // Procura o usuário pelo email/senha
  const usuario = usuarios.find(u => u.email === email && u.senha === senha);

  if (usuario) {
    localStorage.setItem("usuarioLogado", JSON.stringify(usuario));
    window.location = "registros.html";
  } else {
    msg.textContent = "E-mail ou senha incorretos.";
    msg.style.display = "block";
    document.getElementById("email").addEventListener("input", () => msg.style.display = "none");
    document.getElementById("senha").addEventListener("input", () => msg.style.display = "none");
  }
}
