// =================================================================
// 1. UTILITÁRIOS (IDADE, MOEDA, DATA)
// =================================================================
function calcularIdade(dataNasc) {
    if (!dataNasc) return "-";
    const nasc = new Date(dataNasc);
    if (isNaN(nasc.getTime())) return "-";
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade + " anos";
}

function formatarMoeda(valor) {
    if (valor === null || valor === undefined || valor === '') return 'R$ 0,00';
    const num = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(/[^\d.,-]/g, '').replace(',', '.'));
    if (isNaN(num)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

function formatarData(timestamp) {
    if (!timestamp) return 'Não informado';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if (isNaN(date.getTime())) return 'Não informado';
        return date.toLocaleDateString('pt-BR');
    } catch (_) {
        return 'Não informado';
    }
}

/**
 * Calcula os dias restantes de carência
 * @param {string|Date} dataCadastro - Data de cadastro do membro
 * @param {number|string} diasCarencia - Dias de carência do plano (ex: 90, 180, 'padrao')
 * @param {string} carenciaStatus - Status da carência ('padrao', 'isento', ou número de dias)
 * @returns {string} - Texto formatado (ex: "45 dias", "Zerado", "Isento")
 */
function calcularCarencia(dataCadastro, diasCarencia, carenciaStatus) {
    // Se está marcado como isento
    if (carenciaStatus === 'isento' || carenciaStatus === 'Isento') {
        return 'Isento';
    }

    // Se não tem data de cadastro, não pode calcular
    if (!dataCadastro) {
        return carenciaStatus || 'padrão';
    }

    // Converte data de cadastro
    let dataInicio;
    if (typeof dataCadastro === 'string') {
        // Tenta diferentes formatos
        if (dataCadastro.includes('/')) {
            // Formato DD/MM/YYYY
            const partes = dataCadastro.split('/');
            dataInicio = new Date(partes[2], partes[1] - 1, partes[0]);
        } else {
            dataInicio = new Date(dataCadastro);
        }
    } else if (dataCadastro.toDate) {
        dataInicio = dataCadastro.toDate();
    } else {
        dataInicio = new Date(dataCadastro);
    }

    if (isNaN(dataInicio.getTime())) {
        return carenciaStatus || 'padrão';
    }

    // Determina dias de carência
    let dias = 0;
    if (typeof diasCarencia === 'number') {
        dias = diasCarencia;
    } else if (diasCarencia === 'padrao' || diasCarencia === 'padrão') {
        dias = 90; // Padrão de 90 dias se não especificado
    } else if (!isNaN(parseInt(diasCarencia))) {
        dias = parseInt(diasCarencia);
    } else {
        // Retorna o valor original se não conseguir processar
        return carenciaStatus || 'padrão';
    }

    // Calcula data fim da carência
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + dias);

    // Calcula diferença em dias
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    dataFim.setHours(0, 0, 0, 0);

    const diffMs = dataFim.getTime() - hoje.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias <= 0) {
        return 'Zerado';
    } else if (diffDias === 1) {
        return '1 dia';
    } else {
        return `${diffDias} dias`;
    }
}

// =================================================================
// 2. CÉREBRO DA INTERFACE
// =================================================================
function atualizarInterfaceGlobal(contrato, familia) {
    

    // 1. NOME NO TÍTULO
    let nomeTitular = "Cliente";
    let cpfTitular = null;

    if (familia && familia.titular) {
        if (typeof familia.titular === 'object') {
            nomeTitular = familia.titular.nome || "A Definir";
            cpfTitular = familia.titular.cpf || familia.titular.documento || null;
        } else {
            nomeTitular = familia.titular;
        }
    } else if (contrato.nome_titular) {
        nomeTitular = contrato.nome_titular;
    }

    // Tenta obter CPF do contrato se não veio da família
    if (!cpfTitular) {
        cpfTitular = contrato.cpf || contrato.cpf_titular || contrato.documento || null;
    }

    const tituloEl = document.querySelector('h1') || document.getElementById('titulo-contrato') || document.getElementById('pageTitle');
    if (tituloEl) {
        if (tituloEl.innerText.includes("Edição")) {
            tituloEl.innerHTML = `Edição do contrato de <strong>${nomeTitular}</strong>`;
        } else {
            tituloEl.innerText = nomeTitular;
        }
    }

    // Banner do titular
    const holderEl = document.getElementById('holderName');
    if (holderEl) holderEl.innerText = nomeTitular;

    // CPF do titular para cobrança PIX
    const holderCpfEl = document.getElementById('holderCpf');
    if (holderCpfEl) {
        if (cpfTitular) {
            // Formata CPF para exibição (oculta parte por segurança)
            const cpfLimpo = cpfTitular.replace(/\D/g, '');
            const cpfFormatado = cpfLimpo.length === 11
                ? `${cpfLimpo.substring(0, 3)}.***.***.${cpfLimpo.substring(9)}`
                : cpfTitular;
            holderCpfEl.innerText = cpfFormatado;
            holderCpfEl.setAttribute('data-cpf', cpfLimpo); // CPF completo para uso na cobrança
        } else {
            holderCpfEl.innerText = 'Não informado';
            holderCpfEl.setAttribute('data-cpf', '');
        }
    }

    // 2. PREENCHE OS CAMPOS DO CABEÇALHO
    const setTxt = (id, val) => {
        const el = document.getElementById(id) || document.querySelector(`[data-field="${id}"]`);
        if (el) el.innerText = val;
    };

    // Helper para múltiplos IDs
    const setMulti = (ids, val) => {
        ids.forEach(id => setTxt(id, val));
    };

    setMulti(['numero-contrato', 'ivNumero', 'cvNumero'], contrato.numero || contrato.id || '---');
    setMulti(['status-contrato', 'ivSituacao', 'svSituacao'], contrato.status || 'Em Análise');
    setMulti(['data-contrato', 'ivDataContrato', 'cvDataContrato'], formatarData(contrato.createdAt || contrato.data_contrato));
    setMulti(['valor-mensalidade', 'ivValor', 'cvValor'], formatarMoeda(contrato.valor || contrato.valor_mensalidade));
    setMulti(['plano-nome', 'ivPlano', 'cvPlano'], contrato.plano || contrato.nome_plano || 'Não definido');

    // Outros campos úteis
    setMulti(['ivTipo', 'cvTipo', 'tipo-cobranca'], contrato.tipo_cobranca || 'Boleto/Pix');
    setMulti(['ivQtdParcelas', 'svQtdParcelas'], contrato.qtd_parcelas || 'N/A');
    setMulti(['ivTotalRecebido', 'svTotalRecebido'], formatarMoeda(contrato.total_recebido));

    setMulti(['ivDesativacao', 'cvDesativacao'], formatarData(contrato.data_desativacao || contrato.desativadoEm));

    // Boolean / Status fields
    const simNao = (val) => (val === true || val === 'Sim' || val === 'sim') ? 'Sim' : (val === false || val === 'Não' || val === 'nao') ? 'Não' : 'N/A';
    setMulti(['ivEmCarencia', 'svEmCarencia'], simNao(contrato.em_carencia || contrato.carencia));
    setMulti(['ivVencido', 'svVencido'], simNao(contrato.vencido || (contrato.status || '').toLowerCase().includes('vencido')));

    setMulti(['ivPrimeiraParcela', 'svPrimeiraParcela'], formatarData(contrato.primeira_parcela || contrato.data_primeira_parcela));
    setMulti(['ivUltimaParcela', 'svUltimaParcela'], formatarData(contrato.ultima_parcela || contrato.data_ultima_parcela));

    // 3. COR DO STATUS
    const updateStatusColor = (id) => {
        const statusEl = document.getElementById(id);
        if (statusEl) {
            statusEl.className = id === 'statusIcon' ? 'status-icon' : 'chip';
            const st = (contrato.status || '').toLowerCase();
            let colorClass = 'badge-secondary';

            if (st.includes('adimplente') || st.includes('ativo')) colorClass = 'badge-success';
            else if (st.includes('vencido') || st.includes('cancelado')) colorClass = 'badge-danger';
            else colorClass = 'badge-warning';

            statusEl.classList.add(colorClass);

            if (id === 'statusIcon') {
                statusEl.innerHTML = '';
                let icon = 'fa-circle';
                if (st.includes('ativo')) icon = 'fa-check-circle';
                if (st.includes('novo')) icon = 'fa-plus-circle';
                statusEl.innerHTML = `<i class="fas ${icon}"></i> ${contrato.status || 'Novo'}`;
            }
        }
    };

    updateStatusColor('status-contrato');
    updateStatusColor('svSituacao');
    updateStatusColor('statusIcon');
}

// =================================================================
// 3. RENDERIZAÇÃO DA TABELA (COM PROTEÇÃO VISUAL)
// =================================================================
window.renderizarTabelaFamiliares = function (familiaData) {
    // tabela-vinculados é um TBODY, não uma TABLE
    const tbody = document.getElementById('tabela-vinculados');
    if (!tbody) return;
    tbody.innerHTML = ''; // Limpa o "Carregando vinculados..." e qualquer conteúdo anterior
    let listaCompleta = [];


    // Adicionar titular
    if (familiaData && familiaData.titular) {
        let nomeTitular = "";
        let nascimentoTitular = null;

        if (typeof familiaData.titular === 'object') {
            nomeTitular = familiaData.titular.nome;
            // Normalizar campo de nascimento: aceita 'nascimento' ou 'dataNascimento'
            nascimentoTitular = familiaData.titular.nascimento || familiaData.titular.dataNascimento || null;
        } else {
            nomeTitular = familiaData.titular;
        }

        if (nomeTitular && nomeTitular !== "A Definir") {
            listaCompleta.push({
                nome: nomeTitular,
                parentesco: "Titular",
                nascimento: nascimentoTitular,
                status: "Ativo"
            });
        }
    }

    // Adicionar dependentes - suporta 'dependentes', 'members' ou 'membros'
    const membros = (familiaData && (familiaData.dependentes || familiaData.members || familiaData.membros)) || [];

    // Normalizar cada membro e FILTRAR titular duplicado
    // O titular já foi adicionado acima, então ignoramos qualquer membro com parentesco "Titular"
    const membrosNormalizados = membros
        .filter(m => {
            const parentesco = (m.parentesco || '').toLowerCase();
            return parentesco !== 'titular'; // Remove duplicata do titular
        })
        .map(m => ({
            ...m,
            nascimento: m.nascimento || m.dataNascimento || null
        }));

    listaCompleta = [...listaCompleta, ...membrosNormalizados];


    if (listaCompleta.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center" style="padding: 30px; background-color: #fff3cd; color: #856404; border-radius: 8px;">
                    <i class="fas fa-exclamation-circle" style="font-size: 24px; margin-bottom: 10px;"></i><br>
                    <strong>Nenhum familiar encontrado.</strong><br>
                    Os dados do contrato existem, mas não há pessoas cadastradas na família vinculada.
                </td>
            </tr>`;
        return;
    }

    listaCompleta.forEach((m, index) => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-member-index', index);
        tr.setAttribute('data-member-nome', m.nome || m.name || 'Sem Nome');
        tr.setAttribute('data-member-parentesco', m.parentesco || 'Outro');
        tr.setAttribute('data-member-nascimento', m.nascimento || '');
        tr.setAttribute('data-member-datacadastro', m.dataCadastro || familiaData.dataCriacao || '');
        tr.setAttribute('data-member-carencia-original', m.carencia || 'padrao');

        const idade = m.nascimento ? calcularIdade(m.nascimento) : (m.idade || '-');

        // Calcula carência com base na data de cadastro
        const dataCadastroMembro = m.dataCadastro || m.dataInclusao || familiaData.dataCriacao || null;
        const carenciaCalculada = calcularCarencia(dataCadastroMembro, m.carenciaDias || 90, m.carencia);

        tr.innerHTML = `
            <td class="col-10 p-3 text-center"><button class="btn btn-sm btn-outline-warning btn-mover-para-disponiveis" title="Remover do contrato"><i class="fas fa-arrow-down"></i></button></td>
            <td class="col-30 p-3 text-left" style="font-weight: bold;">${m.nome || m.name || 'Sem Nome'}</td>
            <td class="col-15 p-3 text-center">${m.parentesco || 'Outro'}</td>
            <td class="col-10 p-3 text-center">${idade}</td>
            <td class="col-15 p-3 text-center"><span class="badge badge-success">Ativo</span></td>
            <td class="col-20 p-3 text-center">${carenciaCalculada}</td>
        `;

        // Adicionar evento de clique para mover para "Não Vinculados"
        const btnMover = tr.querySelector('.btn-mover-para-disponiveis');
        btnMover.addEventListener('click', function () {
            moverParaDisponiveis(tr);
        });

        tbody.appendChild(tr);
    });

    // Atualizar badge de contagem
    atualizarBadges();
};

// Função para mover membro de Vinculados → Não Vinculados
function moverParaDisponiveis(tr) {
    const tbodyDisponiveis = document.getElementById('tabela-disponiveis');
    if (!tbodyDisponiveis) return;

    // Limpar mensagem padrão se existir
    const msgPadrao = tbodyDisponiveis.querySelector('td[colspan]');
    if (msgPadrao) {
        tbodyDisponiveis.innerHTML = '';
    }

    // Criar nova linha para tabela de disponíveis
    const novaLinha = document.createElement('tr');
    novaLinha.setAttribute('data-member-nome', tr.getAttribute('data-member-nome'));
    novaLinha.setAttribute('data-member-parentesco', tr.getAttribute('data-member-parentesco'));
    novaLinha.setAttribute('data-member-nascimento', tr.getAttribute('data-member-nascimento'));
    novaLinha.setAttribute('data-member-carencia', tr.getAttribute('data-member-carencia'));

    const nascimento = tr.getAttribute('data-member-nascimento');
    const idade = nascimento ? calcularIdade(nascimento) : '-';

    novaLinha.innerHTML = `
        <td class="col-10 p-3 text-center"><button class="btn btn-sm btn-outline-success btn-mover-para-vinculados" title="Adicionar ao contrato"><i class="fas fa-arrow-up"></i></button></td>
        <td class="col-30 p-3 text-left" style="font-weight: bold;">${tr.getAttribute('data-member-nome')}</td>
        <td class="col-15 p-3 text-center">${tr.getAttribute('data-member-parentesco')}</td>
        <td class="col-10 p-3 text-center">${idade}</td>
        <td class="col-15 p-3 text-center"><span class="badge badge-secondary">Disponível</span></td>
        <td class="col-20 p-3 text-center">${tr.getAttribute('data-member-carencia')}</td>
    `;

    // Adicionar evento de clique para mover de volta
    const btnMover = novaLinha.querySelector('.btn-mover-para-vinculados');
    btnMover.addEventListener('click', function () {
        moverParaVinculados(novaLinha);
    });

    tbodyDisponiveis.appendChild(novaLinha);

    // Remover da tabela original
    tr.remove();

    // Verificar se tabela de vinculados ficou vazia
    verificarTabelaVazia();

    // Atualizar badges
    atualizarBadges();

    console.log('✅ Membro movido para Não Vinculados');
}

// Função para mover membro de Não Vinculados → Vinculados
function moverParaVinculados(tr) {
    const tbodyVinculados = document.getElementById('tabela-vinculados');
    if (!tbodyVinculados) return;

    // Limpar mensagem padrão se existir
    const msgPadrao = tbodyVinculados.querySelector('td[colspan]');
    if (msgPadrao) {
        tbodyVinculados.innerHTML = '';
    }

    // Criar nova linha para tabela de vinculados
    const novaLinha = document.createElement('tr');
    novaLinha.setAttribute('data-member-nome', tr.getAttribute('data-member-nome'));
    novaLinha.setAttribute('data-member-parentesco', tr.getAttribute('data-member-parentesco'));
    novaLinha.setAttribute('data-member-nascimento', tr.getAttribute('data-member-nascimento'));
    novaLinha.setAttribute('data-member-carencia', tr.getAttribute('data-member-carencia'));

    const nascimento = tr.getAttribute('data-member-nascimento');
    const idade = nascimento ? calcularIdade(nascimento) : '-';

    novaLinha.innerHTML = `
        <td class="col-10 p-3 text-center"><button class="btn btn-sm btn-outline-warning btn-mover-para-disponiveis" title="Remover do contrato"><i class="fas fa-arrow-down"></i></button></td>
        <td class="col-30 p-3 text-left" style="font-weight: bold;">${tr.getAttribute('data-member-nome')}</td>
        <td class="col-15 p-3 text-center">${tr.getAttribute('data-member-parentesco')}</td>
        <td class="col-10 p-3 text-center">${idade}</td>
        <td class="col-15 p-3 text-center"><span class="badge badge-success">Ativo</span></td>
        <td class="col-20 p-3 text-center">${tr.getAttribute('data-member-carencia')}</td>
    `;

    // Adicionar evento de clique para mover de volta
    const btnMover = novaLinha.querySelector('.btn-mover-para-disponiveis');
    btnMover.addEventListener('click', function () {
        moverParaDisponiveis(novaLinha);
    });

    tbodyVinculados.appendChild(novaLinha);

    // Remover da tabela original
    tr.remove();

    // Verificar se tabela de disponíveis ficou vazia
    verificarTabelaDisponiveisVazia();

    // Atualizar badges
    atualizarBadges();

    console.log('✅ Membro movido para Vinculados');
}

// Verificar se tabela de vinculados ficou vazia
function verificarTabelaVazia() {
    const tbody = document.getElementById('tabela-vinculados');
    if (tbody && tbody.children.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="p-6 text-center text-gray-400">
                    <i class="fas fa-info-circle"></i> Nenhum membro vinculado a este contrato
                </td>
            </tr>`;
    }
}

// Verificar se tabela de disponíveis ficou vazia
function verificarTabelaDisponiveisVazia() {
    const tbody = document.getElementById('tabela-disponiveis');
    if (tbody && tbody.children.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="p-6 text-center text-gray-400">
                    <i class="fas fa-info-circle"></i> Todos os membros da família estão vinculados a este contrato
                </td>
            </tr>`;
    }
}

// Atualizar badges de contagem
function atualizarBadges() {
    const tbodyVinculados = document.getElementById('tabela-vinculados');
    const tbodyDisponiveis = document.getElementById('tabela-disponiveis');
    const badgeVinculados = document.getElementById('badge-vinculados');
    const badgeDisponiveis = document.getElementById('badge-disponiveis');

    if (tbodyVinculados && badgeVinculados) {
        const countVinculados = tbodyVinculados.querySelectorAll('tr:not(:has(td[colspan]))').length ||
            (tbodyVinculados.querySelector('td[colspan]') ? 0 : tbodyVinculados.children.length);
        badgeVinculados.textContent = countVinculados;
    }

    if (tbodyDisponiveis && badgeDisponiveis) {
        const countDisponiveis = tbodyDisponiveis.querySelectorAll('tr:not(:has(td[colspan]))').length ||
            (tbodyDisponiveis.querySelector('td[colspan]') ? 0 : tbodyDisponiveis.children.length);
        badgeDisponiveis.textContent = countDisponiveis;
    }
}

// =================================================================
// 4. A LÓGICA DE BUSCA "SABUJO" (NÃO CRIA, SÓ PROCURA)
// =================================================================
async function attachContractWatcher(numeroUrl) {
    console.clear();
    console.log("%c ⚡ MODO SUPABASE ATIVADO: Procurando seu contrato... ", "background: #000; color: #4f46e5; font-size: 16px;");

    // Tenta recuperar ID da empresa
    const companyId = localStorage.getItem('companyId') || localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');

    const numeroString = String(numeroUrl).trim();
    const numeroNumber = parseInt(numeroUrl);
    
    console.log(`📍 Buscando Contrato: companyId=${companyId || 'NENHUM'}, numeroString='${numeroString}'`);

    try {
        // Busca Relacional no Supabase (Contrato + Família em um único Select)
        let query = window.supabase
            .from('contratos')
            .select('*, familias(*)')
            .eq('company_id', companyId);

        // Busca por número exato ou ID evitando erro de UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(numeroString);
        
        if (isUUID) {
            query = query.or(`numero.eq.${numeroString},id.eq.${numeroString}`);
        } else if (!isNaN(numeroNumber)) {
            query = query.or(`numero.eq.${numeroString},numero.eq.${numeroString.replace(/^0+/, '')}`);
        } else {
            query = query.eq('numero', numeroString);
        }

        const { data, error } = await query.maybeSingle();

        if (error) throw error;

        if (data) {
            // Adaptar objeto retornado para a estrutura esperada pela interface legada
            const contratoOriginal = {
                ...data,
                id: data.id,
                familiaId: data.familia_id,
                _familyData: data.familias // Cache dos dados da família
            };

            window.currentContract = contratoOriginal;
            window.currentFamily = data.familias;

            atualizarInterfaceGlobal(contratoOriginal, data.familias);
            if (typeof window.renderizarTabelaFamiliares === 'function') {
                window.renderizarTabelaFamiliares(data.familias);
            }

            // Ativa o Realtime para este contrato
            setupSupabaseRealtime(data.id);
        } else {
            console.warn("⚠️ Contrato não localizado no banco relacional. Tentando fallback local...");
            
            // FALLBACK LOCAL
            try {
                const familiasRaw = localStorage.getItem('familias');
                if (familiasRaw) {
                    const familiasArray = JSON.parse(familiasRaw);
                    let foundFamily = null;
                    let foundContract = null;
                    
                    for (const fam of familiasArray) {
                        if (fam.contratos && Array.isArray(fam.contratos)) {
                            const ct = fam.contratos.find(c => String(c.numero || c.id) === numeroString || String(c.numero || c.id).replace(/^0+/, '') === String(numeroNumber));
                            if (ct) {
                                foundFamily = fam;
                                foundContract = ct;
                                break;
                            }
                        }
                    }
                    
                    if (foundContract && foundFamily) {
                        console.log("✅ Contrato localizado no localStorage (modo offline/fallback)!");
                        const mockData = {
                            ...foundContract,
                            id: foundContract.id || foundContract.numero,
                            numero: foundContract.numero || foundContract.id,
                            familiaId: foundFamily.id,
                            _familyData: foundFamily
                        };
                        window.currentContract = mockData;
                        window.currentFamily = foundFamily;
                        atualizarInterfaceGlobal(mockData, foundFamily);
                        if (typeof window.renderizarTabelaFamiliares === 'function') {
                            window.renderizarTabelaFamiliares(foundFamily);
                        }
                        showToastEC('Contrato carregado do cache local.', 'info');
                        return;
                    }
                }
            } catch (fallbackErr) {
                console.error("Erro no fallback local:", fallbackErr);
            }
            
            showToastEC('Contrato não localizado.', 'error');
        }

    } catch (err) {
        console.error("❌ Erro ao buscar contrato no Supabase:", err);
        showToastEC('Erro ao carregar dados do contrato.', 'error');
    }
}

// ── FIGURA NOVA: REALTIME SUPABASE ──
function setupSupabaseRealtime(contractId) {
    window.supabase.channel(`contract-${contractId}`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'contratos',
            filter: `id=eq.${contractId}`
        }, payload => {
            
            atualizarInterfaceGlobal(payload.new, window.currentFamily);
        })
        .subscribe();
}

        // =================================================================
        // 6. TOAST NOTIFICATION
        // =================================================================
        function showToastEC(msg, type = 'success') {
            let container = document.getElementById('toastContainerEC');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toastContainerEC';
                container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:10000;display:flex;flex-direction:column;gap:8px;';
                document.body.appendChild(container);
            }
            const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
            const colors = { success: '#22c55e', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
            const toast = document.createElement('div');
            toast.style.cssText = `background:#1a1a2e;color:#fff;padding:14px 20px;border-radius:10px;font-size:14px;display:flex;align-items:center;gap:10px;min-width:280px;box-shadow:0 8px 30px rgba(0,0,0,.25);border-left:4px solid ${colors[type] || colors.info};animation:toastInEC .3s ease;`;
            toast.innerHTML = `<i class="fas ${icons[type] || icons.info}" style="color:${colors[type]}"></i> ${msg}`;
            container.appendChild(toast);
            setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 300); }, 4000);
        }
        // CSS animation
        if (!document.getElementById('toast-ec-style')) {
            const s = document.createElement('style'); s.id = 'toast-ec-style';
            s.textContent = '@keyframes toastInEC{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}';
            document.head.appendChild(s);
        }

        // =================================================================
        // 7. ABA EVENTOS — LOG DE AUDITORIA
        // =================================================================
        function getContractIds() {
            const companyId = localStorage.getItem('companyId') || localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
            const contract = window.currentContract;
            if (!companyId || !contract) return null;
            const docId = contract.id || contract.numero;
            return { companyId, contractId: docId };
        }

        async function carregarEventos() {
            const info = getContractIds();
            if (!info || !window.supabase) return;
            const tbody = document.getElementById('tbodyEventos');
            if (!tbody) return;

            try {
                const { data: eventos, error } = await window.supabase
                    .from('eventos')
                    .select('*')
                    .eq('contrato_id', info.contractId)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                tbody.innerHTML = '';

                if (!eventos || eventos.length === 0) {
                    tbody.innerHTML = `<tr class="empty-state-row"><td colspan="5" style="text-align:center;padding:40px 20px;color:#94a3b8;"><i class="fas fa-stream" style="font-size:28px;margin-bottom:8px;display:block;color:#cbd5e1;"></i>Nenhum evento registrado para este contrato.</td></tr>`;
                    return;
                }

                eventos.forEach(d => {
                    const dataStr = d.created_at ? new Date(d.created_at).toLocaleString('pt-BR') : '—';
                    const tipoBadge = {
                        'pagamento': 'badge-success',
                        'cobranca': 'badge-warning',
                        'cancelamento': 'badge-danger',
                        'emissao': 'badge-info'
                    };
                    const badgeClass = tipoBadge[(d.tipo || '').toLowerCase()] || 'badge-secondary';

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                <td class="text-center" style="padding:10px;">${dataStr}</td>
                <td class="text-center"><span class="badge ${badgeClass}" style="font-size:11px;padding:4px 8px;border-radius:6px;">${d.tipo || '—'}</span></td>
                <td style="padding:10px;">${d.descricao || '—'}</td>
                <td class="text-center">${d.valor ? 'R$ ' + parseFloat(d.valor).toFixed(2).replace('.', ',') : '—'}</td>
                <td class="text-center">${d.metodo || '—'}</td>
            `;
                    tbody.appendChild(tr);
                });
                console.log(`✅ Eventos carregados: ${eventos.length}`);
            } catch (err) {
                console.error('❌ Erro ao carregar eventos:', err);
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:#ef4444;"><i class="fas fa-exclamation-circle"></i> Erro ao carregar eventos.</td></tr>`;
            }
        }

        /**
         * Registra um evento na subcoleção 'eventos' do contrato.
         * Exportado globalmente para uso por outras partes do sistema.
         * @param {string} contratoId - ID do contrato (numero)
         * @param {Object} dadosEvento - { tipo, descricao, valor?, metodo? }
         */
        async function registrarEvento(contratoId, dadosEvento) {
            try {
                const companyId = localStorage.getItem('companyId') || localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
                if (!companyId) throw new Error('Empresa não identificada');
                if (!window.supabase) throw new Error('Supabase indisponível');
                
                // Pega user auth atual, ou 'sistema'
                let userEmail = 'sistema';
                try {
                    const { data: { user } } = await window.supabase.auth.getUser();
                    if (user) userEmail = user.email;
                } catch(e) {}
                
                const { error } = await window.supabase
                    .from('eventos')
                    .insert({
                        contrato_id: contratoId,
                        company_id: companyId,
                        tipo: dadosEvento.tipo || 'sistema',
                        descricao: dadosEvento.descricao || '',
                        valor: dadosEvento.valor || null,
                        metodo: dadosEvento.metodo || null,
                        criado_por: userEmail
                    });
                    
                if (error) throw error;
                console.log(`📝 Evento registrado: ${dadosEvento.tipo}`);
                return true;
            } catch (err) {
                console.error('❌ Erro ao registrar evento:', err);
                return false;
            }
        }
        window.registrarEvento = registrarEvento;

        // =================================================================
        // 8. ABA LEMBRETES — CRUD COM ONSNAPSHOT
        // =================================================================
        let _lembretesUnsubscribe = null;

        function carregarLembretes() {
            const info = getContractIds();
            if (!info || !window.supabase) return;
            const tbody = document.getElementById('tbodyLembretes');
            if (!tbody) return;

            // Cancelar listener anterior
            if (_lembretesUnsubscribe) { window.supabase.removeChannel(_lembretesUnsubscribe); _lembretesUnsubscribe = null; }

            const renderLembretes = async () => {
                const { data: lembretes, error } = await window.supabase
                    .from('lembretes')
                    .select('*')
                    .eq('contrato_id', info.contractId)
                    .order('created_at', { ascending: false });

                tbody.innerHTML = '';
                if (error || !lembretes || lembretes.length === 0) {
                    tbody.innerHTML = `<tr class="empty-state-row"><td colspan="4" style="text-align:center;padding:40px 20px;color:#94a3b8;"><i class="fas fa-sticky-note" style="font-size:28px;margin-bottom:8px;display:block;color:#cbd5e1;"></i>Nenhum lembrete criado. Use o formulário acima para adicionar.</td></tr>`;
                    return;
                }
                
                lembretes.forEach(d => {
                    const dataStr = d.created_at ? new Date(d.created_at).toLocaleString('pt-BR') : '—';
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                <td style="padding:10px;font-weight:600;">${d.titulo || '—'}</td>
                <td style="padding:10px;color:#64748b;">${d.descricao || '—'}</td>
                <td class="text-center" style="padding:10px;font-size:13px;">${dataStr}</td>
                <td class="text-center" style="padding:10px;">
                    <button onclick="excluirLembrete('${d.id}')" class="btn btn-sm" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:12px;" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
                    tbody.appendChild(tr);
                });
                console.log(`✅ Lembretes atualizados: ${lembretes.length}`);
            };

            renderLembretes();
            
            _lembretesUnsubscribe = window.supabase.channel(`lembretes-${info.contractId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'lembretes', filter: `contrato_id=eq.${info.contractId}` }, payload => {
                    renderLembretes();
                })
                .subscribe();
        }

        async function adicionarLembrete() {
            const titulo = (document.getElementById('remTitle')?.value || '').trim();
            const descricao = (document.getElementById('remDesc')?.value || '').trim();
            if (!titulo) { showToastEC('Informe ao menos um título.', 'warning'); return; }

            const info = getContractIds();
            if (!info || !window.supabase) { showToastEC('Contrato não identificado.', 'error'); return; }

            try {
                let userEmail = 'sistema';
                try {
                    const { data: { user } } = await window.supabase.auth.getUser();
                    if (user) userEmail = user.email;
                } catch(e) {}

                const { error } = await window.supabase
                    .from('lembretes')
                    .insert({
                        contrato_id: info.contractId,
                        company_id: info.companyId,
                        titulo,
                        descricao,
                        criado_por: userEmail
                    });
                if (error) throw error;
                
                document.getElementById('remTitle').value = '';
                document.getElementById('remDesc').value = '';
                showToastEC('Lembrete adicionado com sucesso!', 'success');
            } catch (err) {
                console.error('❌ Erro ao adicionar lembrete:', err);
                showToastEC('Erro ao salvar lembrete: ' + err.message, 'error');
            }
        }
        window.adicionarLembrete = adicionarLembrete;

        async function excluirLembrete(lembreteId) {
            if (!confirm('Deseja excluir este lembrete?')) return;
            const info = getContractIds();
            if (!info || !window.supabase) return;

            try {
                const { error } = await window.supabase
                    .from('lembretes')
                    .delete()
                    .eq('id', lembreteId);
                if (error) throw error;
                showToastEC('Lembrete excluído.', 'success');
            } catch (err) {
                console.error('❌ Erro ao excluir lembrete:', err);
                showToastEC('Erro ao excluir: ' + err.message, 'error');
            }
        }
        window.excluirLembrete = excluirLembrete;

        // =================================================================
        // 9. ABA ARQUIVOS — GERENCIADOR DE DOCUMENTOS (ONSNAPSHOT)
        // =================================================================
        let _arquivosUnsubscribe = null;

        function carregarArquivos() {
            const info = getContractIds();
            if (!info || !window.supabase) return;
            const tbody = document.getElementById('tbodyArquivos');
            if (!tbody) return;

            // Cancelar listener anterior
            if (_arquivosUnsubscribe) { window.supabase.removeChannel(_arquivosUnsubscribe); _arquivosUnsubscribe = null; }

            const renderArquivos = async () => {
                const { data: arquivos, error } = await window.supabase
                    .from('arquivos')
                    .select('*')
                    .eq('contrato_id', info.contractId)
                    .order('created_at', { ascending: false });

                tbody.innerHTML = '';
                if (error || !arquivos || arquivos.length === 0) {
                    tbody.innerHTML = `<tr class="empty-state-row"><td colspan="4" style="text-align:center;padding:40px 20px;color:#94a3b8;"><i class="fas fa-folder-open" style="font-size:28px;margin-bottom:8px;display:block;color:#cbd5e1;"></i>Nenhum arquivo vinculado a este contrato.</td></tr>`;
                    return;
                }
                
                arquivos.forEach(d => {
                    const dataStr = d.created_at ? new Date(d.created_at).toLocaleString('pt-BR') : '—';
                    const ext = (d.tipo || d.nome || '').split('.').pop().toUpperCase();
                    const iconMap = { PDF: 'fa-file-pdf', PNG: 'fa-file-image', JPG: 'fa-file-image', JPEG: 'fa-file-image', DOC: 'fa-file-word', DOCX: 'fa-file-word', XLS: 'fa-file-excel', XLSX: 'fa-file-excel' };
                    const icon = iconMap[ext] || 'fa-file';
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                <td style="padding:10px;"><i class="fas ${icon}" style="color:#6366f1;margin-right:6px;"></i> ${d.nome || 'arquivo'}</td>
                <td class="text-center" style="padding:10px;">${d.tipo || ext || '—'}</td>
                <td class="text-center" style="padding:10px;font-size:13px;">${dataStr}</td>
                <td class="text-center" style="padding:10px;">
                    ${d.url ? `<a href="${d.url}" target="_blank" class="btn btn-sm" style="background:#eef2ff;color:#4f46e5;border:1px solid #c7d2fe;border-radius:8px;padding:6px 14px;text-decoration:none;font-size:12px;font-weight:600;">
                        <i class="fas fa-download"></i> Baixar
                    </a>` : '<span style="color:#94a3b8;">—</span>'}
                </td>
            `;
                    tbody.appendChild(tr);
                });
                console.log(`✅ Arquivos atualizados em tempo real: ${arquivos.length}`);
            };

            renderArquivos();

            _arquivosUnsubscribe = window.supabase.channel(`arquivos-${info.contractId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'arquivos', filter: `contrato_id=eq.${info.contractId}` }, payload => {
                    renderArquivos();
                })
                .subscribe();
        }

        // =================================================================
        // INICIALIZAÇÃO
        // =================================================================
        document.addEventListener('DOMContentLoaded', () => {
            // Corrige Abas (Adaptado para o HTML existente: .tab + data-tab)
            const abas = document.querySelectorAll('.tab');
            abas.forEach(aba => {
                aba.addEventListener('click', (e) => {
                    e.preventDefault();
                    // Remove active de todos
                    abas.forEach(a => a.classList.remove('active'));

                    // Esconde todos os conteúdos
                    const conteudos = document.getElementById('tabsContent').children;
                    for (let i = 0; i < conteudos.length; i++) {
                        conteudos[i].style.display = 'none';
                    }

                    // Ativa a aba clicada
                    const target = e.currentTarget;
                    target.classList.add('active');

                    // Mostra o conteúdo
                    const tabId = target.getAttribute('data-tab');
                    const contentEl = document.getElementById('tab-' + tabId);
                    if (contentEl) {
                        contentEl.style.display = 'block';
                    }
                });
            });

            // Código antigo de redirecionamento para index.html removido
            // O botão Voltar agora usa o onclick definido no HTML (contratos.html)

            const params = new URLSearchParams(window.location.search);
            let numero = params.get('numero');
            
            if (!numero || numero === 'undefined' || numero === 'null') {
                numero = sessionStorage.getItem('currentContractNumero');
            }
            if (numero === 'undefined' || numero === 'null') {
                numero = null;
            }

            if (numero) {
                attachContractWatcher(numero);

                // Aguardar carregamento do contrato e inicializar abas
                const waitForContract = setInterval(() => {
                    if (window.currentContract) {
                        clearInterval(waitForContract);
                        carregarEventos();
                        carregarLembretes();
                        carregarArquivos();
                        console.log('📋 Abas Eventos/Lembretes/Arquivos inicializadas');
                    }
                }, 500);
                // Timeout de segurança
                setTimeout(() => clearInterval(waitForContract), 15000);
            } else {
                console.warn('Nenhum número de contrato informado.');
                showToastEC('Nenhum contrato selecionado para edição.', 'error');
                setTimeout(() => {
                    window.location.href = 'contratos.html';
                }, 2500);
            }

            // Mata funções velhas
            window.fetchMembers = () => { };
            window.initFamilyRealtime = () => { };

            // Bind Botão Adicionar Lembrete
            const btnAdd = document.getElementById('btnAddReminder');
            if (btnAdd) {
                btnAdd.addEventListener('click', adicionarLembrete);
            }

            // Bind Botão Contrato PDF
            const btnContrato = document.getElementById('docContrato');
            if (btnContrato) {
                btnContrato.addEventListener('click', () => {
                    if (window.generateContractPDF) {
                        window.generateContractPDF();
                    } else {
                        alert('Funcionalidade de PDF em desenvolvimento...');
                    }
                });
            }
        });

        // =================================================================
        // 10. GERAÇÃO DE PDF — DADOS DINÂMICOS + STORAGE + FIRESTORE
        // =================================================================
        window.generateContractPDF = async function () {
            console.log('🖨️ Iniciando geração profissional de PDF...');
            const contrato = window.currentContract;
            const familia = window.currentFamily;

            if (!contrato) {
                showToastEC('Dados do contrato não carregados. Aguarde...', 'warning');
                return;
            }

            // ── Estado de carregamento ──
            const btn = document.getElementById('docContrato');
            const oldBtnHTML = btn ? btn.innerHTML : '';
            if (btn) {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
                btn.style.pointerEvents = 'none';
                btn.style.opacity = '0.7';
            }
            showToastEC('Gerando e salvando documento...', 'info');

            try {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                const companyId = localStorage.getItem('companyId') || localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
                const empresaNome = localStorage.getItem('empresaSelecionadaNome') || 'QUALIFY';
                const numeroContrato = contrato.numero || contrato.id || '---';

                // ── NOVO: BUSCAR DADOS DA EMPRESA (CONTRATADA) ──
                let empresaCnpj = '';
                let razaoSocial = empresaNome || 'QUALIFY';

                // Busca dados da Empresa no PostgreSQL via Supabase
                try {
                    if (companyId) {
                        const { data: empData, error } = await window.supabase
                            .from('empresa_config') // Ajuste conforme nome da sua tabela de config
                            .select('*')
                            .eq('id', companyId)
                            .maybeSingle();

                        if (empData) {
                            empresaCnpj = empData.cnpj || '';
                            razaoSocial = empData.razao_social || empData.nome || empresaNome;
                        }
                    }
                } catch (err) { console.warn('⚠️ Erro ao buscar dados da empresa:', err); }

                // Formatar CNPJ da Empresa
                if (empresaCnpj && empresaCnpj.replace(/\D/g, '').length === 14) {
                    const clean = empresaCnpj.replace(/\D/g, '');
                    empresaCnpj = clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
                }

                // ── 1. RESOLVER DADOS DINÂMICOS (COM FALLBACKS DE TELA) ──
                let nomeTitular = 'A Definir';
                let cpfTitular = '';
                let enderecoTitular = '';
                let telefoneTitular = '';

                // Tenta resolver Nome
                if (familia && familia.titular) {
                    const tit = typeof familia.titular === 'object' ? familia.titular : { nome: familia.titular };
                    nomeTitular = tit.nome || 'A Definir';
                    cpfTitular = tit.cpf || '';
                    telefoneTitular = tit.telefone || tit.celular || '';
                } else if (contrato.nome_titular) {
                    nomeTitular = contrato.nome_titular;
                }

                // Fallback do Nome: Ler da tela se ainda estiver "A Definir"
                if (nomeTitular === 'A Definir') {
                    const h1Strong = document.querySelector('h1 strong');
                    const holderName = document.getElementById('holderName');
                    if (h1Strong && h1Strong.innerText) nomeTitular = h1Strong.innerText;
                    else if (holderName && holderName.innerText) nomeTitular = holderName.innerText;
                }

                // Tenta resolver CPF
                if (!cpfTitular) {
                    cpfTitular = contrato.cpf || contrato.cpf_titular || '';
                }
                // Fallback do CPF: Ler da tela
                if (!cpfTitular) {
                    const holderCpf = document.getElementById('holderCpf');
                    if (holderCpf) {
                        cpfTitular = holderCpf.getAttribute('data-cpf') || holderCpf.innerText || '';
                    }
                }

                // Formatar CPF
                if (cpfTitular && cpfTitular.replace(/\D/g, '').length === 11) {
                    const clean = cpfTitular.replace(/\D/g, '');
                    cpfTitular = clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                }

                // Endereço
                if (familia && familia.endereco) {
                    const e = familia.endereco;
                    const parts = [e.rua || e.logradouro || '', e.numero ? `nº ${e.numero}` : '', e.complemento || '', e.bairro || '', e.cidade || '', e.estado || e.uf || '', e.cep || ''].filter(Boolean);
                    enderecoTitular = parts.join(', ');
                }
                // Fallback Endereço: Ler da tela (se houver campo id="cvEndereco")
                if (!enderecoTitular) {
                    const addrEl = document.getElementById('cvEndereco') || document.getElementById('ivEndereco');
                    if (addrEl && addrEl.innerText && addrEl.innerText !== '—' && addrEl.innerText !== 'Não informado') {
                        enderecoTitular = addrEl.innerText;
                    }
                }

                // Plano e valor (NaN-safe)
                const nomePlano = contrato.plano || contrato.nome_plano || 'Padrão';
                const valorParsed = parseFloat(String(contrato.valor || contrato.valor_mensalidade || '0').replace(/[^\d.,-]/g, '').replace(',', '.'));
                const valorRaw = isNaN(valorParsed) ? 0 : valorParsed;
                const valorFormatado = valorRaw.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                const tipoCobranca = contrato.tipo_cobranca || 'Boleto/PIX';

                // Data do contrato
                let dataContrato = new Date().toLocaleDateString('pt-BR');
                try {
                    if (contrato.createdAt) {
                        const dt = contrato.createdAt.toDate ? contrato.createdAt.toDate() : new Date(contrato.createdAt);
                        dataContrato = dt.toLocaleDateString('pt-BR');
                    } else if (contrato.data_contrato) {
                        dataContrato = new Date(contrato.data_contrato).toLocaleDateString('pt-BR');
                    }
                } catch (_) { /* usa data atual */ }

                // Dependentes
                const dependentes = [];
                if (familia) {
                    const membros = familia.dependentes || familia.members || familia.membros || [];
                    membros.forEach(m => {
                        if ((m.parentesco || '').toLowerCase() !== 'titular') {
                            dependentes.push({
                                nome: m.nome || m.name || 'Sem Nome',
                                parentesco: m.parentesco || 'Dependente',
                                nascimento: m.nascimento || m.dataNascimento || ''
                            });
                        }
                    });
                }

                // ── 2. BUSCAR CLÁUSULAS DO PLANO ──
                let clausulasTexto = [
                    '1. O presente contrato tem vigência conforme período estipulado, podendo ser renovado automaticamente.',
                    '2. O CONTRATANTE se compromete a manter os pagamentos em dia conforme modalidade escolhida.',
                    '3. Os serviços serão prestados conforme especificações do plano contratado.',
                    '4. O cancelamento deve ser solicitado com no mínimo 30 (trinta) dias de antecedência.',
                    '5. Em caso de inadimplência superior a 60 dias, o contrato poderá ser suspenso.',
                    '6. Ambas as partes concordam com as condições aqui estabelecidas, firmando o presente instrumento.'
                ].join('\n');

                try {
                    if (companyId && nomePlano) {
                        const { data: planos, error } = await window.supabase
                            .from('planos')
                            .select('*')
                            .eq('company_id', companyId)
                            .eq('nome', nomePlano)
                            .limit(1);

                        if (planos && planos.length > 0) {
                            const planoData = planos[0];
                            const source = planoData.clausulas || planoData.contrato || planoData.descricao;
                            if (source) clausulasTexto = source;
                        }
                    }
                } catch (err) {
                    console.warn('⚠️ Erro ao buscar cláusulas no Supabase:', err);
                }

                // ── 3. CONSTRUIR PDF PROFISSIONAL ──
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                const margin = 20;
                const maxW = pageWidth - margin * 2;
                let y = 15;

                // Função helper para adicionar página se necessário
                function checkPage(needed) {
                    if (y + needed > pageHeight - 25) {
                        doc.addPage();
                        y = 20;
                    }
                }

                // ── CABEÇALHO ──
                // Linha decorativa superior
                doc.setDrawColor(79, 70, 229); // indigo
                doc.setLineWidth(1.5);
                doc.line(margin, y, pageWidth - margin, y);
                y += 8;

                // Empresa
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(79, 70, 229);
                doc.text(razaoSocial.toUpperCase(), margin, y);

                if (empresaCnpj) {
                    y += 4;
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'normal');
                    doc.text(`CNPJ: ${empresaCnpj}`, margin, y);
                }

                // Data de emissão no canto direito
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(120);
                y -= empresaCnpj ? 4 : 0; // Alinha com o nome se não houver CNPJ
                doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, y, { align: 'right' });
                y += empresaCnpj ? 10 : 10;

                // Título
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(16);
                doc.setTextColor(30);
                doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', pageWidth / 2, y, { align: 'center' });
                y += 5;

                // Subtítulo
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(100);
                doc.text(`Contrato nº ${numeroContrato} — Plano ${nomePlano}`, pageWidth / 2, y, { align: 'center' });
                y += 10;

                // Linha após título
                doc.setDrawColor(200);
                doc.setLineWidth(0.3);
                doc.line(margin, y, pageWidth - margin, y);
                y += 8;

                // ── BOX: DADOS DAS PARTES ──
                doc.setFillColor(248, 250, 252); // slate-50
                doc.setDrawColor(226, 232, 240); // slate-200
                doc.setLineWidth(0.5);
                const boxH = enderecoTitular ? 52 : 42;
                doc.roundedRect(margin, y, maxW, boxH, 3, 3, 'FD');

                let bx = margin + 8;
                let by = y + 8;

                // Label "CONTRATANTE"
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7);
                doc.setTextColor(100);
                doc.text('CONTRATANTE', bx, by);
                by += 5;

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(30);
                doc.text(nomeTitular.toUpperCase(), bx, by);
                by += 6;

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(60);
                doc.text(`CPF/CNPJ: ${cpfTitular || 'Não informado'}`, bx, by);
                if (telefoneTitular) {
                    doc.text(`Tel.: ${telefoneTitular}`, bx + 80, by);
                }
                by += 5;

                if (enderecoTitular) {
                    const endLines = doc.splitTextToSize(`Endereço: ${enderecoTitular}`, maxW - 16);
                    doc.text(endLines, bx, by);
                    by += endLines.length * 4;
                }

                // Dados do contrato no lado direito do box
                const rx = pageWidth - margin - 8;
                let ry = y + 8;
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7);
                doc.setTextColor(100);
                doc.text('CONTRATO', rx, ry, { align: 'right' });
                ry += 5;
                doc.setFontSize(9);
                doc.setTextColor(30);
                doc.text(`Nº ${numeroContrato}`, rx, ry, { align: 'right' });
                ry += 5;
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(60);
                doc.text(`Data: ${dataContrato}`, rx, ry, { align: 'right' });
                ry += 5;
                doc.text(`Valor: ${valorFormatado}/mês`, rx, ry, { align: 'right' });
                ry += 5;
                doc.text(`Cobrança: ${tipoCobranca}`, rx, ry, { align: 'right' });

                y += boxH + 10;

                // ── SEÇÃO 1: DO OBJETO ──
                checkPage(30);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(30);
                doc.text('1. DO OBJETO', margin, y);
                y += 6;

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(50);
                const textoObjeto = `O presente contrato tem por objeto a prestação de serviços de ${nomePlano}, celebrado entre ${razaoSocial} ("CONTRATADA"), inscrita no CNPJ sob nº ${empresaCnpj || 'não informado'}, e ${nomeTitular} ("CONTRATANTE"), CPF/CNPJ ${cpfTitular || 'não informado'}, sob o valor mensal de ${valorFormatado}, com cobrança via ${tipoCobranca.toLowerCase()}, conforme condições abaixo estabelecidas.`;
                const objLines = doc.splitTextToSize(textoObjeto, maxW);
                doc.text(objLines, margin, y);
                y += objLines.length * 4.5 + 6;

                // ── SEÇÃO 2: DEPENDENTES (se houver) ──
                if (dependentes.length > 0) {
                    checkPage(20 + dependentes.length * 8);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(11);
                    doc.setTextColor(30);
                    doc.text('2. DOS BENEFICIÁRIOS / DEPENDENTES', margin, y);
                    y += 6;

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9);
                    doc.setTextColor(50);
                    doc.text(`Os seguintes dependentes estão cobertos por este contrato:`, margin, y);
                    y += 5;

                    // Tabela com autoTable
                    const tableData = dependentes.map((dep, i) => [
                        (i + 1).toString(),
                        dep.nome,
                        dep.parentesco,
                        dep.nascimento || '—'
                    ]);

                    doc.autoTable({
                        startY: y,
                        head: [['#', 'Nome Completo', 'Parentesco', 'Data Nasc.']],
                        body: tableData,
                        margin: { left: margin, right: margin },
                        styles: { fontSize: 8, cellPadding: 3, textColor: [50, 50, 50] },
                        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
                        alternateRowStyles: { fillColor: [248, 250, 252] },
                        theme: 'grid'
                    });
                    y = doc.lastAutoTable.finalY + 8;
                }

                // ── SEÇÃO 3: CLÁUSULAS ──
                const clausulaNumero = dependentes.length > 0 ? '3' : '2';
                checkPage(20);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(30);
                doc.text(`${clausulaNumero}. DAS CONDIÇÕES GERAIS E CLÁUSULAS`, margin, y);
                y += 6;

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8.5);
                doc.setTextColor(50);

                let textoLimpo = clausulasTexto.replace(/<[^>]*>?/gm, '');
                const clausLines = doc.splitTextToSize(textoLimpo, maxW);

                // Paginação para cláusulas longas
                for (let i = 0; i < clausLines.length; i++) {
                    checkPage(5);
                    doc.text(clausLines[i], margin, y);
                    y += 4;
                }
                y += 8;

                // ── SEÇÃO: FORO ──
                const foroNumero = parseInt(clausulaNumero) + 1;
                checkPage(20);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(30);
                doc.text(`${foroNumero}. DO FORO`, margin, y);
                y += 6;

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(50);
                const foroTexto = `Para dirimir quaisquer dúvidas oriundas deste contrato, as partes elegem o foro da comarca do domicílio da CONTRATADA, com renúncia expressa de qualquer outro, por mais privilegiado que seja.`;
                const foroLines = doc.splitTextToSize(foroTexto, maxW);
                doc.text(foroLines, margin, y);
                y += foroLines.length * 4.5 + 6;

                // ── ASSINATURAS ──
                checkPage(50);
                y += 12;

                // Data por extenso
                const hoje = new Date();
                const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
                const dataExtenso = `${hoje.getDate()} de ${meses[hoje.getMonth()]} de ${hoje.getFullYear()}`;

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(50);
                doc.text(`Local e data: _______________, ${dataExtenso}.`, pageWidth / 2, y, { align: 'center' });
                y += 18;

                // Linha assinatura Contratante
                const sigWidth = 72;
                const sigLeftX = margin + 10;
                const sigRightX = pageWidth - margin - sigWidth - 10;

                doc.setDrawColor(80);
                doc.setLineWidth(0.4);
                doc.line(sigLeftX, y, sigLeftX + sigWidth, y);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text('CONTRATANTE', sigLeftX + sigWidth / 2, y + 5, { align: 'center' });
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.text(nomeTitular.substring(0, 40), sigLeftX + sigWidth / 2, y + 9, { align: 'center' });
                if (cpfTitular) doc.text(`CPF: ${cpfTitular}`, sigLeftX + sigWidth / 2, y + 13, { align: 'center' });

                // Linha assinatura Contratada
                doc.setLineWidth(0.4);
                doc.line(sigRightX, y, sigRightX + sigWidth, y);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.text('CONTRATADA', sigRightX + sigWidth / 2, y + 5, { align: 'center' });
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.text(razaoSocial.substring(0, 40).toUpperCase(), sigRightX + sigWidth / 2, y + 9, { align: 'center' });
                if (empresaCnpj) {
                    doc.text(`CNPJ: ${empresaCnpj}`, sigRightX + sigWidth / 2, y + 13, { align: 'center' });
                }

                // ── RODAPÉ em todas as páginas ──
                const totalPages = doc.internal.getNumberOfPages();
                for (let p = 1; p <= totalPages; p++) {
                    doc.setPage(p);

                    // Linha decorativa inferior
                    doc.setDrawColor(79, 70, 229);
                    doc.setLineWidth(0.8);
                    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7);
                    doc.setTextColor(140);
                    doc.text(`Contrato nº ${numeroContrato} — ${razaoSocial}`, margin, pageHeight - 10);
                    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
                }

                // ── 4. DOWNLOAD LOCAL ──
                const nomeArquivo = `Contrato_${numeroContrato}.pdf`;
                doc.save(nomeArquivo);

                // ── 5. UPLOAD PARA SUPABASE STORAGE (FASE 4) ──
                try {
                    console.log('📤 Fazendo upload do PDF para o Supabase Storage...');
                    const pdfBlob = doc.output('blob');
                    const path = `${companyId}/${contrato.id}/${nomeArquivo}`;

                    const { data: storageData, error: storageError } = await window.supabase.storage
                        .from('contratos')
                        .upload(path, pdfBlob, { upsert: true });

                    if (storageError) throw storageError;

                    // Obter URL Pública
                    const { data: { publicUrl } } = window.supabase.storage
                        .from('contratos')
                        .getPublicUrl(path);

                    // Registrar na tabela arquivos_contrato
                    await window.supabase
                        .from('arquivos_contrato')
                        .insert({
                            contrato_id: contrato.id,
                            nome_arquivo: nomeArquivo,
                            url_publica: publicUrl,
                            tipo_arquivo: 'pdf',
                            tamanho_bytes: pdfBlob.size
                        });

                    console.log('✅ PDF salvo com sucesso no Storage e Banco de Dados.');
                } catch (upErr) {
                    console.warn('⚠️ Falha no upload automático do PDF (mas o download local funcionou):', upErr);
                    showToastEC('PDF baixado, mas erro ao salvar na nuvem.', 'warning');
                }

                showToastEC('Contrato gerado com sucesso! Download iniciado.', 'success');
                console.log(`🎉 PDF gerado e baixado: ${nomeArquivo}`);

            } catch (e) {
                console.error('❌ Erro na geração do PDF:', e);
                showToastEC('Erro ao gerar contrato: ' + e.message, 'error');
            } finally {
                if (btn) {
                    btn.innerHTML = oldBtnHTML;
                    btn.style.pointerEvents = '';
                    btn.style.opacity = '';
                }
            }
        };
