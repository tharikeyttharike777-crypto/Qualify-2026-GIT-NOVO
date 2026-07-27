// Sistema de Aniversariantes - Calendário Festivo Completo & Integração Supabase/Cloud

(function () {
    "use strict";

    const state = {
        hoje: new Date(),
        periodoAtual: 'today', // 'today', 'this_month', ou '1' a '12'
        todosPeloAno: [],      // Lista completa unificada de todos os associados/titulares/dependentes
        exibidosAtual: [],
        filtros: {
            nome: "",
            idadeMin: null,
            idadeMax: null,
        }
    };

    const nomesMeses = [
        "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    // ===== Utilitários de Datas =====
    function parseDateFlexible(value) {
        try {
            if (!value && value !== 0) return null;
            if (value instanceof Date) return isNaN(value) ? null : value;
            if (typeof value === "string") {
                const raw = value.trim().split("T")[0];
                if (!raw) return null;
                // YYYY-MM-DD
                if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
                    const [y, m, d] = raw.split("-").map(Number);
                    return new Date(y, m - 1, d);
                }
                // DD/MM/YYYY ou DD/MM/YY
                const m = raw.match(/^([0-3]?\d)[\/\-]([0-1]?\d)[\/\-](\d{2,4})$/);
                if (m) {
                    const dd = parseInt(m[1], 10);
                    const mm = parseInt(m[2], 10) - 1;
                    let yy = parseInt(m[3], 10);
                    if (yy < 100) yy = yy <= 50 ? 2000 + yy : 1900 + yy;
                    return new Date(yy, mm, dd);
                }
                const fallback = new Date(raw);
                return isNaN(fallback) ? null : fallback;
            }
            return null;
        } catch(e) {
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
        return Math.max(0, age);
    }

    // ===== Carregamento Unificado do Supabase + localStorage =====
    async function loadAllPeople() {
        const pMap = new Map();

        let activeCompanyId = null;
        try {
            const activeCompanyStr = localStorage.getItem('activeCompany');
            const activeCompany = activeCompanyStr ? JSON.parse(activeCompanyStr) : null;
            if (activeCompany && activeCompany.id) activeCompanyId = String(activeCompany.id);
        } catch(e) {}
        if (!activeCompanyId) activeCompanyId = localStorage.getItem('companyId') || localStorage.getItem('activeCompanyId') || null;

        // 1. Supabase - Tabela Famílias (Titular e Dependentes)
        if (window.supabase) {
            try {
                let qFam = window.supabase.from('familias').select('*');
                if (activeCompanyId) qFam = qFam.eq('company_id', activeCompanyId);
                const { data: dataFam } = await qFam;
                if (Array.isArray(dataFam)) {
                    dataFam.forEach(f => {
                        const tit = f.titular || (f.dados ? f.dados.titular : {}) || {};
                        const fId = f.id;
                        const fNome = tit.nome || f.nome_titular || f.nome;
                        const fNasc = tit.dataNascimento || f.data_nascimento;
                        
                        if (fNome && fNasc) {
                            const dt = parseDateFlexible(fNasc);
                            if (dt) {
                                const key = `tit_${fId || fNome}`;
                                pMap.set(key, {
                                    id: fId,
                                    familiaId: fId,
                                    nome: fNome,
                                    tipo: "Titular do Plano",
                                    dataNascimento: dt,
                                    telefone: tit.telefone || f.telefone || tit.celular || "",
                                    email: tit.email || f.email || ""
                                });
                            }
                        }

                        // Dependentes
                        let deps = f.dependentes || (f.dados ? f.dados.dependentes : []);
                        if (typeof deps === 'string') { try { deps = JSON.parse(deps); } catch(e){ deps = []; } }
                        if (Array.isArray(deps)) {
                            deps.forEach((d, idx) => {
                                const dNasc = parseDateFlexible(d.dataNascimento || d.data_nascimento || d.nascimento);
                                if (d.nome && dNasc) {
                                    pMap.set(`dep_${fId}_${idx}`, {
                                        id: d.id || `${fId}_dep_${idx}`,
                                        familiaId: fId,
                                        nome: d.nome,
                                        tipo: `Dependente (${d.parentesco || 'Familiar'}) de ${fNome || 'Titular'}`,
                                        dataNascimento: dNasc,
                                        telefone: d.telefone || d.celular || tit.telefone || "",
                                        email: d.email || tit.email || ""
                                    });
                                }
                            });
                        }
                    });
                }
            } catch(e) {
                console.warn('Erro ao ler famílias no Supabase:', e);
            }

            // 2. Supabase - Tabela Associados
            try {
                let qAssocs = window.supabase.from('associados').select('*');
                if (activeCompanyId) qAssocs = qAssocs.eq('company_id', activeCompanyId);
                const { data: dataAssocs } = await qAssocs;
                if (Array.isArray(dataAssocs)) {
                    dataAssocs.forEach(a => {
                        const dt = parseDateFlexible(a.dataNascimento || a.data_nascimento || a.birthDate);
                        if (a.nome && dt) {
                            const key = `assoc_${a.id || a.cpf || a.nome}`;
                            if (!pMap.has(key)) {
                                pMap.set(key, {
                                    id: a.id,
                                    familiaId: a.familia_id || a.familiaId || null,
                                    nome: a.nome,
                                    tipo: a.tipo || "Associado",
                                    dataNascimento: dt,
                                    telefone: a.telefone || a.celular || a.whatsapp || "",
                                    email: a.email || ""
                                });
                            }
                        }
                    });
                }
            } catch(e) {}
        }

        // 3. Fallback no localStorage
        try {
            const locFamilias = JSON.parse(localStorage.getItem("familias") || "[]");
            locFamilias.forEach(f => {
                if (activeCompanyId && String(f.companyId || '') !== String(activeCompanyId) && f.companyId) return;
                const tit = f.titular || {};
                const fId = f.id || Math.random();
                if (tit.nome && tit.dataNascimento) {
                    const dt = parseDateFlexible(tit.dataNascimento);
                    if (dt && !pMap.has(`tit_${fId}`)) {
                        pMap.set(`tit_${fId}`, {
                            id: fId, familiaId: fId, nome: tit.nome, tipo: "Titular", dataNascimento: dt, telefone: tit.telefone || "", email: tit.email || ""
                        });
                    }
                }
                const deps = Array.isArray(f.dependentes) ? f.dependentes : [];
                deps.forEach((d, i) => {
                    const dt = parseDateFlexible(d.dataNascimento);
                    if (d.nome && dt) {
                        const key = `dep_loc_${fId}_${i}`;
                        if (!pMap.has(key)) {
                            pMap.set(key, {
                                id: d.id || key, familiaId: fId, nome: d.nome, tipo: `Dependente (${d.parentesco || 'Familiar'})`, dataNascimento: dt, telefone: d.telefone || tit.telefone || "", email: d.email || ""
                            });
                        }
                    }
                });
            });
        } catch(e) {}

        return Array.from(pMap.values()).map(item => {
            return {
                ...item,
                dia: item.dataNascimento.getDate(),
                mes: item.dataNascimento.getMonth() + 1,
                ano: item.dataNascimento.getFullYear(),
                dataBR: formatDateBR(item.dataNascimento),
                idade: calculateAge(item.dataNascimento)
            };
        });
    }

    // ===== UI & Renderização dos Cartões =====
    function renderCards() {
        const container = document.getElementById("birthdayCardsContainer");
        const titleEl = document.getElementById("aniversarioPageTitle");
        const statusEl = document.getElementById("filterStatus");

        if (!container) return;
        container.innerHTML = "";

        let lista = state.todosPeloAno;

        // Filtrar pelo período selecionado
        if (state.periodoAtual === 'today') {
            const d = state.hoje.getDate();
            const m = state.hoje.getMonth() + 1;
            lista = lista.filter(x => x.dia === d && x.mes === m);
            if (titleEl) titleEl.innerHTML = `🎉 Aniversariantes de Hoje (${d} de ${nomesMeses[m]})`;
        } else if (state.periodoAtual === 'this_month') {
            const m = state.hoje.getMonth() + 1;
            lista = lista.filter(x => x.mes === m);
            if (titleEl) titleEl.innerHTML = `📅 Aniversariantes do Mês de ${nomesMeses[m]}`;
        } else {
            const mesNum = parseInt(state.periodoAtual, 10);
            lista = lista.filter(x => x.mes === mesNum);
            if (titleEl) titleEl.innerHTML = `📅 Aniversariantes de ${nomesMeses[mesNum]}`;
        }

        // Aplicar filtros de texto / idade
        if (state.filtros.nome) {
            const n = state.filtros.nome.toLowerCase();
            lista = lista.filter(x => x.nome.toLowerCase().includes(n) || x.tipo.toLowerCase().includes(n));
        }
        if (state.filtros.idadeMin !== null) lista = lista.filter(x => x.idade >= state.filtros.idadeMin);
        if (state.filtros.idadeMax !== null) lista = lista.filter(x => x.idade <= state.filtros.idadeMax);

        // Ordenar por dia do mês
        lista.sort((a, b) => a.dia - b.dia);
        state.exibidosAtual = lista;

        if (statusEl) {
            statusEl.textContent = `Exibindo ${lista.length} aniversariante(s) no período selecionado`;
        }

        // Se estiver vazio
        if (lista.length === 0) {
            if (state.periodoAtual === 'today') {
                const mesAtual = state.hoje.getMonth() + 1;
                const qtdNoMes = state.todosPeloAno.filter(x => x.mes === mesAtual).length;

                container.innerHTML = `
                    <div style="grid-column: 1 / -1; background: white; padding: 45px 30px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                        <div style="font-size: 3.5rem; margin-bottom: 15px; opacity: 0.85;">🎈</div>
                        <h3 style="font-size: 1.35rem; color: #1e293b; margin: 0 0 10px 0;">Nenhum cliente assola velinhas nas próximas horas de hoje!</h3>
                        <p style="color: #64748b; font-size: 1rem; max-width: 500px; margin: 0 auto 25px auto;">Hoje é uma jornada mais tranquila! Mas que tal conferir quem são os festejados de ${nomesMeses[mesAtual]} e preparar ações especiais de fidelização?</p>
                        <button onclick="mudarParaMesAtual()" style="padding: 12px 28px; background: #0056b3; color: white; border-radius: 8px; font-weight: 700; font-size: 1rem; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(0,86,179,0.3); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                            <i class="fas fa-calendar-check" style="margin-right: 8px;"></i> Ver os ${qtdNoMes} aniversariantes de ${nomesMeses[mesAtual]}
                        </button>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div style="grid-column: 1 / -1; background: white; padding: 50px 30px; border-radius: 16px; border: 1px solid #e2e8f0; text-align: center; color: #64748b;">
                        <i class="fas fa-calendar-times" style="font-size: 3.5rem; color: #cbd5e1; margin-bottom: 15px; display: block;"></i>
                        <h3 style="font-size: 1.2rem; color: #334155; margin: 0 0 5px 0;">Nenhum aniversariante encontrado</h3>
                        <p style="font-size: 0.92rem; color: #94a3b8; margin: 0;">Não há registros para o mês ou filtro selecionado na sua base de associados.</p>
                    </div>
                `;
            }
            return;
        }

        // Renderizar Cartões Modernos e Festivos
        lista.forEach(a => {
            const isHoje = (a.dia === state.hoje.getDate() && a.mes === state.hoje.getMonth() + 1);
            
            // Botão WhatsApp
            let btnWhats = '';
            if (a.telefone) {
                const numLimpo = a.telefone.replace(/\D/g, '');
                if (numLimpo.length >= 10) {
                    const linkWa = `https://wa.me/55${numLimpo}?text=Olá ${encodeURIComponent(a.nome.split(' ')[0])}! %F0%9F%8E%89 Em nome do Clube de Planos, desejamos um feliz e abençoado aniversário!`;
                    btnWhats = `<a href="${linkWa}" target="_blank" title="Enviar Mensagem de Aniversário" style="background: #25D366; color: white; padding: 6px 14px; border-radius: 6px; font-weight: 600; font-size: 0.85rem; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(37,211,102,0.2);"><i class="fab fa-whatsapp" style="font-size: 1rem;"></i> Dar Parabéns</a>`;
                }
            }

            const card = document.createElement('div');
            card.style.cssText = `background: white; border-radius: 14px; padding: 20px; border: 2px solid ${isHoje ? '#3b82f6' : '#f1f5f9'}; box-shadow: ${isHoje ? '0 10px 25px -5px rgba(59,130,246,0.15)' : '0 4px 6px -1px rgba(0,0,0,0.03)'}; position: relative; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s;`;
            card.onmouseover = () => { card.style.transform = 'translateY(-3px)'; card.style.boxShadow = '0 12px 20px -5px rgba(0,0,0,0.08)'; };
            card.onmouseout = () => { card.style.transform = 'none'; card.style.boxShadow = isHoje ? '0 10px 25px -5px rgba(59,130,246,0.15)' : '0 4px 6px -1px rgba(0,0,0,0.03)'; };

            card.innerHTML = `
                ${isHoje ? `<div style="position: absolute; top: 0; right: 0; background: #3b82f6; color: white; font-size: 0.72rem; font-weight: 800; padding: 4px 12px; border-bottom-left-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px;">⭐ Aniversaria Hoje!</div>` : ''}
                
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 16px;">
                    <div style="width: 58px; height: 58px; border-radius: 14px; background: ${isHoje ? '#EFF6FF' : '#F8FAFC'}; color: ${isHoje ? '#2563eb' : '#475569'}; display: flex; flex-direction: column; align-items: center; justify-content: center; font-weight: 800; border: 1px solid ${isHoje ? '#bfdbfe' : '#e2e8f0'}; flex-shrink: 0;">
                        <span style="font-size: 1.35rem; line-height: 1;">${String(a.dia).padStart(2, '0')}</span>
                        <span style="font-size: 0.68rem; text-transform: uppercase; color: #64748b; margin-top: 2px;">${nomesMeses[a.mes].slice(0, 3)}</span>
                    </div>
                    <div style="overflow: hidden;">
                        <h3 style="margin: 0 0 3px 0; font-size: 1.12rem; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${a.nome}">${a.nome}</h3>
                        <span style="font-size: 0.8rem; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-weight: 600;">${a.tipo}</span>
                    </div>
                </div>

                <div style="background: #f8fafc; padding: 12px 15px; border-radius: 10px; border: 1px solid #f1f5f9; margin-bottom: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.86rem;">
                    <div>
                        <span style="color: #94a3b8; display: block; font-size: 0.75rem;">Idade</span>
                        <strong style="color: #334155; font-size: 0.95rem;">${a.idade !== null ? `${a.idade} anos` : 'Não ind.'}</strong>
                    </div>
                    <div>
                        <span style="color: #94a3b8; display: block; font-size: 0.75rem;">Telefone</span>
                        <strong style="color: #334155;">${a.telefone || '-'}</strong>
                    </div>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                    <div>${btnWhats}</div>
                    ${a.familiaId ? `<a href="nova-familia.html?id=${a.familiaId}" title="Ver cadastro da família" style="padding: 6px 12px; background: #f1f5f9; color: #475569; border-radius: 6px; font-size: 0.82rem; font-weight: 600; text-decoration: none; transition: background 0.2s;"><i class="fas fa-id-card"></i> Ficha</a>` : ''}
                </div>
            `;

            container.appendChild(card);
        });
    }

    // Função pública para o botão na tela vazia
    window.mudarParaMesAtual = function() {
        const btnMes = document.querySelector('.month-btn[data-month="this_month"]');
        if (btnMes) btnMes.click();
        else {
            state.periodoAtual = 'this_month';
            renderCards();
        }
    };

    function wireUI() {
        // Eventos dos botões de meses
        const btns = document.querySelectorAll('.month-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', function() {
                btns.forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'white';
                    b.style.color = '#64748b';
                    b.style.borderColor = '#e2e8f0';
                });
                this.classList.add('active');
                this.style.background = '#0056b3';
                this.style.color = 'white';
                this.style.borderColor = '#3b82f6';
                
                state.periodoAtual = this.dataset.month;
                renderCards();
            });
        });

        // Modais de Filtro / Opções já existentes na UI
        const filterBtn = document.getElementById("filterBtn");
        const filterModal = document.getElementById("filterModal");
        const closeFilterBtn = document.querySelector("#filterModal .modal-close") || document.getElementById("closeFilterBtn");
        const applyFilterBtn = document.querySelector("#filterModal .btn-primary") || document.getElementById("applyFilterBtn");
        const clearFilterBtn = document.querySelector("#filterModal .btn-secondary") || document.getElementById("clearFilterBtn");

        if (filterBtn && filterModal) filterBtn.addEventListener("click", () => filterModal.classList.add("active"));
        if (closeFilterBtn && filterModal) closeFilterBtn.addEventListener("click", () => filterModal.classList.remove("active"));
        
        if (applyFilterBtn) {
            applyFilterBtn.addEventListener("click", () => {
                const nameFilter = document.getElementById("nameFilter");
                state.filtros.nome = nameFilter?.value?.trim() || "";
                renderCards();
                filterModal?.classList.remove("active");
            });
        }
        if (clearFilterBtn) {
            clearFilterBtn.addEventListener("click", () => {
                state.filtros.nome = "";
                const nameFilter = document.getElementById("nameFilter");
                if (nameFilter) nameFilter.value = "";
                renderCards();
                filterModal?.classList.remove("active");
            });
        }

        // Options
        const optionsBtn = document.getElementById("optionsBtn");
        const optionsModal = document.getElementById("optionsModal");
        const closeOptionsBtn = document.querySelector("#optionsModal .modal-close");
        if (optionsBtn && optionsModal) optionsBtn.addEventListener("click", () => optionsModal.classList.add("active"));
        if (closeOptionsBtn && optionsModal) closeOptionsBtn.addEventListener("click", () => optionsModal.classList.remove("active"));
    }

    window.exportData = function() {
        if (state.exibidosAtual.length === 0) {
            alert("Nenhum aniversariante para exportar.");
            return;
        }
        const headers = ["Dia/Mês", "Nome", "Tipo", "Idade", "Telefone", "Email"];
        const rows = state.exibidosAtual.map(x => [
            `${String(x.dia).padStart(2,'0')}/${String(x.mes).padStart(2,'0')}`,
            x.nome,
            x.tipo,
            x.idade !== null ? x.idade : "",
            x.telefone || "",
            x.email || ""
        ]);
        let csv = "data:text/csv;charset=utf-8," + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
        const encodedUri = encodeURI(csv);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `aniversariantes_${state.periodoAtual}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    window.printPage = () => window.print();

    // Inicialização do módulo de aniversariantes
    document.addEventListener('DOMContentLoaded', () => {
        wireUI();
        setTimeout(async () => {
            state.todosPeloAno = await loadAllPeople();
            renderCards();
        }, 350);
    });

})();
console.log('✅ Calendário de Aniversariantes Inteligente integrado e carregado com sucesso!');