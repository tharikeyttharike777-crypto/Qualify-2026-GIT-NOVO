import { createClient } from '@supabase/supabase-js';

// Usar variáveis de ambiente do Vite no futuro.
// Por enquanto, usando placeholders para evitar erros caso não haja .env ainda.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sua-url-supabase.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sua-chave-anon-aqui';

const rawClient = createClient(supabaseUrl, supabaseAnonKey);

export const getActiveCompanyId = () => {
  return localStorage.getItem('activeCompanyId') ||
         localStorage.getItem('empresaSelecionadaId') ||
         localStorage.getItem('companyId') ||
         null;
};

// ─── ISOLAMENTO MULTIEMPRESA (BLINDAGEM CENTRAL) ─────────────────────
// Toda tabela listada aqui pertence a uma empresa. Qualquer leitura,
// atualização ou exclusão recebe automaticamente o filtro company_id da
// empresa ativa; inserções recebem o company_id da empresa ativa.
// Sem empresa ativa, a consulta usa um ID inexistente e retorna VAZIO —
// nunca a tabela inteira.
const TENANT_TABLES = new Set([
  'familias',
  'contratos',
  'planos',
  'produtos',
  'servicos',
  'cobrancas',
  'contas_pagar',
  'contas_receber'
]);

const NO_COMPANY = '00000000-0000-0000-0000-000000000000';

const companyOrBlock = () => getActiveCompanyId() || NO_COMPANY;

function withCompany(rows) {
  const companyId = getActiveCompanyId();
  if (!companyId) {
    throw new Error('Nenhuma empresa selecionada. Selecione uma empresa antes de salvar.');
  }
  const apply = (row) => ({ ...row, company_id: companyId });
  return Array.isArray(rows) ? rows.map(apply) : apply(rows);
}

function tenantFrom(table) {
  const qb = rawClient.from(table);
  if (!TENANT_TABLES.has(table)) return qb;

  return {
    select: (...args) => qb.select(...args).eq('company_id', companyOrBlock()),
    update: (...args) => qb.update(...args).eq('company_id', companyOrBlock()),
    delete: (...args) => qb.delete(...args).eq('company_id', companyOrBlock()),
    insert: (rows, opts) => qb.insert(withCompany(rows), opts),
    upsert: (rows, opts) => qb.upsert(withCompany(rows), opts)
  };
}

// Cliente usado pelo sistema interno (painel): isolado por empresa.
export const supabase = new Proxy(rawClient, {
  get(target, prop) {
    if (prop === 'from') return tenantFrom;
    const value = target[prop];
    return typeof value === 'function' ? value.bind(target) : value;
  }
});

// Cliente sem filtro automático — usar SOMENTE em páginas públicas
// (Área do Associado, Catálogo público), que não têm empresa ativa.
export const supabasePublic = rawClient;
