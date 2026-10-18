/**
 * Rotas de Boleto
 * Cria e consulta cobranças de Boleto (com suporte a QR Code PIX / Link via Woovi e registro no Supabase)
 */

const express = require('express');
const router = express.Router();
const wooviBankService = require('../services/wooviBank');

/**
 * POST /api/boleto - Criar cobrança de boleto
 */
router.post('/', async (req, res) => {
    try {
        const { empresaId, valor, descricao, pagador, vencimento, contratoNumero } = req.body;

        if (!empresaId) {
            return res.status(400).json({ error: 'empresaId é obrigatório', code: 'MISSING_COMPANY_ID' });
        }
        if (!valor || parseFloat(valor) <= 0) {
            return res.status(400).json({ error: 'Valor inválido' });
        }
        if (!vencimento) {
            return res.status(400).json({ error: 'Data de vencimento é obrigatória' });
        }

        const supabase = req.app.get('supabase');
        const cpfCnpj = (pagador?.cpf || pagador?.cnpj || '').replace(/\D/g, '');
        const nomePagador = pagador?.nome || 'Cliente';

        let wooviCharge = null;
        if (process.env.WOOVI_APP_ID && cpfCnpj) {
            try {
                wooviCharge = await wooviBankService.criarCobranca(
                    { id: empresaId, appId: process.env.WOOVI_APP_ID },
                    {
                        customer: {
                            name: nomePagador,
                            cpfCnpj: cpfCnpj,
                            email: pagador?.email,
                            phone: pagador?.telefone
                        },
                        value: parseFloat(valor),
                        description: descricao || `Boleto Contrato ${contratoNumero || ''}`,
                        dueDate: vencimento
                    }
                );
            } catch (wErr) {
                console.warn('⚠️ Aviso ao gerar QR Code PIX complementar para o boleto:', wErr.message);
            }
        }

        const payload = {
            company_id: empresaId,
            contrato_numero: String(contratoNumero || ''),
            tipo: 'boleto',
            billing_type: 'BOLETO',
            valor: parseFloat(valor),
            vencimento: vencimento,
            descricao: descricao || `Boleto Contrato ${contratoNumero || ''}`,
            status: 'pendente',
            status_display: 'Em Aberto',
            pagador_nome: nomePagador,
            pagador_documento: cpfCnpj,
            pagador_email: pagador?.email || null,
            pagador_telefone: pagador?.telefone || null,
            id_asaas: wooviCharge?.correlationID || null,
            invoice_id: wooviCharge?.correlationID || null,
            link_pagamento: wooviCharge?.paymentLinkUrl || null,
            invoice_url: wooviCharge?.paymentLinkUrl || null,
            qrcode: wooviCharge?.qrCodeImage || null,
            pix_copia_e_cola: wooviCharge?.brCode || null,
            banco: wooviCharge ? 'woovi' : 'qualify',
            metadata: {
                endereco: pagador?.endereco || {},
                criadoEm: new Date().toISOString()
            }
        };

        const { data: inserted, error: insertError } = await supabase
            .from('cobrancas')
            .insert([payload])
            .select()
            .single();

        if (insertError) throw insertError;

        return res.json({
            success: true,
            id: inserted.id,
            cobranca: inserted,
            paymentLink: inserted.link_pagamento,
            invoiceUrl: inserted.invoice_url,
            qrcode: inserted.qrcode,
            pixCopiaECola: inserted.pix_copia_e_cola,
            status: inserted.status,
            value: parseFloat(valor),
            dueDate: vencimento
        });
    } catch (error) {
        console.error('❌ Erro ao criar boleto:', error);
        return res.status(500).json({
            error: error.message || 'Erro ao gerar boleto',
            code: 'BOLETO_CREATION_ERROR'
        });
    }
});

/**
 * GET /api/boleto/:id - Consultar boleto
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const supabase = req.app.get('supabase');
        const { data, error } = await supabase
            .from('cobrancas')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error || !data) {
            return res.status(404).json({ error: 'Boleto não encontrado' });
        }

        return res.json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Erro ao consultar boleto' });
    }
});

module.exports = router;
