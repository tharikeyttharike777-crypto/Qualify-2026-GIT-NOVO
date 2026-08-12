import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import ConfirmModal from '../components/common/ConfirmModal';

export default function NovaFamilia() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');

  // Form State
  const [titular, setTitular] = useState({
    nome: '',
    dataNascimento: '',
    email: '',
    sexo: 'masculino',
    rg: '',
    cpf: '',
    celular: '',
    profissao: ''
  });

  const [endereco, setEndereco] = useState({
    cep: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    complemento: ''
  });

  const [dependentes, setDependentes] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [pets, setPets] = useState([]);
  const [planosDisponiveis, setPlanosDisponiveis] = useState([]);

  // Confirm Modal state
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: 'Confirmar Exclusão',
    message: '',
    onConfirm: () => {}
  });

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'dependente' | 'contrato' | 'pet'
  
  // Modal forms
  const [depForm, setDepForm] = useState({
    nome: '',
    parentesco: '',
    carencia: 'padrao',
    dataNascimento: '',
    cpf: '',
    genero: '',
    celular: '',
    psicologo: '',
    seguradora: ''
  });

  const [contratoForm, setContratoForm] = useState({
    numero: '000001',
    plano: '',
    dataInicio: new Date().toISOString().slice(0, 10),
    valor: '',
    formaPagamento: 'Pix',
    planoContas: 'Mensalidades',
    parcelas: '12',
    participantes: []
  });

  const [petForm, setPetForm] = useState({ nome: '', especie: '', raca: '', idade: '' });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // Helper to convert dates to YYYY-MM-DD for <input type="date">
  const formatToDateInput = (val) => {
    if (!val) return '';
    const s = String(val).trim();
    if (!s) return '';
    
    if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(s)) {
      return s.slice(0, 10).replace(/\//g, '-');
    }
    if (/^\d{2}[-/]\d{2}[-/]\d{4}/.test(s)) {
      const parts = s.split(/[-/]/);
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    } catch(e){}
    return '';
  };

  // Helper to convert YYYY-MM-DD or any date to DD/MM/YYYY for table display
  const formatDisplayDate = (val) => {
    if (!val) return '-';
    const s = String(val).trim();
    if (!s) return '-';
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      const [y, m, d] = s.slice(0, 10).split('-');
      return `${d}/${m}/${y}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s;
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      }
    } catch(e){}
    return s;
  };

  useEffect(() => {
    fetchPlanos();
    fetchNextContractNumber();
  }, []);

  async function fetchNextContractNumber() {
    try {
      // Busca todos os números de contrato existentes para pegar o maior
      const { data } = await supabase.from('contratos').select('numero').order('numero', { ascending: false });
      let maxNum = 0;
      if (Array.isArray(data)) {
        data.forEach(row => {
          const n = parseInt(String(row.numero || '0').replace(/\D/g, ''), 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        });
      }
      // Verifica também nos contratos locais
      try {
        const localConts = JSON.parse(localStorage.getItem('contratos') || '[]');
        localConts.forEach(c => {
          const n = parseInt(String(c.numero || '0').replace(/\D/g, ''), 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        });
      } catch(e){}
      const nextNum = String(maxNum + 1).padStart(6, '0');
      setContratoForm(prev => ({ ...prev, numero: nextNum }));
    } catch(e) {
      // Fallback: número sequencial simples
      setContratoForm(prev => ({ ...prev, numero: '000001' }));
    }
  }

  async function fetchPlanos() {
    try {
      const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
      let query = supabase.from('planos').select('*');
      if (companyId) query = query.eq('company_id', companyId);
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        setPlanosDisponiveis(data);
      }
    } catch (e) {}
  }

  // Load if editing
  useEffect(() => {
    if (!editId) return;

    async function loadFamily() {
      setLoading(true);
      try {
        const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
        let query = supabase.from('familias').select('*').eq('id', editId);
        if (companyId) query = query.eq('company_id', companyId);
        
        let { data, error } = await query.single();
        if (error || !data) {
          const res = await supabase.from('familias').select('*').eq('id', editId).single();
          data = res.data;
        }

        if (!data) {
          try {
            const local = JSON.parse(localStorage.getItem('familias') || '[]');
            data = local.find(f => String(f.id) === String(editId));
          } catch(e){}
        }

        if (data) {
          let meta = {};
          if (data.metadata) {
            try { meta = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata; } catch(e){}
          }

          const rawTitular = data.titular || meta.titular || {};
          const rawNasc = rawTitular.dataNascimento ||
                          rawTitular.data_nascimento ||
                          rawTitular.dataNasc ||
                          rawTitular.data_nasc ||
                          rawTitular.dt_nascimento ||
                          rawTitular.nascimento ||
                          rawTitular.dob ||
                          rawTitular.birth_date ||
                          data.data_nascimento ||
                          data.dataNascimento ||
                          data.nascimento ||
                          meta.dataNascimento ||
                          meta.data_nascimento ||
                          meta.nascimento ||
                          '';

          setTitular({
            nome: rawTitular.nome || data.nome || meta.nome || '',
            dataNascimento: formatToDateInput(rawNasc),
            email: rawTitular.email || data.email || meta.email || '',
            sexo: rawTitular.sexo || rawTitular.genero || 'masculino',
            rg: rawTitular.rg || data.rg || meta.rg || '',
            cpf: rawTitular.cpf || data.cpf || meta.cpf || '',
            celular: rawTitular.celular || data.celular || meta.celular || '',
            profissao: rawTitular.profissao || data.profissao || meta.profissao || ''
          });

          const rawEndereco = data.endereco || meta.endereco || {};
          setEndereco({
            cep: rawEndereco.cep || data.cep || '',
            rua: rawEndereco.rua || data.rua || '',
            numero: rawEndereco.numero || data.numero || '',
            bairro: rawEndereco.bairro || data.bairro || '',
            cidade: rawEndereco.cidade || data.cidade || '',
            estado: rawEndereco.estado || data.estado || '',
            complemento: rawEndereco.complemento || data.complemento || ''
          });

          const rawDeps = data.dependentes || meta.dependentes || [];
          if (Array.isArray(rawDeps)) {
            setDependentes(rawDeps.map((d, i) => ({
              id: d.id || i,
              nome: d.nome || '',
              parentesco: d.parentesco || 'Outro',
              carencia: d.carencia || 'padrao',
              dataNascimento: formatToDateInput(d.dataNascimento || d.data_nascimento || d.nascimento || d.dataNasc),
              cpf: d.cpf || '',
              genero: d.genero || '',
              celular: d.celular || '',
              psicologo: d.psicologo || '',
              seguradora: d.seguradora || ''
            })));
          }

          if (Array.isArray(data.pets || meta.pets)) setPets(data.pets || meta.pets);

          // Carrega contratos da família ou do Supabase
          try {
            const { data: centralConts } = await supabase.from('contratos').select('*');
            if (Array.isArray(centralConts)) {
              const matched = centralConts.filter(c => {
                let cMeta = {};
                try { cMeta = typeof c.metadata === 'string' ? JSON.parse(c.metadata) : (c.metadata || {}); } catch(e){}
                
                const fId = String(c.family_id || c.familyId || c.familia_id || cMeta.family_id || cMeta.familyId || cMeta.familia_id);
                if (fId === String(editId)) return true;
                
                const cTitular = String(c.titular || c.cliente || cMeta.titular || '').trim().toLowerCase();
                const rTitular = String(rawTitular.nome || data.nome || meta.nome || '').trim().toLowerCase();
                
                return cTitular && rTitular && cTitular === rTitular;
              });
              
              if (matched.length > 0) setContratos(matched);
              else if (Array.isArray(data.contratos || meta.contratos)) setContratos(data.contratos || meta.contratos);
            } else if (Array.isArray(data.contratos || meta.contratos)) {
              setContratos(data.contratos || meta.contratos);
            }
          } catch(e) {
            if (Array.isArray(data.contratos || meta.contratos)) setContratos(data.contratos || meta.contratos);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar família para edição:", err);
      } finally {
        setLoading(false);
      }
    }

    loadFamily();
  }, [editId]);

  const handleTitularChange = (e) => {
    let { name, value } = e.target;
    
    // Máscaras automáticas
    if (name === 'cpf') {
      value = value.replace(/\D/g, '');
      if (value.length > 11) value = value.slice(0, 11);
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else if (name === 'celular') {
      value = value.replace(/\D/g, '');
      if (value.length > 11) value = value.slice(0, 11);
      if (value.length > 2) value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
      if (value.length > 9) value = value.replace(/(\d{5})(\d)/, '$1-$2');
      else if (value.length > 8) value = value.replace(/(\d{4})(\d)/, '$1-$2');
    }
    
    setTitular(prev => ({ ...prev, [name]: value }));
  };

  const handleEnderecoChange = (e) => {
    let { name, value } = e.target;
    
    if (name === 'cep') {
      value = value.replace(/\D/g, '');
      if (value.length > 8) value = value.slice(0, 8);
      value = value.replace(/^(\d{5})(\d)/, '$1-$2');
    }
    
    setEndereco(prev => ({ ...prev, [name]: value }));
  };

  const buscarCep = async () => {
    const cleanCep = endereco.cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEndereco(prev => ({
          ...prev,
          rua: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || ''
        }));
      }
    } catch (err) {
      console.error("Erro ao buscar CEP:", err);
    }
  };

  // Add items handlers
  const handleAddDependente = (e) => {
    e.preventDefault();
    setDependentes(prev => [...prev, { id: Date.now(), ...depForm }]);
    setDepForm({ nome: '', parentesco: '', carencia: 'padrao', dataNascimento: '', cpf: '', genero: '', celular: '', psicologo: '', seguradora: '' });
    setActiveModal(null);
  };

  const handleAddContrato = async (e) => {
    e.preventDefault();
    const tempContrato = { id: `temp-${Date.now()}`, ...contratoForm };
    setContratos(prev => [...prev, tempContrato]);

    // Unifica e cria o contrato na tabela central 'contratos' do Supabase
    try {
      const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
      const payloadCentral = {
        numero: contratoForm.numero,
        company_id: companyId,
        status: 'ativo',
        metadata: {
          plano: contratoForm.plano,
          valor: contratoForm.valor,
          forma_pagamento: contratoForm.formaPagamento,
          plano_contas: contratoForm.planoContas,
          parcelas: contratoForm.parcelas,
          data_inicio: contratoForm.dataInicio,
          titular: titular.nome || 'Família em cadastro'
        }
      };
      // Tenta insert e recebe o UUID real do Supabase
      const { data: upsertedRows } = await supabase
        .from('contratos')
        .insert([payloadCentral])
        .select();

      // Atualiza o contrato local com o UUID real do banco (para navegação funcionar)
      if (upsertedRows?.[0]?.id) {
        const realId = upsertedRows[0].id;
        setContratos(prev => prev.map(c =>
          c.id === tempContrato.id ? { ...c, id: realId } : c
        ));
      }

      // Salva no localStorage para redundância
      const localConts = JSON.parse(localStorage.getItem('contratos') || '[]');
      localConts.push(payloadCentral);
      localStorage.setItem('contratos', JSON.stringify(localConts));
    } catch(err) {
      console.warn("Aviso ao sincronizar contrato central:", err);
    }

    setContratoForm({
      numero: '------',
      plano: '',
      dataInicio: new Date().toISOString().slice(0, 10),
      valor: '',
      formaPagamento: 'Pix',
      planoContas: 'Mensalidades',
      parcelas: '12',
      participantes: []
    });
    setActiveModal(null);
    // Busca o próximo número sequencial disponível após salvar
    fetchNextContractNumber();
  };

  const handleAddPet = (e) => {
    e.preventDefault();
    setPets(prev => [...prev, { id: Date.now(), ...petForm }]);
    setPetForm({ nome: '', especie: '', raca: '', idade: '' });
    setActiveModal(null);
  };

  // Styled modal deletion prompts
  const removeDependente = (id) => {
    const item = dependentes.find(d => d.id === id);
    setConfirmModalState({
      isOpen: true,
      title: 'Excluir Dependente',
      message: `Tem certeza que deseja remover o dependente "${item?.nome || 'Selecionado'}"?`,
      onConfirm: () => {
        setDependentes(prev => prev.filter(d => d.id !== id));
        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const removeContrato = (id, num) => {
    const displayNum = num || id;
    setConfirmModalState({
      isOpen: true,
      title: 'Excluir Contrato',
      message: `Tem certeza que deseja remover permanentemente o contrato #${displayNum}? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setContratos(prev => prev.filter(c => c.id !== id && c.numero !== num));
        try {
          if (num) await supabase.from('contratos').delete().eq('numero', num);
          if (id) await supabase.from('contratos').delete().eq('id', id);

          if (editId) {
             const res = await supabase.from('familias').select('*').eq('id', editId).single();
             if (res.data) {
                let fam = res.data;
                let meta = {};
                if (fam.metadata) {
                  try { meta = typeof fam.metadata === 'string' ? JSON.parse(fam.metadata) : fam.metadata; } catch(e){}
                }
                const rawConts = fam.contratos || meta.contratos || [];
                if (rawConts.length > 0) {
                  const newConts = rawConts.filter(cc => String(cc.id) !== String(id) && String(cc.numero) !== String(num));
                  meta.contratos = newConts;
                  await supabase.from('familias').update({ metadata: meta }).eq('id', editId);
                }
             }
          }

          const localContratosStr = localStorage.getItem('contratos');
          if (localContratosStr) {
            let parsed = JSON.parse(localContratosStr);
            parsed = parsed.filter(cc => String(cc.id) !== String(id) && String(cc.numero) !== String(num));
            localStorage.setItem('contratos', JSON.stringify(parsed));
          }
        } catch(e){}
        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const removePet = (id) => {
    const item = pets.find(p => p.id === id);
    setConfirmModalState({
      isOpen: true,
      title: 'Excluir Pet',
      message: `Tem certeza que deseja remover o pet "${item?.nome || 'Selecionado'}"?`,
      onConfirm: () => {
        setPets(prev => prev.filter(p => p.id !== id));
        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Save full family to Supabase
  const handleSaveFamily = async (e) => {
    e.preventDefault();
    if (!titular.nome || !titular.cpf || !titular.celular) {
      setMsg({ type: 'error', text: 'Preencha todos os campos obrigatórios (*)' });
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
      
      // NOTA CRÍTICA: Não passa 'contratos' no familyPayload direto porque não existe essa coluna na tabela 'familias'!
      const familyPayload = {
        titular,
        endereco,
        dependentes,
        company_id: companyId,
        metadata: {
          contratos,
          pets
        },
        updated_at: new Date().toISOString()
      };

      let result;
      let familyRecordId = editId;

      if (editId) {
        result = await supabase.from('familias').update(familyPayload).eq('id', editId);
      } else {
        result = await supabase.from('familias').insert([familyPayload]).select();
        if (result.data?.[0]?.id) familyRecordId = result.data[0].id;
      }

      if (result.error) throw result.error;

      for (const c of contratos) {
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id);
          const payload = {
            numero: c.numero || String(c.id),
            company_id: companyId,
            status: 'ativo',
            metadata: {
              plano: c.plano,
              valor: c.valor,
              forma_pagamento: c.formaPagamento || c.forma_pagamento,
              titular: titular.nome,
              family_id: familyRecordId || null
            }
          };
          if (isUuid) payload.id = c.id;
          
          await supabase.from('contratos').upsert([payload]);
        } catch(e){}
      }

      // Sync no localStorage
      try {
        const local = JSON.parse(localStorage.getItem('familias') || '[]');
        if (editId) {
          const idx = local.findIndex(f => String(f.id) === String(editId));
          if (idx !== -1) local[idx] = { ...local[idx], ...familyPayload, contratos };
          else local.push({ id: editId, ...familyPayload, contratos });
        } else {
          local.push({ id: familyRecordId || Date.now(), ...familyPayload, contratos });
        }
        localStorage.setItem('familias', JSON.stringify(local));
      } catch (e) {}

      setMsg({ type: 'success', text: 'Família salva com sucesso!' });
      setTimeout(() => navigate('/familias/pesquisar'), 1200);
    } catch (err) {
      console.error("Erro ao salvar família:", err);
      setMsg({ type: 'error', text: 'Erro ao salvar: ' + (err.message || 'Falha de comunicação.') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        onConfirm={confirmModalState.onConfirm}
        onCancel={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
      />

      <div className="breadcrumb" style={{ marginBottom: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
        <span>Famílias</span> <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem', margin: '0 0.5rem' }}></i> <span className="active" style={{ color: '#1565C0', fontWeight: 600 }}>{editId ? 'Editar Família' : 'Nova Família'}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#2c3e50', margin: 0 }}>{editId ? 'Editar Família' : 'Nova Família'}</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="button" onClick={() => navigate('/familias/pesquisar')} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-times"></i> Cancelar
          </button>
          <button type="button" onClick={handleSaveFamily} disabled={loading} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}>
            <i className="fas fa-save"></i> {loading ? 'Salvando...' : 'Salvar Família'}
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', backgroundColor: msg.type === 'error' ? '#fee2e2' : '#dcfce7', color: msg.type === 'error' ? '#991b1b' : '#166534', border: `1px solid ${msg.type === 'error' ? '#fca5a5' : '#86efac'}` }}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSaveFamily}>
        {/* Seção 1: Informações Pessoais */}
        <div style={{ background: '#fff', padding: '1.8rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.2rem', color: '#1565C0', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.6rem', fontWeight: 700 }}>
            1. Informações Pessoais
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>* Nome (obrigatório)</label>
              <input type="text" name="nome" value={titular.nome} onChange={handleTitularChange} required style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>* Data de nascimento</label>
              <input type="date" name="dataNascimento" value={titular.dataNascimento} onChange={handleTitularChange} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>E-mail</label>
              <input type="email" name="email" value={titular.email} onChange={handleTitularChange} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>* CPF (obrigatório)</label>
              <input type="text" name="cpf" placeholder="000.000.000-00" value={titular.cpf} onChange={handleTitularChange} required style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>* Celular</label>
              <input type="tel" name="celular" placeholder="(00) 00000-0000" value={titular.celular} onChange={handleTitularChange} required style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>RG</label>
              <input type="text" name="rg" value={titular.rg} onChange={handleTitularChange} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Profissão</label>
              <input type="text" name="profissao" value={titular.profissao} onChange={handleTitularChange} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>
        </div>

        {/* Seção 2: Dados de Endereço */}
        <div style={{ background: '#fff', padding: '1.8rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.2rem', color: '#1565C0', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.6rem', fontWeight: 700 }}>
            2. Dados de Endereço
          </h2>
          <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.2rem', alignItems: 'flex-end' }}>
            <div style={{ width: '200px' }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>CEP</label>
              <input type="text" name="cep" value={endereco.cep} onChange={handleEnderecoChange} placeholder="00000-000" style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
            </div>
            <button type="button" onClick={buscarCep} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.7rem 1.4rem', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}>
              <i className="fas fa-search"></i> Buscar CEP
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Rua</label>
              <input type="text" name="rua" value={endereco.rua} onChange={handleEnderecoChange} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Nº</label>
              <input type="text" name="numero" value={endereco.numero} onChange={handleEnderecoChange} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Bairro</label>
              <input type="text" name="bairro" value={endereco.bairro} onChange={handleEnderecoChange} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Cidade</label>
              <input type="text" name="cidade" value={endereco.cidade} onChange={handleEnderecoChange} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Estado (UF)</label>
              <input type="text" name="estado" maxLength="2" value={endereco.estado} onChange={handleEnderecoChange} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1', textTransform: 'uppercase' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Complemento</label>
              <input type="text" name="complemento" value={endereco.complemento} onChange={handleEnderecoChange} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>
        </div>

        {/* Seção 3: Dependentes */}
        <div style={{ background: '#fff', padding: '1.8rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.6rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#1565C0', fontWeight: 700 }}>
              3. Dependentes da Família ({dependentes.length})
            </h2>
            <button type="button" onClick={() => setActiveModal('dependente')} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}>
              <i className="fas fa-plus"></i> Adicionar Dependente
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
                <th style={{ padding: '12px' }}>Nome</th>
                <th style={{ padding: '12px' }}>Parentesco</th>
                <th style={{ padding: '12px' }}>Nascimento</th>
                <th style={{ padding: '12px' }}>CPF</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {dependentes.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Nenhum dependente adicionado.</td>
                </tr>
              ) : (
                dependentes.map(dep => (
                  <tr key={dep.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#1e293b' }}>{dep.nome}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{dep.parentesco}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{formatDisplayDate(dep.dataNascimento)}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{dep.cpf || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button type="button" onClick={() => removeDependente(dep.id)} style={{ background: '#fee2e2', border: 'none', padding: '6px 12px', borderRadius: '6px', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}>
                        <i className="fas fa-trash"></i> Excluir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Seção 4: Contratos */}
        <div style={{ background: '#fff', padding: '1.8rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.6rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#1565C0', fontWeight: 700 }}>
              4. Contratos ({contratos.length})
            </h2>
            <button type="button" onClick={() => setActiveModal('contrato')} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}>
              <i className="fas fa-plus"></i> Adicionar Contrato
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
                <th style={{ padding: '12px' }}>Número</th>
                <th style={{ padding: '12px' }}>Plano</th>
                <th style={{ padding: '12px' }}>Valor</th>
                <th style={{ padding: '12px' }}>Forma Pagamento</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {contratos.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Nenhum contrato associado.</td>
                </tr>
              ) : (
                contratos.map(c => {
                  // SEMPRE usa 'numero' para navegar — nunca o id interno (timestamp/UUID)
                  const targetKey = c.numero || c.id;
                  return (
                    <tr key={c.id || c.numero} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#1565C0' }}>
                        <button type="button" onClick={() => navigate(`/contratos/editar?numero=${targetKey}`)} style={{ border: 'none', background: 'none', color: '#1565C0', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
                          #{c.numero}
                        </button>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 600, color: '#1e293b' }}>{c.plano}</td>
                      <td style={{ padding: '12px', fontWeight: 700, color: '#10b981' }}>{c.valor ? `R$ ${c.valor}` : '-'}</td>
                      <td style={{ padding: '12px', color: '#475569' }}>{c.formaPagamento || c.forma_pagamento || '-'}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button type="button" onClick={() => navigate(`/contratos/editar?numero=${targetKey}`)} style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '6px', color: '#1565C0', cursor: 'pointer', fontWeight: 600 }} title="Acessar / Editar Contrato">
                            <i className="fas fa-edit"></i> Acessar
                          </button>
                          <button type="button" onClick={() => removeContrato(c.id, c.numero)} style={{ background: '#fee2e2', border: 'none', padding: '6px 12px', borderRadius: '6px', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }} title="Excluir Contrato">
                            <i className="fas fa-trash"></i> Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Seção 5: Pets */}
        <div style={{ background: '#fff', padding: '1.8rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.6rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0, color: '#1565C0', fontWeight: 700 }}>
              5. Pets ({pets.length})
            </h2>
            <button type="button" onClick={() => setActiveModal('pet')} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}>
              <i className="fas fa-paw"></i> Adicionar Pet
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
                <th style={{ padding: '12px' }}>Nome</th>
                <th style={{ padding: '12px' }}>Espécie</th>
                <th style={{ padding: '12px' }}>Raça</th>
                <th style={{ padding: '12px' }}>Idade</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pets.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Nenhum pet adicionado.</td>
                </tr>
              ) : (
                pets.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#1e293b' }}>{p.nome}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{p.especie}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{p.raca}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{p.idade}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button type="button" onClick={() => removePet(p.id)} style={{ background: '#fee2e2', border: 'none', padding: '6px 12px', borderRadius: '6px', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}>
                        <i className="fas fa-trash"></i> Excluir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </form>

      {/* Modal Dependente */}
      {activeModal === 'dependente' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '20px', width: '100%', maxWidth: '540px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.3rem', fontWeight: 700 }}>Adicionar Dependente</h3>
              <button onClick={() => setActiveModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.2rem' }}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleAddDependente}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Nome Completo *</label>
                  <input type="text" placeholder="Nome do dependente" value={depForm.nome} onChange={e => setDepForm({ ...depForm, nome: e.target.value })} required style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Parentesco *</label>
                  <select value={depForm.parentesco} onChange={e => setDepForm({ ...depForm, parentesco: e.target.value })} required style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                    <option value="">Selecione...</option>
                    <option value="Filho(a)">Filho(a)</option>
                    <option value="Cônjuge">Cônjuge</option>
                    <option value="Pai/Mãe">Pai/Mãe</option>
                    <option value="Enteado(a)">Enteado(a)</option>
                    <option value="Neto(a)">Neto(a)</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Data de Nascimento *</label>
                  <input type="date" value={depForm.dataNascimento} onChange={e => setDepForm({ ...depForm, dataNascimento: e.target.value })} required style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>CPF</label>
                  <input type="text" placeholder="000.000.000-00" value={depForm.cpf} onChange={e => setDepForm({ ...depForm, cpf: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Gênero</label>
                  <select value={depForm.genero} onChange={e => setDepForm({ ...depForm, genero: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                    <option value="">Selecione...</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '1.8rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                <button type="button" onClick={() => setActiveModal(null)} style={{ padding: '0.7rem 1.4rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.7rem 1.6rem', borderRadius: '10px', border: 'none', background: '#10b981', color: 'white', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Contrato Completo */}
      {activeModal === 'contrato' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '20px', width: '100%', maxWidth: '640px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.3rem', fontWeight: 700 }}>Adicionar Contrato</h3>
              <button onClick={() => setActiveModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.2rem' }}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleAddContrato}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Número do Contrato *</label>
                  <input type="text" value={contratoForm.numero} onChange={e => setContratoForm({ ...contratoForm, numero: e.target.value })} required style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Plano *</label>
                  <select value={contratoForm.plano} onChange={e => {
                    const selPlano = planosDisponiveis.find(p => (p.name || p.nome) === e.target.value);
                    const val = selPlano ? (selPlano.monthly_value || selPlano.monthlyValue || selPlano.valorMensalidade || '') : '';
                    setContratoForm({ ...contratoForm, plano: e.target.value, valor: val });
                  }} required style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                    <option value="">Selecione o plano...</option>
                    {planosDisponiveis.map(p => (
                      <option key={p.id} value={p.name || p.nome || p.title}>{p.name || p.nome || p.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Data de Início</label>
                  <input type="date" value={contratoForm.dataInicio} onChange={e => setContratoForm({ ...contratoForm, dataInicio: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Valor da Cobrança (R$) *</label>
                  <input type="text" placeholder="0,00" value={contratoForm.valor} onChange={e => setContratoForm({ ...contratoForm, valor: e.target.value })} required style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Forma de Pagamento *</label>
                  <select value={contratoForm.formaPagamento} onChange={e => setContratoForm({ ...contratoForm, formaPagamento: e.target.value })} required style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                    <option value="Pix">Pix</option>
                    <option value="Pix Automático">Pix Automático (Recorrente)</option>
                    <option value="Cartão">Cartão (Crédito/Débito)</option>
                    <option value="Dinheiro">Dinheiro (Manual)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Número de Parcelas *</label>
                  <input type="number" min="1" value={contratoForm.parcelas} onChange={e => setContratoForm({ ...contratoForm, parcelas: e.target.value })} required style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>

              <div style={{ marginTop: '1.8rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                <button type="button" onClick={() => setActiveModal(null)} style={{ padding: '0.7rem 1.4rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.7rem 1.6rem', borderRadius: '10px', border: 'none', background: '#10b981', color: 'white', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}>Salvar Contrato</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Pet */}
      {activeModal === 'pet' && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '20px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.3rem', fontWeight: 700 }}>Adicionar Pet</h3>
              <button onClick={() => setActiveModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.2rem' }}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleAddPet}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Nome do Pet *</label>
                  <input type="text" placeholder="Nome do pet" value={petForm.nome} onChange={e => setPetForm({ ...petForm, nome: e.target.value })} required style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Espécie *</label>
                  <input type="text" placeholder="Ex: Cão, Gato" value={petForm.especie} onChange={e => setPetForm({ ...petForm, especie: e.target.value })} required style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Raça</label>
                  <input type="text" placeholder="Raça do pet" value={petForm.raca} onChange={e => setPetForm({ ...petForm, raca: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Idade</label>
                  <input type="text" placeholder="Ex: 3 anos" value={petForm.idade} onChange={e => setPetForm({ ...petForm, idade: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>
              <div style={{ marginTop: '1.8rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                <button type="button" onClick={() => setActiveModal(null)} style={{ padding: '0.7rem 1.4rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.7rem 1.6rem', borderRadius: '10px', border: 'none', background: '#10b981', color: 'white', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}>Salvar Pet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
