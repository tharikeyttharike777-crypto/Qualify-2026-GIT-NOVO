/**
 * Rotas de Boleto
 * Boleto desativado em favor da integração PIX da Woovi.
 */

const express = require('express');
const router = express.Router();

/**
 * POST /api/boleto - Criar boleto
 */
router.post('/', async (req, res) => {
    return res.status(501).json({
        error: 'Geração de boletos desativada na nova integração. Utilize PIX ou Assinatura PIX.',
        code: 'BOLETO_DISABLED'
    });
});

/**
 * GET /api/boleto/:id - Consultar boleto
 */
router.get('/:id', async (req, res) => {
    return res.status(501).json({
        error: 'Consulta de boletos desativada.',
        code: 'BOLETO_DISABLED'
    });
});

module.exports = router;
