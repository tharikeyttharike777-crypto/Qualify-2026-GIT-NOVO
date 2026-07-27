// Área do Associado - JavaScript (LGPD Protegida & Língura Inteligente)
document.addEventListener('DOMContentLoaded', async function() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';

    // Botão de Girar Carteirinha (3D Flip)
    const btnFlip = document.getElementById('btnFlipCard');
    const card = document.getElementById('carteirinhaCard');
    if (btnFlip && card) {
        btnFlip.addEventListener('click', () => {
            card.classList.toggle('flipped');
        });
    }

    // Botão de Histórico de Pagamentos
    const btnHist = document.getElementById('btnHistPagamento');
    if (btnHist) {
        btnHist.addEventListener('click', () => {
            Swal.fire({
                title: '<i class="fas fa-history text-primary"></i> Histórico de Mensalidades',
                html: `
                    <div style="text-align: left; margin-top: 10px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                            <thead>
                                <tr style="border-bottom: 2px solid #cbd5e1; color: #475569; text-align: left;">
                                    <th style="padding: 8px 6px;">Competência</th>
                                    <th style="padding: 8px 6px;">Modalidade</th>
                                    <th style="padding: 8px 6px;">Valor</th>
                                    <th style="padding: 8px 6px;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 10px 6px; font-weight: 700;">Junho / 2026</td>
                                    <td style="padding: 10px 6px;">PIX Automático / Cartão</td>
                                    <td style="padding: 10px 6px;">R$ 89,90</td>
                                    <td style="padding: 10px 6px;"><span style="background:#dcfce7;color:#166534;padding:4px 8px;border-radius:12px;font-size:0.75rem;font-weight:800;">LIQUIDADO</span></td>
                                </tr>
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 10px 6px; font-weight: 700;">Maio / 2026</td>
                                    <td style="padding: 10px 6px;">PIX Automático / Cartão</td>
                                    <td style="padding: 10px 6px;">R$ 89,90</td>
                                    <td style="padding: 10px 6px;"><span style="background:#dcfce7;color:#166534;padding:4px 8px;border-radius:12px;font-size:0.75rem;font-weight:800;">LIQUIDADO</span></td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 6px; font-weight: 700;">Abril / 2026</td>
                                    <td style="padding: 10px 6px;">PIX Copia e Cola</td>
                                    <td style="padding: 10px 6px;">R$ 89,90</td>
                                    <td style="padding: 10px 6px;"><span style="background:#dcfce7;color:#166534;padding:4px 8px;border-radius:12px;font-size:0.75rem;font-weight:800;">LIQUIDADO</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                `,
                confirmButtonText: 'Fechar Histórico',
                confirmButtonColor: '#3b82f6'
            });
        });
    }

    const printBtn = document.getElementById('printArea');
    if (printBtn) printBtn.addEventListener('click', () => window.print());

    await loadAssociatePortal();

    // Bind seletor (Membros da mesma família apenas!)
    const associateSelect = document.getElementById('associateSelect');
    if (associateSelect) {
        associateSelect.addEventListener('change', (e) => {
            const selId = e.target.value;
            if (selId) renderAssociateDetails(selId);
        });
    }
});

async function loadAssociatePortal() {
    try {
        let associadosFamilia = [];
        let activeFamily = null;
        let activeContract = null;

        // PROTEÇÃO LGPD & KNOWLEDGE ITEMS:
        // Carregamos EXCLUSIVAMENTE a família do associado logado ou a primeira família ativa como sessão atual.
        // NUNCA concatenar outras famílias ou terceiros de todo o banco no seletor do associado!
        try {
            const rawFamilias = JSON.parse(localStorage.getItem('familias') || '[]');
            const rawContratos = JSON.parse(localStorage.getItem('contratos') || '[]');

            // Pegamos apenas A FAMÍLIA LOGADA (simulando pelo último ID ou primeiro da lista)
            if (rawFamilias.length > 0) {
                activeFamily = rawFamilias[rawFamilias.length - 1]; // Família mais recente ou autenticada
                
                // Buscar contrato desta família específica
                if (Array.isArray(activeFamily.contratos) && activeFamily.contratos.length > 0) {
                    activeContract = activeFamily.contratos[0];
                } else {
                    activeContract = rawContratos.find(c => String(c.familia_id || c.familyId) === String(activeFamily.id)) || {};
                }

                const planoFam = activeContract.plano || activeFamily.plano || 'Plano Assistencial Master';
                const valorFam = activeContract.valor || activeContract.valorMensalidade || 'R$ 89,90';
                const formaPag = String(activeContract.formaPagamento || activeContract.metodoPagamento || activeFamily.formaPagamento || 'pix_automatico').toLowerCase();

                // 1. Titular da Família
                if (activeFamily.titular) {
                    associadosFamilia.push({
                        id: activeFamily.id || 'titular-1',
                        nome: activeFamily.titular.nome || activeFamily.nome || 'Associado Titular',
                        cpf: activeFamily.titular.cpf || activeFamily.cpf || 'Não informado',
                        email: activeFamily.titular.email || activeFamily.email || 'Não informado',
                        phone: activeFamily.titular.telefone || activeFamily.telefone || '(00) 00000-0000',
                        plano: planoFam,
                        valor: valorFam,
                        formaPagamento: formaPag,
                        vencimento: activeContract.diaVencimento ? `Dia ${activeContract.diaVencimento} de cada mês` : 'Dia 10 de cada mês',
                        status: 'Ativo',
                        tipo: 'Titular',
                        date: activeContract.dataInicio || activeFamily.dataCadastro || '01/01/2026'
                    });
                }

                // 2. Dependente(s) DESTA MESMA FAMÍLIA exclusivamente
                if (Array.isArray(activeFamily.dependentes)) {
                    activeFamily.dependentes.forEach((dep, i) => {
                        associadosFamilia.push({
                            id: dep.id || `dep-${i}`,
                            nome: dep.nome || 'Dependente',
                            cpf: dep.cpf || 'Não informado',
                            email: dep.email || (activeFamily.titular ? activeFamily.titular.email : ''),
                            phone: dep.telefone || (activeFamily.titular ? activeFamily.titular.telefone : ''),
                            plano: planoFam,
                            valor: 'Incluso no Titular',
                            formaPagamento: formaPag,
                            vencimento: 'Vinculado ao Titular',
                            status: 'Ativo',
                            tipo: dep.parentesco || 'Dependente',
                            date: activeFamily.dataCadastro || '01/01/2026'
                        });
                    });
                }
            }
        } catch(e) { console.warn('Erro ao carregar família da sessão:', e); }

        // Se banco completamente vazio no teste local, carregar apenas 1 Núcleo Familiar de Demonstração
        if (associadosFamilia.length === 0) {
            associadosFamilia = [
                {
                    id: 'demo-1',
                    nome: 'Tharso H. F. Santos',
                    cpf: '549.015.478-01',
                    email: 'contato@qualifysistemas.com.br',
                    phone: '(11) 98765-4321',
                    plano: 'QUALIFY MASTER FAMILIAR',
                    valor: 'R$ 149,90',
                    formaPagamento: 'pix_automatico',
                    vencimento: 'Dia 27 de cada mês',
                    status: 'Ativo',
                    tipo: 'Titular',
                    date: '27/07/2026'
                }
            ];
        }

        window.cachedAssociados = associadosFamilia;

        // Popular Seletor apenas com os membros da PRÓPRIA casa
        const select = document.getElementById('associateSelect');
        if (select) {
            select.innerHTML = associadosFamilia.map((a, idx) => `<option value="${a.id}" ${idx === 0 ? 'selected' : ''}>${a.nome} (${a.tipo})</option>`).join('');
        }

        // Renderizar primeiro da família (Titular)
        renderAssociateDetails(associadosFamilia[0].id);

    } catch(err) {
        console.error('Erro em loadAssociatePortal:', err);
    }
}

function renderAssociateDetails(id) {
    const list = window.cachedAssociados || [];
    const ass = list.find(a => String(a.id) === String(id)) || list[0];
    if (!ass) return;

    const setEl = (eid, val) => { const el = document.getElementById(eid); if (el) el.textContent = val; };
    setEl('userNameDisplay', ass.nome);
    setEl('userCpf', `CPF: ${ass.cpf}`);
    setEl('userEmail', ass.email);
    setEl('userPhone', ass.phone);
    setEl('memberSince', `Desde: ${ass.date}`);
    setEl('userPlanBadge', `${ass.plano} • ${ass.tipo}`);
    setEl('cardPlanName', ass.plano.toUpperCase());
    setEl('cardHolderName', ass.nome.toUpperCase());
    setEl('cardHolderCpf', ass.cpf);
    setEl('cardType', ass.tipo.toUpperCase());
    setEl('mensalidadeValor', ass.valor);
    setEl('proximoVencimento', ass.vencimento);

    // Renderizar Lógica Inteligente de Pagamento (PIX Automático vs Manual)
    const panel = document.getElementById('panelPaymentMethod');
    if (panel) {
        const isPixAutoOrCartao = ['pix_automatico', 'pix auto', 'pix automático', 'cartao', 'cartao_credito', 'cartão de crédito'].some(k => (ass.formaPagamento || '').includes(k));
        
        if (isPixAutoOrCartao || ass.tipo !== 'Titular') {
            panel.style.background = '#f0fdf4';
            panel.style.border = '1px solid #86efac';
            panel.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <div style="width: 44px; height: 44px; border-radius: 12px; background: #10b981; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;">
                        <i class="fas fa-check-double"></i>
                    </div>
                    <div>
                        <h4 style="font-size: 1.05rem; font-weight: 800; color: #166534; margin: 0;">Cobrança Automatizada Ativa</h4>
                        <span style="font-size: 0.8rem; font-weight: 700; color: #15803d;">PIX Automático / Cartão de Crédito</span>
                    </div>
                </div>
                <p style="font-size: 0.88rem; color: #166534; margin: 0 0 10px 0; line-height: 1.4;">
                    <strong>Não é necessário efetuar pagamento manual!</strong> O valor é liquidado de forma segura na data estipulada em seu contrato recorrente.
                </p>
                <div style="background: white; padding: 8px 14px; border-radius: 10px; border: 1px solid #bbf7d0; display: flex; align-items: center; justify-content: space-between; font-size: 0.82rem; color: #15803d; font-weight: 700;">
                    <span><i class="fas fa-lock me-2"></i> Recorrência Validada</span>
                    <span style="color: #10b981;">Em Dia • D-0</span>
                </div>
            `;
        } else {
            panel.style.background = '#fff8f1';
            panel.style.border = '1px solid #fed7aa';
            panel.innerHTML = `
                <h4 style="font-size: 1.05rem; font-weight: 800; color: #9a3412; margin: 0 0 10px 0;"><i class="fas fa-bolt text-warning me-2"></i> Pagamento Avulso (PIX Copia e Cola)</h4>
                <p style="font-size: 0.85rem; color: #7c2d12; margin-bottom: 14px;">Seu contrato está configurado para quitação manual. Copie o código abaixo para liquidar na data do vencimento:</p>
                <div style="display: flex; gap: 8px;">
                    <input id="pixCode" type="text" readonly value="00020126580014BR.GOV.BCB.PIX013636c4c14c-4b34-4c6e-a4e5-123456789abc5204000053039865802BR5925QUALIFY SISTEMAS6009SAO PAULO62070503***63048891" style="flex: 1; background: white; border: 1px solid #fdba74; border-radius: 10px; padding: 10px 14px; font-size: 0.85rem; color: #475569; outline: none; font-weight: 600;" />
                    <button id="copyPixCodeBtn" style="background: #ea580c; color: white; border: none; padding: 10px 18px; border-radius: 10px; font-weight: 800; cursor: pointer; transition: all 0.2s; white-space: nowrap;"><i class="fas fa-copy"></i> Copiar</button>
                </div>
            `;

            setTimeout(() => {
                const btnCopy = document.getElementById('copyPixCodeBtn');
                const inputPix = document.getElementById('pixCode');
                if (btnCopy && inputPix) {
                    btnCopy.onclick = () => {
                        inputPix.select();
                        navigator.clipboard?.writeText(inputPix.value).catch(()=>{});
                        const orig = btnCopy.innerHTML;
                        btnCopy.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                        btnCopy.style.background = '#10b981';
                        setTimeout(() => { btnCopy.innerHTML = orig; btnCopy.style.background = '#ea580c'; }, 2000);
                    };
                }
            }, 50);
        }
    }
}