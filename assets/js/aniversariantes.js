// Sistema de Aniversariantes — Reescrito do zero, enxuto e robusto
// Objetivo: exibir clientes que fazem aniversário na data atual do usuário

(function () {
  "use strict";

  // Configuração básica e utilitários
  const state = {
    hoje: new Date(),
    todosAssociados: [],
    associadosHoje: [],
    filtros: {
      nome: "",
      idadeMin: null,
      idadeMax: null,
    },
  };

  // ===== Utilitário de Datas =====
  function parseDateFlexible(value) {
    try {
      if (!value && value !== 0) return null;

      // Firestore Timestamp
      if (value && typeof value === "object") {
        if (typeof value.toDate === "function") {
          const d = value.toDate();
          return isNaN(d) ? null : d;
        }
        // objeto com segundos/nanoseconds
        if (
          ("seconds" in value && typeof value.seconds === "number") ||
          ("_seconds" in value && typeof value._seconds === "number")
        ) {
          const seconds = value.seconds ?? value._seconds;
          const ms = seconds * 1000;
          const d = new Date(ms);
          return isNaN(d) ? null : d;
        }
        // Date nativo
        if (value instanceof Date) {
          return isNaN(value) ? null : value;
        }
      }

      // número epoch (ms)
      if (typeof value === "number") {
        const d = new Date(value);
        return isNaN(d) ? null : d;
      }

      // strings comuns
      if (typeof value === "string") {
        const raw = value.trim();
        if (!raw) return null;

        // ISO ou YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
          const d = new Date(raw);
          return isNaN(d) ? null : d;
        }

        // dd/mm/yyyy
        let m = raw.match(/^([0-3]?\d)[\/\-]([0-1]?\d)[\/\-](\d{4})$/);
        if (m) {
          const dd = parseInt(m[1], 10);
          const mm = parseInt(m[2], 10) - 1;
          const yyyy = parseInt(m[3], 10);
          const d = new Date(yyyy, mm, dd);
          return isNaN(d) ? null : d;
        }

        // dd/mm/yy — heurística de século
        m = raw.match(/^([0-3]?\d)[\/\-]([0-1]?\d)[\/\-](\d{2})$/);
        if (m) {
          const dd = parseInt(m[1], 10);
          const mm = parseInt(m[2], 10) - 1;
          const yy = parseInt(m[3], 10);
          const yyyy = yy <= 50 ? 2000 + yy : 1900 + yy;
          const d = new Date(yyyy, mm, dd);
          return isNaN(d) ? null : d;
        }

        // fallback
        const d = new Date(raw);
        return isNaN(d) ? null : d;
      }

      return null;
    } catch (e) {
      console.warn("parseDateFlexible error:", e);
      return null;
    }
  }

  function formatDateBR(date) {
    if (!(date instanceof Date) || isNaN(date)) return "";
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function calculateAge(date) {
    if (!(date instanceof Date) || isNaN(date)) return null;
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;
    return age;
  }

  function isBirthdayToday(date, today = new Date()) {
    if (!(date instanceof Date) || isNaN(date)) return false;
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth();
  }

  // ===== UI helpers =====
  function qs(sel) {
    return document.querySelector(sel);
  }
  function qsa(sel) {
    return Array.from(document.querySelectorAll(sel));
  }

  function showToast(msg, type = "info") {
    const toast = qs("#toast");
    if (!toast) {
      console[type === "error" ? "error" : "log"]("Toast:", msg);
      return;
    }
    const icon = toast.querySelector(".toast-icon");
    const message = toast.querySelector(".toast-message");
    if (icon) icon.textContent = type === "error" ? "⚠️" : type === "success" ? "✅" : "ℹ️";
    if (message) message.textContent = msg;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 3500);
  }

  function setTodayTitle() {
    const el = qs(".page-title");
    if (!el) return;
    const opts = { day: "numeric", month: "long" };
    el.textContent = `Aniversariantes de ${state.hoje.toLocaleDateString("pt-BR", opts)}`;
  }

  function renderAssociadosHoje(list) {
    const container = qs("#birthdayCardsContainer");
    if (!container) return;
    container.innerHTML = "";

    if (!list || list.length === 0) {
      container.innerHTML = `<p class="empty-text">Nenhum aniversariante hoje.</p>`;
      return;
    }

    const frag = document.createDocumentFragment();
    list.forEach((a) => {
      const card = document.createElement("div");
      card.className = "card associado-card";
      card.innerHTML = `
        <div class="card-content">
          <div class="left">
            <div class="avatar" aria-hidden="true">🎉</div>
          </div>
          <div class="right">
            <h3 class="name">${a.nome ?? "Sem nome"}</h3>
            <p class="meta">Nascimento: ${a.nascimentoBR ?? ""}${a.idade != null ? ` • ${a.idade} anos` : ""}</p>
            ${a.telefone ? `<p class="meta">Telefone: ${a.telefone}</p>` : ""}
            ${a.celular ? `<p class="meta">Celular: ${a.celular}</p>` : ""}
            ${a.email ? `<p class="meta">Email: ${a.email}</p>` : ""}
          </div>
        </div>`;
      frag.appendChild(card);
    });
    container.appendChild(frag);
  }

  // ===== Carregamento e Unificação de Dados =====
  async function loadAssociados() {
    // Tenta via userDataManager (Firestore)
    let firestoreAssociados = [];
    try {
      const udm = window.userDataManager;
      if (udm && typeof udm.getUserData === "function") {
        // Busca diretamente a coleção 'associados' da empresa ativa
        const arr = await udm.getUserData("associados", { orderBy: { field: "nome", direction: "asc" } });
        if (Array.isArray(arr)) firestoreAssociados = arr;
      }
    } catch (e) {
      console.warn("Falha ao carregar do Firestore:", e);
    }

    // Fallback extra: caminho antigo via multitenantManager (companies/.../associados)
    try {
      const mm = window.multitenantManager;
      if (mm && typeof mm.getCompanyCollection === "function") {
        const coll = mm.getCompanyCollection("associados");
        const snap = await coll.get();
        const arr = [];
        if (snap && typeof snap.forEach === "function") {
          snap.forEach((doc) => arr.push({ id: doc.id, ...doc.data() }));
        }
        if (Array.isArray(arr) && arr.length) {
          firestoreAssociados = [...arr, ...firestoreAssociados];
        }
      }
    } catch (e) {
      console.warn("Fallback companies/associados falhou:", e);
    }

    // Fallback direto: acessar caminho antigo via Firestore sem o manager
    try {
      const acObjStr = localStorage.getItem("activeCompany");
      const acObj = acObjStr ? JSON.parse(acObjStr) : null;
      const activeCompanyId = acObj?.id || localStorage.getItem("activeCompanyId") || localStorage.getItem("empresaSelecionadaId");
      if (activeCompanyId && window.firebase && firebase.firestore) {
        const snap = await firebase.firestore().collection('companies').doc(activeCompanyId).collection('associados').get();
        const arr = [];
        if (snap && typeof snap.forEach === "function") {
          snap.forEach((doc) => arr.push({ id: doc.id, ...doc.data() }));
        }
        if (Array.isArray(arr) && arr.length) {
          firestoreAssociados = [...arr, ...firestoreAssociados];
        }
      }
    } catch (e) {
      console.warn("Fallback direto companies/{id}/associados falhou:", e);
    }

    // Fallback localStorage
    let localAssociados = [];
    try {
      const raw = localStorage.getItem("associados");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) localAssociados = arr;
      }
    } catch (e) {
      console.warn("Falha ao carregar do localStorage:", e);
    }

    // Deriva associados a partir de famílias no localStorage (titular + dependentes)
    let derivadosDeFamilias = [];
    try {
      const rawF = localStorage.getItem("familias");
      if (rawF) {
        const familias = JSON.parse(rawF);
        if (Array.isArray(familias)) {
          familias.forEach((f) => {
            const baseEnd = f.endereco || {};
            const companyId = f.companyId || null;
            // Titular
            if (f.titular && (f.titular.nome || f.titular.dataNascimento)) {
              derivadosDeFamilias.push({
                id: f.titular.id || f.id || null,
                familiaId: f.id || null,
                companyId,
                tipo: "titular",
                nome: f.titular.nome,
                cpf: f.titular.cpf,
                rg: f.titular.rg,
                dataNascimento: f.titular.dataNascimento,
                telefone: f.titular.telefone,
                email: f.titular.email,
                endereco: baseEnd,
                status: f.status || "ativo",
              });
            }
            // Dependentes
            if (Array.isArray(f.dependentes)) {
              f.dependentes.forEach((d) => {
                derivadosDeFamilias.push({
                  id: d.id || null,
                  familiaId: f.id || null,
                  companyId,
                  tipo: "dependente",
                  nome: d.nome,
                  cpf: d.cpf,
                  rg: d.rg,
                  dataNascimento: d.dataNascimento,
                  telefone: d.telefone,
                  email: d.email,
                  endereco: baseEnd,
                  parentesco: d.parentesco,
                  status: d.status || "ativo",
                });
              });
            }
          });
        }
      }
    } catch (e) {
      console.warn("Falha ao derivar associados de famílias:", e);
    }

    // Unificação com prioridade para Firestore
    const map = new Map();

    const put = (x, source) => {
      const nome = x.nome?.trim() || x.name?.trim() || "";
      const nascimento = x.dataNascimento ?? x.nascimento ?? x.birthDate ?? x.date_of_birth;
      const d = parseDateFlexible(nascimento);
      const nascimentoKey = d ? `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` : String(nascimento ?? "");
      const id = x.id ?? x.uid ?? x.docId ?? null;
      const key = id ? `id:${id}` : `nm:${nome}|dt:${nascimentoKey}`;
      const prev = map.get(key);
      if (!prev || source === "fs") map.set(key, x);
    };

    localAssociados.forEach((x) => put(x, "ls"));
    derivadosDeFamilias.forEach((x) => put(x, "lsfam"));
    firestoreAssociados.forEach((x) => put(x, "fs"));

    return Array.from(map.values());
  }

  // ===== Transformação (normaliza para a UI) =====
  function normalizeAssociado(x) {
    const nome = x.nome?.trim() || x.name?.trim() || "";
    const nascimentoRaw = x.dataNascimento ?? x.nascimento ?? x.birthDate ?? x.date_of_birth;
    const nascimento = parseDateFlexible(nascimentoRaw);
    const idade = nascimento ? calculateAge(nascimento) : null;
    return {
      id: x.id ?? x.uid ?? x.docId ?? null,
      nome,
      nascimento,
      nascimentoBR: nascimento ? formatDateBR(nascimento) : "",
      idade,
      telefone: x.telefone ?? x.phone ?? "",
      celular: x.celular ?? x.mobile ?? x.whatsapp ?? "",
      email: x.email ?? "",
      raw: x,
    };
  }

  // ===== Filtros =====
  function aplicaFiltros(list) {
    let out = list;
    const { nome, idadeMin, idadeMax } = state.filtros;
    if (nome) {
      const n = nome.toLowerCase();
      out = out.filter((x) => (x.nome || "").toLowerCase().includes(n));
    }
    if (idadeMin != null) out = out.filter((x) => x.idade != null && x.idade >= idadeMin);
    if (idadeMax != null) out = out.filter((x) => x.idade != null && x.idade <= idadeMax);
    return out;
  }

  // ===== Inicialização =====
  async function init() {
    setTodayTitle();

    try {
      const associados = await loadAssociados();
      state.todosAssociados = associados.map(normalizeAssociado);

      const apenasHoje = state.todosAssociados.filter((x) => isBirthdayToday(x.nascimento, state.hoje));
      state.associadosHoje = aplicaFiltros(apenasHoje);

      renderAssociadosHoje(state.associadosHoje);
    } catch (e) {
      console.error("Erro ao inicializar aniversariantes:", e);
      showToast("Erro ao carregar aniversariantes", "error");
    }

    wireUI();
  }

  // ===== UI: eventos de filtro e opções =====
  function wireUI() {
    // Filtro modal
    const filterBtn = qs("#filterBtn");
    const filterModal = qs("#filterModal");
    const closeFilterBtn = qs("#closeFilterBtn");
    const applyFilterBtn = qs("#applyFilterBtn");
    const clearFilterBtn = qs("#clearFilterBtn");
    const nameFilter = qs("#nameFilter");
    const ageFilter = qs("#ageFilter");

    if (filterBtn && filterModal) {
      filterBtn.addEventListener("click", () => filterModal.classList.remove("hidden"));
    }
    if (closeFilterBtn && filterModal) {
      closeFilterBtn.addEventListener("click", () => filterModal.classList.add("hidden"));
    }
    if (applyFilterBtn) {
      applyFilterBtn.addEventListener("click", () => {
        state.filtros.nome = nameFilter?.value?.trim() || "";
        const ageVal = ageFilter?.value?.trim();
        if (ageVal) {
          // suporta faixas tipo "25" ou "25-35"
          const range = ageVal.split("-").map((v) => parseInt(v, 10)).filter((n) => !isNaN(n));
          if (range.length === 1) {
            state.filtros.idadeMin = range[0];
            state.filtros.idadeMax = range[0];
          } else if (range.length >= 2) {
            state.filtros.idadeMin = Math.min(range[0], range[1]);
            state.filtros.idadeMax = Math.max(range[0], range[1]);
          }
        } else {
          state.filtros.idadeMin = null;
          state.filtros.idadeMax = null;
        }

        const apenasHoje = state.todosAssociados.filter((x) => isBirthdayToday(x.nascimento, state.hoje));
        state.associadosHoje = aplicaFiltros(apenasHoje);
        renderAssociadosHoje(state.associadosHoje);
        filterModal?.classList.add("hidden");
      });
    }
    if (clearFilterBtn) {
      clearFilterBtn.addEventListener("click", () => {
        state.filtros = { nome: "", idadeMin: null, idadeMax: null };
        if (nameFilter) nameFilter.value = "";
        if (ageFilter) ageFilter.value = "";
        const apenasHoje = state.todosAssociados.filter((x) => isBirthdayToday(x.nascimento, state.hoje));
        state.associadosHoje = aplicaFiltros(apenasHoje);
        renderAssociadosHoje(state.associadosHoje);
        filterModal?.classList.add("hidden");
      });
    }

    // Opções modal
    const optionsBtn = qs("#optionsBtn");
    const optionsModal = qs("#optionsModal");
    const closeOptionsBtn = qs("#closeOptionsBtn");
    const exportBtn = qs("#exportBtn");
    const exportTodayBtn = qs("#exportTodayBtn");
    const printBtn = qs("#printBtn");
    const sendGreetingsBtn = qs("#sendGreetingsBtn");

    if (optionsBtn && optionsModal) {
      optionsBtn.addEventListener("click", () => optionsModal.classList.remove("hidden"));
    }
    if (closeOptionsBtn && optionsModal) {
      closeOptionsBtn.addEventListener("click", () => optionsModal.classList.add("hidden"));
    }
    if (exportBtn) {
      exportBtn.addEventListener("click", () => exportData(state.todosAssociados));
    }
    if (exportTodayBtn) {
      exportTodayBtn.addEventListener("click", () => exportData(state.associadosHoje));
    }
    if (printBtn) {
      printBtn.addEventListener("click", () => window.print());
    }
    if (sendGreetingsBtn) {
      sendGreetingsBtn.addEventListener("click", () => {
        showToast("Funcionalidade de cumprimentos em massa em breve.", "info");
      });
    }
  }

  // ===== Exportação =====
  function exportData(list) {
    try {
      const rows = list.map((x) => ({
        nome: x.nome,
        nascimento: x.nascimentoBR,
        idade: x.idade ?? "",
        telefone: x.telefone ?? "",
        celular: x.celular ?? "",
        email: x.email ?? "",
      }));
      const csv = [
        ["Nome", "Nascimento", "Idade", "Telefone", "Celular", "Email"].join(";"),
        ...rows.map((r) => [r.nome, r.nascimento, r.idade, r.telefone, r.celular, r.email].join(";")),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aniversariantes-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Exportação concluída", "success");
    } catch (e) {
      console.error("Exportação falhou:", e);
      showToast("Falha na exportação", "error");
    }
  }

  // ===== Boot =====
  document.addEventListener("DOMContentLoaded", init);
})();