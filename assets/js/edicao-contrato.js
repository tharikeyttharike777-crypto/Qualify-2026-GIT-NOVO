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
    if (!valor && valor !== 0) return "R$ 0,00";
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function formatarData(timestamp) {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString('pt-BR');
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
    console.log("🎨 Desenhando dados na tela...", { contrato });

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
    setMulti(['ivQtdParcelas', 'svQtdParcelas'], contrato.qtd_parcelas || '-');
    setMulti(['ivTotalRecebido', 'svTotalRecebido'], formatarMoeda(contrato.total_recebido || 0));

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
    console.log("%c 🕵️ MODO SABUJO ATIVADO: Procurando seu contrato... ", "background: #000; color: #ffeb3b; font-size: 16px;");

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) return;
        const db = firebase.firestore();

        // Tenta recuperar ID da empresa de TODAS as fontes possíveis
        let companyId = localStorage.getItem('companyId')
            || localStorage.getItem('activeCompanyId')
            || localStorage.getItem('empresaSelecionadaId');

        if (!companyId) {
            try { companyId = JSON.parse(localStorage.getItem('selectedCompany'))?.id; } catch (e) { }
        }
        if (!companyId) {
            try { companyId = JSON.parse(localStorage.getItem('activeCompany'))?.id; } catch (e) { }
        }
        if (!companyId) {
            try { companyId = JSON.parse(localStorage.getItem('configCompany'))?.id; } catch (e) { }
        }

        console.log(`📍 Company ID encontrado: ${companyId || 'NENHUM'}`);

        const numeroString = numeroUrl.toString();
        const numeroNumber = parseInt(numeroUrl);

        let contratoDoc = null;

        try {
            // Preparar variações do número para busca
            const numeroSemZeros = numeroNumber.toString(); // ex: "0000001" -> "1"

            // TENTATIVA 1: Busca Direta na Empresa por ID string com zeros
            if (companyId) {
                console.log(`🔎 Tentando na empresa ${companyId} com ID: ${numeroString}...`);
                const ref = db.collection('empresas').doc(companyId).collection('contratos').doc(numeroString);
                const snap = await ref.get();
                if (snap.exists) contratoDoc = snap;
            }

            // TENTATIVA 1B: Busca Direta por ID numérico SEM zeros à esquerda
            if (!contratoDoc && companyId && numeroSemZeros !== numeroString) {
                console.log(`🔎 Tentando com ID numérico: ${numeroSemZeros}...`);
                const ref = db.collection('empresas').doc(companyId).collection('contratos').doc(numeroSemZeros);
                const snap = await ref.get();
                if (snap.exists) contratoDoc = snap;
            }

            // TENTATIVA 2: Busca por Campo 'numero' na Empresa (Caso o ID seja aleatório)
            if (!contratoDoc && companyId) {
                console.log("🔎 Tentando busca por campo 'numero' (Texto)...");
                let q = await db.collection('empresas').doc(companyId).collection('contratos')
                    .where('numero', '==', numeroString).limit(1).get();
                if (q.empty && !isNaN(numeroNumber)) {
                    console.log(`🔎 Tentando busca por campo 'numero' (Número: ${numeroNumber})...`);
                    q = await db.collection('empresas').doc(companyId).collection('contratos')
                        .where('numero', '==', numeroNumber).limit(1).get();
                    if (q.empty) {
                        console.log("🔎 Tentando busca por campo 'numero_num' (Número)...");
                        q = await db.collection('empresas').doc(companyId).collection('contratos')
                            .where('numero_num', '==', numeroNumber).limit(1).get();
                    }
                }
                if (!q.empty) contratoDoc = q.docs[0];
            }


            // TENTATIVA 3: Busca dentro das famílias (contratos são salvos como array dentro da família)
            if (!contratoDoc && companyId) {
                console.log("🔎 Tentando buscar contrato dentro das famílias...");
                try {
                    const familiasSnap = await db.collection(`empresas/${companyId}/familias`).get();
                    for (const famDoc of familiasSnap.docs) {
                        const famData = famDoc.data();
                        const contratos = Array.isArray(famData.contratos) ? famData.contratos : [];

                        // Busca por número (com ou sem zeros)
                        const contratoEncontrado = contratos.find(c => {
                            const cNumero = String(c.numero || c.id || '');
                            const cNumeroLimpo = cNumero.replace(/^0+/, ''); // Remove zeros à esquerda
                            const numeroUrlLimpo = numeroString.replace(/^0+/, '');

                            return cNumero === numeroString || // Exato
                                cNumero === numeroSemZeros || // Sem zeros no banco
                                cNumeroLimpo === numeroUrlLimpo; // Ambos sem zeros
                        });

                        if (contratoEncontrado) {
                            console.log("🎉 Contrato encontrado dentro da família:", famDoc.id);
                            // Criar um objeto que simula o documento do Firestore
                            contratoDoc = {
                                exists: true,
                                id: contratoEncontrado.id || contratoEncontrado.numero,
                                data: () => ({
                                    ...contratoEncontrado,
                                    familyId: famDoc.id,
                                    familiaId: famDoc.id,
                                    nome_titular: famData.titular?.nome || famData.titular || '',
                                    cpf: famData.titular?.cpf || contratoEncontrado.cpf || '',
                                    cpf_titular: famData.titular?.cpf || ''
                                }),
                                _familyData: famData // Guardar dados da família para uso posterior
                            };
                            break;
                        }
                    }
                } catch (famError) {
                    console.warn("⚠️ Erro ao buscar em famílias:", famError);
                }
            }

            // TENTATIVA 4: Busca GLOBAL - DESATIVADA (requer índice manual)
            // Comentado para evitar erro de índice faltando
            // Se necessário, criar índice manualmente no Firebase Console
            /*
            if (!contratoDoc) {
                try {
                    console.warn("⚠️ Não achou na empresa. Iniciando varredura global (CollectionGroup)...");
                    const qGlobal = await db.collectionGroup('contratos')
                        .where('numero', '==', numeroString).limit(1).get();
                    if (!qGlobal.empty) {
                        console.log("🎉 ACHAMOS! Estava escondido em outra coleção.");
                        contratoDoc = qGlobal.docs[0];
                    }
                } catch (idxError) {
                    console.warn("🛡️ Busca Global falhou (provável falta de índice). Ignorando para não travar.", idxError);
                }
            }
            */

            // =========================================================
            // RESULTADO DA BUSCA
            // =========================================================
            if (!contratoDoc) {
                // SE NÃO ACHAR, NÃO CRIA NADA! APENAS AVISA.
                console.error("❌ Contrato realmente não encontrado.");
                const tabela = document.getElementById('tabela-vinculados');
                if (tabela) {
                    let tbody = tabela.querySelector('tbody');
                    if (!tbody) { tbody = document.createElement('tbody'); tabela.appendChild(tbody); }
                    tbody.innerHTML = `
                        <tr><td colspan="10" class="text-center text-danger" style="padding: 20px;">
                            <strong>Erro 404: Contrato ${numeroString} não localizado.</strong><br>
                            Verifique se o cadastro foi finalizado na tela anterior.
                        </td></tr>`;
                }
                return;
            }

            // SUCESSO: CARREGA OS DADOS
            const dadosContrato = contratoDoc.data();
            console.log("✅ Dados Carregados:", dadosContrato);

            // Busca Família (ou usa dados já carregados)
            const familyId = dadosContrato.familyId || dadosContrato.familiaId;
            let dadosFamilia = {};

            // Se os dados da família já vieram junto com o contrato (busca via array)
            if (contratoDoc._familyData) {
                console.log('✅ Usando dados da família já carregados');
                dadosFamilia = contratoDoc._familyData;
            } else if (familyId) {
                // 🔧 CORREÇÃO CRÍTICA: Buscar na coleção CORRETA
                // Famílias são salvas em empresas/{companyId}/familias, não na raiz
                const companyIdForFamily = localStorage.getItem('empresaSelecionadaId') ||
                    localStorage.getItem('activeCompanyId') ||
                    companyId ||
                    'public';

                console.log(`🔍 Buscando família ${familyId} na empresa ${companyIdForFamily}...`);

                let famSnap = await db.collection(`empresas/${companyIdForFamily}/familias`).doc(familyId).get();

                // Fallback: tenta na raiz se não achar (retrocompatibilidade)
                if (!famSnap.exists) {
                    console.warn('⚠️ Família não encontrada na empresa, tentando raiz...');
                    famSnap = await db.collection('families').doc(familyId).get();
                    if (!famSnap.exists) famSnap = await db.collection('familias').doc(familyId).get();
                }

                if (famSnap.exists) {
                    dadosFamilia = famSnap.data();
                    console.log('✅ Família encontrada:', dadosFamilia);
                } else {
                    console.error(`❌ Família ${familyId} não encontrada em nenhuma coleção!`);
                }
            } else {
                console.warn("Contrato sem vínculo familiar.");
            }

            // 🔧 NORMALIZAÇÃO: Converter dataNascimento → nascimento para compatibilidade
            if (dadosFamilia && dadosFamilia.titular && typeof dadosFamilia.titular === 'object') {
                if (dadosFamilia.titular.dataNascimento && !dadosFamilia.titular.nascimento) {
                    dadosFamilia.titular.nascimento = dadosFamilia.titular.dataNascimento;
                }
            }

            // Normalizar dependentes também
            if (dadosFamilia && Array.isArray(dadosFamilia.dependentes)) {
                dadosFamilia.dependentes = dadosFamilia.dependentes.map(dep => ({
                    ...dep,
                    nascimento: dep.nascimento || dep.dataNascimento || null
                }));
            }

            // Renderizar interface
            if (dadosFamilia && (dadosFamilia.titular || dadosFamilia.dependentes)) {
                window.renderizarTabelaFamiliares(dadosFamilia);
                let nomeT = "Cliente";
                if (dadosFamilia.titular) nomeT = (typeof dadosFamilia.titular === 'object') ? dadosFamilia.titular.nome : dadosFamilia.titular;
                const h1 = document.querySelector('h1') || document.getElementById('pageTitle');
                if (h1) h1.innerHTML = `Edição do contrato de <strong>${nomeT}</strong>`;
            } else {
                window.renderizarTabelaFamiliares({});
            }

            atualizarInterfaceGlobal(dadosContrato, dadosFamilia);

        } catch (erro) {
            console.error("🔥 Erro fatal:", erro);
            alert("Erro técnico: " + erro.message);
        }
    });
}

// INICIALIZAÇÃO
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
    const numero = params.get('numero');
    if (numero) attachContractWatcher(numero);

    // Mata funções velhas
    window.fetchMembers = () => { };
    window.initFamilyRealtime = () => { };
});
