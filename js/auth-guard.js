/* Vitrine Digital PRO 5.0.3 — autenticação + recuperação de senha */
(async () => {
  const c = window.SUPABASE_CONFIG || {};
  if (!c.url || !c.key || !window.supabase) return;

  const client = window.supabase.createClient(c.url, c.key);
  const isLogin = location.pathname.endsWith("/login.html");

  function abrirNovaSenha() {
    if (document.getElementById("vdRecovery")) return;

    const tela = document.createElement("div");
    tela.id = "vdRecovery";
    tela.style.cssText =
      "position:fixed;inset:0;z-index:99999;background:#07111f;display:grid;place-items:center;padding:20px;color:#eef6ff;font-family:system-ui,sans-serif";

    tela.innerHTML = `
      <form id="vdRecoveryForm" style="width:min(100%,430px);background:#0d1a2b;border:1px solid #1d3550;border-radius:16px;padding:24px">
        <h1>Criar nova senha</h1>
        <p>Defina sua senha de acesso ao Vitrine Digital PRO.</p>

        <input id="vdP1" type="password"
          placeholder="Nova senha"
          minlength="8" required
          style="width:100%;box-sizing:border-box;padding:12px;margin:8px 0;font-size:16px">

        <input id="vdP2" type="password"
          placeholder="Confirmar senha"
          minlength="8" required
          style="width:100%;box-sizing:border-box;padding:12px;margin:8px 0 16px;font-size:16px">

        <button id="vdSave" type="submit"
          style="padding:12px 18px;font-weight:800">
          Salvar senha
        </button>

        <div id="vdMsg" style="margin-top:14px;color:#ff9aaa"></div>
      </form>
    `;

    document.body.appendChild(tela);

    document.getElementById("vdRecoveryForm").onsubmit = async (e) => {
      e.preventDefault();

      const senha = document.getElementById("vdP1").value;
      const confirmar = document.getElementById("vdP2").value;
      const msg = document.getElementById("vdMsg");
      const botao = document.getElementById("vdSave");

      if (senha.length < 8) {
        msg.textContent = "Use pelo menos 8 caracteres.";
        return;
      }

      if (senha !== confirmar) {
        msg.textContent = "As senhas não coincidem.";
        return;
      }

      botao.disabled = true;
      botao.textContent = "Salvando...";

      const { error } = await client.auth.updateUser({
        password: senha
      });

      if (error) {
        msg.textContent = error.message;
        botao.disabled = false;
        botao.textContent = "Salvar senha";
        return;
      }

      msg.style.color = "#8ee5b2";
      msg.textContent = "Senha criada com sucesso.";

      history.replaceState({}, document.title, location.pathname);

      setTimeout(() => {
        location.replace("index.html?v=503");
      }, 700);
    };
  }

  try {
    client.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        abrirNovaSenha();
      }
    });

    const { data } = await client.auth.getSession();

    const query = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.replace(/^#/, ""));

    const recovery =
      query.get("type") === "recovery" ||
      hash.get("type") === "recovery";

    if (recovery && data?.session) {
      abrirNovaSenha();
      return;
    }

    if (!data?.session && !isLogin) {
      location.replace("login.html");
    }

  } catch (e) {
    console.error("auth guard", e);
  }
})();
