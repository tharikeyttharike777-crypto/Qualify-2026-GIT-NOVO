import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import ConfirmModal from '../components/common/ConfirmModal';

// ─── Helpers ───────────────────────────────────────────────────────
function fmtDate(val) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d)) return String(val);
    return d.toLocaleDateString('pt-BR');
  } catch { return String(val); }
}

function fmtCurrency(val) {
  if (val === null || val === undefined || val === '') return 'R$ 0,00';
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^\d.,-]/g, '').replace(',', '.'));
  if (isNaN(n)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function calcAge(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return `${age} anos`;
}

const STATUS_COLORS = {
  ativo: { bg: '#dcfce7', color: '#166534' },
  cancelado: { bg: '#fee2e2', color: '#991b1b' },
  inadimplente: { bg: '#fef3c7', color: '#92400e' },
  pendente: { bg: '#dbeafe', color: '#1e40af' },
};

function StatusBadge({ status }) {
  const s = String(status || 'ativo').toLowerCase();
  const style = STATUS_COLORS[s] || { bg: '#f1f5f9', color: '#475569' };
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '12px', fontSize: '0.78rem',
      fontWeight: 700, textTransform: 'capitalize',
      background: style.bg, color: style.color
    }}>{status || 'Ativo'}</span>
  );
}

// ─── Main Component ────────────────────────────────────────────────
export default function EdicaoContrato() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contractNumero = searchParams.get('numero');
  const contractId = searchParams.get('id');
  const searchKey = contractNumero || contractId;

  const [contract, setContract] = useState(null);
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cobrancas');
  const [actionMsg, setActionMsg] = useState(null);

  // Sub-states
  const [cobrancasAbertas, setCobrancasAbertas] = useState([]);
  const [cobrancasPagas, setCobrancasPagas] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [anotacoes, setAnotacoes] = useState([]);
  const [novaAnotacao, setNovaAnotacao] = useState({ titulo: '', descricao: '' });
  const [loadingTab, setLoadingTab] = useState(false);

  // Nova Cobranca state
  const [novaCobrancaModal, setNovaCobrancaModal] = useState(false);
  const [cobrancaForm, setCobrancaForm] = useState({ 
    valor: '', vencimento: '', descricao: '', tipo: 'Mensalidade', 
    cpfPagador: '', metodo: 'pix_automatico', parcelas: 1, 
    cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '', mensagem: '',
    cobrarImediatamente: false, valorImediato: '', cycle: 'MONTHLY'
  });
  const [baixandoId, setBaixandoId] = useState(null);

  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  });

  // ─── Load Contract ─────────────────────────────────────────────
  useEffect(() => {
    if (!searchKey) return;
    loadData();
  }, [searchKey]);

  async function loadData() {
    setLoading(true);
    try {
      let fetchedContract = null;
      let fetchedFamily = null;

      // 1. Busca por NUMERO na tabela central (fonte primária e única)
      try {
        const { data } = await supabase.from('contratos').select('*').eq('numero', searchKey).maybeSingle();
        if (data) fetchedContract = data;
      } catch(e){}

      // 2. Se não achou por numero, tenta por UUID
      if (!fetchedContract) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchKey);
        if (isUuid) {
          try {
            const { data } = await supabase.from('contratos').select('*').eq('id', searchKey).maybeSingle();
            if (data) fetchedContract = data;
          } catch(e){}
        }
      }

      // 3. Busca família relacionada ao contrato
      if (fetchedContract) {
        let meta = {};
        if (fetchedContract.metadata) {
          try { meta = typeof fetchedContract.metadata === 'string' ? JSON.parse(fetchedContract.metadata) : fetchedContract.metadata; } catch(e){}
        }
        
        const famId = fetchedContract.family_id || fetchedContract.familyId || fetchedContract.familia_id || meta.family_id || meta.familyId;
        if (famId) {
          try {
            const { data: fam } = await supabase.from('familias').select('*').eq('id', famId).maybeSingle();
            if (fam) fetchedFamily = fam;
          } catch(e){}
        }
        // Se não tem family_id, tenta buscar pelo nome do titular
        const titNome = fetchedContract.titular || meta.titular;
        if (!fetchedFamily && titNome) {
          try {
            const { data: fams } = await supabase.from('familias').select('*');
            if (Array.isArray(fams)) {
              fetchedFamily = fams.find(f => {
                const tNome = typeof f.titular === 'object' ? f.titular?.nome : f.titular;
                if (!tNome && f.metadata) {
                  let fMeta = typeof f.metadata === 'string' ? JSON.parse(f.metadata) : f.metadata;
                  const fmNome = fMeta.titular?.nome || fMeta.nome;
                  return fmNome && String(fmNome).toLowerCase() === String(titNome).toLowerCase();
                }
                return tNome && String(tNome).toLowerCase() === String(titNome).toLowerCase();
              }) || null;
            }
          } catch(e){}
        }
      }

      setContract(fetchedContract);
      setFamily(fetchedFamily);

      // Carrega cobranças se encontrou o contrato
      if (fetchedContract) {
        loadCobrancas(fetchedContract);
        loadEventos(fetchedContract);
        loadAnotacoes(fetchedContract);
      }
    } catch (err) {
      console.error('Erro ao carregar contrato:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCobrancas(ct) {
    try {
      const num = ct.numero || ct.id;
      const { data } = await supabase.from('cobrancas').select('*').eq('contrato_numero', num);
      if (Array.isArray(data)) {
        setCobrancasAbertas(data.filter(c => !['pago', 'paga', 'paid'].includes(String(c.status).toLowerCase())));
        setCobrancasPagas(data.filter(c => ['pago', 'paga', 'paid'].includes(String(c.status).toLowerCase())));
      }
    } catch(e) {}
  }

  async function loadEventos(ct) {
    try {
      const { data } = await supabase.from('eventos').select('*')
        .eq('contrato_id', ct.id || ct.numero)
        .order('created_at', { ascending: false });
      if (Array.isArray(data)) setEventos(data);
    } catch(e){}
  }

  async function loadAnotacoes(ct) {
    try {
      const { data } = await supabase.from('lembretes').select('*')
        .eq('contrato_id', ct.id || ct.numero)
        .order('created_at', { ascending: false });
      if (Array.isArray(data)) setAnotacoes(data);
    } catch(e){}
  }

  // ─── Actions ───────────────────────────────────────────────────
  const handleCancel = () => {
    if (!contract) return;
    setConfirmModalState({
      isOpen: true,
      title: 'Cancelar Contrato',
      message: 'Tem certeza que deseja cancelar este contrato? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contract.id);
          if (isUuid) await supabase.from('contratos').update({ status: 'cancelado' }).eq('id', contract.id);
          if (contract.numero) await supabase.from('contratos').update({ status: 'cancelado' }).eq('numero', contract.numero);
          setContract(prev => ({ ...prev, status: 'cancelado' }));
          setActionMsg({ type: 'success', text: 'Contrato cancelado com sucesso!' });
        } catch(err) {
          setActionMsg({ type: 'error', text: 'Erro ao cancelar: ' + err.message });
        }
        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDuplicate = () => {
    if (!contract) return;
    setConfirmModalState({
      isOpen: true,
      title: 'Duplicar Contrato',
      message: 'Deseja criar uma cópia deste contrato?',
      onConfirm: async () => {
        try {
          const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
          const { data: allNums } = await supabase.from('contratos').select('numero').order('numero', { ascending: false });
          let maxNum = 0;
          if (Array.isArray(allNums)) {
            allNums.forEach(r => {
              const n = parseInt(String(r.numero || '0').replace(/\D/g, ''), 10);
              if (!isNaN(n) && n > maxNum) maxNum = n;
            });
          }
          const nextNum = String(maxNum + 1).padStart(6, '0');
          const dupPayload = {
            numero: nextNum,
            company_id: companyId,
            status: 'ativo',
            metadata: {
              plano: contract.plano,
              valor: contract.valor,
              forma_pagamento: contract.forma_pagamento,
              titular: contract.titular,
              created_at: new Date().toISOString()
            }
          };
          const { data, error } = await supabase.from('contratos').insert([dupPayload]).select().single();
          if (error) throw error;
          setActionMsg({ type: 'success', text: `Contrato duplicado como #${nextNum}!` });
          if (data?.numero) setTimeout(() => navigate(`/contratos/editar?numero=${data.numero}`), 1200);
        } catch(err) {
          setActionMsg({ type: 'error', text: 'Erro ao duplicar: ' + err.message });
        }
        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleAddAnotacao = async (e) => {
    e.preventDefault();
    if (!novaAnotacao.titulo.trim()) return;
    try {
      const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
      const { data, error } = await supabase.from('lembretes').insert([{
        contrato_id: contract?.id || contract?.numero,
        titulo: novaAnotacao.titulo,
        descricao: novaAnotacao.descricao,
        company_id: companyId
      }]).select().single();
      if (error) throw error;
      setAnotacoes(prev => [data, ...prev]);
      setNovaAnotacao({ titulo: '', descricao: '' });
    } catch(err) {
      setActionMsg({ type: 'error', text: 'Erro ao salvar anotação: ' + err.message });
    }
  };

  const handleDeleteAnotacao = (id) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Excluir Anotação',
      message: 'Deseja excluir esta anotação permanentemente?',
      onConfirm: async () => {
        try {
          await supabase.from('lembretes').delete().eq('id', id);
          setAnotacoes(prev => prev.filter(a => a.id !== id));
        } catch(err) {
          setActionMsg({ type: 'error', text: 'Erro ao excluir: ' + err.message });
        }
        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleAddCobranca = async (e) => {
    e.preventDefault();
    try {
      const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
      
      const valorOriginal = parseFloat(String(cobrancaForm.valor).replace(',', '.'));
      const parcelas = parseInt(cobrancaForm.parcelas) || 1;
      
      const basePayload = {
        contrato_numero: contract?.numero || contract?.id,
        valor: valorOriginal,
        descricao: cobrancaForm.descricao,
        tipo: cobrancaForm.tipo,
        status: 'pendente',
        company_id: companyId,
        titular: titularNome
      };
      
      if (cobrancaForm.metodo === 'pix_automatico') {
        const token = (await supabase.auth.getSession())?.data?.session?.access_token || '';
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_BASE = import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:4570/api' : 'https://qualify-2026.onrender.com/api');
        
        const valorImediato = parseFloat(String(cobrancaForm.valorImediato || cobrancaForm.valor).replace(',', '.'));
        const isDifferentValue = cobrancaForm.cobrarImediatamente && valorImediato !== valorOriginal;

        // Se tiver valor imediato diferente, cria a cobrança avulsa primeiro
        if (isDifferentValue) {
          const avulsaPayload = {
            empresaId: companyId,
            cpfCnpj: cobrancaForm.cpfPagador,
            nomeCliente: titularNome,
            value: valorImediato,
            description: `Taxa Inicial / Adesão - Contrato ${basePayload.contrato_numero}`,
            endereco: { cep: cobrancaForm.cep, logradouro: cobrancaForm.logradouro, numero: cobrancaForm.numero, bairro: cobrancaForm.bairro, cidade: cobrancaForm.cidade, uf: cobrancaForm.uf }
          };
          const resAvulso = await fetch(`${API_BASE}/pix/cob`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
            body: JSON.stringify(avulsaPayload)
          });
          if (!resAvulso.ok) throw new Error('Erro ao gerar PIX de adesão');
        }

        const apiPayload = {
          empresaId: companyId,
          cpfCnpj: cobrancaForm.cpfPagador,
          nomeCliente: titularNome,
          value: valorOriginal,
          nextDueDate: cobrancaForm.vencimento,
          description: basePayload.descricao || `Assinatura Contrato ${basePayload.contrato_numero}`,
          cycle: cobrancaForm.cycle || 'MONTHLY',
          contratoNumero: basePayload.contrato_numero,
          // Se gerou avulso, não pede pra Woovi cobrar imediatamente de novo na assinatura
          cobrarImediatamente: isDifferentValue ? false : cobrancaForm.cobrarImediatamente,
          endereco: { cep: cobrancaForm.cep, logradouro: cobrancaForm.logradouro, numero: cobrancaForm.numero, bairro: cobrancaForm.bairro, cidade: cobrancaForm.cidade, uf: cobrancaForm.uf }
        };

        const res = await fetch(`${API_BASE}/subscriptions/criar-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          body: JSON.stringify(apiPayload)
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Erro ao gerar Assinatura na API');
        
        setNovaCobrancaModal(false);
        setTimeout(() => loadCobrancas(contract), 1500);
      } else if (cobrancaForm.metodo === 'pix') {
        const token = (await supabase.auth.getSession())?.data?.session?.access_token || '';
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const API_BASE = import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:4570/api' : 'https://qualify-2026.onrender.com/api');
        
        const apiPayload = {
          empresaId: companyId,
          cpfCnpj: cobrancaForm.cpfPagador,
          nomeCliente: titularNome,
          value: valorOriginal,
          nextDueDate: cobrancaForm.vencimento,
          description: basePayload.descricao || `Cobrança Contrato ${basePayload.contrato_numero}`,
          endereco: { cep: cobrancaForm.cep, logradouro: cobrancaForm.logradouro, numero: cobrancaForm.numero, bairro: cobrancaForm.bairro, cidade: cobrancaForm.cidade, uf: cobrancaForm.uf }
        };

        const res = await fetch(`${API_BASE}/pix/cob`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          body: JSON.stringify(apiPayload)
        });

        if (!res.ok) throw new Error('Erro ao gerar PIX avulso na API');
        
        setNovaCobrancaModal(false);
        setTimeout(() => loadCobrancas(contract), 1500);
      } else {
        // FLUXO NORMAL: Loop de parcelas para Pix avulso, dinheiro, cartão etc.
        const [anoStr, mesStr, diaStr] = cobrancaForm.vencimento.split('-');
        let anoBase = parseInt(anoStr);
        let mesBase = parseInt(mesStr);
        const diaBase = parseInt(diaStr);

        const payloadsToInsert = [];
        
        for (let i = 0; i < parcelas; i++) {
          let mesCalc = mesBase + i;
          let anoCalc = anoBase;
          while (mesCalc > 12) {
            mesCalc -= 12;
            anoCalc++;
          }
          const vencimentoParcela = `${anoCalc}-${String(mesCalc).padStart(2, '0')}-${String(diaBase).padStart(2, '0')}`;
          const msgParcela = parcelas > 1 ? `${basePayload.descricao || basePayload.tipo} (${i + 1}/${parcelas})` : (basePayload.descricao || basePayload.tipo);
          
          payloadsToInsert.push({
            ...basePayload,
            vencimento: vencimentoParcela,
            descricao: msgParcela
          });
        }
        
        const { data, error } = await supabase.from('cobrancas').insert(payloadsToInsert).select();
        if (error) throw error;
        setCobrancasAbertas(prev => [...data, ...prev].sort((a,b) => new Date(a.vencimento) - new Date(b.vencimento)));
      }
      
      setNovaCobrancaModal(false);
      setCobrancaForm({ 
        valor: '', vencimento: '', descricao: '', tipo: 'Mensalidade',
        cpfPagador: '', metodo: 'pix_automatico', parcelas: 1, 
        cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '', mensagem: '',
        cobrarImediatamente: true, validadeQrCode: ''
      });
      setActionMsg({ type: 'success', text: 'Cobrança gerada com sucesso!' });
    } catch(err) {
      console.error("ERRO AO SALVAR COBRANÇA:", err);
      alert('Erro: ' + err.message);
      setActionMsg({ type: 'error', text: 'Erro ao adicionar cobrança: ' + err.message });
    }
  };

  const handleAbrirNovaCobranca = () => {
    let famMeta = {};
    if (family?.metadata) {
      try { famMeta = typeof family.metadata === 'string' ? JSON.parse(family.metadata) : family.metadata; } catch(e){}
    }
    let contMeta = {};
    if (contract?.metadata) {
      try { contMeta = typeof contract.metadata === 'string' ? JSON.parse(contract.metadata) : contract.metadata; } catch(e){}
    }

    const famTit = (typeof family?.titular === 'object') ? family.titular : {};
    const metaTit = famMeta.titular || {};
    const end = (typeof family?.endereco === 'object') ? family.endereco : (famMeta.endereco || {});

    const cpfVal = famTit.cpf || famTit.documento || metaTit.cpf || metaTit.documento || family?.cpf || '';
    const cepVal = end.cep || '';
    const logradouro = end.rua || end.logradouro || '';
    const numero = end.numero || '';
    const bairro = end.bairro || '';
    const cidade = end.cidade || end.localidade || '';
    const ufVal = end.uf || end.estado || '';

    let valorNum = parseFloat(contract?.valor || contMeta.valor || 0) || 0;

    // --- Vencimento padrão: hoje + 7 dias ---
    const hoje = new Date();
    hoje.setDate(hoje.getDate() + 7);
    const vencimentoDefault = hoje.toISOString().split('T')[0];

    setCobrancaForm(prev => ({
      ...prev,
      cpfPagador: cpfVal,
      cep: cepVal,
      logradouro: logradouro,
      numero: numero,
      bairro: bairro,
      cidade: cidade,
      uf: ufVal.toUpperCase(),
      valor: valorNum > 0 ? valorNum.toFixed(2) : '',
      vencimento: vencimentoDefault,
      cobrarImediatamente: false,
      valorImediato: valorNum > 0 ? valorNum.toFixed(2) : '',
      cycle: 'MONTHLY'
    }));
    setNovaCobrancaModal(true);
  };

  const handleBaixaCobranca = async (id) => {
    setBaixandoId(id);
    try {
      const { error } = await supabase.from('cobrancas').update({ status: 'pago', data_pagamento: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      
      const baixada = cobrancasAbertas.find(c => c.id === id);
      if (baixada) {
        baixada.status = 'pago';
        baixada.data_pagamento = new Date().toISOString();
        setCobrancasAbertas(prev => prev.filter(c => c.id !== id));
        setCobrancasPagas(prev => [baixada, ...prev]);
      }
      setActionMsg({ type: 'success', text: 'Baixa registrada com sucesso!' });
    } catch(err) {
      setActionMsg({ type: 'error', text: 'Erro ao dar baixa: ' + err.message });
    } finally {
      setBaixandoId(null);
    }
  };

  const [selectedCobrancas, setSelectedCobrancas] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggleSelectCobranca = (id) => {
    setSelectedCobrancas(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCobrancas(cobrancasAbertas.map(c => c.id));
    } else {
      setSelectedCobrancas([]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedCobrancas.length === 0) return;
    if (!window.confirm(`Tem certeza que deseja excluir ${selectedCobrancas.length} cobrança(s)?`)) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('cobrancas').delete().in('id', selectedCobrancas);
      if (error) throw error;
      
      setCobrancasAbertas(prev => prev.filter(c => !selectedCobrancas.includes(c.id)));
      setSelectedCobrancas([]);
      setActionMsg({ type: 'success', text: 'Cobranças excluídas com sucesso!' });
      setTimeout(() => setActionMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setActionMsg({ type: 'error', text: 'Erro ao excluir cobranças: ' + err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCobranca = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta cobrança?')) return;
    try {
      const { error } = await supabase.from('cobrancas').delete().eq('id', id);
      if (error) throw error;
      setCobrancasAbertas(prev => prev.filter(c => c.id !== id));
      setSelectedCobrancas(prev => prev.filter(x => x !== id));
      setActionMsg({ type: 'success', text: 'Cobrança excluída!' });
      setTimeout(() => setActionMsg(null), 3000);
    } catch(err) {
      console.error(err);
      setActionMsg({ type: 'error', text: 'Erro ao excluir: ' + err.message });
    }
  };

  const handleRemoverDependente = (index) => {
    if (!family) return;
    setConfirmModalState({
      isOpen: true,
      title: 'Remover Dependente',
      message: 'Deseja realmente remover este dependente da família e do contrato?',
      onConfirm: async () => {
        try {
          const depsAtualizados = [...(family.dependentes || [])];
          depsAtualizados.splice(index, 1);

          const { error } = await supabase.from('familias').update({ dependentes: depsAtualizados }).eq('id', family.id);
          if (error) throw error;

          setFamily(prev => ({ ...prev, dependentes: depsAtualizados }));
          setActionMsg({ type: 'success', text: 'Dependente removido com sucesso!' });
        } catch(err) {
          setActionMsg({ type: 'error', text: 'Erro ao remover dependente: ' + err.message });
        }
        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // ─── Render Guards ─────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
        <i className="fas fa-spinner fa-spin fa-2x" style={{ marginBottom: '1rem', color: '#1565C0' }}></i>
        <p style={{ fontWeight: 600 }}>Carregando informações do contrato...</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
        <i className="fas fa-exclamation-triangle fa-2x" style={{ marginBottom: '1rem', color: '#f59e0b' }}></i>
        <p style={{ fontWeight: 600 }}>Contrato não encontrado ou sem acesso.</p>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Chave de busca: <code>{searchKey}</code></p>
        <button onClick={() => navigate('/contratos/ativos')} style={{ marginTop: '1rem', padding: '0.7rem 1.4rem', borderRadius: '8px', background: '#1565C0', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          Voltar para Contratos
        </button>
      </div>
    );
  }

  // Trata titular como string OU objeto (compatibilidade com dados migrados)
  const rawTit = family?.titular;
  let contMeta = {};
  if (contract?.metadata) {
    try { contMeta = typeof contract.metadata === 'string' ? JSON.parse(contract.metadata) : contract.metadata; } catch(e){}
  }
  let famMeta = {};
  if (family?.metadata) {
    try { famMeta = typeof family.metadata === 'string' ? JSON.parse(family.metadata) : family.metadata; } catch(e){}
  }

  const titularNome = (rawTit && typeof rawTit === 'object') ? (rawTit.nome || contMeta.titular || '—') : (rawTit || contMeta.titular || contract.titular || contract.cliente || '—');
  const titularCpf = (() => {
    if (rawTit && typeof rawTit === 'object') return rawTit.cpf || rawTit.documento || '';
    // Fallback: busca em metadata, família, contrato
    let metaTit = famMeta.titular;
    if (metaTit && typeof metaTit === 'object') return metaTit.cpf || metaTit.documento || '';
    return family?.cpf || family?.documento || contMeta.cpf || contract?.cpf || contract?.cpf_titular || contract?.documento || '—';
  })();
  const dependentes = family?.dependentes || [];
  const totalRecebido = cobrancasPagas.reduce((s, c) => s + (parseFloat(c.valor) || 0), 0);
  
  const displayPlano = contract.plano || contMeta.plano || 'Plano QUALIFY';
  const displayValor = contract.valor || contMeta.valor || 0;
  const displayForma = contract.forma_pagamento || contMeta.forma_pagamento || '—';
  const displayParcelas = contract.parcelas || contMeta.parcelas || '—';
  const displayData = contract.created_at || contract.data_inicio || contMeta.data_inicio || '—';

  const cardStyle = {
    background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px',
    padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
  };
  const cardTitleStyle = {
    display: 'flex', alignItems: 'center', gap: '8px',
    marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9'
  };
  const kvStyle = { display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '10px' };
  const labelStyle = { fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 };
  const valueStyle = { fontSize: '14px', fontWeight: 600, color: '#0f172a' };

  return (
    <div style={{ padding: '10px 0' }}>
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        onConfirm={confirmModalState.onConfirm}
        onCancel={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* ── Banner Titular ── */}
      <div style={{ background: '#1e293b', color: 'white', padding: '16px 24px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <i className="fas fa-id-card" style={{ fontSize: '1.5rem', color: '#38bdf8' }}></i>
        <div>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Titular: </span>
          <strong style={{ fontSize: '1.1rem', marginRight: '20px' }}>{titularNome}</strong>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CPF: </span>
          <strong style={{ color: '#e2e8f0' }}>{titularCpf}</strong>
        </div>
      </div>

      {/* ── Header com Ações ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ fontSize: '1.5rem', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          Edição do Contrato
          <span style={{ fontSize: '0.9rem', padding: '4px 12px', borderRadius: '12px', background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
            #{contract.numero || contract.id}
          </span>
          <StatusBadge status={contract.status} />
        </h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/contratos/ativos')} style={{ background: 'white', border: '1px solid #cbd5e1', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fas fa-arrow-left"></i> Voltar
          </button>
          <button onClick={handleDuplicate} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fas fa-copy"></i> Duplicar
          </button>
          <button onClick={handleCancel} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fas fa-ban"></i> Cancelar
          </button>
        </div>
      </div>

      {actionMsg && (
        <div style={{ padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', background: actionMsg.type === 'error' ? '#fee2e2' : '#dcfce7', color: actionMsg.type === 'error' ? '#991b1b' : '#166534', fontWeight: 600 }}>
          <i className={`fas ${actionMsg.type === 'error' ? 'fa-times-circle' : 'fa-check-circle'}`} style={{ marginRight: '8px' }}></i>
          {actionMsg.text}
        </div>
      )}

      {/* ── 4 Cards de Resumo ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Card 1: Detalhes do Plano */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>
            <i className="fas fa-file-contract" style={{ color: '#3b82f6' }}></i>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Detalhes do Plano</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={kvStyle}>
              <span style={labelStyle}>Nº Contrato</span>
              <span style={valueStyle}>#{contract.numero || contract.id}</span>
            </div>
            <div style={kvStyle}>
              <span style={labelStyle}>Data do Contrato</span>
              <span style={valueStyle}>{fmtDate(displayData)}</span>
            </div>
            <div style={{ ...kvStyle, gridColumn: '1 / -1' }}>
              <span style={labelStyle}>Plano Atual</span>
              <span style={valueStyle}>{displayPlano}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Financeiro */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>
            <i className="fas fa-money-bill-wave" style={{ color: '#10b981' }}></i>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Financeiro</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={kvStyle}>
              <span style={labelStyle}>Tipo Cobrança</span>
              <span style={valueStyle}>{contract.tipoCobranca || contract.tipo_cobranca || contMeta.tipo_cobranca || 'Mensal'}</span>
            </div>
            <div style={kvStyle}>
              <span style={labelStyle}>Mensalidade</span>
              <span style={{ ...valueStyle, color: '#10b981' }}>{fmtCurrency(displayValor)}</span>
            </div>
            <div style={kvStyle}>
              <span style={labelStyle}>Forma Pgto</span>
              <span style={valueStyle}>{displayForma}</span>
            </div>
            <div style={kvStyle}>
              <span style={labelStyle}>Parcelas</span>
              <span style={valueStyle}>{displayParcelas}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Status Operacional */}
        <div style={cardStyle}>
          <div style={cardTitleStyle}>
            <i className="fas fa-chart-pie" style={{ color: '#f59e0b' }}></i>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Status Operacional</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={kvStyle}>
              <span style={labelStyle}>Situação</span>
              <span><StatusBadge status={contract.status} /></span>
            </div>
            <div style={kvStyle}>
              <span style={labelStyle}>Vencido?</span>
              <span style={{ ...valueStyle, color: '#ef4444' }}>{contract.vencido ? 'Sim' : 'Não'}</span>
            </div>
            <div style={kvStyle}>
              <span style={labelStyle}>Em Carência?</span>
              <span style={{ ...valueStyle, color: '#f59e0b' }}>{contract.em_carencia ? 'Sim' : 'Não'}</span>
            </div>
            <div style={kvStyle}>
              <span style={labelStyle}>Desativação</span>
              <span style={valueStyle}>{fmtDate(contract.data_desativacao)}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Balanço Total */}
        <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid #334155', borderRadius: '14px', padding: '20px', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #334155' }}>
            <i className="fas fa-wallet" style={{ color: '#60a5fa' }}></i>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>Balanço Total</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Recebido</span>
              <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: 700, color: '#4ade80' }}>{fmtCurrency(totalRecebido)}</span>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pagas</span>
                <span style={{ display: 'inline-block', fontSize: '14px', fontWeight: 700, background: 'rgba(255,255,255,0.1)', padding: '2px 10px', borderRadius: '12px' }}>{cobrancasPagas.length}</span>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Em aberto</span>
                <span style={{ display: 'inline-block', fontSize: '14px', fontWeight: 700, background: 'rgba(255,255,255,0.1)', padding: '2px 10px', borderRadius: '12px' }}>{cobrancasAbertas.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Abas ── */}
      <div style={{ borderBottom: '2px solid #e2e8f0', display: 'flex', gap: '4px', marginBottom: '20px', overflowX: 'auto' }}>
        {[
          { key: 'cobrancas', label: 'Cobranças', icon: 'fa-file-invoice-dollar' },
          { key: 'familiares', label: 'Familiares', icon: 'fa-users' },
          { key: 'eventos', label: 'Eventos', icon: 'fa-stream' },
          { key: 'anotacoes', label: 'Anotações', icon: 'fa-sticky-note' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '10px 18px', background: 'transparent', border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.88rem', color: activeTab === tab.key ? '#1565C0' : '#64748b',
            borderBottom: `2px solid ${activeTab === tab.key ? '#1565C0' : 'transparent'}`,
            marginBottom: '-2px', display: 'flex', alignItems: 'center', gap: '6px',
            transition: 'all 0.15s', whiteSpace: 'nowrap'
          }}>
            <i className={`fas ${tab.icon}`}></i> {tab.label}
          </button>
        ))}
      </div>

      {/* ── ABA: Cobranças ── */}
      {activeTab === 'cobrancas' && (
        <div>
          {/* Em Aberto */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ background: '#fff8e1', borderBottom: '1px solid #ffecb3', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#ffecb3', color: '#f57f17', padding: '6px 8px', borderRadius: '6px' }}><i className="fas fa-clock"></i></div>
                <div>
                  <h4 style={{ margin: 0, color: '#f57f17', fontWeight: 700, fontSize: '14px' }}>Em Aberto</h4>
                  <p style={{ margin: 0, color: '#fbc02d', fontSize: '12px' }}>Faturas aguardando pagamento ou vencidas</p>
                </div>
              </div>
              <button onClick={handleAbrirNovaCobranca} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-plus"></i> Nova Cobrança
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #e2e8f0', fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '12px', width: '40px', textAlign: 'center' }}>
                      <input type="checkbox" onChange={handleToggleSelectAll} checked={cobrancasAbertas.length > 0 && selectedCobrancas.length === cobrancasAbertas.length} style={{ cursor: 'pointer' }} />
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Tipo</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Vencimento</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Valor</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {cobrancasAbertas.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                        <i className="fas fa-check-circle" style={{ fontSize: '24px', display: 'block', marginBottom: '8px', color: '#cbd5e1' }}></i>
                        Nenhuma cobrança em aberto
                      </td>
                    </tr>
                  ) : cobrancasAbertas.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0', background: selectedCobrancas.includes(c.id) ? '#eff6ff' : 'transparent' }}>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <input type="checkbox" checked={selectedCobrancas.includes(c.id)} onChange={() => handleToggleSelectCobranca(c.id)} style={{ cursor: 'pointer' }} />
                      </td>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{c.tipo || 'Mensalidade'}</td>
                      <td style={{ padding: '12px' }}>{fmtDate(c.vencimento || c.data_vencimento)}</td>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#dc2626' }}>{fmtCurrency(c.valor)}</td>
                      <td style={{ padding: '12px' }}><StatusBadge status={c.status || 'pendente'} /></td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          <button 
                            onClick={() => handleBaixaCobranca(c.id)}
                            disabled={baixandoId === c.id}
                            style={{ background: '#dcfce7', color: '#166534', border: 'none', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                          >
                            {baixandoId === c.id ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-check"></i> Dar baixa</>}
                          </button>
                          <button 
                            onClick={() => handleDeleteCobranca(c.id)}
                            style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                            title="Excluir Cobrança"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedCobrancas.length > 0 && (
              <div style={{ padding: '10px 16px', background: '#f1f5f9', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>{selectedCobrancas.length} cobrança(s) selecionada(s)</span>
                <button 
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isDeleting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-trash"></i>} 
                  Excluir Selecionadas
                </button>
              </div>
            )}
          </div>

          {/* Pagas */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ background: '#e8f5e9', borderBottom: '1px solid #c8e6c9', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#c8e6c9', color: '#2e7d32', padding: '6px 8px', borderRadius: '6px' }}><i className="fas fa-check-circle"></i></div>
              <div>
                <h4 style={{ margin: 0, color: '#2e7d32', fontWeight: 700, fontSize: '14px' }}>Histórico de Pagamentos</h4>
                <p style={{ margin: 0, color: '#4caf50', fontSize: '12px' }}>Faturas já pagas ou confirmadas</p>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #e2e8f0', fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '12px' }}>Tipo</th>
                    <th style={{ padding: '12px' }}>Data Pgto</th>
                    <th style={{ padding: '12px' }}>Valor</th>
                    <th style={{ padding: '12px' }}>Método</th>
                  </tr>
                </thead>
                <tbody>
                  {cobrancasPagas.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                        <i className="fas fa-history" style={{ fontSize: '24px', display: 'block', marginBottom: '8px', color: '#cbd5e1' }}></i>
                        Nenhum pagamento registrado
                      </td>
                    </tr>
                  ) : cobrancasPagas.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{c.tipo || 'Mensalidade'}</td>
                      <td style={{ padding: '12px' }}>{fmtDate(c.data_pagamento || c.pago_em)}</td>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#10b981' }}>{fmtCurrency(c.valor)}</td>
                      <td style={{ padding: '12px' }}>{c.metodo || c.forma_pagamento || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ABA: Familiares ── */}
      {activeTab === 'familiares' && (
        <div>
          {/* Vinculados */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#bbf7d0', color: '#166534', padding: '6px 8px', borderRadius: '6px' }}><i className="fas fa-check-circle"></i></div>
                <div>
                  <h4 style={{ margin: 0, color: '#166534', fontWeight: 700, fontSize: '14px' }}>Vinculados ao Contrato</h4>
                  <p style={{ margin: 0, color: '#4ade80', fontSize: '12px' }}>Pessoas cobertas por este plano</p>
                </div>
              </div>
              <span style={{ background: '#bbf7d0', color: '#166534', fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px' }}>
                {1 + dependentes.length}
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Nome Completo</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Parentesco</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Idade</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>{titularNome}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 700 }}>Titular</span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>{calcAge(family?.titular?.nascimento || family?.titular?.dataNascimento)}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}><StatusBadge status="ativo" /></td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>N/A</span>
                  </td>
                </tr>
                {dependentes.map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{d.nome}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 }}>{d.parentesco}</span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>{calcAge(d.nascimento || d.dataNascimento)}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}><StatusBadge status="ativo" /></td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button onClick={() => handleRemoverDependente(i)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer' }} title="Remover Dependente">
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {!family && (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      <i className="fas fa-info-circle" style={{ fontSize: '20px', display: 'block', marginBottom: '8px' }}></i>
                      Nenhuma família vinculada a este contrato
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ABA: Eventos ── */}
      {activeTab === 'eventos' && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-stream" style={{ color: '#64748b' }}></i>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>Log de Eventos</h3>
            <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: 'auto' }}>
              <i className="fas fa-lock"></i> Log imutável de ações automáticas
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                <th style={{ padding: '12px' }}>Data/Hora</th>
                <th style={{ padding: '12px' }}>Tipo</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Descrição</th>
                <th style={{ padding: '12px' }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {eventos.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                    <i className="fas fa-stream" style={{ fontSize: '28px', display: 'block', marginBottom: '8px', color: '#cbd5e1' }}></i>
                    Nenhum evento registrado para este contrato.
                  </td>
                </tr>
              ) : eventos.map(ev => (
                <tr key={ev.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px' }}>{ev.created_at ? new Date(ev.created_at).toLocaleString('pt-BR') : '—'}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <StatusBadge status={ev.tipo} />
                  </td>
                  <td style={{ padding: '12px', color: '#475569' }}>{ev.descricao || '—'}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#10b981' }}>{ev.valor ? fmtCurrency(ev.valor) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ABA: Anotações ── */}
      {activeTab === 'anotacoes' && (
        <div>
          {/* Formulário */}
          <div style={{ ...cardStyle, marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 16px', color: '#1e293b', fontSize: '15px', fontWeight: 700 }}>
              <i className="fas fa-plus-circle" style={{ color: '#3b82f6', marginRight: '8px' }}></i>
              Nova Anotação
            </h3>
            <form onSubmit={handleAddAnotacao} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="Título da anotação *"
                value={novaAnotacao.titulo}
                onChange={e => setNovaAnotacao(prev => ({ ...prev, titulo: e.target.value }))}
                required
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
              />
              <textarea
                placeholder="Descrição detalhada..."
                rows={3}
                value={novaAnotacao.descricao}
                onChange={e => setNovaAnotacao(prev => ({ ...prev, descricao: e.target.value }))}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', resize: 'vertical', outline: 'none' }}
              />
              <button type="submit" style={{ alignSelf: 'flex-start', background: '#1565C0', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-plus"></i> Adicionar
              </button>
            </form>
          </div>

          {/* Lista */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Título</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Descrição</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Criado em</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {anotacoes.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                      <i className="fas fa-sticky-note" style={{ fontSize: '28px', display: 'block', marginBottom: '8px', color: '#cbd5e1' }}></i>
                      Nenhuma anotação criada. Use o formulário acima para adicionar.
                    </td>
                  </tr>
                ) : anotacoes.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#1e293b' }}>{a.titulo}</td>
                    <td style={{ padding: '12px', color: '#64748b', fontSize: '13px' }}>{a.descricao || '—'}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
                      {a.created_at ? new Date(a.created_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button onClick={() => handleDeleteAnotacao(a.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal Nova Cobrança ── */}
      {novaCobrancaModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '2rem 1rem' }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '20px', width: '100%', maxWidth: '750px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', margin: '2rem auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.2rem', fontWeight: 700 }}>Adicionar Cobranças</h3>
              <button onClick={() => setNovaCobrancaModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.2rem' }}><i className="fas fa-times"></i></button>
            </div>
            
            <form onSubmit={handleAddCobranca} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* BLOCO 1: IDENTIFICAÇÃO BÁSICA */}
              <div style={{ paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b', textTransform: 'uppercase' }}>1. Informações Básicas</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Método de cobrança</label>
                    <select value={cobrancaForm.metodo} onChange={e => setCobrancaForm(prev => ({ ...prev, metodo: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '2px solid #3b82f6', fontSize: '14px', background: '#eff6ff', color: '#1e293b', fontWeight: 600 }}>
                      <option value="pix_automatico">Pix Automático (Assinatura)</option>
                      <option value="pix">Pix (Avulso / Parcelado)</option>
                      <option value="cartao">Cartão (Crédito/Débito)</option>
                      <option value="money">Dinheiro (Manual)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>CPF do Pagador *</label>
                    <input type="text" placeholder="000.000.000-00" value={cobrancaForm.cpfPagador} onChange={e => setCobrancaForm(prev => ({ ...prev, cpfPagador: e.target.value }))} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                  </div>
                </div>
              </div>

              {/* BLOCO 2: REGRAS DE VALOR E DATA */}
              <div style={{ paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b', textTransform: 'uppercase' }}>2. Detalhes do Pagamento</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                      {cobrancaForm.metodo === 'pix_automatico' ? 'Valor da Mensalidade (R$)' : 'Valor (R$)'}
                    </label>
                    <input type="number" step="0.01" placeholder="0.00" value={cobrancaForm.valor} onChange={e => setCobrancaForm(prev => ({ ...prev, valor: e.target.value, valorImediato: prev.cobrarImediatamente ? e.target.value : prev.valorImediato }))} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                      {cobrancaForm.metodo === 'pix_automatico' ? 'Vencimento Base' : 'Data de Vencimento'}
                    </label>
                    <input type="date" value={cobrancaForm.vencimento} onChange={e => setCobrancaForm(prev => ({ ...prev, vencimento: e.target.value }))} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                  </div>
                </div>

                {cobrancaForm.metodo === 'pix_automatico' ? (
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>Frequência (Ciclo)</label>
                        <select value={cobrancaForm.cycle} onChange={e => setCobrancaForm(prev => ({ ...prev, cycle: e.target.value }))} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
                          <option value="MONTHLY">Mensal</option>
                          <option value="YEARLY">Anual</option>
                          <option value="WEEKLY">Semanal</option>
                        </select>
                      </div>
                      
                      <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0f172a', fontWeight: 600, cursor: 'pointer', marginBottom: cobrancaForm.cobrarImediatamente ? '12px' : 0 }}>
                          <input type="checkbox" checked={cobrancaForm.cobrarImediatamente} onChange={e => setCobrancaForm(prev => ({ ...prev, cobrarImediatamente: e.target.checked, valorImediato: e.target.checked ? prev.valor : '' }))} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                          Cobrar uma taxa IMEDIATAMENTE (No ato da assinatura)
                        </label>
                        
                        {cobrancaForm.cobrarImediatamente && (
                          <div style={{ paddingLeft: '26px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', color: '#64748b' }}>Valor da cobrança inicial (Adesão/Matrícula):</label>
                            <input type="number" step="0.01" value={cobrancaForm.valorImediato} onChange={e => setCobrancaForm(prev => ({ ...prev, valorImediato: e.target.value }))} style={{ width: '150px', padding: '8px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '14px', background: '#fff' }} />
                            <small style={{ color: '#059669', fontSize: '11px' }}>* Uma cobrança avulsa será gerada para HOJE no valor de R$ {cobrancaForm.valorImediato || '0.00'}.</small>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Quantidade de parcelas</label>
                      <input type="number" min="1" value={cobrancaForm.parcelas} onChange={e => setCobrancaForm(prev => ({ ...prev, parcelas: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* BLOCO 3: COMPLEMENTOS */}
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b', textTransform: 'uppercase' }}>3. Complementos</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Tipo / Descrição</label>
                    <select value={cobrancaForm.tipo} onChange={e => setCobrancaForm(prev => ({ ...prev, tipo: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}>
                      <option value="Mensalidade">Mensalidade</option>
                      <option value="Adesao">Adesão / Taxa Inicial</option>
                      <option value="Avulsa">Cobrança Avulsa</option>
                      <option value="Multa">Multa / Juros</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Mensagem (Opcional)</label>
                    <input type="text" placeholder="Mensagem para o cliente..." value={cobrancaForm.mensagem} onChange={e => setCobrancaForm(prev => ({ ...prev, mensagem: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 8px', color: '#64748b', fontSize: '14px', textTransform: 'uppercase' }}>
                  <i className="fas fa-map-marker-alt"></i> Endereço do Pagador
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px', gap: '10px', marginBottom: '10px' }}>
                  <input type="text" placeholder="CEP" value={cobrancaForm.cep} onChange={e => setCobrancaForm(prev => ({ ...prev, cep: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                  <input type="text" placeholder="Logradouro" value={cobrancaForm.logradouro} onChange={e => setCobrancaForm(prev => ({ ...prev, logradouro: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                  <input type="text" placeholder="Nº" value={cobrancaForm.numero} onChange={e => setCobrancaForm(prev => ({ ...prev, numero: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '10px' }}>
                  <input type="text" placeholder="Bairro" value={cobrancaForm.bairro} onChange={e => setCobrancaForm(prev => ({ ...prev, bairro: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                  <input type="text" placeholder="Cidade" value={cobrancaForm.cidade} onChange={e => setCobrancaForm(prev => ({ ...prev, cidade: e.target.value }))} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }} />
                  <input type="text" placeholder="UF" value={cobrancaForm.uf} onChange={e => setCobrancaForm(prev => ({ ...prev, uf: e.target.value }))} maxLength={2} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', textTransform: 'uppercase' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setNovaCobrancaModal(false)} style={{ padding: '10px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Salvar Cobrança</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
