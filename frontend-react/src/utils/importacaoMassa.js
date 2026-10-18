// ═══════════════════════════════════════════════════════════════════
//  IMPORTAÇÃO EM MASSA — Famílias + Contratos (migração de outros sistemas, ex: Progem)
//  Lê planilhas (.xlsx / .xls / .csv), reconhece as colunas automaticamente,
//  agrupa titular + dependentes + contratos, valida e grava no Supabase
//  no MESMO formato usado pela tela "Nova Família".
// ═══════════════════════════════════════════════════════════════════
import * as XLSX from 'xlsx';

// ─── Texto ─────────────────────────────────────────────────────────
export function normalizar(str) {
  return String(str ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const limpar = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
export const soDigitos = (v) => String(v ?? '').replace(/\D/g, '');

// ─── Campos reconhecidos pelo importador ───────────────────────────
// grupo: usado só para organizar a tela de mapeamento
export const CAMPOS = [
  // Agrupamento / identificação
  { key: 'contrato_numero', label: 'Nº do contrato', grupo: 'Contrato', aliases: ['contrato', 'n contrato', 'numero contrato', 'numero do contrato', 'nro contrato', 'num contrato', 'cod contrato', 'codigo contrato', 'codigo do contrato', 'id contrato', 'contrato numero', 'proposta', 'n proposta', 'numero proposta', 'n do contrato'] },
  { key: 'grupo_familia', label: 'Código da família', grupo: 'Contrato', dica: 'Opcional. Agrupa titular e dependentes quando não houver nº de contrato.', aliases: ['familia', 'cod familia', 'codigo familia', 'id familia', 'codigo da familia', 'matricula titular', 'cod titular', 'codigo titular', 'id titular', 'grupo familiar'] },
  { key: 'tipo_membro', label: 'Tipo (Titular / Dependente)', grupo: 'Pessoa', dica: 'Use quando titular e dependentes estiverem em linhas separadas.', aliases: ['tipo', 'tipo pessoa', 'tipo associado', 'tipo beneficiario', 'tipo de beneficiario', 'titularidade', 'titular dependente', 'titular ou dependente', 'categoria', 'condicao', 'tipo vinculo'] },
  { key: 'parentesco', label: 'Parentesco', grupo: 'Pessoa', aliases: ['parentesco', 'grau parentesco', 'grau de parentesco', 'vinculo', 'relacao', 'grau'] },

  // Pessoa (titular — ou o dependente, quando cada pessoa estiver em uma linha)
  { key: 'nome', label: 'Nome', grupo: 'Pessoa', obrigatorio: true, aliases: ['nome', 'nome completo', 'nome titular', 'nome do titular', 'titular', 'cliente', 'nome cliente', 'nome do cliente', 'associado', 'nome associado', 'nome do associado', 'contratante', 'nome contratante', 'beneficiario', 'nome beneficiario', 'nome pessoa'] },
  { key: 'cpf', label: 'CPF', grupo: 'Pessoa', obrigatorio: true, aliases: ['cpf', 'cpf titular', 'cpf do titular', 'cpf cnpj', 'documento', 'cpf cliente', 'cpf associado', 'cpf contratante', 'cpf beneficiario', 'n cpf', 'numero cpf', 'cpf pessoa'] },
  { key: 'nascimento', label: 'Data de nascimento', grupo: 'Pessoa', tipo: 'data', aliases: ['nascimento', 'data nascimento', 'data de nascimento', 'dt nascimento', 'dt nasc', 'data nasc', 'dta nascimento', 'dt de nascimento', 'aniversario', 'nasc'] },
  { key: 'sexo', label: 'Sexo', grupo: 'Pessoa', aliases: ['sexo', 'genero'] },
  { key: 'rg', label: 'RG', grupo: 'Pessoa', aliases: ['rg', 'identidade', 'n rg', 'numero rg', 'rg ie', 'documento identidade'] },
  { key: 'email', label: 'E-mail', grupo: 'Pessoa', aliases: ['email', 'e mail', 'correio eletronico', 'endereco eletronico', 'email titular'] },
  { key: 'celular', label: 'Celular / Telefone', grupo: 'Pessoa', aliases: ['celular', 'telefone', 'fone', 'whatsapp', 'whats', 'tel', 'telefone celular', 'celular 1', 'telefone 1', 'fone 1', 'contato', 'telefones', 'fone celular', 'tel celular'] },
  { key: 'profissao', label: 'Profissão', grupo: 'Pessoa', aliases: ['profissao', 'ocupacao'] },

  // Endereço
  { key: 'cep', label: 'CEP', grupo: 'Endereço', aliases: ['cep', 'codigo postal'] },
  { key: 'rua', label: 'Endereço (rua)', grupo: 'Endereço', aliases: ['endereco', 'logradouro', 'rua', 'end', 'endereco residencial', 'av rua', 'rua av'] },
  { key: 'numero_end', label: 'Número', grupo: 'Endereço', aliases: ['numero', 'num', 'nro', 'numero casa', 'numero residencia', 'numero endereco', 'n casa'] },
  { key: 'complemento', label: 'Complemento', grupo: 'Endereço', aliases: ['complemento', 'compl'] },
  { key: 'bairro', label: 'Bairro', grupo: 'Endereço', aliases: ['bairro'] },
  { key: 'cidade', label: 'Cidade', grupo: 'Endereço', aliases: ['cidade', 'municipio', 'localidade'] },
  { key: 'estado', label: 'UF', grupo: 'Endereço', aliases: ['uf', 'estado'] },

  // Contrato
  { key: 'plano', label: 'Plano', grupo: 'Contrato', aliases: ['plano', 'nome plano', 'plano contratado', 'produto', 'tipo plano', 'nome do plano', 'descricao plano', 'plano atual'] },
  { key: 'valor', label: 'Valor da mensalidade', grupo: 'Contrato', tipo: 'moeda', aliases: ['valor', 'mensalidade', 'valor mensal', 'valor mensalidade', 'valor plano', 'valor parcela', 'vlr mensalidade', 'vl mensalidade', 'valor do plano', 'valor contrato', 'valor da mensalidade', 'vlr parcela', 'vlr plano'] },
  { key: 'data_inicio', label: 'Data de adesão / início', grupo: 'Contrato', tipo: 'data', aliases: ['data adesao', 'adesao', 'data de adesao', 'dt adesao', 'data contrato', 'data do contrato', 'data inicio', 'inicio', 'data de inicio', 'data cadastro', 'dt cadastro', 'data inclusao', 'dt inclusao', 'inicio vigencia', 'vigencia', 'data assinatura', 'dt contrato'] },
  { key: 'dia_vencimento', label: 'Dia de vencimento', grupo: 'Contrato', aliases: ['dia vencimento', 'dia de vencimento', 'vencimento', 'dia pagamento', 'dia de pagamento', 'dia venc', 'venc', 'dt vencimento'] },
  { key: 'forma_pagamento', label: 'Forma de pagamento', grupo: 'Contrato', aliases: ['forma pagamento', 'forma de pagamento', 'pagamento', 'meio pagamento', 'meio de pagamento', 'tipo cobranca', 'tipo pagamento', 'modalidade pagamento', 'cobranca'] },
  { key: 'status', label: 'Status / Situação', grupo: 'Contrato', aliases: ['status', 'situacao', 'situacao contrato', 'status contrato', 'situacao do contrato'] },
  { key: 'parcelas', label: 'Nº de parcelas', grupo: 'Contrato', aliases: ['parcelas', 'qtd parcelas', 'numero parcelas', 'n parcelas', 'quantidade parcelas'] },
  { key: 'carencia', label: 'Carência (dias)', grupo: 'Contrato', aliases: ['carencia', 'dias carencia', 'carencia dias'] },
  { key: 'observacoes', label: 'Observações', grupo: 'Contrato', aliases: ['observacao', 'observacoes', 'obs'] },
];

export const CAMPOS_POR_KEY = Object.fromEntries(CAMPOS.map(c => [c.key, c]));

// Cabeçalhos de dependentes em colunas ("Dependente 1 Nome", "CPF Dep 2"...)
const RE_DEP = /\b(?:dep|dependente|dependentes|benef|beneficiario)\s*(\d{1,2})\b/;
const ehCabecalhoDependente = (h) => RE_DEP.test(h);
// Palavras que indicam que a coluna NÃO é do titular (evita "Nome da Mãe" virar Nome)
const RE_NAO_TITULAR = /\b(mae|pai|conjuge|vendedor|corretor|consultor|atendente|usuario|empresa|banco|cobrador|agencia|responsavel financeiro|indicacao|plano anterior)\b/;

// ─── Leitura do arquivo ────────────────────────────────────────────
function decodificarTexto(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^\uFEFF/, '');
  } catch {
    // Exportações de sistemas Windows (Progem incluso) costumam vir em ANSI/Latin-1
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

function detectarSeparador(texto) {
  const primeira = texto.split(/\r?\n/).find(l => l.trim()) || '';
  const candidatos = [';', ',', '\t', '|'];
  let melhor = ',', max = -1;
  for (const sep of candidatos) {
    let n = 0, aspas = false;
    for (const ch of primeira) {
      if (ch === '"') aspas = !aspas;
      else if (ch === sep && !aspas) n++;
    }
    if (n > max) { max = n; melhor = sep; }
  }
  return melhor;
}

export function parseCSV(texto) {
  const sep = detectarSeparador(texto);
  const linhas = [];
  let linha = [], campo = '', aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (aspas) {
      if (ch === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; }
        else aspas = false;
      } else campo += ch;
    } else if (ch === '"') {
      aspas = true;
    } else if (ch === sep) {
      linha.push(campo); campo = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo); linhas.push(linha);
      linha = []; campo = '';
    } else campo += ch;
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}

function pontuarCabecalho(linha) {
  const todosAliases = new Set(CAMPOS.flatMap(c => c.aliases));
  return linha.reduce((s, cel) => {
    const n = normalizar(cel);
    if (!n) return s;
    if (todosAliases.has(n) || ehCabecalhoDependente(n)) return s + 1;
    return s;
  }, 0);
}

/**
 * Lê um arquivo .xlsx/.xls/.ods/.csv/.txt e devolve cabeçalhos + linhas.
 * @returns {{ headers: string[], linhas: {linha:number, valores:any[]}[], abas: string[], abaAtual: string }}
 */
export async function lerArquivo(file, abaEscolhida) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const buffer = await file.arrayBuffer();
  let matriz = [];
  let abas = [];
  let abaAtual = '';

  if (ext === 'csv' || ext === 'txt') {
    matriz = parseCSV(decodificarTexto(buffer));
  } else {
    const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
    abas = wb.SheetNames;
    abaAtual = abaEscolhida && abas.includes(abaEscolhida)
      ? abaEscolhida
      : (abas.find(n => wb.Sheets[n]?.['!ref']) || abas[0]);
    matriz = XLSX.utils.sheet_to_json(wb.Sheets[abaAtual], { header: 1, raw: true, defval: '', blankrows: true });
  }

  // Detecta a linha de cabeçalho (relatórios às vezes têm título antes)
  let idxCab = -1, melhor = 0;
  for (let i = 0; i < Math.min(matriz.length, 25); i++) {
    const p = pontuarCabecalho(matriz[i] || []);
    if (p > melhor) { melhor = p; idxCab = i; }
  }
  if (idxCab === -1) {
    idxCab = matriz.findIndex(l => (l || []).filter(c => limpar(c)).length >= 2);
    if (idxCab === -1) idxCab = 0;
  }

  const cabBruto = matriz[idxCab] || [];
  const largura = Math.max(cabBruto.length, ...matriz.slice(idxCab + 1, idxCab + 50).map(l => (l || []).length));
  const vistos = {};
  const headers = Array.from({ length: largura }, (_, i) => {
    let h = limpar(cabBruto[i]) || `Coluna ${i + 1}`;
    if (vistos[h]) { vistos[h]++; h = `${h} (${vistos[h]})`; } else vistos[h] = 1;
    return h;
  });

  const linhas = [];
  for (let i = idxCab + 1; i < matriz.length; i++) {
    const valores = matriz[i] || [];
    if (!valores.some(v => limpar(v) !== '')) continue;
    linhas.push({ linha: i + 1, valores });
  }

  return { headers, linhas, abas, abaAtual };
}

// ─── Mapeamento automático de colunas ──────────────────────────────
export function autoMapear(headers) {
  const norm = headers.map(normalizar);
  const usados = new Set();
  const mapa = {};
  const livre = (i) => !usados.has(i) && !ehCabecalhoDependente(norm[i]);

  // 1ª passada: correspondência exata
  for (const campo of CAMPOS) {
    for (const alias of campo.aliases) {
      const idx = norm.findIndex((h, i) => h === alias && livre(i));
      if (idx !== -1) { mapa[campo.key] = idx; usados.add(idx); break; }
    }
  }
  // 2ª passada: cabeçalho contém o alias (palavra inteira)
  for (const campo of CAMPOS) {
    if (mapa[campo.key] !== undefined) continue;
    for (const alias of campo.aliases) {
      if (alias.length < 4) continue;
      const idx = norm.findIndex((h, i) => livre(i) && !RE_NAO_TITULAR.test(h) && (` ${h} `).includes(` ${alias} `));
      if (idx !== -1) { mapa[campo.key] = idx; usados.add(idx); break; }
    }
  }
  return mapa;
}

/** Detecta dependentes em colunas: "Dependente 1 Nome", "CPF Dep 2", "Nasc. Dependente 3"... */
export function detectarDependentesEmColunas(headers) {
  const porNumero = {};
  headers.forEach((hRaw, idx) => {
    const h = normalizar(hRaw);
    const m = h.match(RE_DEP);
    if (!m) return;
    const n = parseInt(m[1], 10);
    const resto = h.replace(m[0], ' ').trim();
    let sub = null;
    if (/\bcpf\b/.test(resto)) sub = 'cpf';
    else if (/nasc|aniver/.test(resto)) sub = 'nascimento';
    else if (/parent|grau|vinculo|relacao/.test(resto)) sub = 'parentesco';
    else if (/sexo|genero/.test(resto)) sub = 'sexo';
    else if (/cel|tel|fone|whats/.test(resto)) sub = 'celular';
    else if (/\brg\b/.test(resto)) sub = 'rg';
    else if (resto === '' || /nome/.test(resto)) sub = 'nome';
    if (!sub) return;
    porNumero[n] = porNumero[n] || { n, campos: {} };
    if (porNumero[n].campos[sub] === undefined) porNumero[n].campos[sub] = idx;
  });
  return Object.values(porNumero).filter(d => d.campos.nome !== undefined).sort((a, b) => a.n - b.n);
}

// ─── Conversores de valores ────────────────────────────────────────
export function normalizarCPF(v) {
  if (v === null || v === undefined || v === '') return '';
  let d = typeof v === 'number' ? String(Math.round(v)) : soDigitos(v);
  if (!d) return '';
  // Excel costuma "comer" os zeros à esquerda do CPF
  if (d.length >= 8 && d.length < 11) d = d.padStart(11, '0');
  if (d.length > 11 && d.length < 14) d = d.padStart(14, '0');
  return d;
}

export function formatarCPF(d) {
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return d;
}

export function cpfValido(d) {
  if (d.length === 14) return true; // CNPJ: aceita sem checar dígitos
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += parseInt(base[i], 10) * (base.length + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(d.slice(0, 9)) === parseInt(d[9], 10) && calc(d.slice(0, 10)) === parseInt(d[10], 10);
}

export function formatarCelular(v) {
  let d = typeof v === 'number' ? String(Math.round(v)) : soDigitos(v);
  if (!d) return '';
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  if (d.length > 11 && d.startsWith('0')) d = d.replace(/^0+/, '');
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return d;
}

export function formatarCEP(v) {
  let d = typeof v === 'number' ? String(Math.round(v)) : soDigitos(v);
  if (!d) return '';
  if (d.length < 8 && d.length >= 5) d = d.padStart(8, '0');
  return d.length === 8 ? d.replace(/(\d{5})(\d{3})/, '$1-$2') : d;
}

const ymd = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
function dataValida(y, m, d) {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Converte data em qualquer formato comum → 'YYYY-MM-DD'. Retorna null se inválida, '' se vazia. */
export function normalizarData(v) {
  if (v === null || v === undefined || limpar(v) === '') return '';
  if (v instanceof Date && !isNaN(v)) return ymd(v.getFullYear(), v.getMonth() + 1, v.getDate());
  if (typeof v === 'number') {
    // Número de série do Excel
    if (v > 59 && v < 80000) {
      const dt = new Date(Math.round((v - 25569) * 86400000));
      return ymd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
    }
    v = String(v);
  }
  const s = limpar(v);
  let m, y, mo, d;
  if ((m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/))) {
    d = +m[1]; mo = +m[2]; y = +m[3];
    if (m[3].length === 2) y += (y <= (new Date().getFullYear() % 100) ? 2000 : 1900);
  } else if ((m = s.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/))) {
    y = +m[1]; mo = +m[2]; d = +m[3];
  } else if ((m = s.match(/^(\d{4})(\d{2})(\d{2})$/)) && +m[1] > 1900) {
    y = +m[1]; mo = +m[2]; d = +m[3];
  } else if ((m = s.match(/^(\d{2})(\d{2})(\d{4})$/))) {
    d = +m[1]; mo = +m[2]; y = +m[3];
  } else return null;
  return dataValida(y, mo, d) ? ymd(y, mo, d) : null;
}

/** "R$ 1.234,56" / "89,90" / 89.9 → 89.9 */
export function normalizarValor(v) {
  if (v === null || v === undefined || limpar(v) === '') return null;
  if (typeof v === 'number') return Math.round(v * 100) / 100;
  let s = String(v).replace(/[^\d,.-]/g, '');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if ((s.match(/\./g) || []).length > 1 || /^\d{1,3}\.\d{3}$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : Math.round(n * 100) / 100;
}

export function mapearStatus(v) {
  const s = normalizar(v);
  if (!s) return 'ativo';
  if (/cancel|encerr|inativ|rescin|desist|exclu|obito|falecid|baixad|distrat/.test(s)) return 'cancelado';
  if (/inadimp|atras|debito|suspen|bloque|devedor|vencid/.test(s)) return 'inadimplente';
  if (/pend|aguard|analise/.test(s)) return 'pendente';
  return 'ativo';
}

export function mapearFormaPagamento(v, padrao = 'Pix') {
  const s = normalizar(v);
  if (!s) return padrao;
  if (/pix/.test(s) && /auto|recorr/.test(s)) return 'Pix Automático';
  if (/pix/.test(s)) return 'Pix';
  if (/cartao|credito|card/.test(s)) return 'Cartão';
  if (/dinheiro|especie|balcao/.test(s)) return 'Dinheiro';
  // Mantém o nome original (ex: Boleto, Carnê, Débito em conta, Cobrador)
  return limpar(v).replace(/\b\w/g, c => c.toUpperCase());
}

export function mapearSexo(v) {
  const s = normalizar(v);
  if (/^(m|masc|masculino|homem|h)$/.test(s)) return 'masculino';
  if (/^(f|fem|feminino|mulher)$/.test(s)) return 'feminino';
  return '';
}

export function mapearParentesco(v) {
  const s = normalizar(v);
  if (!s) return 'Outro';
  if (/enteado|enteada/.test(s)) return 'Enteado(a)';
  if (/filh/.test(s)) return 'Filho(a)';
  if (/conjug|espos|marid|companheir|esposa|mulher|convivente/.test(s)) return 'Cônjuge';
  if (/^(pai|mae)\b|genitor|\bpai\b|\bmae\b/.test(s)) return 'Pai/Mãe';
  if (/\bnet[oa]s?\b/.test(s)) return 'Neto(a)';
  return 'Outro';
}

const TITULARES = new Set(['titular', 'tit', 't', 'responsavel', 'contratante', 'principal', 'proprio', 'o proprio', 'a propria', 'propria', 'socio', 'socio titular', 'associado titular', 'beneficiario titular', 'titular do contrato', 'cliente']);
const ehTitularTipo = (v) => { const s = normalizar(v); return !s || TITULARES.has(s) || s.startsWith('titular'); };

function inteiro(v) {
  const n = parseInt(soDigitos(v), 10);
  return isNaN(n) ? null : n;
}

function diaVencimento(v) {
  if (v === null || v === undefined || limpar(v) === '') return null;
  if (typeof v === 'number' && v > 31) {
    const d = normalizarData(v);
    return d ? parseInt(d.slice(8, 10), 10) : null;
  }
  const s = limpar(v);
  if (/[/\-.]/.test(s)) {
    const d = normalizarData(s);
    return d ? parseInt(d.slice(8, 10), 10) : null;
  }
  const n = inteiro(s);
  return n && n >= 1 && n <= 31 ? n : null;
}

export function normalizarNumeroContrato(v) {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'number' ? String(Math.round(v)) : limpar(v);
  if (!s) return '';
  return /^\d+$/.test(s) && s.length < 6 ? s.padStart(6, '0') : s;
}

// ═══════════════════════════════════════════════════════════════════
//  PROCESSAMENTO: linhas → famílias (titular + dependentes + contratos)
// ═══════════════════════════════════════════════════════════════════
/**
 * @param {object} p
 * @param {{linha:number, valores:any[]}[]} p.linhas
 * @param {Record<string, number>} p.mapeamento   key do campo → índice da coluna
 * @param {Array} p.depColunas                    resultado de detectarDependentesEmColunas (já filtrado pelo usuário)
 * @param {object} p.opcoes                       { formaPagamentoPadrao, dePara: {planoNormalizado: nomeQualify}, duplicados: 'pular'|'vincular' }
 * @param {object} p.contexto                     { planos: [{nome, valor}], familiasExistentes: Map<cpf, familiaRow> }
 */
export function processarLinhas({ linhas, mapeamento, depColunas = [], opcoes = {}, contexto = {} }) {
  const temCampo = (k) => mapeamento[k] !== undefined && mapeamento[k] !== null && mapeamento[k] !== '' && mapeamento[k] >= 0;
  const get = (vals, k) => (temCampo(k) ? vals[mapeamento[k]] : '');
  const temTipo = temCampo('tipo_membro');
  const temParentesco = temCampo('parentesco');

  // 1) Extrai cada linha
  const registros = linhas.map(({ linha, valores }) => {
    const r = { linha };
    for (const c of CAMPOS) r[c.key] = get(valores, c.key);
    r.chave = limpar(r.grupo_familia) ? `F:${limpar(r.grupo_familia)}` : (limpar(r.contrato_numero) ? `C:${normalizarNumeroContrato(r.contrato_numero)}` : '');
    r.ehDependente = temTipo ? !ehTitularTipo(r.tipo_membro) : (temParentesco ? !ehTitularTipo(r.parentesco) : false);
    // Dependentes em colunas na mesma linha
    r.depsColunas = depColunas.map(dc => {
      const g = (sub) => (dc.campos[sub] !== undefined ? valores[dc.campos[sub]] : '');
      return { linha, nome: g('nome'), cpf: g('cpf'), nascimento: g('nascimento'), parentesco: g('parentesco'), sexo: g('sexo'), celular: g('celular'), rg: g('rg') };
    }).filter(d => limpar(d.nome));
    return r;
  });

  // 2) Agrupa em "grupos de contrato" (titular + dependentes)
  const grupos = [];
  const porChave = new Map();
  let ultimo = null;
  const novoGrupo = (chave) => {
    const g = { chave, titulares: [], dependentes: [], linhas: [] };
    grupos.push(g);
    if (chave) porChave.set(chave, g);
    return g;
  };

  for (const r of registros) {
    let g;
    if (r.ehDependente) {
      g = r.chave ? (porChave.get(r.chave) || novoGrupo(r.chave)) : ultimo;
      if (!g) { g = novoGrupo(''); g.orfao = true; }
      g.dependentes.push({ ...r, parentesco: r.parentesco || r.tipo_membro });
    } else {
      g = r.chave ? (porChave.get(r.chave) || novoGrupo(r.chave)) : novoGrupo('');
      g.titulares.push(r);
      ultimo = g;
    }
    g.linhas.push(r.linha);
    for (const d of r.depsColunas) g.dependentes.push(d);
  }

  // 3) Junta grupos do mesmo titular (mesmo CPF) numa única família
  const familias = [];
  const porCpf = new Map();
  const planosQualify = contexto.planos || [];
  const planoPorNome = new Map(planosQualify.map(p => [normalizar(p.nome), p]));
  const dePara = opcoes.dePara || {};

  for (const g of grupos) {
    const erros = [], avisos = [];
    if (!g.titulares.length) {
      erros.push(g.orfao
        ? 'Dependente(s) sem titular acima na planilha.'
        : `Dependente(s) sem titular no grupo ${g.chave.slice(2)}.`);
    }

    // Titular: 1ª linha de titular, completando campos vazios com as demais
    const base = g.titulares[0] || g.dependentes[0] || {};
    const tit = { ...base };
    for (const t of g.titulares.slice(1)) {
      for (const c of CAMPOS) if (!limpar(tit[c.key]) && limpar(t[c.key])) tit[c.key] = t[c.key];
    }
    const cpfsTit = new Set(g.titulares.map(t => normalizarCPF(t.cpf)).filter(Boolean));
    if (cpfsTit.size > 1) erros.push(`Mais de um titular diferente no mesmo grupo (${g.chave.slice(2) || 'sem código'}).`);

    // Contratos: cada linha de titular com dados de contrato
    const contratos = [];
    const vistosNum = new Set();
    for (const t of (g.titulares.length ? g.titulares : [])) {
      const numeroOrigem = normalizarNumeroContrato(t.contrato_numero);
      if (numeroOrigem && vistosNum.has(numeroOrigem)) {
        avisos.push(`Linha ${t.linha}: contrato ${numeroOrigem} repetido — linha usada só para completar dados.`);
        continue;
      }
      if (numeroOrigem) vistosNum.add(numeroOrigem);

      const planoOrigem = limpar(t.plano);
      const pn = normalizar(planoOrigem);
      let plano = planoOrigem;
      let planoQualify = null;
      if (pn && dePara[pn] && dePara[pn] !== '__manter__') {
        plano = dePara[pn];
        planoQualify = planoPorNome.get(normalizar(plano)) || null;
      } else if (pn && planoPorNome.has(pn)) {
        planoQualify = planoPorNome.get(pn);
        plano = planoQualify.nome;
      }

      let valor = normalizarValor(t.valor);
      if (valor === null && planoQualify?.valor) valor = normalizarValor(planoQualify.valor);

      const dataInicio = normalizarData(t.data_inicio);
      if (dataInicio === null) avisos.push(`Linha ${t.linha}: data de adesão "${limpar(t.data_inicio)}" não reconhecida.`);

      contratos.push({
        linha: t.linha,
        numeroOrigem,
        plano: plano || '',
        planoOrigem,
        planoEncontrado: !!planoQualify,
        valor,
        dataInicio: dataInicio || '',
        diaVencimento: diaVencimento(t.dia_vencimento),
        formaPagamento: mapearFormaPagamento(t.forma_pagamento, opcoes.formaPagamentoPadrao || 'Pix'),
        status: mapearStatus(t.status),
        statusOrigem: limpar(t.status),
        parcelas: inteiro(t.parcelas) || 12,
        carencia: inteiro(t.carencia),
        observacoes: limpar(t.observacoes),
      });
    }
    if (g.titulares.length && !contratos.length) erros.push('Nenhum contrato válido encontrado.');
    for (const c of contratos) {
      if (!c.plano) avisos.push(`Contrato ${c.numeroOrigem || `(linha ${c.linha})`}: sem plano informado.`);
      else if (!c.planoEncontrado) avisos.push(`Plano "${c.plano}" não existe no Qualify — será gravado com esse nome.`);
      if (c.valor === null) avisos.push(`Contrato ${c.numeroOrigem || `(linha ${c.linha})`}: sem valor de mensalidade.`);
    }
    const planosDoGrupo = Array.from(new Set(contratos.map(c => c.plano || 'Plano Familiar').filter(Boolean)));

    // Titular normalizado (mesmo formato da tela Nova Família)
    const cpfTit = normalizarCPF(tit.cpf);
    const nascTit = normalizarData(tit.nascimento);
    if (!limpar(tit.nome)) erros.push('Titular sem nome.');
    if (!cpfTit) erros.push('Titular sem CPF.');
    else if (!cpfValido(cpfTit)) avisos.push(`CPF do titular ${formatarCPF(cpfTit)} parece inválido.`);
    if (nascTit === null) avisos.push(`Data de nascimento do titular "${limpar(tit.nascimento)}" não reconhecida.`);
    if (!soDigitos(tit.celular)) avisos.push('Titular sem celular.');

    const titular = {
      idSequencial: '',
      nome: limpar(tit.nome),
      dataNascimento: nascTit || '',
      email: limpar(tit.email).toLowerCase(),
      sexo: mapearSexo(tit.sexo) || 'masculino',
      rg: limpar(tit.rg),
      cpf: formatarCPF(cpfTit),
      celular: formatarCelular(tit.celular),
      profissao: limpar(tit.profissao),
      psicologo: '',
      seguradora: '',
      ...(planosDoGrupo.length ? { produtoVinculado: planosDoGrupo } : {}),
    };

    const endereco = {
      cep: formatarCEP(tit.cep),
      rua: limpar(tit.rua),
      numero: limpar(typeof tit.numero_end === 'number' ? String(tit.numero_end) : tit.numero_end),
      bairro: limpar(tit.bairro),
      cidade: limpar(tit.cidade),
      estado: limpar(tit.estado).toUpperCase().slice(0, 2),
      complemento: limpar(tit.complemento),
    };

    // Dependentes
    const dependentes = [];
    const chavesDep = new Set();
    for (const d of g.dependentes) {
      const nome = limpar(d.nome);
      if (!nome) continue;
      const cpf = normalizarCPF(d.cpf);
      if (cpf && cpf === cpfTit) continue; // o próprio titular repetido
      const nasc = normalizarData(d.nascimento);
      const k = cpf || `${normalizar(nome)}|${nasc || ''}`;
      if (chavesDep.has(k)) continue;
      chavesDep.add(k);
      if (nasc === null) avisos.push(`Dependente ${nome}: data de nascimento "${limpar(d.nascimento)}" não reconhecida.`);
      const parentescoOrig = limpar(d.parentesco);
      const parentesco = mapearParentesco(parentescoOrig);
      const sx = mapearSexo(d.sexo);
      dependentes.push({
        idSequencial: '',
        nome,
        parentesco,
        ...(parentesco === 'Outro' && parentescoOrig && normalizar(parentescoOrig) !== 'dependente' ? { parentesco_origem: parentescoOrig } : {}),
        carencia: 'padrao',
        dataNascimento: nasc || '',
        cpf: cpf ? formatarCPF(cpf) : '',
        genero: sx ? sx[0].toUpperCase() + sx.slice(1) : '',
        celular: formatarCelular(d.celular),
        rg: limpar(d.rg),
        psicologo: '',
        seguradora: '',
        ...(planosDoGrupo.length ? { produtoVinculado: [...planosDoGrupo] } : {}),
      });
    }

    const fam = {
      chave: cpfTit || `semcpf-${familias.length}`,
      linhas: [...g.linhas],
      titular, endereco, dependentes, contratos,
      erros, avisos,
    };

    // Mescla com família já vista (mesmo CPF)
    const existenteNaPlanilha = cpfTit && porCpf.get(cpfTit);
    if (existenteNaPlanilha && !erros.length) {
      const f = existenteNaPlanilha;
      f.linhas.push(...fam.linhas);
      const numsF = new Set(f.contratos.map(c => c.numeroOrigem).filter(Boolean));
      for (const c of fam.contratos) if (!c.numeroOrigem || !numsF.has(c.numeroOrigem)) f.contratos.push(c);
      const kd = new Set(f.dependentes.map(d => soDigitos(d.cpf) || `${normalizar(d.nome)}|${d.dataNascimento}`));
      for (const d of fam.dependentes) {
        const k = soDigitos(d.cpf) || `${normalizar(d.nome)}|${d.dataNascimento}`;
        if (!kd.has(k)) { f.dependentes.push(d); kd.add(k); }
        else {
          const ex = f.dependentes.find(x => (soDigitos(x.cpf) || `${normalizar(x.nome)}|${x.dataNascimento}`) === k);
          if (ex && d.produtoVinculado) ex.produtoVinculado = Array.from(new Set([...(ex.produtoVinculado || []), ...d.produtoVinculado]));
        }
      }
      const planosF = Array.from(new Set([...(f.titular.produtoVinculado || []), ...(titular.produtoVinculado || [])]));
      if (planosF.length) f.titular.produtoVinculado = planosF;
      for (const k of Object.keys(f.titular)) if (!f.titular[k] && titular[k]) f.titular[k] = titular[k];
      for (const k of Object.keys(f.endereco)) if (!f.endereco[k] && endereco[k]) f.endereco[k] = endereco[k];
      f.avisos.push(...avisos.filter(a => !f.avisos.includes(a)));
      continue;
    }

    familias.push(fam);
    if (cpfTit && !erros.length) porCpf.set(cpfTit, fam);
  }

  // 4) Situação final + família já existente no Qualify
  const existentes = contexto.familiasExistentes || new Map();
  for (const f of familias) {
    f.avisos = Array.from(new Set(f.avisos));
    const cpf = soDigitos(f.titular.cpf);
    f.existente = cpf ? existentes.get(cpf) || null : null;
    if (f.erros.length) f.situacao = 'erro';
    else if (f.existente) f.situacao = 'existente';
    else if (f.avisos.length) f.situacao = 'aviso';
    else f.situacao = 'ok';
  }

  const resumo = {
    linhas: linhas.length,
    familias: familias.length,
    contratos: familias.reduce((s, f) => s + f.contratos.length, 0),
    dependentes: familias.reduce((s, f) => s + f.dependentes.length, 0),
    ok: familias.filter(f => f.situacao === 'ok').length,
    aviso: familias.filter(f => f.situacao === 'aviso').length,
    erro: familias.filter(f => f.situacao === 'erro').length,
    existente: familias.filter(f => f.situacao === 'existente').length,
  };
  return { familias, resumo };
}

/** Lista nomes de plano distintos da planilha (para o De-Para). */
export function planosDaPlanilha(linhas, mapeamento) {
  const idx = mapeamento.plano;
  if (idx === undefined || idx === null || idx < 0) return [];
  const cont = new Map();
  for (const { valores } of linhas) {
    const nome = limpar(valores[idx]);
    if (!nome) continue;
    const k = normalizar(nome);
    const atual = cont.get(k) || { nome, chave: k, qtd: 0 };
    atual.qtd++;
    cont.set(k, atual);
  }
  return Array.from(cont.values()).sort((a, b) => b.qtd - a.qtd);
}

// ═══════════════════════════════════════════════════════════════════
//  GRAVAÇÃO NO SUPABASE
// ═══════════════════════════════════════════════════════════════════
const HISTORICO_KEY = 'historicoImportacoes';

export function lerHistorico() {
  try { return JSON.parse(localStorage.getItem(HISTORICO_KEY) || '[]'); } catch { return []; }
}
function salvarHistorico(lista) {
  try { localStorage.setItem(HISTORICO_KEY, JSON.stringify(lista.slice(0, 30))); } catch { /* sem espaço */ }
}

function maiorIdSequencial(fams) {
  let max = 0;
  for (const fam of fams || []) {
    const tit = fam.titular || {};
    const t = parseInt(String(tit.idSequencial || tit.id_sequencial || '0').replace(/\D/g, ''), 10);
    if (!isNaN(t) && t > max) max = t;
    for (const d of fam.dependentes || []) {
      const n = parseInt(String(d.idSequencial || d.id_sequencial || d.numero_associado || '0').replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    }
  }
  return max;
}

async function emLotes(itens, tamanho, fn) {
  for (let i = 0; i < itens.length; i += tamanho) await fn(itens.slice(i, i + tamanho));
}

async function pool(itens, concorrencia, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(concorrencia, itens.length) }, async () => {
    while (i < itens.length) {
      const idx = i++;
      await fn(itens[idx], idx);
    }
  });
  await Promise.all(workers);
}

/**
 * Grava as famílias selecionadas.
 * @returns {Promise<{registro: object, resultados: object[]}>}
 */
export async function executarImportacao({ supabase, familias, opcoes, companyId, nomeArquivo, onProgresso }) {
  const loteId = `IMP-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}`;
  const agora = new Date().toISOString();
  const sistemaOrigem = opcoes.sistemaOrigem || 'Progem';
  const effectiveCompanyId = companyId || localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId') || null;

  // Numeração sequencial isolada para a empresa ativa
  let qFams = supabase.from('familias').select('titular, dependentes');
  if (effectiveCompanyId) qFams = qFams.eq('company_id', effectiveCompanyId);
  const { data: famsTodas } = await qFams;
  let proxId = maiorIdSequencial(famsTodas) + 1;

  let qNums = supabase.from('contratos').select('numero');
  if (effectiveCompanyId) qNums = qNums.eq('company_id', effectiveCompanyId);
  const { data: numsTodos } = await qNums;
  const numerosUsados = new Set();
  let maxNum = 0;
  for (const r of numsTodos || []) {
    const s = String(r.numero || '');
    if (s) numerosUsados.add(s);
    const n = parseInt(s.replace(/\D/g, ''), 10);
    if (!isNaN(n) && n > maxNum && n < 1e9) maxNum = n;
  }
  const proximoNumero = () => {
    let n;
    do { maxNum += 1; n = String(maxNum).padStart(6, '0'); } while (numerosUsados.has(n));
    numerosUsados.add(n);
    return n;
  };

  // 1ª passada (síncrona): numera tudo antes de gravar em paralelo
  const tarefas = familias.map((f, idxF) => {
    const vincular = !!f.existente;
    const titular = { ...f.titular };
    if (!vincular) titular.idSequencial = String(proxId++).padStart(8, '0');
    const dependentes = f.dependentes.map((d, i) => ({
      id_interno: `dep-imp-${loteId}-${idxF}-${i}`,
      ...d,
      idSequencial: String(proxId++).padStart(8, '0'),
    }));
    const avisosNum = [];
    const contratos = f.contratos.map(c => {
      let numero;
      if (opcoes.manterNumero && c.numeroOrigem) {
        if (numerosUsados.has(c.numeroOrigem)) {
          numero = proximoNumero();
          avisosNum.push(`Nº ${c.numeroOrigem} já existia no Qualify → gravado como ${numero}.`);
        } else {
          numero = c.numeroOrigem;
          numerosUsados.add(numero);
        }
      } else numero = proximoNumero();
      return { ...c, numero };
    });
    return { f, vincular, titular, dependentes, contratos, avisosNum };
  });

  const resultados = new Array(tarefas.length);
  const criadas = { familias: [], contratos: [], vinculadas: [] };
  let feitos = 0;

  const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));

  const montarContrato = (c, familyId, titularObj, enderecoObj) => ({
    numero: c.numero,
    company_id: effectiveCompanyId,
    ...(isUuid(familyId) ? { familia_id: familyId } : {}),
    status: c.status,
    metadata: {
      plano: c.plano || 'Plano Familiar',
      valor: c.valor ?? '',
      forma_pagamento: c.formaPagamento,
      plano_contas: 'Mensalidades',
      parcelas: String(c.parcelas || 12),
      data_inicio: c.dataInicio || '',
      titular: titularObj?.nome || '',
      cpf: titularObj?.cpf || '',
      celular: titularObj?.celular || '',
      email: titularObj?.email || '',
      endereco: enderecoObj || {},
      family_id: familyId,
      ...(c.diaVencimento ? { dia_vencimento: c.diaVencimento } : {}),
      ...(c.carencia !== null && c.carencia !== undefined ? { carencia: c.carencia } : {}),
      ...(c.observacoes ? { observacoes: c.observacoes } : {}),
      ...(c.planoOrigem && c.planoOrigem !== c.plano ? { plano_origem: c.planoOrigem } : {}),
      ...(c.statusOrigem ? { status_origem: c.statusOrigem } : {}),
      numero_origem: c.numeroOrigem || '',
      origem: 'importacao',
      sistema_origem: sistemaOrigem,
      lote_importacao: loteId,
      importado_em: agora,
    },
  });

  await pool(tarefas, 4, async (t, idx) => {
    const { f } = t;
    const base = { linhas: f.linhas, titular: t.titular.nome, cpf: t.titular.cpf, avisos: [...f.avisos, ...t.avisosNum] };
    let familyId = null;
    let criouFamilia = false;
    try {
      if (t.vincular) {
        // Família já existe: adiciona dependentes novos, mescla endereço vazio e vincula contratos
        familyId = f.existente.id;
        const atualDeps = Array.isArray(f.existente.dependentes) ? f.existente.dependentes : [];
        const atualTit = (f.existente.titular && typeof f.existente.titular === 'object') ? f.existente.titular : {};
        const atualEnd = (f.existente.endereco && typeof f.existente.endereco === 'object') ? f.existente.endereco : {};
        let atualMeta = {};
        if (f.existente.metadata) {
          try { atualMeta = typeof f.existente.metadata === 'string' ? JSON.parse(f.existente.metadata) : f.existente.metadata; } catch {}
        }
        const chave = (d) => soDigitos(d.cpf) || `${normalizar(d.nome)}|${d.dataNascimento || d.data_nascimento || ''}`;
        const ks = new Set(atualDeps.map(chave));
        const novosDeps = t.dependentes.filter(d => !ks.has(chave(d)));
        const depsMesclados = atualDeps.map(d => {
          const matchNovo = t.dependentes.find(nd => chave(nd) === chave(d));
          if (!matchNovo) return d;
          const prodsAtuais = Array.isArray(d.produtoVinculado) ? d.produtoVinculado : (d.produtoVinculado ? [d.produtoVinculado] : []);
          const prodsNovos = Array.isArray(matchNovo.produtoVinculado) ? matchNovo.produtoVinculado : [];
          const mergedProds = Array.from(new Set([...prodsAtuais, ...prodsNovos]));
          return { ...d, ...(mergedProds.length ? { produtoVinculado: mergedProds } : {}) };
        });
        const planos = Array.from(new Set([
          ...(Array.isArray(atualTit.produtoVinculado) ? atualTit.produtoVinculado : (atualTit.produtoVinculado ? [atualTit.produtoVinculado] : [])),
          ...(t.titular.produtoVinculado || []),
        ]));
        const enderecoMesclado = { ...atualEnd };
        for (const k of Object.keys(f.endereco || {})) {
          if (!enderecoMesclado[k] && f.endereco[k]) enderecoMesclado[k] = f.endereco[k];
        }
        const contratosMetaAtuais = Array.isArray(atualMeta.contratos) ? atualMeta.contratos : [];
        const novosContratosMeta = t.contratos.map(c => ({ numero: c.numero, plano: c.plano || 'Plano Familiar', valor: c.valor ?? '', formaPagamento: c.formaPagamento, dataInicio: c.dataInicio, parcelas: String(c.parcelas || 12) }));
        const { error: errUpd } = await supabase.from('familias').update({
          titular: { ...atualTit, ...(planos.length ? { produtoVinculado: planos } : {}) },
          endereco: enderecoMesclado,
          dependentes: [...depsMesclados, ...novosDeps],
          metadata: { ...atualMeta, contratos: [...contratosMetaAtuais, ...novosContratosMeta] },
          updated_at: agora,
        }).eq('id', familyId);
        if (errUpd) throw errUpd;
        criadas.vinculadas.push({ id: familyId, titular: atualTit, dependentes: atualDeps });
      } else {
        const payload = {
          titular: t.titular,
          endereco: f.endereco,
          dependentes: t.dependentes,
          company_id: effectiveCompanyId,
          metadata: {
            contratos: t.contratos.map(c => ({ numero: c.numero, plano: c.plano || 'Plano Familiar', valor: c.valor ?? '', formaPagamento: c.formaPagamento, dataInicio: c.dataInicio, parcelas: String(c.parcelas || 12) })),
            pets: [],
            origem: 'importacao',
            sistema_origem: sistemaOrigem,
            lote_importacao: loteId,
            importado_em: agora,
          },
          updated_at: agora,
        };
        const { data, error } = await supabase.from('familias').insert([payload]).select('id').single();
        if (error) throw error;
        familyId = data.id;
        criouFamilia = true;
      }

      const payloadContratos = t.contratos.map(c => montarContrato(c, familyId, t.titular, f.endereco));
      const { data: conts, error: errC } = await supabase.from('contratos').insert(payloadContratos).select('id, numero');
      if (errC) {
        // Desfaz a família recém-criada para não deixar registro pela metade
        if (criouFamilia) await supabase.from('familias').delete().eq('id', familyId);
        throw errC;
      }
      if (criouFamilia) criadas.familias.push(familyId);
      (conts || []).forEach(c => criadas.contratos.push(c.id));

      resultados[idx] = { ...base, situacao: t.vincular ? 'vinculado' : 'importado', familyId, contratos: t.contratos.map(c => c.numero), mensagem: t.vincular ? 'Contrato(s) adicionados à família já existente.' : 'Importado com sucesso.' };
    } catch (err) {
      resultados[idx] = { ...base, situacao: 'falha', familyId: null, contratos: [], mensagem: err?.message || String(err) };
    } finally {
      feitos++;
      onProgresso?.({ feitos, total: tarefas.length, atual: t.titular.nome });
    }
  });

  const registro = {
    loteId,
    data: agora,
    arquivo: nomeArquivo || '',
    companyId,
    empresa: localStorage.getItem('empresaSelecionadaNome') || '',
    sistemaOrigem,
    familias: criadas.familias,
    contratos: criadas.contratos,
    vinculadas: criadas.vinculadas,
    totais: {
      importados: resultados.filter(r => r?.situacao === 'importado').length,
      vinculados: resultados.filter(r => r?.situacao === 'vinculado').length,
      falhas: resultados.filter(r => r?.situacao === 'falha').length,
      contratos: criadas.contratos.length,
    },
    desfeito: false,
  };
  if (criadas.familias.length || criadas.contratos.length) salvarHistorico([registro, ...lerHistorico()]);
  return { registro, resultados };
}

/** Remove tudo o que um lote de importação criou. */
export async function desfazerImportacao(supabase, registro) {
  await emLotes(registro.contratos || [], 100, async (ids) => {
    const { error } = await supabase.from('contratos').delete().in('id', ids);
    if (error) throw error;
  });
  // Garantia extra: contratos do lote que não estejam na lista
  try { await supabase.from('contratos').delete().eq('metadata->>lote_importacao', registro.loteId); } catch { /* opcional */ }
  await emLotes(registro.familias || [], 100, async (ids) => {
    const { error } = await supabase.from('familias').delete().in('id', ids);
    if (error) throw error;
  });
  for (const v of registro.vinculadas || []) {
    await supabase.from('familias').update({ titular: v.titular, dependentes: v.dependentes }).eq('id', v.id);
  }
  const hist = lerHistorico().map(h => (h.loteId === registro.loteId ? { ...h, desfeito: true, desfeitoEm: new Date().toISOString() } : h));
  salvarHistorico(hist);
}

// ═══════════════════════════════════════════════════════════════════
//  PLANILHAS AUXILIARES (modelo e relatório)
// ═══════════════════════════════════════════════════════════════════
export function baixarModelo() {
  const cab = ['Nº Contrato', 'Tipo', 'Parentesco', 'Nome', 'CPF', 'Data Nascimento', 'Sexo', 'RG', 'E-mail', 'Celular', 'CEP', 'Endereço', 'Número', 'Complemento', 'Bairro', 'Cidade', 'UF', 'Plano', 'Valor Mensalidade', 'Data Adesão', 'Dia Vencimento', 'Forma Pagamento', 'Status'];
  const linhas = [
    cab,
    ['1001', 'Titular', '', 'Maria da Silva', '123.456.789-09', '15/03/1975', 'F', '12.345.678-9', 'maria@email.com', '(11) 98888-7777', '01310-100', 'Av. Paulista', '1000', 'Apto 12', 'Bela Vista', 'São Paulo', 'SP', 'Plano Familiar', '89,90', '10/01/2020', '10', 'Boleto', 'Ativo'],
    ['1001', 'Dependente', 'Cônjuge', 'João da Silva', '987.654.321-00', '02/07/1972', 'M', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['1001', 'Dependente', 'Filho(a)', 'Ana da Silva', '', '20/11/2005', 'F', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['1002', 'Titular', '', 'Carlos Pereira', '111.444.777-35', '08/09/1960', 'M', '', '', '(21) 97777-6666', '20040-020', 'Rua da Assembleia', '50', '', 'Centro', 'Rio de Janeiro', 'RJ', 'Plano Individual', '49,90', '05/06/2018', '5', 'Pix', 'Ativo'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(linhas);
  ws['!cols'] = cab.map(h => ({ wch: Math.max(12, h.length + 2) }));
  const instr = XLSX.utils.aoa_to_sheet([
    ['COMO PREENCHER — Importação em Massa Qualify'],
    [''],
    ['• Uma linha por pessoa. Titular e dependentes do mesmo contrato devem ter o MESMO "Nº Contrato".'],
    ['• Na coluna "Tipo" use "Titular" ou "Dependente". Dependentes só precisam de Nome, Parentesco e Nascimento.'],
    ['• Dados do contrato (Plano, Valor, Adesão, Vencimento, Forma de pagamento, Status) ficam na linha do Titular.'],
    ['• Datas no formato DD/MM/AAAA. Valores como 89,90. Status: Ativo, Inadimplente ou Cancelado.'],
    ['• Também é possível importar a planilha exportada do Progem/outro sistema do jeito que ela vier:'],
    ['  o Qualify reconhece as colunas automaticamente e você confere antes de gravar.'],
    ['• Dependentes também podem vir em colunas na linha do titular: "Dependente 1 Nome", "Dependente 1 Parentesco"...'],
  ]);
  instr['!cols'] = [{ wch: 110 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Contratos');
  XLSX.utils.book_append_sheet(wb, instr, 'Instruções');
  XLSX.writeFile(wb, 'modelo_importacao_qualify.xlsx');
}

export function baixarRelatorio(resultados, nome = 'relatorio_importacao') {
  const SIT = { importado: 'Importado', vinculado: 'Vinculado a família existente', falha: 'Falhou', erro: 'Não importado (erro)', pulado: 'Ignorado' };
  const linhas = [['Linha(s) na planilha', 'Titular', 'CPF', 'Situação', 'Contratos gravados', 'Mensagem', 'Avisos']];
  for (const r of resultados) {
    if (!r) continue;
    linhas.push([
      (r.linhas || []).join(', '),
      r.titular || '',
      r.cpf || '',
      SIT[r.situacao] || r.situacao,
      (r.contratos || []).join(', '),
      r.mensagem || '',
      (r.avisos || []).join(' | '),
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(linhas);
  ws['!cols'] = [{ wch: 18 }, { wch: 34 }, { wch: 16 }, { wch: 26 }, { wch: 20 }, { wch: 50 }, { wch: 80 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Resultado');
  XLSX.writeFile(wb, `${nome}.xlsx`);
}

// ═══════════════════════════════════════════════════════════════════
//  IMPORTAÇÃO DE DEPENDENTES EM MASSA (específica para Nova Família)
// ═══════════════════════════════════════════════════════════════════
export function baixarModeloDependentes() {
  const cab = ['Nome', 'Parentesco', 'Data Nascimento', 'CPF', 'Sexo / Gênero', 'Celular', 'RG', 'Psicólogo', 'Seguradora'];
  const linhas = [
    cab,
    ['Maria Santos', 'Cônjuge', '15/05/1985', '123.456.789-01', 'Feminino', '(11) 98765-4321', '12.345.678-9', '', ''],
    ['Pedro Santos', 'Filho(a)', '20/10/2012', '987.654.321-09', 'Masculino', '', '', '', ''],
    ['Lucas Santos', 'Filho(a)', '05/03/2016', '', 'Masculino', '', '', '', ''],
  ];
  const ws = XLSX.utils.aoa_to_sheet(linhas);
  ws['!cols'] = cab.map(h => ({ wch: Math.max(16, h.length + 3) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dependentes');
  XLSX.writeFile(wb, 'modelo_dependentes_qualify.xlsx');
}

export async function parseDependentesArquivo(file, proxIdInicial = 1) {
  const { headers, linhas } = await lerArquivo(file);
  const normHeaders = headers.map(normalizar);

  const acharIdx = (aliases) => {
    for (const al of aliases) {
      const idx = normHeaders.findIndex(h => h === al);
      if (idx !== -1) return idx;
    }
    for (const al of aliases) {
      const idx = normHeaders.findIndex(h => h.includes(al));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const idxNome = acharIdx(['nome dependente', 'nome', 'nome completo', 'dependente', 'beneficiario']);
  const idxParentesco = acharIdx(['parentesco', 'grau parentesco', 'grau de parentesco', 'grau', 'vinculo', 'relacao']);
  const idxTipo = acharIdx(['tipo', 'tipo membro', 'tipo associado', 'tipo beneficiario']);
  const idxNasc = acharIdx(['data nascimento', 'nascimento', 'data de nascimento', 'dt nascimento', 'dt nasc', 'aniversario', 'nasc']);
  const idxCpf = acharIdx(['cpf', 'cpf dependente', 'documento', 'doc']);
  const idxSexo = acharIdx(['sexo', 'genero']);
  const idxCelular = acharIdx(['celular', 'telefone', 'fone', 'whatsapp', 'whats']);
  const idxRg = acharIdx(['rg', 'identidade']);
  const idxPsico = acharIdx(['psicologo', 'psicologa']);
  const idxSeg = acharIdx(['seguradora', 'seguro']);

  let curId = proxIdInicial;
  const dependentes = [];
  const avisos = [];

  for (const { linha, valores } of linhas) {
    // Se tiver coluna de tipo e for titular, ignora (pois estamos importando apenas dependentes)
    if (idxTipo !== -1) {
      const tipoVal = normalizar(valores[idxTipo]);
      if (tipoVal.startsWith('titular')) continue;
    }

    const nomeRaw = idxNome !== -1 ? valores[idxNome] : '';
    const nome = limpar(nomeRaw);
    if (!nome) continue; // Pula linha sem nome

    const parentescoRaw = idxParentesco !== -1 ? valores[idxParentesco] : '';
    const parentesco = mapearParentesco(parentescoRaw);

    const nascRaw = idxNasc !== -1 ? valores[idxNasc] : '';
    const nascNorm = normalizarData(nascRaw);
    if (nascRaw && nascNorm === null) {
      avisos.push(`Linha ${linha} (${nome}): Data de nascimento "${nascRaw}" não reconhecida.`);
    }

    const cpfRaw = idxCpf !== -1 ? valores[idxCpf] : '';
    const cpfNorm = normalizarCPF(cpfRaw);
    const cpf = cpfNorm ? formatarCPF(cpfNorm) : '';
    if (cpfNorm && !cpfValido(cpfNorm)) {
      avisos.push(`Linha ${linha} (${nome}): CPF "${cpf}" parece inválido.`);
    }

    const sexoRaw = idxSexo !== -1 ? valores[idxSexo] : '';
    const sx = mapearSexo(sexoRaw);
    const genero = sx ? (sx === 'feminino' ? 'Feminino' : 'Masculino') : '';

    const celularRaw = idxCelular !== -1 ? valores[idxCelular] : '';
    const celular = formatarCelular(celularRaw);

    const rg = idxRg !== -1 ? limpar(valores[idxRg]) : '';
    const psicologo = idxPsico !== -1 ? limpar(valores[idxPsico]) : '';
    const seguradora = idxSeg !== -1 ? limpar(valores[idxSeg]) : '';

    const idSeq = String(curId++).padStart(8, '0');
    const idInterno = `dep-imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    dependentes.push({
      id_interno: idInterno,
      idSequencial: idSeq,
      nome,
      parentesco,
      carencia: 'padrao',
      dataNascimento: nascNorm || '',
      cpf,
      genero,
      celular,
      rg,
      psicologo,
      seguradora,
      produtoVinculado: []
    });
  }

  return { dependentes, totalLinhas: linhas.length, avisos };
}

