/**
 * company-resolver.js — Resolução centralizada de empresa ativa
 * 
 * PROBLEMA RESOLVIDO: Antes havia 4+ padrões diferentes espalhados pelo código
 * para resolver o companyId. Agora tudo passa por aqui.
 * 
 * Uso:
 *   const id = window.getActiveCompanyId();        // retorna null se não encontrar
 *   const id = window.requireActiveCompanyId();     // lança erro se não encontrar
 *   const obj = window.getActiveCompany();          // retorna { id, name } ou null
 */

(function () {
    'use strict';

    /**
     * Retorna o objeto da empresa ativa { id, name } ou null
     */
    window.getActiveCompany = function () {
        // 1. Tentar 'activeCompany' parseado (formato principal)
        try {
            const stored = localStorage.getItem('activeCompany');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && parsed.id) return { id: parsed.id, name: parsed.name || '' };
            }
        } catch (_) { /* JSON inválido, seguir para fallbacks */ }

        // 2. Fallbacks por ordem de prioridade
        const fallbackId =
            localStorage.getItem('activeCompanyId') ||
            localStorage.getItem('empresaSelecionadaId') ||
            localStorage.getItem('companyId') ||
            null;

        if (fallbackId) {
            const fallbackName = localStorage.getItem('empresaSelecionadaNome') || '';
            return { id: fallbackId, name: fallbackName };
        }

        return null;
    };

    /**
     * Retorna apenas o ID da empresa ativa, ou null
     */
    window.getActiveCompanyId = function () {
        const company = window.getActiveCompany();
        return company ? company.id : null;
    };

    /**
     * Retorna o ID da empresa ativa ou lança erro se não encontrar.
     * Usar em operações que EXIGEM empresa (salvar, cobrar, etc.)
     */
    window.requireActiveCompanyId = function () {
        const id = window.getActiveCompanyId();
        if (!id) {
            throw new Error('Nenhuma empresa ativa selecionada. Vá em "Trocar Empresa" e selecione uma.');
        }
        return id;
    };

    /**
     * Normaliza o armazenamento: garante que 'activeCompany' esteja 
     * sempre no formato JSON correto { id, name }
     */
    window.normalizeActiveCompany = function () {
        const company = window.getActiveCompany();
        if (company) {
            try {
                localStorage.setItem('activeCompany', JSON.stringify(company));
            } catch (_) { }
        }
    };

    console.log('✅ company-resolver.js carregado — use getActiveCompanyId() ou requireActiveCompanyId()');
})();
