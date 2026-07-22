/**
 * Sistema de Cobranças - Integração com Asaas (PIX, Boleto, Cartão de Crédito)
 * Gerencia a criação, visualização e pagamento de cobranças
 * 
 * CORREÇÕES:
 * - salvarCobrancaFirestore: usa caminho direto sem depender de multitenantConfig
 * - Novo: Suporte a assinatura via Link de Pagamento (Cartão de Crédito)
 */

(function () {
    'use strict';

    // URL do Backend
    const API_BASE = window.location.hostname === 'localhost'
        ? 'http://localhost:4570/api'
        : 'https://qualify-2026.onrender.com/api';

    // Estado global
    let currentContract = null;

    // Elementos DOM
    const $ = id => document.getElementById(id);

    /**
     * Obtém o ID da empresa ativa (busca dinâmica)
     */
    function getEmpresaId() {
        // Tenta múltiplas fontes
        let id = localStorage.getItem('empresaSelecionadaId') ||
            localStorage.getItem('activeCompanyId') ||
            localStorage.getItem('companyId');

        // Tenta também do multitenantConfig se disponível
        if (!id && window.multitenantConfig && window.multitenantConfig.getActiveCompany) {
            const company = window.multitenantConfig.getActiveCompany();
            if (company && company.id) {
                id = company.id;
            }
        }

        console.log('🏢 Empresa ID obtido:', id);
        return id;
    }

    // Inicialização
    document.addEventListener('DOMContentLoaded', function () {
        console.log('🔄 Inicializando sistema de cobranças... [VERSÃO: FIX-BOLETO-FINAL-V2]');


        // Bind dos eventos
        bindChargeEvents();
        bindModalEvents();

        // Carrega cobranças ao iniciar (se empresaId disponível)
        setTimeout(() => {
            const empresaId = getEmpresaId();
            if (empresaId) {
                carregarCobrancasContrato(empresaId);
            }
        }, 1000);

        console.log('✅ Sistema de cobranças inicializado');
    });

    /**
     * Carrega cobranças do Firestore e popula as tabelas
     * @param {string} empresaId - ID da empresa
     */
    async function carregarCobrancasContrato(empresaId, contratoNumeroOverride = null) {
        

        if (!empresaId) {
            empresaId = getEmpresaId();
        }

        if (!empresaId) {
            console.warn('⚠️ Nenhum empresaId disponível para carregar cobranças');
            return;
        }

        const tblAbertas = document.getElementById('tblAbertas');
        const tblPagas = document.getElementById('tblPagas');

        if (!tblAbertas || !tblPagas) {
            console.warn('⚠️ Tabelas de cobranças não encontradas no DOM');
            return;
        }

        const tbodyAbertas = tblAbertas.querySelector('tbody');
        const tbodyPagas = tblPagas.querySelector('tbody');

        // Mostra loading
        tbodyAbertas.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#666;"><i class="fas fa-spinner fa-spin"></i> Carregando...</td></tr>';
        tbodyPagas.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#666;"><i class="fas fa-spinner fa-spin"></i> Carregando...</td></tr>';

        try {
            if (!window.supabase) {
                throw new Error('Supabase não disponível');
            }

            let query = window.supabase
                .from('cobrancas')
                .select('*')
                .eq('company_id', empresaId);

            // FILTRO POR CONTRATO (CRÍTICO)
            const params = new URLSearchParams(window.location.search);
            const numeroContrato = contratoNumeroOverride || params.get('numero');

            if (numeroContrato) {
                
                query = query.eq('contrato_numero', String(numeroContrato));
            }

            const { data: cobrancasData, error } = await query;

            if (error) throw error;

            const cobrancasAbertas = [];
            const cobrancasPagas = [];

            (cobrancasData || []).forEach(data => {
                const status = (data.status || '').toUpperCase();
                // Classifica por status
                if (status === 'RECEIVED' || status === 'CONFIRMED' || status === 'PAGO' || status === 'PAID') {
                    cobrancasPagas.push(data);
                } else {
                    cobrancasAbertas.push(data);
                }
            });

            console.log(`✅ Cobranças carregadas: ${cobrancasAbertas.length} abertas, ${cobrancasPagas.length} pagas`);

            // Ordenação Cronológica (Data de Vencimento ASC)
            // Ordenação Cronológica (Data de Vencimento ASC) - STRING COMPARISON (Mais seguro)
            const sorter = (a, b) => {
                const dA = String(a.vencimento || '2999-12-31').substring(0, 10);
                const dB = String(b.vencimento || '2999-12-31').substring(0, 10);
                if (dA < dB) return -1;
                if (dA > dB) return 1;
                return 0;
            };

            cobrancasAbertas.sort(sorter);
            cobrancasPagas.sort((a, b) => {
                // Pagas ordenadas por data de pagamento (desc ou asc? Geralmente mais recentes primeiro)
                // Mas o usuário pediu "hierarquico; mês 1, mês 2...", então vamos manter vencimento também ou dataPagamento ASC
                const dA = new Date(a.dataPagamento || a.vencimento || '1970-01-01');
                const dB = new Date(b.dataPagamento || b.vencimento || '1970-01-01');
                return dA - dB;
            });

            // Renderiza cobranças em aberto
            renderizarTabelaCobranças(tbodyAbertas, cobrancasAbertas, 'aberta');

            // Renderiza cobranças pagas
            renderizarTabelaCobranças(tbodyPagas, cobrancasPagas, 'paga');

        } catch (error) {
            console.error('❌ Erro ao carregar cobranças:', error);
            tbodyAbertas.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#dc3545;">Erro ao carregar cobranças</td></tr>';
            tbodyPagas.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#dc3545;">Erro ao carregar cobranças</td></tr>';
        }
    }

    /**
     * Renderiza tabela de cobranças
     */
    function renderizarTabelaCobranças(tbody, cobrancas, tipo) {
        if (cobrancas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#999;">Nenhuma cobrança ${tipo === 'aberta' ? 'em aberto' : 'paga'}</td></tr>`;
            return;
        }

        tbody.innerHTML = '';

        cobrancas.forEach((cob, index) => {
            const tr = document.createElement('tr');

            // Formata valor
            const valor = parseFloat(cob.valor || 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            });

            // Formata data
            let dataFormatada = '-';
            if (cob.vencimento) {
                const dataVenc = new Date(cob.vencimento + 'T00:00:00');
                dataFormatada = dataVenc.toLocaleDateString('pt-BR');
            }

            // Ícone do tipo
            const tipoIcone = getTipoIcone(cob.tipo || cob.billingType);

            // Status badge
            const statusBadge = getStatusBadge(cob.status);

            if (tipo === 'aberta') {
                // ============================================
                // LÓGICA À PROVA DE FALHAS - NUNCA FICA VAZIO
                // ============================================
                let acoesHTML = '';

                // Normaliza o tipo de cobrança
                const tipoRaw = cob.billingType || cob.tipo || cob.metodoPagamento || '';
                const billingType = tipoRaw.toUpperCase();

                // ============================================
                // DETECTOR UNIVERSAL DE ID DO ASAAS
                // ============================================
                // Tenta achar o ID em qualquer variação possível
                const idReal = cob.paymentId || cob.asaasPaymentId || cob.asaasId || cob.invoiceId || null;

                // Monta link com prioridade: URL salva > construir com ID
                let linkPagamento = cob.bankSlipUrl || cob.invoiceUrl || cob.linkPagamento;
                if (!linkPagamento && idReal) {
                    linkPagamento = `https://www.asaas.com/i/${idReal}`;
                }

                // LOG DE RAIO-X para debug
                console.log('📋 LINHA:', { billingType, tipoRaw, idReal, linkPagamento, campos: Object.keys(cob) });


                // ============================================
                // DETECÇÃO POR INCLUDES (mais flexível)
                // ============================================
                if (billingType.includes('BOLETO')) {
                    // ========== BOLETO ==========
                    if (linkPagamento) {
                        acoesHTML = `
                            <a href="${linkPagamento}" target="_blank" class="btn btn-sm" style="background:#ff6b35; color:white; padding:6px 12px; border-radius:6px; text-decoration:none; display:inline-flex; align-items:center; gap:4px;" title="Visualizar/Imprimir Boleto">
                                <i class="fas fa-file-pdf"></i> Boleto
                            </a>
                        `;
                    } else {
                        // SEM ID = Botão desabilitado
                        acoesHTML = `
                            <span class="btn btn-sm" style="background:#999; color:white; padding:6px 12px; border-radius:6px; cursor:not-allowed; opacity:0.7;" title="ID de pagamento não encontrado">
                                <i class="fas fa-exclamation-triangle"></i> Sem ID
                            </span>
                        `;
                    }
                } else if (billingType.includes('PIX')) {
                    // ========== PIX ==========
                    if (cob.pixCopiaECola) {
                        acoesHTML += `
                            <button class="btn btn-sm" style="background:#00c853; color:white; padding:6px 10px; border-radius:6px; border:none; cursor:pointer;" onclick="copiarPix('${cob.pixCopiaECola}')" title="Copiar Código Pix">
                                <i class="fas fa-copy"></i> Copiar
                            </button>
                        `;
                    }
                    if (cob.imagemQrcode) {
                        acoesHTML += `
                            <button class="btn btn-sm" style="background:#7c4dff; color:white; padding:6px 10px; border-radius:6px; border:none; cursor:pointer; margin-left:4px;" onclick="verQrCode('${cob.imagemQrcode}')" title="Ver QR Code">
                                <i class="fas fa-qrcode"></i> QR
                            </button>
                        `;
                    }
                    // Fallback PIX sem dados
                    if (!acoesHTML) {
                        acoesHTML = `
                            <span class="btn btn-sm" style="background:#999; color:white; padding:6px 12px; border-radius:6px; cursor:not-allowed; opacity:0.7;" title="Dados PIX não encontrados">
                                <i class="fas fa-exclamation-triangle"></i> Sem dados
                            </span>
                            </span>
                        `;
                    }
                } else if (billingType.includes('PIX_AUTOMATICO')) {
                    // ========== PIX AUTOMÁTICO ==========
                    // Botão Copiar (se disponível)
                    if (cob.pixCopiaECola) {
                        acoesHTML += `
                            <button class="btn btn-sm" style="background:#00c853; color:white; padding:6px 10px; border-radius:6px; border:none; cursor:pointer;" onclick="copiarPix('${cob.pixCopiaECola}')" title="Copiar Código Pix">
                                <i class="fas fa-copy"></i> Copiar
                            </button>
                        `;
                    } else {
                        // Desabilitado se não tiver código
                        acoesHTML += `
                            <button class="btn btn-sm" style="background:#ccc; color:#666; padding:6px 10px; border-radius:6px; border:none; cursor:not-allowed;" title="Aguardando código...">
                                <i class="fas fa-copy"></i>
                            </button>
                        `;
                    }

                    // Botão QR Code (se disponível)
                    if (cob.imagemQrcode) {
                        acoesHTML += `
                            <button class="btn btn-sm" style="background:#7c4dff; color:white; padding:6px 10px; border-radius:6px; border:none; cursor:pointer; margin-left:4px;" onclick="verQrCode('${cob.imagemQrcode}')" title="Ver QR Code">
                                <i class="fas fa-qrcode"></i> QR
                            </button>
                        `;
                    }

                    // Fallback se não tiver nada (apenas para não ficar vazio)
                    if (!acoesHTML && linkPagamento) {
                        acoesHTML = `
                            <a href="${linkPagamento}" target="_blank" class="btn btn-sm btn-secondary" style="padding:6px 10px; border-radius:6px;" title="Abrir Fatura">
                                <i class="fas fa-external-link-alt"></i> Fatura
                            </a>
                        `;
                    }
                } else if (billingType.includes('CREDIT') || billingType.includes('CARTAO') || billingType.includes('CARTÃO')) {
                    // ========== CARTÃO ==========
                    if (linkPagamento) {
                        acoesHTML = `
                            <a href="${linkPagamento}" target="_blank" class="btn btn-sm" style="background:#0066ff; color:white; padding:6px 12px; border-radius:6px; text-decoration:none; display:inline-flex; align-items:center; gap:4px;" title="Link de Pagamento">
                                <i class="fas fa-credit-card"></i> Pagar
                            </a>
                        `;
                    } else {
                        acoesHTML = `
                            <span class="btn btn-sm" style="background:#999; color:white; padding:6px 12px; border-radius:6px; cursor:not-allowed; opacity:0.7;" title="Link não disponível">
                                <i class="fas fa-exclamation-triangle"></i> Sem link
                            </span>
                        `;
                    }
                } else {
                    // ========== TIPO DESCONHECIDO - FALLBACK ==========
                    if (linkPagamento) {
                        acoesHTML = `
                            <a href="${linkPagamento}" target="_blank" class="btn btn-sm btn-secondary" style="padding:6px 10px; border-radius:6px;" title="Abrir Link">
                                <i class="fas fa-external-link-alt"></i> Abrir
                            </a>
                        `;
                    } else {
                        acoesHTML = `
                            <span class="btn btn-sm" style="background:#666; color:white; padding:6px 12px; border-radius:6px; font-size:11px;" title="Tipo: ${tipoRaw || 'indefinido'}">
                                <i class="fas fa-question-circle"></i> ${tipoRaw || '?'}
                            </span>
                        `;
                    }
                }



                // 5 colunas: Tipo | Vencimento | Valor | Status | Ações
                tr.innerHTML = `
                    <td style="padding:10px; text-align:center; border-bottom:1px solid #eee;">${tipoIcone}</td>
                    <td style="padding:10px; text-align:center; border-bottom:1px solid #eee;">${dataFormatada}</td>
                    <td style="padding:10px; text-align:center; border-bottom:1px solid #eee;"><strong>${valor}</strong></td>
                    <td style="padding:10px; text-align:center; border-bottom:1px solid #eee;">${statusBadge}</td>
                    <td style="padding:10px; text-align:center; border-bottom:1px solid #eee;">
                        <div style="display:flex; gap:6px; justify-content:center; flex-wrap:nowrap; align-items:center;">
                            ${acoesHTML || '<span style="color:#999; font-size:11px;">-</span>'}
                            
                            <!-- Botão Baixa Manual (FORÇADO PARAA APARECER) -->
                            <div style="display:inline-block; margin: 0 4px;">
                                <button type="button" 
                                    onclick="window.confirmarPagamentoManual('${cob.id}', '${cob.valor}')"
                                    style="
                                        display: inline-flex !important;
                                        align-items: center;
                                        justify-content: center;
                                        width: 32px;
                                        height: 32px;
                                        background-color: #28a745 !important;
                                        color: white !important;
                                        border: none !important;
                                        border-radius: 6px !important;
                                        cursor: pointer !important;
                                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                        opacity: 1 !important;
                                        visibility: visible !important;
                                    " 
                                    title="Dar Baixa Manual (Confirmar Pagamento)">
                                    <i class="fas fa-check" style="pointer-events: none;"></i>
                                </button>
                            </div>

                            <button class="btn btn-sm btn-delete-charge" 
                                style="background:transparent; color:#dc3545; border:1px solid #dc3545; padding:6px 10px; border-radius:6px; cursor:pointer;" 
                                title="Excluir Cobrança"
                                onclick="excluirCobranca('${cob.id}')">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </td>
                `;

            } else {
                // Para cobranças pagas - 5 colunas: Tipo | Data Pgto | Valor | Método | Ações (Nova)
                let dataPagamento = '-';
                if (cob.dataPagamento || cob.confirmedDate) {
                    const dp = new Date(cob.dataPagamento || cob.confirmedDate);
                    dataPagamento = dp.toLocaleDateString('pt-BR');
                }

                // Coluna de ações para pagas (Excluir)
                const acoesPagas = `
                    <button class="btn btn-sm btn-delete-charge" 
                        style="background:transparent; color:#dc3545; border:1px solid #dc3545; padding:6px 10px; border-radius:6px; cursor:pointer;" 
                        title="Excluir Transação"
                        onclick="excluirCobranca('${cob.id}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                `;

                tr.innerHTML = `
                    <td style="padding:10px; text-align:center; border-bottom:1px solid #eee;">${tipoIcone}</td>
                    <td style="padding:10px; text-align:center; border-bottom:1px solid #eee;">${dataPagamento}</td>
                    <td style="padding:10px; text-align:center; border-bottom:1px solid #eee;"><strong style="color:#28a745;">${valor}</strong></td>
                    <td style="padding:10px; text-align:center; border-bottom:1px solid #eee;">${getTipoLabel(cob.tipo || cob.billingType)}</td>
                    <td style="padding:10px; text-align:center; border-bottom:1px solid #eee;">
                        <div style="display:flex; gap:6px; justify-content:center;">${acoesPagas}</div>
                    </td>
                `;
            }

            tbody.appendChild(tr);
        });
    }

    /**
     * Exclui uma cobrança
     */
    window.excluirCobranca = async function (id) {
        const confirmed = await window.swalConfirm(
            'Excluir Cobrança', 
            'Tem certeza que deseja EXCLUIR esta cobrança?\nEssa ação não pode ser desfeita.', 
            'error', 
            'Sim, excluir', 
            'Cancelar'
        );
        if (!confirmed) {
            return;
        }

        const empresaId = getEmpresaId();
        if (!empresaId) {
            showToast('Erro: Empresa não identificada', 'error');
            return;
        }

        try {
            showLoading('Excluindo...');
            const { error } = await window.supabase
                .from('cobrancas')
                .delete()
                .eq('id', id)
                .eq('company_id', empresaId);
                
            if (error) throw error;

            showToast('Cobrança excluída com sucesso!', 'success');

            // Recarrega a lista COM AWAIT para garantir sync
            const params = new URLSearchParams(window.location.search);
            const numeroContrato = params.get('numero');

            console.log('🔄 Recarregando após exclusão...');
            if (typeof carregarCobrancasContrato === 'function') {
                await carregarCobrancasContrato(empresaId, numeroContrato);
            } else if (window.carregarCobrancasContrato) {
                await window.carregarCobrancasContrato(empresaId, numeroContrato);
            }

        } catch (error) {
            console.error('Erro ao excluir:', error);
            showToast('Erro ao excluir cobrança: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    };

    /**
     * Confirma pagamento manual (Baixa Manual)
     */
    window.confirmarPagamentoManual = async function (id, valor) {
        const confirmed = await window.swalConfirm(
            'Confirmar Pagamento', 
            'Deseja confirmar o pagamento manual desta cobrança?\n\nEsta ação moverá a cobrança para "Pagas".', 
            'question', 
            'Sim, pagar', 
            'Cancelar'
        );
        if (!confirmed) {
            return;
        }

        const empresaId = getEmpresaId();
        if (!empresaId) {
            showToast('Erro: Empresa não identificada', 'error');
            return;
        }

        try {
            showLoading('Dando baixa...');

            // Atualiza status local e remoto
            const { error } = await window.supabase
                .from('cobrancas')
                .update({
                    status: 'CONFIRMED',
                    statusTraduzido: 'Pago Manualmente',
                    dataPagamento: new Date().toISOString(),
                    metodoPagamento: 'MANUAL', // Marca que foi manual
                    atualizadoEm: new Date().toISOString()
                })
                .eq('id', id)
                .eq('company_id', empresaId);
                
            if (error) throw error;

            // Sucesso Visual com Modal
            await showSuccessModal('Pagamento Confirmado!', 'A cobrança foi movida para a lista de PAGOS com sucesso.');

            // Recarrega a lista COM AWAIT para garantir sync
            const params = new URLSearchParams(window.location.search);
            const numeroContrato = params.get('numero');

            console.log('🔄 Recarregando após baixa manual...');
            if (typeof carregarCobrancasContrato === 'function') {
                await carregarCobrancasContrato(empresaId, numeroContrato);
            } else if (window.carregarCobrancasContrato) {
                await window.carregarCobrancasContrato(empresaId, numeroContrato);
            }

        } catch (error) {
            console.error('Erro ao confirmar pagamento:', error);
            showToast('Erro ao confirmar: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    };


    /**
     * Retorna ícone baseado no tipo de cobrança
     */
    function getTipoIcone(tipo) {
        const t = (tipo || '').toLowerCase();
        if (t === 'pix') return '<i class="fas fa-qrcode" style="color:#00a651; font-size:18px;" title="PIX"></i>';
        if (t === 'pix_automatico') return '<i class="fas fa-qrcode" style="color:#00a651; font-size:18px;" title="PIX Automático"></i>';
        if (t === 'pix_automatico') return '<i class="fas fa-qrcode" style="color:#00a651; font-size:18px;" title="PIX Automático"></i>';
        if (t === 'boleto') return '<i class="fas fa-barcode" style="color:#333; font-size:18px;" title="Boleto"></i>';
        if (t === 'cartao' || t === 'credit_card') return '<i class="fas fa-credit-card" style="color:#0d6efd; font-size:18px;" title="Cartão"></i>';
        if (t === 'money' || t === 'dinheiro') return '<i class="fas fa-money-bill-wave" style="color:#28a745; font-size:18px;" title="Dinheiro"></i>';
        return '<i class="fas fa-money-bill" style="color:#666; font-size:18px;" title="Outro"></i>';
    }

    /**
     * Retorna label do tipo
     */
    function getTipoLabel(tipo) {
        const t = (tipo || '').toLowerCase();
        if (t === 'pix') return '<span style="background:#e8f5e9; color:#2e7d32; padding:4px 8px; border-radius:4px; font-size:12px;">PIX</span>';
        if (t === 'pix_automatico') return '<span style="background:#e8f5e9; color:#2e7d32; padding:4px 8px; border-radius:4px; font-size:12px;">PIX Auto</span>';
        if (t === 'boleto') return '<span style="background:#fff3e0; color:#e65100; padding:4px 8px; border-radius:4px; font-size:12px;">Boleto</span>';
        if (t === 'cartao' || t === 'credit_card') return '<span style="background:#e3f2fd; color:#1565c0; padding:4px 8px; border-radius:4px; font-size:12px;">Cartão</span>';
        if (t === 'money' || t === 'dinheiro') return '<span style="background:#d4edda; color:#155724; padding:4px 8px; border-radius:4px; font-size:12px;">Dinheiro (Manual)</span>';
        return `<span style="background:#f5f5f5; color:#666; padding:4px 8px; border-radius:4px; font-size:12px;">${tipo}</span>`;
    }

    /**
     * Retorna badge de status formatado
     */
    function getStatusBadge(status) {
        const s = (status || '').toUpperCase();

        const statusMap = {
            'PENDING': { label: 'Pendente', bg: '#fff3cd', color: '#856404' },
            'AGUARDANDO_PAGAMENTO': { label: 'Aguardando', bg: '#fff3cd', color: '#856404' },
            'OVERDUE': { label: 'Vencida', bg: '#f8d7da', color: '#721c24' },
            'RECEIVED': { label: 'Pago', bg: '#d4edda', color: '#155724' },
            'CONFIRMED': { label: 'Confirmado', bg: '#d4edda', color: '#155724' },
            'PAGO': { label: 'Pago', bg: '#d4edda', color: '#155724' },
            'CANCELLED': { label: 'Cancelado', bg: '#e2e3e5', color: '#383d41' },
            'REFUNDED': { label: 'Estornado', bg: '#cce5ff', color: '#004085' }
        };

        const config = statusMap[s] || { label: s || 'Em Aberto', bg: '#e3f2fd', color: '#1565c0' };

        return `<span style="display:inline-block; background:${config.bg}; color:${config.color}; padding:4px 10px; border-radius:12px; font-size:11px; font-weight:600;">${config.label}</span>`;
    }

    // Expõe função globalmente para ser chamada de outros scripts
    window.carregarCobrancasContrato = carregarCobrancasContrato;

    // Funções auxiliares globais para botões de ação
    window.copiarLink = function (link) {
        navigator.clipboard.writeText(link).then(() => {
            showToast('Link copiado!', 'success');
        }).catch(() => {
            prompt('Copie o link:', link);
        });
    };

    window.copiarPix = function (pix) {
        navigator.clipboard.writeText(pix).then(() => {
            showToast('PIX Copia e Cola copiado!', 'success');
        }).catch(() => {
            prompt('Copie o código PIX:', pix);
        });
    };

    // Função para exibir QR Code do PIX em modal
    window.verQrCode = function (imagemBase64) {
        // Remove modal anterior se existir
        const existing = document.getElementById('modalQrCode');
        if (existing) existing.remove();

        const modalHTML = `
            <div id="modalQrCode" style="
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
            " onclick="if(event.target.id==='modalQrCode') this.remove();">
                <div style="
                    background: white;
                    border-radius: 16px;
                    padding: 24px;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                ">
                    <h3 style="margin:0 0 16px; color:#333;">QR Code PIX</h3>
                    <img src="${imagemBase64}" alt="QR Code PIX" style="max-width: 280px; border-radius: 8px;">
                    <p style="margin: 16px 0 0; color: #666; font-size: 13px;">Escaneie com o app do seu banco</p>
                    <button onclick="document.getElementById('modalQrCode').remove()" style="
                        margin-top: 16px;
                        padding: 10px 24px;
                        background: #0066ff;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                    ">Fechar</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    };

    /**
     * Vincula eventos do botão de adicionar cobrança
     */
    function bindChargeEvents() {
        const btnAddCharge = $('btnAddCharge');
        if (btnAddCharge) {
            btnAddCharge.addEventListener('click', function (e) {
                e.preventDefault();
                openAddChargeModal();
            });
            console.log('✅ Evento btnAddCharge vinculado');
        } else {
            console.warn('⚠️ Botão btnAddCharge não encontrado');
        }
    }

    /**
     * Vincula eventos do modal
     */
    function bindModalEvents() {
        // Botão Salvar cobrança
        const btnSalvar = $('btnSalvarCharge');
        if (btnSalvar) {
            btnSalvar.addEventListener('click', saveCharge);
        }

        // Botão Cancelar
        const btnCancelar = $('btnCancelarCharge');
        if (btnCancelar) {
            btnCancelar.addEventListener('click', closeAddChargeModal);
        }

        // Botão X (fechar)
        const closeBtn = $('closeAddCharge');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeAddChargeModal);
        }

        // Fechar modal ao clicar fora
        const modal = $('modalAddCharge');
        if (modal) {
            modal.addEventListener('click', function (e) {
                if (e.target === modal) {
                    closeAddChargeModal();
                }
            });
        }

        // Modal PIX - Copiar código
        const copyPix = $('copyPix');
        if (copyPix) {
            copyPix.addEventListener('click', function () {
                const pixCode = $('pixCode');
                if (pixCode) {
                    navigator.clipboard.writeText(pixCode.value);
                    showToast('Código PIX copiado!', 'success');
                }
            });
        }

        // Fechar modal PIX
        const closePix = $('closePix');
        if (closePix) {
            closePix.addEventListener('click', function () {
                $('modalPix').style.display = 'none';
                $('modalPix').setAttribute('aria-hidden', 'true');
            });
        }
    }

    /**
     * Abre o modal de adicionar cobrança
     */
    function openAddChargeModal() {
        console.log('📝 Abrindo modal de adicionar cobrança...');

        // Preenche data de vencimento padrão (hoje + 7 dias)
        const hoje = new Date();
        hoje.setDate(hoje.getDate() + 7);
        const vencimentoDefault = hoje.toISOString().split('T')[0];

        const mcVencimento = $('mcVencimento');
        if (mcVencimento) {
            mcVencimento.value = vencimentoDefault;
        }

        // Preenche valor padrão a partir do contrato
        const valorMensalidade = $('ivValor') || $('cvValor');
        if (valorMensalidade) {
            const valorTexto = valorMensalidade.textContent || '';
            const valorNum = parseFloat(valorTexto.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
            const mcValor = $('mcValor');
            if (mcValor && valorNum > 0) {
                mcValor.value = valorNum.toFixed(2);
            }
        }

        // Preenche CPF e Endereço do titular (se disponível na memória global da página edicao-contrato)
        if (window.currentFamily) {
            const fam = Array.isArray(window.currentFamily) ? window.currentFamily[0] : window.currentFamily;
            if (fam) {
                // Tenta pegar o CPF do titular ou do elemento HTML
                const mcCpfPagador = $('mcCpfPagador');
                if (mcCpfPagador) {
                    const cpfEl = $('holderCpf');
                    let cpfVal = '';
                    if (cpfEl && cpfEl.getAttribute('data-cpf')) {
                        cpfVal = cpfEl.getAttribute('data-cpf');
                    } else if (fam.titular && fam.titular.cpf) {
                        cpfVal = fam.titular.cpf;
                    }
                    mcCpfPagador.value = cpfVal;
                }

                // Tenta pegar o endereço
                if (fam.endereco) {
                    const e = fam.endereco;
                    if ($('mcCep')) $('mcCep').value = e.cep || '';
                    if ($('mcLogradouro')) $('mcLogradouro').value = e.rua || e.logradouro || '';
                    if ($('mcNumero')) $('mcNumero').value = e.numero || '';
                    if ($('mcBairro')) $('mcBairro').value = e.bairro || '';
                    if ($('mcCidade')) $('mcCidade').value = e.cidade || '';
                    if ($('mcUf')) $('mcUf').value = e.uf || e.estado || '';
                }
            }
        }

        // Abre o modal
        const modal = $('modalAddCharge');
        if (modal) {
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false');
        }
    }

    /**
     * Fecha o modal de adicionar cobrança
     */
    function closeAddChargeModal() {
        const modal = $('modalAddCharge');
        if (modal) {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    /**
     * Salva a cobrança e gera PIX/Boleto/Cartão
     * FIX: Adicionada idempotency key para prevenir duplicatas em double-click
     */
    async function saveCharge() {
        console.log('💾 Salvando cobrança...');

        const vencimento = $('mcVencimento')?.value;
        const valor = parseFloat($('mcValor')?.value) || 0;
        const qtdParcelas = parseInt($('mcQtdParcelas')?.value) || 1;
        const metodo = $('mcMetodo')?.value || 'pix';
        const mensagem = $('mcMensagem')?.value || '';

        // Validações
        if (!vencimento) {
            showToast('Informe a data de vencimento', 'error');
            return;
        }
        if (valor <= 0) {
            showToast('Informe um valor válido', 'error');
            return;
        }

        // Obtém empresa dinamicamente
        const empresaId = getEmpresaId();
        console.log('📦 Usando empresaId:', empresaId);

        if (!empresaId) {
            showToast('Selecione uma empresa primeiro', 'error');
            console.error('❌ empresaId não encontrado!');
            return;
        }

        // Obtém o número do contrato PRIORIZANDO a URL para garantir consistência com o filtro
        const params = new URLSearchParams(window.location.search);
        const numeroContrato = params.get('numero') || $('ivNumero')?.textContent || '';
        const titular = $('holderName')?.textContent || 'Cliente';

        // --- IDEMPOTENCY: Previne duplicatas em double-click ou retry ---
        const idempotencyKey = `charge_${empresaId}_${numeroContrato}_${vencimento}_${valor}_${metodo}`;
        if (sessionStorage.getItem(idempotencyKey)) {
            showToast('Cobrança já está sendo processada. Aguarde.', 'warning');
            console.warn('🔒 Idempotency key encontrada, bloqueando duplicata:', idempotencyKey);
            return;
        }
        sessionStorage.setItem(idempotencyKey, 'processing');

        showLoading('Gerando cobrança...');

        try {
            // Loop para parcelas
            let dataBase = new Date(vencimento);

            for (let i = 0; i < qtdParcelas; i++) {
                // Calcula vencimento da parcela atual
                // Clona a data base para não afetar as próximas iterações incorretamente
                const dataParcela = new Date(dataBase);
                dataParcela.setMonth(dataBase.getMonth() + i);

                // Formata para YYYY-MM-DD
                const vencimentoParcela = dataParcela.toISOString().split('T')[0];
                const msgParcela = qtdParcelas > 1 ? `${mensagem} (${i + 1}/${qtdParcelas})` : mensagem;

                console.log(`🔄 Gerando parcela ${i + 1}/${qtdParcelas} para ${vencimentoParcela}`);

                if (metodo === 'pix') {
                    await gerarCobrancaPix(empresaId, vencimentoParcela, valor, titular, msgParcela, numeroContrato);
                } else if (metodo === 'pix_automatico') {
                    // PIX Automático trata como assinatura (cria apenas uma vez)
                    if (i === 0) await gerarAssinaturaPix(empresaId, vencimentoParcela, valor, titular, msgParcela, numeroContrato);
                } else if (metodo === 'boleto') {
                    await gerarCobrancaBoleto(empresaId, vencimentoParcela, valor, titular, msgParcela, numeroContrato);
                } else if (metodo === 'cartao' || metodo === 'credit_card') {
                    if (i === 0) await gerarAssinaturaCartao(empresaId, vencimentoParcela, valor, titular, msgParcela, numeroContrato);
                } else if (metodo === 'money') {
                    // Dinheiro é sempre manual e local (sem API)
                    await salvarCobrancaLocal(vencimentoParcela, valor, 'money', msgParcela, numeroContrato, empresaId);
                } else {
                    await salvarCobrancaLocal(vencimentoParcela, valor, metodo, msgParcela, numeroContrato, empresaId);
                }

                // Pequeno delay para não estourar rate limit da API
                if (qtdParcelas > 1) await new Promise(r => setTimeout(r, 500));
            }

            closeAddChargeModal();
            hideLoading();

            // Sucesso Visual com Modal
            await showSuccessModal('Cobrança gerada com sucesso!', 'Agora ela aparecerá na lista de cobranças em aberto.');

            // Recarrega a lista de cobranças com força
            console.log('🔄 Forçando recarregamento das cobranças...');

            // Tenta chamar a função global exposta
            if (typeof window.carregarCobrancasContrato === 'function') {
                await window.carregarCobrancasContrato(empresaId, numeroContrato);
            } else if (typeof carregarCobrancasContrato === 'function') {
                await carregarCobrancasContrato(empresaId, numeroContrato);
            } else {
                console.warn('⚠️ Função de recarregamento não encontrada, recarregando página...');
                window.location.reload();
            }

            // Libera a idempotency key após 30 segundos (permite recriar se necessário)
            setTimeout(() => sessionStorage.removeItem(idempotencyKey), 30000);

        } catch (error) {
            console.error('❌ Erro ao gerar cobrança:', error);
            hideLoading();
            showToast(error.message || 'Erro ao gerar cobrança', 'error');
            // Libera a key imediatamente em caso de erro para permitir retry
            sessionStorage.removeItem(idempotencyKey);
        }
    }

    /**
     * Modal de Sucesso Customizado
     */
    function showSuccessModal(title, message) {
        return new Promise((resolve) => {
            const modalId = 'successModal_' + Date.now();
            const modalHTML = `
                <div id="${modalId}" style="
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100000;
                    animation: fadeIn 0.3s ease;
                ">
                    <div style="
                        background: white;
                        border-radius: 16px;
                        padding: 32px;
                        text-align: center;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.2);
                        max-width: 90%;
                        width: 400px;
                        transform: scale(0.9);
                        animation: scaleIn 0.3s ease forwards;
                    ">
                        <div style="
                            width: 80px;
                            height: 80px;
                            background: #d4edda;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0 auto 24px;
                        ">
                            <i class="fas fa-check" style="font-size: 40px; color: #28a745;"></i>
                        </div>
                        <h2 style="margin: 0 0 12px; color: #333; font-size: 24px;">${title}</h2>
                        <p style="margin: 0 0 24px; color: #666; font-size: 16px; line-height: 1.5;">${message}</p>
                        <button id="btnSuccess_${modalId}" style="
                            background: #28a745;
                            color: white;
                            border: none;
                            padding: 12px 32px;
                            border-radius: 8px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                            width: 100%;
                            transition: background 0.2s;
                        ">OK, Entendi</button>
                    </div>
                </div>
                <style>
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes scaleIn { from { transform: scale(0.9); } to { transform: scale(1); } }
                </style>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            const btn = document.getElementById(`btnSuccess_${modalId}`);
            const modal = document.getElementById(modalId);

            const close = () => {
                modal.remove();
                resolve();
            };

            btn.addEventListener('click', close);
            // Também fecha ao clicar fora, opcional
            // modal.addEventListener('click', (e) => { if(e.target === modal) close(); });
        });
    }

    /**
     * Gera cobrança PIX via API do Asaas
     */
    async function gerarCobrancaPix(empresaId, vencimento, valor, devedor, mensagem, numeroContrato) {
        console.log('🔵 Gerando cobrança PIX para empresa:', empresaId);

        // PRIORIDADE 1: Busca do campo CPF no modal (digitado pelo usuário)
        let cpfDevedor = null;
        const cpfInput = document.getElementById('mcCpfPagador');
        if (cpfInput && cpfInput.value) {
            cpfDevedor = cpfInput.value.replace(/\D/g, '');
            
        }

        // PRIORIDADE 2: Busca do elemento holderCpf (data-cpf)
        if (!cpfDevedor || cpfDevedor.length !== 11) {
            const cpfEl = document.getElementById('holderCpf');
            if (cpfEl && cpfEl.dataset.cpf) {
                cpfDevedor = cpfEl.dataset.cpf.replace(/\D/g, '');
                
            }
        }

        // PRIORIDADE 3: Fallback do localStorage
        if (!cpfDevedor || cpfDevedor.length !== 11) {
            const contractKey = `CONTRACT_EDIT_${numeroContrato}`;
            const contractData = localStorage.getItem(contractKey);
            if (contractData) {
                try {
                    const parsed = JSON.parse(contractData);
                    cpfDevedor = (parsed.cpf || parsed.cpfTitular || parsed.documento || '').replace(/\D/g, '');
                    
                } catch (e) { }
            }
        }

        // Se não tiver CPF válido, mostra erro claro
        if (!cpfDevedor || cpfDevedor.length !== 11) {
            console.error('❌ CPF do devedor não encontrado ou inválido!');
            throw new Error('CPF do pagador é obrigatório. Por favor, informe um CPF válido.');
        }

        

        // Captura campos de endereço do modal
        const cep = document.getElementById('mcCep')?.value || '';
        const logradouro = document.getElementById('mcLogradouro')?.value || '';
        const numero = document.getElementById('mcNumero')?.value || '';
        const bairro = document.getElementById('mcBairro')?.value || '';
        const cidade = document.getElementById('mcCidade')?.value || '';
        const uf = document.getElementById('mcUf')?.value?.toUpperCase() || '';

        // Monta endereço completo (logradouro + número)
        const enderecoCompleto = numero ? `${logradouro}, ${numero}` : logradouro;

        console.log('📍 Endereço capturado:', { cep, logradouro: enderecoCompleto, bairro, cidade, uf });

        const payload = {
            empresaId: empresaId,
            valor: valor,
            descricao: mensagem || `Cobrança contrato ${numeroContrato}`,
            pagador: {
                nome: devedor,
                cpf: cpfDevedor,
                endereco: {
                    cep: cep,
                    logradouro: enderecoCompleto,
                    bairro: bairro,
                    cidade: cidade,
                    uf: uf
                }
            },
            expiracao: 3600 // 1 hora para cobrança imediata
        };

        let token = '';
        if (window.supabase) {
            const { data } = await window.supabase.auth.getSession();
            if (data?.session?.access_token) {
                token = data.session.access_token;
            }
        }

        const response = await fetch(`${API_BASE}/pix/cob`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || result.message || 'Erro ao gerar PIX');
        }

        // Exibe modal com QR Code
        if (result.qrcode || result.imagemQrcode) {
            showPixModal(result);
        }

        // Salva cobrança no Firestore (CORRIGIDO: passa empresaId diretamente)
        // FIX: Mapeamento correto dos campos PIX
        // showPixModal usa result.qrcode como Imagem e result.pixCopiaECola como Texto
        await salvarCobrancaFirestore({
            tipo: 'pix',
            valor: valor,
            vencimento: vencimento,
            status: 'pendente',
            txid: result.txid,
            pixCopiaECola: result.pixCopiaECola, // O TEXTO copia e cola
            imagemQrcode: result.qrcode,         // A IMAGEM Base64
            contratoNumero: numeroContrato,
            criadoEm: new Date().toISOString()
        }, empresaId);

        return result;
    }

    /**
     * Gera cobrança Boleto via API do Asaas
     */
    async function gerarCobrancaBoleto(empresaId, vencimento, valor, devedor, mensagem, numeroContrato) {
        console.log('📄 Gerando cobrança Boleto para empresa:', empresaId);

        // Busca CPF do pagador
        let cpfDevedor = null;
        const cpfInput = document.getElementById('mcCpfPagador');
        if (cpfInput && cpfInput.value) {
            cpfDevedor = cpfInput.value.replace(/\D/g, '');
        }

        // Fallback: holderCpf
        if (!cpfDevedor || cpfDevedor.length < 11) {
            const cpfEl = document.getElementById('holderCpf');
            if (cpfEl && cpfEl.dataset.cpf) {
                cpfDevedor = cpfEl.dataset.cpf.replace(/\D/g, '');
            }
        }

        if (!cpfDevedor || cpfDevedor.length < 11) {
            throw new Error('CPF do pagador é obrigatório para gerar boleto.');
        }

        // Captura campos de endereço
        const cep = document.getElementById('mcCep')?.value || '';
        const logradouro = document.getElementById('mcLogradouro')?.value || '';
        const numero = document.getElementById('mcNumero')?.value || '';
        const bairro = document.getElementById('mcBairro')?.value || '';
        const cidade = document.getElementById('mcCidade')?.value || '';
        const uf = document.getElementById('mcUf')?.value?.toUpperCase() || '';

        const payload = {
            empresaId: empresaId,
            valor: valor,
            vencimento: vencimento,
            descricao: mensagem || `Cobrança contrato ${numeroContrato}`,
            pagador: {
                nome: devedor,
                cpf: cpfDevedor,
                endereco: {
                    cep: cep,
                    logradouro: logradouro,
                    numero: numero,
                    bairro: bairro,
                    cidade: cidade,
                    uf: uf
                }
            },
            contratoNumero: numeroContrato
        };
        let token = '';
        if (window.supabase) {
            const { data } = await window.supabase.auth.getSession();
            if (data?.session?.access_token) {
                token = data.session.access_token;
            }
        }

        const response = await fetch(`${API_BASE}/boleto`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        console.log('📄 Resposta do backend boleto:', result);

        if (!response.ok) {
            throw new Error(result.error || 'Erro ao gerar boleto');
        }

        // Exibe modal com link do boleto (usa invoiceUrl como fallback)
        const linkBoleto = result.bankSlipUrl || result.invoiceUrl;
        if (linkBoleto) {
            console.log('🔗 Link do boleto:', linkBoleto);
            showBoletoModal(linkBoleto, valor);
        } else {
            console.warn('⚠️ Boleto criado mas sem link disponível ainda');
            showToast('Boleto criado! O link estará disponível em breve.', 'info');
        }

        // O backend já salvou no Firestore, não precisa salvar novamente

        // Recarrega a tabela de cobranças
        console.log('🔄 Recarregando tabela de cobranças...');
        if (typeof carregarCobrancasContrato === 'function') {
            await carregarCobrancasContrato(empresaId);
        }

        return result;
    }

    /**
     * Exibe modal com Link do Boleto - Design Premium
     */
    function showBoletoModal(link, valor) {
        // Remove modal anterior se existir
        const existing = document.getElementById('modalBoletoLink');
        if (existing) existing.remove();

        const valorFormatado = parseFloat(valor).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });

        // Cria o modal
        const modalHTML = `
            <div id="modalBoletoLink" style="
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
            ">
                <div style="
                    background: white;
                    border-radius: 16px;
                    width: 520px;
                    max-width: 95vw;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    overflow: hidden;
                ">
                    <header style="
                        background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
                        color: white;
                        padding: 20px 24px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 28px;">📄</span>
                            <div>
                                <strong style="font-size: 18px; display: block;">Boleto Gerado!</strong>
                                <small style="opacity: 0.9;">Cobrança via Boleto Bancário</small>
                            </div>
                        </div>
                        <button id="closeBoletoModal" style="
                            background: rgba(255,255,255,0.2);
                            border: none;
                            color: white;
                            width: 36px;
                            height: 36px;
                            border-radius: 50%;
                            cursor: pointer;
                            font-size: 20px;
                        ">&times;</button>
                    </header>
                    <div style="padding: 24px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <span style="
                                display: inline-block;
                                background: #fff3e0;
                                color: #e65100;
                                padding: 8px 20px;
                                border-radius: 50px;
                                font-weight: 700;
                                font-size: 20px;
                            ">${valorFormatado}</span>
                        </div>
                        <p style="color: #555; text-align: center; margin-bottom: 16px;">
                            Envie este link para o cliente acessar o boleto:
                        </p>
                        <div style="
                            background: #f8f9fa;
                            border: 2px dashed #dee2e6;
                            border-radius: 10px;
                            padding: 16px;
                            margin-bottom: 20px;
                        ">
                            <input type="text" id="boletoLinkInput" value="${link}" readonly style="
                                width: 100%;
                                padding: 12px;
                                font-size: 12px;
                                border: 1px solid #ced4da;
                                border-radius: 8px;
                                background: white;
                                text-align: center;
                                box-sizing: border-box;
                            ">
                        </div>
                        <div style="display: flex; gap: 12px;">
                            <button id="copyBoletoLink" style="
                                flex: 1;
                                background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
                                color: white;
                                border: none;
                                padding: 14px 24px;
                                border-radius: 10px;
                                font-size: 15px;
                                font-weight: 600;
                                cursor: pointer;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 8px;
                            ">
                                <i class="fas fa-copy"></i> Copiar Link
                            </button>
                            <a href="${link}" target="_blank" style="
                                background: #28a745;
                                color: white;
                                border: none;
                                padding: 14px 20px;
                                border-radius: 10px;
                                font-size: 15px;
                                cursor: pointer;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 8px;
                                text-decoration: none;
                            ">
                                <i class="fas fa-download"></i> Baixar PDF
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Eventos
        document.getElementById('closeBoletoModal').onclick = () => {
            document.getElementById('modalBoletoLink').remove();
        };

        document.getElementById('copyBoletoLink').onclick = () => {
            const input = document.getElementById('boletoLinkInput');
            input.select();
            navigator.clipboard.writeText(input.value).then(() => {
                showToast('Link do boleto copiado!', 'success');
            });
        };

        document.getElementById('modalBoletoLink').onclick = (e) => {
            if (e.target.id === 'modalBoletoLink') {
                document.getElementById('modalBoletoLink').remove();
            }
        };
    }


    /**
     * Gera assinatura recorrente via PIX AUTOMÁTICO
     */
    async function gerarAssinaturaPix(empresaId, vencimento, valor, devedor, mensagem, numeroContrato) {
        console.log('💠 Gerando PIX AUTOMÁTICO (Assinatura) para empresa:', empresaId);

        // Busca CPF do pagador (modal -> holder -> local)
        let cpfDevedor = null;
        const cpfInput = document.getElementById('mcCpfPagador');
        if (cpfInput && cpfInput.value) cpfDevedor = cpfInput.value.replace(/\D/g, '');
        if (!cpfDevedor) {
            const cpfEl = document.getElementById('holderCpf');
            if (cpfEl && cpfEl.dataset.cpf) cpfDevedor = cpfEl.dataset.cpf.replace(/\D/g, '');
        }

        if (!cpfDevedor || cpfDevedor.length < 11) {
            throw new Error('CPF do pagador é obrigatório para PIX Automático.');
        }

        // --- TRATAMENTO DE CHOQUE SOLICITADO ---
        // Garante que o Backend receba estritamente 'PIX' ou 'BOLETO' ou 'CREDIT_CARD'
        let metodoSelecionado = document.getElementById('mcMetodo') ? document.getElementById('mcMetodo').value : 'pix_automatico';
        let billingTypeEnvio = 'CREDIT_CARD'; // Default fallback

        if (metodoSelecionado.includes('pix') || metodoSelecionado.includes('Pix') || metodoSelecionado.includes('PIX')) {
            billingTypeEnvio = 'PIX';
        } else if (metodoSelecionado.includes('boleto') || metodoSelecionado.includes('Boleto')) {
            billingTypeEnvio = 'BOLETO';
        } else {
            billingTypeEnvio = 'CREDIT_CARD';
        }

        // Força BRUTA se esta função é "gerarAssinaturaPix", tem que ser PIX.
        billingTypeEnvio = 'PIX';

        console.log('🚀 ENVIANDO BILLING TYPE:', billingTypeEnvio);

        const payload = {
            empresaId: empresaId,
            cpfCnpj: cpfDevedor,
            nomeCliente: devedor,
            value: valor,
            nextDueDate: vencimento,
            description: mensagem || `PIX Automático contrato ${numeroContrato}`,
            cycle: 'MONTHLY',
            billingType: billingTypeEnvio, // << USA A VARIÁVEL TRATADA
            contratoNumero: numeroContrato
        };

        // --- TRAVA DE SEGURANÇA FINAL ---
        // Se a descrição diz que é PIX, ENTÃO É PIX!
        if (payload.description && payload.description.toUpperCase().includes('PIX')) {
            console.log('🛑 CORRIGINDO TIPO PARA PIX BASEADO NA DESCRIÇÃO');
            payload.billingType = 'PIX';
        }
        // --------------------------------
        console.log('🚀 Payload Final:', payload); // Quero ver isso no console

        let token = '';
        if (window.supabase) {
            const { data } = await window.supabase.auth.getSession();
            if (data?.session?.access_token) {
                token = data.session.access_token;
            }
        }

        const response = await fetch(`${API_BASE}/subscriptions/criar-link`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro ao criar PIX Automático');
        }

        // Exibe modal com o link para o cliente autorizar/pagar
        const paymentLink = result.paymentLink || result.invoiceUrl;

        // VERIFICA SE É PIX AUTOMATICO COM QR CODE RETORNADO
        if (result.qrcode || result.imagemQrcode) {
            const qrCodeBase64 = result.qrcode || result.imagemQrcode;
            const pixCopiaECola = result.pixCopiaECola;

            console.log('📱 Exibindo Modal de PIX Automático (Autorização)');

            // Usa a função global `verQrCode` mas adaptada para mostrar o Copia e Cola também se possível
            // Como `verQrCode` é simples (só imagem), vamos criar um modal mais completo aqui ou usar o Swal se disponível

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: '📱 PIX Automático Gerado!',
                    html: `
                        <p style="color: #666; margin-bottom: 15px;">Peça para o cliente escanear para <strong>autorizar</strong> a recorrência:</p>
                        <div style="margin: 20px auto; display: inline-block; padding: 10px; border: 2px dashed #28a745; border-radius: 8px;">
                             <img src="data:image/png;base64,${qrCodeBase64}" style="width: 200px; height: 200px;">
                        </div>
                        <div style="margin-top: 15px;">
                            <p style="font-size: 13px; color: #555; margin-bottom: 5px;">Ou use o Pix Copia e Cola:</p>
                            <input type="text" value="${pixCopiaECola}" id="swalPixCopiaCola" readonly 
                                style="width: 100%; font-size: 12px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                    `,
                    confirmButtonText: 'Copiar Código',
                    showCancelButton: true,
                    cancelButtonText: 'Fechar',
                    confirmButtonColor: '#28a745'
                }).then((resAlert) => {
                    if (resAlert.isConfirmed) {
                        navigator.clipboard.writeText(pixCopiaECola);
                        showToast('Pix Copia e Cola copiado!', 'success');
                    }
                });
            } else {
                // Fallback para função simples
                window.verQrCode(`data:image/png;base64,${qrCodeBase64}`);
            }

        } else if (paymentLink) {
            // Fluxo normal de Link (Cartão ou Fallback)
            showPaymentLinkModal(paymentLink, valor);
        }

        console.log('✅ PIX Automático criado com sucesso!');
    }

    /**
     * NOVO: Gera assinatura recorrente via Cartão de Crédito (Link de Pagamento)
     */
    async function gerarAssinaturaCartao(empresaId, vencimento, valor, devedor, mensagem, numeroContrato) {
        console.log('💳 Gerando assinatura com Link de Pagamento para empresa:', empresaId);

        // Busca CPF do pagador
        let cpfDevedor = null;
        const cpfInput = document.getElementById('mcCpfPagador');
        if (cpfInput && cpfInput.value) {
            cpfDevedor = cpfInput.value.replace(/\D/g, '');
        }

        // Fallback do localStorage
        if (!cpfDevedor || cpfDevedor.length < 11) {
            const cpfEl = document.getElementById('holderCpf');
            if (cpfEl && cpfEl.dataset.cpf) {
                cpfDevedor = cpfEl.dataset.cpf.replace(/\D/g, '');
            }
        }

        if (!cpfDevedor || cpfDevedor.length < 11) {
            throw new Error('CPF do pagador é obrigatório para assinatura.');
        }

        const payload = {
            empresaId: empresaId,
            cpfCnpj: cpfDevedor,
            nomeCliente: devedor,
            value: valor,
            nextDueDate: vencimento,
            description: mensagem || `Assinatura contrato ${numeroContrato}`,
            cycle: 'MONTHLY',
            contratoNumero: numeroContrato, // Envia para o backend salvar no Firestore
            endereco: {
                cep: document.getElementById('mcCep')?.value || '',
                logradouro: document.getElementById('mcLogradouro')?.value || '',
                numero: document.getElementById('mcNumero')?.value || '',
                bairro: document.getElementById('mcBairro')?.value || '',
                cidade: document.getElementById('mcCidade')?.value || '',
                uf: document.getElementById('mcUf')?.value || ''
            }
        };

        let token = '';
        if (window.supabase) {
            const { data } = await window.supabase.auth.getSession();
            if (data?.session?.access_token) {
                token = data.session.access_token;
            }
        }

        const response = await fetch(`${API_BASE}/subscriptions/criar-link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro ao criar assinatura');
        }

        // Exibe modal/SweetAlert com o link de pagamento
        const paymentLink = result.paymentLink || result.invoiceUrl;

        if (paymentLink) {
            showPaymentLinkModal(paymentLink, valor);
        }

        // Backend já salva no Firestore, então apenas recarregamos a tabela
        console.log('✅ Cobrança criada com sucesso, recarregando tabela...');

        // Recarrega a lista de cobranças para mostrar a nova cobrança
        setTimeout(() => {
            if (typeof carregarCobrancas === 'function') {
                carregarCobrancas(empresaId);
            }
            if (typeof reloadCharges === 'function') {
                reloadCharges();
            }
            // Tenta também chamar função global de reload
            if (window.carregarCobrancasContrato) {
                window.carregarCobrancasContrato();
            }
        }, 500);

        return result;
    }


    /**
     * Exibe modal com Link de Pagamento (Cartão) - Design Premium
     */
    function showPaymentLinkModal(link, valor) {
        // Verifica se SweetAlert2 está disponível
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: '💳 Link de Pagamento Gerado!',
                html: `
                    <p style="color: #666; margin-bottom: 15px;">Valor: <strong style="color: #28a745; font-size: 18px;">R$ ${valor.toFixed(2)}</strong></p>
                    <p style="color: #555;">Envie este link para o cliente pagar no cartão:</p>
                    <div style="margin: 15px 0; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef;">
                        <input type="text" id="swalPaymentLink" value="${link}" 
                               style="width: 100%; padding: 12px; font-size: 13px; border: 1px solid #ced4da; border-radius: 6px; background: white;" readonly>
                    </div>
                `,
                icon: 'success',
                showCancelButton: true,
                confirmButtonText: '📋 Copiar Link',
                cancelButtonText: 'Fechar',
                confirmButtonColor: '#28a745',
                cancelButtonColor: '#6c757d'
            }).then((result) => {
                if (result.isConfirmed) {
                    navigator.clipboard.writeText(link);
                    Swal.fire({
                        title: 'Copiado!',
                        text: 'Link copiado para a área de transferência.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            });
        } else {
            // Fallback: Modal HTML dinâmico premium (sem SweetAlert)
            createPaymentLinkModalHTML(link, valor);
        }
    }

    /**
     * Cria modal HTML dinâmico para Link de Pagamento (fallback sem SweetAlert)
     */
    function createPaymentLinkModalHTML(link, valor) {
        // Remove modal anterior se existir
        const existing = document.getElementById('modalPaymentLink');
        if (existing) existing.remove();

        // Cria o modal
        const modalHTML = `
            <div id="modalPaymentLink" class="modal-backdrop" style="
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                animation: fadeIn 0.2s ease-out;
            ">
                <div class="modal" style="
                    background: white;
                    border-radius: 16px;
                    width: 500px;
                    max-width: 95vw;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    overflow: hidden;
                    animation: slideUp 0.3s ease-out;
                ">
                    <header style="
                        background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                        color: white;
                        padding: 20px 24px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 28px;">💳</span>
                            <div>
                                <strong style="font-size: 18px; display: block;">Link de Pagamento Gerado!</strong>
                                <small style="opacity: 0.9;">Assinatura via Cartão de Crédito</small>
                            </div>
                        </div>
                        <button id="closePaymentLinkModal" style="
                            background: rgba(255,255,255,0.2);
                            border: none;
                            color: white;
                            width: 36px;
                            height: 36px;
                            border-radius: 50%;
                            cursor: pointer;
                            font-size: 20px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            transition: background 0.2s;
                        " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">&times;</button>
                    </header>
                    <div class="content" style="padding: 24px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <span style="
                                display: inline-block;
                                background: #e8f5e9;
                                color: #28a745;
                                padding: 8px 20px;
                                border-radius: 50px;
                                font-weight: 700;
                                font-size: 20px;
                            ">R$ ${valor.toFixed(2)}</span>
                        </div>
                        <p style="color: #555; text-align: center; margin-bottom: 16px;">
                            Envie este link para o cliente realizar o pagamento:
                        </p>
                        <div style="
                            background: #f8f9fa;
                            border: 2px dashed #dee2e6;
                            border-radius: 10px;
                            padding: 16px;
                            margin-bottom: 20px;
                        ">
                            <input type="text" id="paymentLinkInput" value="${link}" readonly style="
                                width: 100%;
                                padding: 14px;
                                font-size: 13px;
                                border: 1px solid #ced4da;
                                border-radius: 8px;
                                background: white;
                                color: #333;
                                text-align: center;
                                box-sizing: border-box;
                            ">
                        </div>
                        <div style="display: flex; gap: 12px;">
                            <button id="copyPaymentLink" style="
                                flex: 1;
                                background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                                color: white;
                                border: none;
                                padding: 14px 24px;
                                border-radius: 10px;
                                font-size: 15px;
                                font-weight: 600;
                                cursor: pointer;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 8px;
                                transition: transform 0.2s, box-shadow 0.2s;
                            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(40,167,69,0.4)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
                                <i class="fas fa-copy"></i> Copiar Link
                            </button>
                            <button id="openPaymentLink" style="
                                background: #6c757d;
                                color: white;
                                border: none;
                                padding: 14px 20px;
                                border-radius: 10px;
                                font-size: 15px;
                                cursor: pointer;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 8px;
                                transition: background 0.2s;
                            " onmouseover="this.style.background='#5a6268'" onmouseout="this.style.background='#6c757d'">
                                <i class="fas fa-external-link-alt"></i> Abrir
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
            </style>
        `;

        // Adiciona ao DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Eventos
        const modal = document.getElementById('modalPaymentLink');
        const closeBtn = document.getElementById('closePaymentLinkModal');
        const copyBtn = document.getElementById('copyPaymentLink');
        const openBtn = document.getElementById('openPaymentLink');
        const linkInput = document.getElementById('paymentLinkInput');

        // Fechar modal
        closeBtn.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Copiar link
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(link).then(() => {
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                copyBtn.style.background = '#155724';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copiar Link';
                    copyBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
                }, 2000);
            });
        });

        // Abrir link
        openBtn.addEventListener('click', () => {
            window.open(link, '_blank');
        });

        // Selecionar texto ao clicar
        linkInput.addEventListener('click', () => linkInput.select());
    }


    /**
     * Salva cobrança localmente (passa para Firestore)
     */
    async function salvarCobrancaLocal(vencimento, valor, metodo, mensagem, numeroContrato, empresaId) {
        console.log('💾 Salvando cobrança local...');

        const cobranca = {
            id: Date.now().toString(),
            tipo: metodo,
            valor: valor,
            vencimento: vencimento,
            mensagem: mensagem,
            status: 'pendente',
            contratoNumero: numeroContrato,
            criadoEm: new Date().toISOString()
        };

        await salvarCobrancaFirestore(cobranca, empresaId);
    }

    /**
     * Salva cobrança no Firestore usando caminho direto.
     * FIX: Removido fallback silencioso para localStorage.
     * Dados financeiros DEVEM ir para o Firestore. Se falhar, o erro é propagado.
     */
    async function salvarCobrancaFirestore(cobrancaData, empresaUid) {
        // Validação do empresaUid
        if (!empresaUid) {
            empresaUid = getEmpresaId();
        }

        if (!empresaUid) {
            throw new Error('Nenhuma empresa ativa selecionada. Impossível salvar cobrança.');
        }

        console.log('💾 Salvando cobrança no Supabase para empresa:', empresaUid);

        if (!window.supabase) {
            throw new Error('Supabase indisponível. A cobrança NÃO foi salva.');
        }

        const { data, error } = await window.supabase
            .from('cobrancas')
            .insert({
                company_id: empresaUid,
                contrato_numero: String(cobrancaData.contratoNumero || ''),
                tipo: cobrancaData.tipo,
                valor: cobrancaData.valor,
                vencimento: cobrancaData.vencimento,
                status: cobrancaData.status || 'PENDING',
                metadata: {
                    mensagem: cobrancaData.mensagem,
                    criadoEm: cobrancaData.criadoEm || new Date().toISOString(),
                    idAsaas: cobrancaData.idAsaas || null
                }
            })
            .select()
            .single();

        if (error) throw error;

        

        // Recarrega a lista de cobranças
        if (typeof carregarCobrancasContrato === 'function') {
            carregarCobrancasContrato(empresaUid);
        }

        return data.id;
    }

    /**
     * Exibe modal com QR Code PIX
     */
    function showPixModal(pixData) {
        const modal = $('modalPix');
        const qrImg = $('pixQrImg');
        const pixCode = $('pixCode');

        if (qrImg && pixData.qrcode) {
            qrImg.src = `data:image/png;base64,${pixData.qrcode}`;
        }

        if (pixCode && pixData.pixCopiaECola) {
            pixCode.value = pixData.pixCopiaECola;
        }

        if (modal) {
            modal.style.display = 'flex';
            modal.setAttribute('aria-hidden', 'false');
        }
    }

    /**
     * Exibe mensagem de loading
     */
    function showLoading(message) {
        const overlay = $('loadingOverlay');
        const msg = $('loadingMessage');

        if (msg) msg.textContent = message || 'Processando...';
        if (overlay) overlay.style.display = 'flex';
    }

    /**
     * Esconde loading
     */
    function hideLoading() {
        const overlay = $('loadingOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    /**
     * Exibe toast de notificação
     */
    function showToast(message, type = 'info') {
        const container = $('toastContainer') || document.body;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        `;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Expõe funções globalmente
    window.openAddChargeModal = openAddChargeModal;
    window.closeAddChargeModal = closeAddChargeModal;
    window.showPixModal = showPixModal;
    window.salvarCobrancaFirestore = salvarCobrancaFirestore;

})();
