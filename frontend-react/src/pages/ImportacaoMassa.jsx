import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import ConfirmModal from '../components/common/ConfirmModal';
import {
  CAMPOS,
  CAMPOS_POR_KEY,
  lerArquivo,
  autoMapear,
  detectarDependentesEmColunas,
  processarLinhas,
  planosDaPlanilha,
  executarImportacao,
  desfazerImportacao,
  lerHistorico,
  baixarModelo,
  baixarRelatorio,
  normalizar
} from '../utils/importacaoMassa';

export default function ImportacaoMassa() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Stepper: 1: Arquivo, 2: Mapeamento, 3: Validação & De-Para, 4: Execução
  const [passo, setPasso] = useState(1);

  // Arquivo & Linhas Brutas
  const [arquivo, setArquivo] = useState(null);
  const [abas, setAbas] = useState([]);
  const [abaAtual, setAbaAtual] = useState('');
  const [headers, setHeaders] = useState([]);
  const [linhasBrutas, setLinhasBrutas] = useState([]);
  const [lendoArquivo, setLendoArquivo] = useState(false);
  const [arrastando, setArrastando] = useState(false);

  // Mapeamento & Opções
  const [mapeamento, setMapeamento] = useState({});
  const [depColunas, setDepColunas] = useState([]);
  const [opcoes, setOpcoes] = useState({
    formaPagamentoPadrao: 'Pix',
    manterNumero: true,
    sistemaOrigem: 'Progem',
    dePara: {}
  });

  // Contexto do Banco
  const [planosQualify, setPlanosQualify] = useState([]);
  const [familiasExistentesMap, setFamiliasExistentesMap] = useState(new Map());
  const [carregandoContexto, setCarregandoContexto] = useState(false);

  // Resultado do Processamento (Etapa 3)
  const [familiasProcessadas, setFamiliasProcessadas] = useState([]);
  const [resumoProcessamento, setResumoProcessamento] = useState(null);
  const [filtroSituacao, setFiltroSituacao] = useState('todos');
  const [buscaTabela, setBuscaTabela] = useState('');
  const [familiaExpandida, setFamiliaExpandida] = useState(null);

  // Execução (Etapa 4)
  const [executando, setExecutando] = useState(false);
  const [progresso, setProgresso] = useState({ feitos: 0, total: 0, atual: '' });
  const [registroConcluido, setRegistroConcluido] = useState(null);
  const [resultadosExecucao, setResultadosExecucao] = useState([]);

  // Histórico & Modais
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);
  const [historicoLotes, setHistoricoLotes] = useState([]);
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Carrega planos e histórico ao montar
  useEffect(() => {
    carregarContextoBanco();
    setHistoricoLotes(lerHistorico());
  }, []);

  async function carregarContextoBanco() {
    setCarregandoContexto(true);
    try {
      const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');

      // Planos
      let qPlanos = supabase.from('planos').select('nome, valor');
      if (companyId) qPlanos = qPlanos.eq('company_id', companyId);
      const { data: dataPlanos } = await qPlanos;
      if (Array.isArray(dataPlanos)) {
        setPlanosQualify(dataPlanos);
      }

      // Famílias existentes (para checagem de CPF)
      let qFamilias = supabase.from('familias').select('id, titular, dependentes, company_id');
      if (companyId) qFamilias = qFamilias.eq('company_id', companyId);
      const { data: dataFamilias } = await qFamilias;

      const mapFams = new Map();
      if (Array.isArray(dataFamilias)) {
        dataFamilias.forEach(f => {
          const cpf = String(f.titular?.cpf || '').replace(/\D/g, '');
          if (cpf) mapFams.set(cpf, f);
        });
      }
      setFamiliasExistentesMap(mapFams);
    } catch (e) {
      console.warn('Erro ao carregar dados do banco para contexto:', e);
    } finally {
      setCarregandoContexto(false);
    }
  }

  // ─── LEITURA DO ARQUIVO ───────────────────────────────────────────
  async function processarArquivoSelecionado(file, abaEspecifica = null) {
    if (!file) return;
    setLendoArquivo(true);
    setArquivo(file);
    try {
      const res = await lerArquivo(file, abaEspecifica);
      setHeaders(res.headers);
      setLinhasBrutas(res.linhas);
      setAbas(res.abas || []);
      setAbaAtual(res.abaAtual || '');

      // Mapeamento automático inicial
      const mapaAuto = autoMapear(res.headers);
      setMapeamento(mapaAuto);

      // Dependentes em colunas
      const depsDetectados = detectarDependentesEmColunas(res.headers);
      setDepColunas(depsDetectados);

      // Avança para o passo 2
      setPasso(2);
    } catch (err) {
      alert('Erro ao ler a planilha: ' + (err.message || String(err)));
    } finally {
      setLendoArquivo(false);
    }
  }

  const handleTrocarAba = async (novaAba) => {
    if (!arquivo || novaAba === abaAtual) return;
    await processarArquivoSelecionado(arquivo, novaAba);
  };

  // ─── PROCESSAMENTO & PRÉ-VISUALIZAÇÃO (Etapa 3) ───────────────────
  const prepararRevisao = () => {
    // Validação mínima de mapeamento
    if (mapeamento.nome === undefined || mapeamento.nome === '') {
      alert('Atenção: A coluna "Nome" do titular precisa ser mapeada.');
      return;
    }
    if (mapeamento.cpf === undefined || mapeamento.cpf === '') {
      alert('Atenção: A coluna "CPF" do titular precisa ser mapeada.');
      return;
    }

    // Inicializa De-Para para planos desconhecidos
    const planosPlanilha = planosDaPlanilha(linhasBrutas, mapeamento);
    const planosQualifyNorm = new Map(planosQualify.map(p => [normalizar(p.nome), p.nome]));
    const novoDePara = { ...opcoes.dePara };

    planosPlanilha.forEach(p => {
      if (!novoDePara[p.chave]) {
        // Se existir um plano no sistema com o mesmo nome normalizado, pré-seleciona
        if (planosQualifyNorm.has(p.chave)) {
          novoDePara[p.chave] = planosQualifyNorm.get(p.chave);
        } else {
          novoDePara[p.chave] = '__manter__'; // Mantém o nome original como novo
        }
      }
    });

    const opcoesAtualizadas = { ...opcoes, dePara: novoDePara };
    setOpcoes(opcoesAtualizadas);

    // Executa validação
    recalcularValidacao(opcoesAtualizadas);
    setPasso(3);
  };

  const recalcularValidacao = (opcoesAtualizadas) => {
    const res = processarLinhas({
      linhas: linhasBrutas,
      mapeamento,
      depColunas,
      opcoes: opcoesAtualizadas || opcoes,
      contexto: {
        planos: planosQualify,
        familiasExistentes: familiasExistentesMap
      }
    });

    setFamiliasProcessadas(res.familias);
    setResumoProcessamento(res.resumo);
  };

  const handleDeParaChange = (chavePlanilha, valorQualify) => {
    const novoDePara = { ...opcoes.dePara, [chavePlanilha]: valorQualify };
    const novasOpcoes = { ...opcoes, dePara: novoDePara };
    setOpcoes(novasOpcoes);
    recalcularValidacao(novasOpcoes);
  };

  // ─── EXECUÇÃO (Etapa 4) ───────────────────────────────────────────
  const iniciarImportacao = async () => {
    const familiasValidas = familiasProcessadas.filter(f => f.situacao !== 'erro');
    if (!familiasValidas.length) {
      alert('Nenhuma família válida para importar.');
      return;
    }

    setConfirmModalState({
      isOpen: true,
      title: 'Confirmar Importação em Massa',
      message: `Você está prestes a importar ${familiasValidas.length} famílias para o sistema. Deseja continuar?`,
      onConfirm: async () => {
        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        setPasso(4);
        setExecutando(true);
        setProgresso({ feitos: 0, total: familiasValidas.length, atual: '' });

        try {
          const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
          const { registro, resultados } = await executarImportacao({
            supabase,
            familias: familiasValidas,
            opcoes,
            companyId,
            nomeArquivo: arquivo?.name || 'planilha.xlsx',
            onProgresso: (p) => setProgresso(p)
          });

          setRegistroConcluido(registro);
          setResultadosExecucao(resultados);
          setHistoricoLotes(lerHistorico());
        } catch (err) {
          alert('Erro durante a execução da importação: ' + (err.message || String(err)));
        } finally {
          setExecutando(false);
        }
      }
    });
  };

  // ─── DESFAZER IMPORTAÇÃO (ROLLBACK) ──────────────────────────────
  const handleDesfazerLote = (registro) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Desfazer Lote de Importação',
      message: `Tem certeza que deseja desfazer a importação ${registro.loteId}? Todos os ${registro.contratos?.length || 0} contratos e ${registro.familias?.length || 0} famílias criados por este lote serão removidos do sistema.`,
      onConfirm: async () => {
        try {
          await desfazerImportacao(supabase, registro);
          setHistoricoLotes(lerHistorico());
          if (registroConcluido?.loteId === registro.loteId) {
            setRegistroConcluido(prev => ({ ...prev, desfeito: true }));
          }
          alert(`Lote ${registro.loteId} desfeito com sucesso!`);
        } catch (err) {
          alert('Erro ao desfazer lote: ' + (err.message || String(err)));
        } finally {
          setConfirmModalState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Filtro da tabela na Etapa 3
  const familiasFiltradas = useMemo(() => {
    return familiasProcessadas.filter(f => {
      if (filtroSituacao !== 'todos' && f.situacao !== filtroSituacao) return false;
      if (buscaTabela) {
        const q = normalizar(buscaTabela);
        const nome = normalizar(f.titular.nome);
        const cpf = normalizar(f.titular.cpf);
        const contratosStr = f.contratos.map(c => normalizar(c.numeroOrigem || c.plano)).join(' ');
        if (!nome.includes(q) && !cpf.includes(q) && !contratosStr.includes(q)) return false;
      }
      return true;
    });
  }, [familiasProcessadas, filtroSituacao, buscaTabela]);

  const planosDistintosPlanilha = useMemo(() => {
    if (!linhasBrutas.length || mapeamento.plano === undefined) return [];
    return planosDaPlanilha(linhasBrutas, mapeamento);
  }, [linhasBrutas, mapeamento]);

  return (
    <div style={{ padding: '10px 0', maxWidth: '1280px', margin: '0 auto' }}>
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        onConfirm={confirmModalState.onConfirm}
        onCancel={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Breadcrumb */}
      <div className="breadcrumb" style={{ marginBottom: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
        <span>Famílias</span> <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem', margin: '0 0.5rem' }}></i>{' '}
        <span className="active" style={{ color: '#1565C0', fontWeight: 600 }}>Importação em Massa</span>
      </div>

      {/* Header com ações rápidas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#1e293b', margin: 0, fontWeight: 700 }}>
            <i className="fas fa-file-import" style={{ color: '#1565C0', marginRight: '10px' }}></i>
            Importação em Massa de Famílias & Contratos
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0 0', fontSize: '0.95rem' }}>
            Migração de sistemas anteriores (ex: Progem) e importação rápida via Excel (.xlsx, .xls) ou CSV.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={baixarModelo}
            style={{
              background: '#fff',
              color: '#1565C0',
              border: '1px solid #90caf9',
              padding: '9px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem'
            }}
          >
            <i className="fas fa-download"></i> Baixar Modelo Excel
          </button>

          <button
            type="button"
            onClick={() => setModalHistoricoAberto(true)}
            style={{
              background: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              padding: '9px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem'
            }}
          >
            <i className="fas fa-history"></i> Histórico de Importações ({historicoLotes.length})
          </button>

          <button
            type="button"
            onClick={() => navigate('/familias/pesquisar')}
            style={{
              background: '#fff',
              color: '#64748b',
              border: '1px solid #e2e8f0',
              padding: '9px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Voltar
          </button>
        </div>
      </div>

      {/* Stepper visual */}
      <div style={{ display: 'flex', background: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        {[
          { num: 1, label: '1. Carregar Planilha', icone: 'fa-upload' },
          { num: 2, label: '2. Mapear Colunas', icone: 'fa-columns' },
          { num: 3, label: '3. Conferir & De-Para', icone: 'fa-check-double' },
          { num: 4, label: '4. Gravação & Relatório', icone: 'fa-database' }
        ].map((item, idx) => {
          const ativo = passo === item.num;
          const completo = passo > item.num;
          return (
            <div
              key={item.num}
              onClick={() => { if (passo > item.num && !executando) setPasso(item.num); }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: '8px',
                cursor: passo > item.num && !executando ? 'pointer' : 'default',
                background: ativo ? '#eff6ff' : 'transparent',
                borderLeft: idx > 0 ? '1px solid #f1f5f9' : 'none'
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: completo ? '#10b981' : (ativo ? '#1565C0' : '#e2e8f0'),
                  color: completo || ativo ? '#fff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                {completo ? <i className="fas fa-check"></i> : <i className={`fas ${item.icone}`}></i>}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: ativo ? '#1565C0' : (completo ? '#10b981' : '#64748b') }}>
                  {item.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ETAPA 1: CARREGAR PLANILHA
         ═══════════════════════════════════════════════════════════════ */}
      {passo === 1 && (
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <div
            onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastando(false);
              const files = e.dataTransfer.files;
              if (files?.length) processarArquivoSelecionado(files[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${arrastando ? '#1565C0' : '#cbd5e1'}`,
              background: arrastando ? '#f0f7ff' : '#f8fafc',
              borderRadius: '16px',
              padding: '3.5rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginBottom: '2rem'
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv,.txt"
              onChange={(e) => {
                if (e.target.files?.length) processarArquivoSelecionado(e.target.files[0]);
              }}
              style={{ display: 'none' }}
            />

            <div style={{ width: '70px', height: '70px', background: '#e0f2fe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <i className="fas fa-cloud-upload-alt" style={{ fontSize: '2rem', color: '#0284c7' }}></i>
            </div>

            <h3 style={{ fontSize: '1.3rem', color: '#1e293b', marginBottom: '0.5rem', fontWeight: 700 }}>
              {lendoArquivo ? 'Lendo e analisando planilha...' : 'Arraste sua planilha aqui ou clique para selecionar'}
            </h3>
            <p style={{ color: '#64748b', maxWidth: '540px', margin: '0 auto 1.2rem auto', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Compatível com arquivos <strong>.xlsx, .xls, .csv</strong> exportados do <strong>Progem</strong> ou qualquer outro formato.
            </p>

            <span style={{ display: 'inline-block', background: '#1565C0', color: '#fff', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '0.95rem' }}>
              <i className="fas fa-folder-open" style={{ marginRight: '8px' }}></i> Selecionar Arquivo do Computador
            </span>
          </div>

          {/* Dicas e vantagens */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', color: '#1565C0', fontWeight: 700 }}>
                <i className="fas fa-magic"></i> Reconhecimento Inteligente
              </div>
              <p style={{ color: '#475569', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
                Detecta automaticamente cabeçalhos em português, acentos, pontuações de CPF, datas nos formatos DD/MM/AAAA e valores em Real.
              </p>
            </div>

            <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', color: '#10b981', fontWeight: 700 }}>
                <i className="fas fa-users"></i> Agrupamento de Dependentes
              </div>
              <p style={{ color: '#475569', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
                Suporta tanto planilhas com titulares e dependentes em <em>linhas separadas</em> quanto planilhas com colunas <em>"Dependente 1 Nome"</em>.
              </p>
            </div>

            <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', color: '#8b5cf6', fontWeight: 700 }}>
                <i className="fas fa-shield-alt"></i> Importação Segura com Rollback
              </div>
              <p style={{ color: '#475569', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
                Todas as importações geram um lote rastreável. Caso precise desfazer ou reverter, basta um clique no Histórico.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ETAPA 2: MAPEAMENTO DE COLUNAS
         ═══════════════════════════════════════════════════════════════ */}
      {passo === 2 && (
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          {/* Informações do arquivo selecionado */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '1rem 1.5rem', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
                <i className="fas fa-file-excel" style={{ color: '#10b981', marginRight: '8px' }}></i>
                {arquivo?.name}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '2px' }}>
                {linhasBrutas.length} linhas de dados encontradas | {headers.length} colunas identificadas
              </div>
            </div>

            {/* Seletor de abas se houver mais de uma */}
            {abas.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Aba do Excel:</span>
                <select
                  value={abaAtual}
                  onChange={(e) => handleTrocarAba(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                >
                  {abas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Opções Gerais de Importação */}
          <div style={{ background: '#eff6ff', padding: '1.2rem 1.5rem', borderRadius: '10px', border: '1px solid #bfdbfe', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', color: '#1e40af', margin: '0 0 1rem 0', fontWeight: 700 }}>
              <i className="fas fa-sliders-h" style={{ marginRight: '8px' }}></i> Configurações Gerais
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1e3a8a', marginBottom: '6px' }}>
                  Forma de Pagamento Padrão
                </label>
                <select
                  value={opcoes.formaPagamentoPadrao}
                  onChange={(e) => setOpcoes(prev => ({ ...prev, formaPagamentoPadrao: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  <option value="Pix">Pix</option>
                  <option value="Boleto">Boleto</option>
                  <option value="Cartão">Cartão de Crédito</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Débito em conta">Débito em conta</option>
                  <option value="Carnê">Carnê</option>
                </select>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Usada quando a planilha não tiver forma informada</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1e3a8a', marginBottom: '6px' }}>
                  Numeração dos Contratos
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="checkbox"
                    id="chkManterNumero"
                    checked={opcoes.manterNumero}
                    onChange={(e) => setOpcoes(prev => ({ ...prev, manterNumero: e.target.checked }))}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="chkManterNumero" style={{ fontSize: '0.88rem', color: '#1e293b', cursor: 'pointer' }}>
                    Preservar número original do contrato (quando existir)
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1e3a8a', marginBottom: '6px' }}>
                  Sistema de Origem
                </label>
                <input
                  type="text"
                  value={opcoes.sistemaOrigem}
                  onChange={(e) => setOpcoes(prev => ({ ...prev, sistemaOrigem: e.target.value }))}
                  placeholder="Ex: Progem"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                />
              </div>
            </div>
          </div>

          {/* Aviso de Dependentes em Colunas se houver */}
          {depColunas.length > 0 && (
            <div style={{ background: '#f0fdf4', padding: '1rem 1.2rem', borderRadius: '10px', border: '1px solid #bbf7d0', marginBottom: '1.5rem', color: '#166534', fontSize: '0.9rem' }}>
              <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i>
              Foram detectados <strong>{depColunas.length} dependentes em colunas</strong> na mesma linha (ex: "Dependente 1 Nome", "Dependente 2..."). Eles serão processados automaticamente!
            </div>
          )}

          {/* Tabela de Mapeamento */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#1e293b', marginBottom: '0.8rem', fontWeight: 700 }}>
              Correspondência das Colunas
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '1rem' }}>
              O sistema reconheceu as colunas abaixo automaticamente. Você pode ajustar ou alterar caso necessário:
            </p>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '12px 16px' }}>Campo do Qualify</th>
                    <th style={{ padding: '12px 16px' }}>Grupo</th>
                    <th style={{ padding: '12px 16px' }}>Coluna na Planilha</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {CAMPOS.map(campo => {
                    const colIdx = mapeamento[campo.key];
                    const estaMapeado = colIdx !== undefined && colIdx !== '' && colIdx >= 0;
                    return (
                      <tr key={campo.key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: '#1e293b' }}>
                          {campo.label} {campo.obrigatorio && <span style={{ color: '#ef4444' }}>*</span>}
                          {campo.dica && <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>{campo.dica}</div>}
                        </td>
                        <td style={{ padding: '10px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                          {campo.grupo}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <select
                            value={estaMapeado ? colIdx : ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                              setMapeamento(prev => ({ ...prev, [campo.key]: val }));
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: `1px solid ${campo.obrigatorio && !estaMapeado ? '#fca5a5' : '#cbd5e1'}`,
                              background: '#fff',
                              width: '100%',
                              maxWidth: '360px',
                              fontSize: '0.88rem'
                            }}
                          >
                            <option value="">(Não mapear / Em branco)</option>
                            {headers.map((h, i) => (
                              <option key={i} value={i}>
                                Coluna {i + 1}: {h}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          {estaMapeado ? (
                            <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
                              <i className="fas fa-check"></i> Mapeado
                            </span>
                          ) : campo.obrigatorio ? (
                            <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
                              Obrigatório
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Opcional</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setPasso(1)}
              style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              <i className="fas fa-arrow-left"></i> Voltar
            </button>

            <button
              type="button"
              onClick={prepararRevisao}
              style={{ background: '#1565C0', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(21,101,192,0.25)' }}
            >
              Avançar para Conferência <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ETAPA 3: CONFERÊNCIA, VALIDAÇÃO & DE-PARA DE PLANOS
         ═══════════════════════════════════════════════════════════════ */}
      {passo === 3 && (
        <div style={{ background: '#fff', padding: '2rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          {/* Cards de Resumo */}
          {resumoProcessamento && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>{resumoProcessamento.familias}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Famílias Agrupadas</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>{resumoProcessamento.contratos}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Contratos</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>{resumoProcessamento.dependentes}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Dependentes</div>
              </div>

              <div style={{ background: '#dcfce7', padding: '1.2rem', borderRadius: '10px', border: '1px solid #86efac', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#166534' }}>{resumoProcessamento.ok}</div>
                <div style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>Prontos (100% OK)</div>
              </div>

              <div style={{ background: '#fef9c3', padding: '1.2rem', borderRadius: '10px', border: '1px solid #fde047', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#854d0e' }}>{resumoProcessamento.aviso}</div>
                <div style={{ fontSize: '0.85rem', color: '#854d0e', fontWeight: 600 }}>Com Avisos</div>
              </div>

              <div style={{ background: '#e0f2fe', padding: '1.2rem', borderRadius: '10px', border: '1px solid #7dd3fc', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0369a1' }}>{resumoProcessamento.existente}</div>
                <div style={{ fontSize: '0.85rem', color: '#0369a1', fontWeight: 600 }}>Já Cadastrados (Vincular)</div>
              </div>

              {resumoProcessamento.erro > 0 && (
                <div style={{ background: '#fee2e2', padding: '1.2rem', borderRadius: '10px', border: '1px solid #fca5a5', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#991b1b' }}>{resumoProcessamento.erro}</div>
                  <div style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 600 }}>Erros Impeditivos</div>
                </div>
              )}
            </div>
          )}

          {/* Seção DE-PARA DE PLANOS se houver planos na planilha */}
          {planosDistintosPlanilha.length > 0 && (
            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem', color: '#1e293b', fontWeight: 700 }}>
                <i className="fas fa-random" style={{ color: '#1565C0' }}></i> De-Para de Planos Encontrados na Planilha
              </div>
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 1rem 0' }}>
                Associe cada nome de plano da planilha ao plano correspondente no catálogo do Qualify:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                {planosDistintosPlanilha.map(p => (
                  <div key={p.chave} style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>"{p.nome}"</span>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.qtd} registro(s)</span>
                    </div>
                    <select
                      value={opcoes.dePara[p.chave] || '__manter__'}
                      onChange={(e) => handleDeParaChange(p.chave, e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                    >
                      <option value="__manter__">Manter exatamente "{p.nome}" (gravar como novo)</option>
                      {planosQualify.map(pq => (
                        <option key={pq.nome} value={pq.nome}>
                          Associar ao Plano Qualify: {pq.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filtros e Busca da Tabela */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'ok', label: 'Prontos (OK)' },
                { id: 'aviso', label: 'Com Avisos' },
                { id: 'existente', label: 'Já Existentes' },
                { id: 'erro', label: 'Com Erros' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroSituacao(f.id)}
                  style={{
                    background: filtroSituacao === f.id ? '#1565C0' : '#f1f5f9',
                    color: filtroSituacao === f.id ? '#fff' : '#475569',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '280px' }}>
              <input
                type="text"
                placeholder="Buscar por titular, CPF ou contrato..."
                value={buscaTabela}
                onChange={(e) => setBuscaTabela(e.target.value)}
                style={{ width: '100%', padding: '7px 12px 7px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
              />
              <i className="fas fa-search" style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8', fontSize: '0.85rem' }}></i>
            </div>
          </div>

          {/* Tabela de Conferência */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '2rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 14px' }}>Titular</th>
                  <th style={{ padding: '12px 14px' }}>CPF</th>
                  <th style={{ padding: '12px 14px' }}>Contratos</th>
                  <th style={{ padding: '12px 14px' }}>Dependentes</th>
                  <th style={{ padding: '12px 14px' }}>Situação</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {familiasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                      Nenhuma família encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  familiasFiltradas.slice(0, 50).map((fam, idx) => {
                    const isExp = familiaExpandida === idx;
                    const badge = {
                      ok: { bg: '#dcfce7', cor: '#166534', txt: 'OK' },
                      aviso: { bg: '#fef9c3', cor: '#854d0e', txt: 'Aviso' },
                      existente: { bg: '#e0f2fe', cor: '#0369a1', txt: 'Existente (Vincular)' },
                      erro: { bg: '#fee2e2', cor: '#991b1b', txt: 'Erro Impeditivo' }
                    }[fam.situacao] || { bg: '#f1f5f9', cor: '#475569', txt: fam.situacao };

                    return (
                      <React.Fragment key={idx}>
                        <tr style={{ borderBottom: '1px solid #f1f5f9', background: isExp ? '#f8fafc' : '#fff' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 600, color: '#1e293b' }}>
                            {fam.titular.nome || <em style={{ color: '#ef4444' }}>(Sem nome)</em>}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#475569' }}>
                            {fam.titular.cpf || <em style={{ color: '#ef4444' }}>(Sem CPF)</em>}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#475569' }}>
                            {fam.contratos.map((c, i) => (
                              <span key={i} style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontSize: '0.8rem', marginRight: '4px', display: 'inline-block' }}>
                                #{c.numeroOrigem || 'Auto'} - {c.plano || 'Sem plano'}
                              </span>
                            ))}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#475569' }}>
                            {fam.dependentes.length > 0 ? `${fam.dependentes.length} dependente(s)` : '-'}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ background: badge.bg, color: badge.cor, padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                              {badge.txt}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => setFamiliaExpandida(isExp ? null : idx)}
                              style={{ background: 'none', border: 'none', color: '#1565C0', cursor: 'pointer', fontWeight: 600 }}
                            >
                              {isExp ? <i className="fas fa-chevron-up"></i> : <i className="fas fa-chevron-down"></i>}
                            </button>
                          </td>
                        </tr>

                        {isExp && (
                          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                            <td colSpan="6" style={{ padding: '16px 20px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
                                <div>
                                  <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>Dados do Titular:</div>
                                  <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
                                    <div><strong>Celular:</strong> {fam.titular.celular || '-'} | <strong>Nascimento:</strong> {fam.titular.dataNascimento || '-'}</div>
                                    <div><strong>Endereço:</strong> {fam.endereco.rua ? `${fam.endereco.rua}, ${fam.endereco.numero} - ${fam.endereco.bairro}, ${fam.endereco.cidade}/${fam.endereco.estado}` : 'Não informado'}</div>
                                    <div><strong>Linha(s) na planilha:</strong> {fam.linhas.join(', ')}</div>
                                  </div>
                                </div>

                                <div>
                                  <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>Dependentes ({fam.dependentes.length}):</div>
                                  {fam.dependentes.length === 0 ? (
                                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Nenhum dependente vinculado</div>
                                  ) : (
                                    <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                                      {fam.dependentes.map((d, di) => (
                                        <div key={di}>• {d.nome} ({d.parentesco}) - CPF: {d.cpf || 'Sem CPF'}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {(fam.erros.length > 0 || fam.avisos.length > 0) && (
                                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                                  {fam.erros.map((er, ei) => (
                                    <div key={ei} style={{ color: '#dc2626', fontSize: '0.82rem', fontWeight: 600 }}>
                                      <i className="fas fa-times-circle"></i> {er}
                                    </div>
                                  ))}
                                  {fam.avisos.map((av, ai) => (
                                    <div key={ai} style={{ color: '#b45309', fontSize: '0.82rem' }}>
                                      <i className="fas fa-exclamation-triangle"></i> {av}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {familiasFiltradas.length > 50 && (
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Exibindo as primeiras 50 de {familiasFiltradas.length} famílias na pré-visualização.
            </div>
          )}

          {/* Botões de Ação */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setPasso(2)}
              style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              <i className="fas fa-arrow-left"></i> Voltar para Mapeamento
            </button>

            <button
              type="button"
              onClick={iniciarImportacao}
              disabled={!resumoProcessamento || (resumoProcessamento.ok === 0 && resumoProcessamento.aviso === 0 && resumoProcessamento.existente === 0)}
              style={{
                background: '#10b981',
                color: '#fff',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(16,185,129,0.3)'
              }}
            >
              <i className="fas fa-play"></i> Iniciar Gravação no Banco ({familiasProcessadas.filter(f => f.situacao !== 'erro').length} Famílias)
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ETAPA 4: EXECUÇÃO & RELATÓRIO
         ═══════════════════════════════════════════════════════════════ */}
      {passo === 4 && (
        <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', textAlign: 'center' }}>
          {executando ? (
            <div>
              <div style={{ width: '80px', height: '80px', background: '#e0f2fe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#1565C0' }}></i>
              </div>
              <h2 style={{ fontSize: '1.6rem', color: '#1e293b', marginBottom: '0.5rem', fontWeight: 700 }}>
                Gravando famílias e contratos no banco...
              </h2>
              <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '2rem' }}>
                Processando: <strong>{progresso.atual || 'Carregando...'}</strong>
              </p>

              {/* Barra de Progresso */}
              <div style={{ maxWidth: '600px', margin: '0 auto 1.5rem auto', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden', height: '20px' }}>
                <div
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #1565C0, #10b981)',
                    width: `${progresso.total ? Math.round((progresso.feitos / progresso.total) * 100) : 0}%`,
                    transition: 'width 0.2s ease'
                  }}
                ></div>
              </div>
              <div style={{ fontWeight: 700, color: '#1565C0' }}>
                {progresso.feitos} de {progresso.total} famílias processadas ({progresso.total ? Math.round((progresso.feitos / progresso.total) * 100) : 0}%)
              </div>
            </div>
          ) : (
            <div>
              <div style={{ width: '80px', height: '80px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                <i className="fas fa-check" style={{ fontSize: '2.5rem', color: '#10b981' }}></i>
              </div>

              <h2 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem', fontWeight: 800 }}>
                Importação Concluída com Sucesso!
              </h2>
              <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '2rem' }}>
                Lote gravado sob identificador: <code>{registroConcluido?.loteId}</code>
              </p>

              {/* Estatísticas Finais */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.2rem', maxWidth: '800px', margin: '0 auto 2.5rem auto' }}>
                <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>{registroConcluido?.totais?.importados || 0}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Novas Famílias Criadas</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1565C0' }}>{registroConcluido?.totais?.contratos || 0}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Contratos Gravados</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '1.2rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0284c7' }}>{registroConcluido?.totais?.vinculados || 0}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Famílias Já Existentes Vinculadas</div>
                </div>

                {registroConcluido?.totais?.falhas > 0 && (
                  <div style={{ background: '#fee2e2', padding: '1.2rem', borderRadius: '10px', border: '1px solid #fca5a5' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>{registroConcluido?.totais?.falhas || 0}</div>
                    <div style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 600 }}>Falhas Registradas</div>
                  </div>
                )}
              </div>

              {/* Botões de Ação Conclusão */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => baixarRelatorio(resultadosExecucao, `relatorio_${registroConcluido?.loteId}`)}
                  style={{ background: '#1565C0', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(21,101,192,0.25)' }}
                >
                  <i className="fas fa-file-excel"></i> Baixar Relatório (.xlsx)
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/familias/pesquisar')}
                  style={{ background: '#10b981', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <i className="fas fa-list"></i> Ver Famílias Cadastradas
                </button>

                {registroConcluido && !registroConcluido.desfeito && (
                  <button
                    type="button"
                    onClick={() => handleDesfazerLote(registroConcluido)}
                    style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <i className="fas fa-undo"></i> Desfazer Esta Importação
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setPasso(1);
                    setArquivo(null);
                    setLinhasBrutas([]);
                    setRegistroConcluido(null);
                  }}
                  style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Nova Importação
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL HISTÓRICO DE IMPORTAÇÕES
         ═══════════════════════════════════════════════════════════════ */}
      {modalHistoricoAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '840px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.4rem', color: '#1e293b', margin: 0, fontWeight: 700 }}>
                <i className="fas fa-history" style={{ color: '#1565C0', marginRight: '8px' }}></i> Histórico de Importações
              </h2>
              <button
                type="button"
                onClick={() => setModalHistoricoAberto(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#94a3b8', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {historicoLotes.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
                <i className="fas fa-folder-open" style={{ fontSize: '2.5rem', color: '#cbd5e1', marginBottom: '1rem', display: 'block' }}></i>
                Nenhum lote de importação registrado neste navegador.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {historicoLotes.map(reg => (
                  <div
                    key={reg.loteId}
                    style={{
                      border: `1px solid ${reg.desfeito ? '#fca5a5' : '#e2e8f0'}`,
                      background: reg.desfeito ? '#fff5f5' : '#f8fafc',
                      padding: '1.2rem',
                      borderRadius: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
                          Lote {reg.loteId} {reg.desfeito && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>(DESFEITO)</span>}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '2px' }}>
                          Data: {new Date(reg.data).toLocaleString('pt-BR')} | Arquivo: <strong>{reg.arquivo || 'planilha'}</strong>
                        </div>
                        <div style={{ color: '#475569', fontSize: '0.88rem', marginTop: '6px' }}>
                          Famílias criadas: <strong>{reg.familias?.length || 0}</strong> | Contratos criados: <strong>{reg.contratos?.length || 0}</strong>
                        </div>
                      </div>

                      {!reg.desfeito ? (
                        <button
                          type="button"
                          onClick={() => handleDesfazerLote(reg)}
                          style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '6px 14px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          <i className="fas fa-undo"></i> Desfazer Lote
                        </button>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Lote já revertido</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '2rem', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setModalHistoricoAberto(false)}
                style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
