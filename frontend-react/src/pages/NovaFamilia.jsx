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
    idSequencial: '',
    nome: '',
    dataNascimento: '',
    email: '',
    sexo: 'masculino',
    rg: '',
    cpf: '',
    celular: '',
    profissao: '',
    psicologo: '',
    seguradora: ''
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
  const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);
  const [planosDisponiveis, setPlanosDisponiveis] = useState([]);
  const [nextAssociadoId, setNextAssociadoId] = useState(1);

  // Confirm Modal state
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: 'Confirmar Exclusão',
    message: '',
    onConfirm: () => {}
  });

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'dependente' | 'contrato' | 'pet'
  const [isVincularModalOpen, setIsVincularModalOpen] = useState(false);
  const [editDepId, setEditDepId] = useState(null);
  const [vincularTarget, setVincularTarget] = useState(null); // { tipo: 'titular' | 'dependente', id_interno: string }
  const [vincularProdutoSelecionado, setVincularProdutoSelecionado] = useState([]);
  
  // Modal forms
  const [depForm, setDepForm] = useState({
    idSequencial: '',
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
    fetchProdutos();
    fetchPlanos();
    fetchNextContractNumber();
    fetchNextAssociadoId();
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

  async function fetchProdutos() {
    let loaded = [];
    try {
      const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
      let query = supabase.from('produtos').select('*');
      if (companyId) query = query.eq('company_id', companyId);
      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        loaded = data;
      }
    } catch (e) {}

    try {
      const stored = JSON.parse(localStorage.getItem('catalogoProdutos') || '[]');
      if (Array.isArray(stored)) {
        stored.forEach(sp => {
          if (!loaded.some(p => String(p.nome || p.name).toLowerCase() === String(sp.nome || sp.name).toLowerCase())) {
            loaded.push(sp);
          }
        });
      }
    } catch(e) {}
    
    setProdutosDisponiveis(loaded);
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

  async function fetchNextAssociadoId() {
    try {
      const { data } = await supabase.from('familias').select('titular, dependentes');
      let maxId = 0;
      if (Array.isArray(data)) {
        data.forEach(fam => {
          const tit = fam.titular || {};
          const titId = parseInt(String(tit.idSequencial || tit.id_sequencial || '0').replace(/\D/g, ''), 10);
          if (!isNaN(titId) && titId > maxId) maxId = titId;
          const deps = fam.dependentes || [];
          if (Array.isArray(deps)) {
            deps.forEach(d => {
              const depId = parseInt(String(d.idSequencial || d.id_sequencial || d.numero_associado || '0').replace(/\D/g, ''), 10);
              if (!isNaN(depId) && depId > maxId) maxId = depId;
            });
          }
        });
      }
      const nextId = maxId + 1;
      setNextAssociadoId(nextId);
      // Para nova familia (sem editId), auto-atribui ID ao titular
      if (!editId) {
        setTitular(prev => ({
          ...prev,
          idSequencial: prev.idSequencial || String(nextId).padStart(8, '0')
        }));
      }
    } catch(e) {
      setNextAssociadoId(1);
      if (!editId) {
        setTitular(prev => ({ ...prev, idSequencial: prev.idSequencial || '00000001' }));
      }
    }
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
            idSequencial: '', // será atribuído automaticamente abaixo
            nome: rawTitular.nome || data.nome || meta.nome || '',
            dataNascimento: formatToDateInput(rawNasc),
            email: rawTitular.email || data.email || meta.email || '',
            sexo: rawTitular.sexo || rawTitular.genero || 'masculino',
            rg: rawTitular.rg || data.rg || meta.rg || '',
            cpf: rawTitular.cpf || data.cpf || meta.cpf || '',
            celular: rawTitular.celular || data.celular || meta.celular || '',
            profissao: rawTitular.profissao || data.profissao || meta.profissao || '',
            psicologo: rawTitular.psicologo || data.psicologo || meta.psicologo || '',
            seguradora: rawTitular.seguradora || data.seguradora || meta.seguradora || ''
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
            // Busca o maior ID global para atribuir aos que não têm
            let globalMaxId = 0;
            try {
              const { data: allFams } = await supabase.from('familias').select('titular, dependentes');
              if (Array.isArray(allFams)) {
                allFams.forEach(fam => {
                  const tit = fam.titular || {};
                  const tId = parseInt(String(tit.idSequencial || tit.id_sequencial || '0').replace(/\D/g, ''), 10);
                  if (!isNaN(tId) && tId > globalMaxId) globalMaxId = tId;
                  (fam.dependentes || []).forEach(d => {
                    const dId = parseInt(String(d.idSequencial || d.id_sequencial || d.numero_associado || '0').replace(/\D/g, ''), 10);
                    if (!isNaN(dId) && dId > globalMaxId) globalMaxId = dId;
                  });
                });
              }
            } catch(e) {}

            // Atribui ID sequencial ao titular se não tiver
            let titularIdSeq = rawTitular.idSequencial || rawTitular.id_sequencial || data.id_sequencial || meta.id_sequencial || '';
            let needsSave = false;
            if (!titularIdSeq) {
              globalMaxId += 1;
              titularIdSeq = String(globalMaxId).padStart(8, '0');
              needsSave = true;
            }

            setTitular(prev => ({ ...prev, idSequencial: titularIdSeq }));

            // Atribui ID sequencial a cada dependente sem ID
            const depsComId = rawDeps.map((d, i) => {
              let seqId = d.idSequencial || d.id_sequencial || d.numero_associado || '';
              if (!seqId) {
                globalMaxId += 1;
                seqId = String(globalMaxId).padStart(8, '0');
                needsSave = true;
              }
              return {
                id_interno: d.id_interno || `dep-loaded-${Date.now()}-${i}`,
                idSequencial: seqId,
                nome: d.nome || '',
                parentesco: d.parentesco || 'Outro',
                carencia: d.carencia || 'padrao',
                dataNascimento: formatToDateInput(d.dataNascimento || d.data_nascimento || d.nascimento || d.dataNasc),
                cpf: d.cpf || '',
                genero: d.genero || '',
                celular: d.celular || '',
                psicologo: d.psicologo || '',
                seguradora: d.seguradora || ''
              };
            });

            setNextAssociadoId(globalMaxId + 1);
            setDependentes(depsComId);

            // Salva os IDs de volta no banco se algum foi gerado agora
            if (needsSave) {
              try {
                const updTitular = { ...(data.titular || meta.titular || {}), idSequencial: titularIdSeq };
                const updDeps = depsComId.map(({ id_interno, ...rest }) => rest);
                await supabase.from('familias').update({ titular: updTitular, dependentes: updDeps }).eq('id', editId);
              } catch(e) { console.warn('Aviso ao salvar IDs sequenciais:', e); }
            }
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
    if (editDepId !== null) {
      setDependentes(prev => prev.map(d => d.id_interno === editDepId ? { ...depForm, id_interno: editDepId } : d));
    } else {
      const newId = `dep-new-${Date.now()}`;
      const seqId = String(nextAssociadoId).padStart(8, '0');
      setNextAssociadoId(prev => prev + 1);
      setDependentes(prev => [...prev, { id_interno: newId, idSequencial: seqId, ...depForm }]);
    }
    setDepForm({ idSequencial: '', nome: '', parentesco: '', carencia: 'padrao', dataNascimento: '', cpf: '', genero: '', celular: '', psicologo: '', seguradora: '' });
    setEditDepId(null);
    setActiveModal(null);
  };

  const handleEditDependente = (dep) => {
    setDepForm(dep);
    setEditDepId(dep.id_interno);
    setActiveModal('dependente');
  };

  const handleAbrirVincularProduto = (tipo, id_interno) => {
    const membro = tipo === 'titular' ? titular : dependentes.find(d => d.id_interno === id_interno);
    let produtos = membro?.produtoVinculado || [];
    if (typeof produtos === 'string') produtos = [produtos];
    setVincularProdutoSelecionado(produtos);
    setVincularTarget({ tipo, id_interno });
    setIsVincularModalOpen(true);
  };

  const handleSalvarVincularProduto = () => {
    if (!vincularTarget) return;
    if (vincularTarget.tipo === 'titular') {
      setTitular(prev => {
        let curr = Array.isArray(prev.produtoVinculado) ? prev.produtoVinculado : (prev.produtoVinculado ? [prev.produtoVinculado] : []);
        // Replace instead of merge for manual edit? Or just set? The modal edits the entire list of products for that person
        return { ...prev, produtoVinculado: vincularProdutoSelecionado };
      });
    } else {
      setDependentes(prev => prev.map(d =>
        d.id_interno === vincularTarget.id_interno
          ? { ...d, produtoVinculado: vincularProdutoSelecionado }
          : d
      ));
    }
    setVincularTarget(null);
    setVincularProdutoSelecionado([]);
    setIsVincularModalOpen(false);
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
  const removeDependente = (id_interno) => {
    const item = dependentes.find(d => d.id_interno === id_interno);
    setConfirmModalState({
      isOpen: true,
      title: 'Excluir Dependente',
      message: `Tem certeza que deseja remover o dependente "${item?.nome || 'Selecionado'}"?`,
      onConfirm: () => {
        setDependentes(prev => prev.filter(d => d.id_interno !== id_interno));
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
      // Removido o redirecionamento a pedido do usuário: setTimeout(() => navigate('/familias/pesquisar'), 1200);
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
              <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>ID (Matrícula)</label>
              <div style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-id-badge" style={{ color: '#1565C0', fontSize: '0.85rem' }}></i>
                {titular.idSequencial || '...'}
              </div>
            </div>
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
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Psicólogo</label>
              <input type="text" name="psicologo" placeholder="Nome do psicólogo" value={titular.psicologo} onChange={handleTitularChange} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Seguradora</label>
              <input type="text" name="seguradora" placeholder="Nome da seguradora" value={titular.seguradora} onChange={handleTitularChange} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
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
                <th style={{ padding: '12px' }}>ID</th>
                <th style={{ padding: '12px' }}>Nome</th>
                <th style={{ padding: '12px' }}>Parentesco</th>
                <th style={{ padding: '12px' }}>Nascimento</th>
                <th style={{ padding: '12px' }}>CPF</th>
                <th style={{ padding: '12px' }}>Psicólogo</th>
                <th style={{ padding: '12px' }}>Seguradora</th>
                <th style={{ padding: '12px' }}>Produto Vinculado</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {titular.nome && (
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#fdfdfd' }}>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#1e293b' }}>{titular.idSequencial || titular.id_sequencial || titular.numero_associado || '-'}</td>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#1e293b' }}>{titular.nome}</td>
                  <td style={{ padding: '12px', color: '#475569', fontWeight: 600 }}>Titular</td>
                  <td style={{ padding: '12px', color: '#475569' }}>{formatDisplayDate(titular.dataNascimento)}</td>
                  <td style={{ padding: '12px', color: '#475569' }}>{titular.cpf || '-'}</td>
                  <td style={{ padding: '12px', color: '#475569' }}>{titular.psicologo || '-'}</td>
                  <td style={{ padding: '12px', color: '#475569' }}>{titular.seguradora || '-'}</td>
                  <td style={{ padding: '12px' }}>
                    {titular.produtoVinculado && titular.produtoVinculado.length > 0
                      ? (Array.isArray(titular.produtoVinculado) ? titular.produtoVinculado : [titular.produtoVinculado]).map((p, idx) => (
                          <span key={idx} style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, display: 'inline-block', margin: '2px' }}>{p}</span>
                        ))
                      : <span style={{ color: '#94a3b8', fontSize: '12px' }}>Nenhum</span>}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button type="button" onClick={() => handleAbrirVincularProduto('titular', null)} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '5px 10px', borderRadius: '6px', color: '#16a34a', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>
                      <i className="fas fa-link"></i> {titular.produtoVinculado ? 'Trocar Produto' : 'Vincular Produto'}
                    </button>
                  </td>
                </tr>
              )}
              {dependentes.length === 0 && !titular.nome ? (
                <tr>
                  <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Nenhum membro adicionado.</td>
                </tr>
              ) : (
                dependentes.map(dep => (
                  <tr key={dep.id_interno} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#1e293b' }}>{dep.idSequencial || dep.id_sequencial || dep.numero_associado || '-'}</td>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#1e293b' }}>{dep.nome}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{dep.parentesco}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{formatDisplayDate(dep.dataNascimento)}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{dep.cpf || '-'}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{dep.psicologo || '-'}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{dep.seguradora || '-'}</td>
                    <td style={{ padding: '12px' }}>
                      {dep.produtoVinculado && dep.produtoVinculado.length > 0
                        ? (Array.isArray(dep.produtoVinculado) ? dep.produtoVinculado : [dep.produtoVinculado]).map((p, idx) => (
                            <span key={idx} style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, display: 'inline-block', margin: '2px' }}>{p}</span>
                          ))
                        : <span style={{ color: '#94a3b8', fontSize: '12px' }}>Nenhum</span>}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => handleAbrirVincularProduto('dependente', dep.id_interno)} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '5px 8px', borderRadius: '6px', color: '#16a34a', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>
                          <i className="fas fa-link"></i>
                        </button>
                        <button type="button" onClick={() => handleEditDependente(dep)} style={{ background: '#f1f5f9', border: 'none', padding: '5px 10px', borderRadius: '6px', color: '#1565C0', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button type="button" onClick={() => removeDependente(dep.id_interno)} style={{ background: '#fee2e2', border: 'none', padding: '5px 10px', borderRadius: '6px', color: '#dc2626', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
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
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.3rem', fontWeight: 700 }}>{editDepId ? 'Editar Dependente' : 'Adicionar Dependente'}</h3>
              <button onClick={() => { setActiveModal(null); setEditDepId(null); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.2rem' }}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleAddDependente}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {depForm.idSequencial && (
                  <div style={{ gridColumn: 'span 2', background: '#f0fdf4', borderRadius: '10px', padding: '0.5rem 0.8rem', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-id-badge" style={{ color: '#16a34a' }}></i>
                    <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>ID Matrícula: <strong>{depForm.idSequencial}</strong></span>
                  </div>
                )}
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
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Psicólogo</label>
                  <input type="text" placeholder="Nome do psicólogo" value={depForm.psicologo} onChange={e => setDepForm({ ...depForm, psicologo: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>Seguradora</label>
                  <input type="text" placeholder="Nome da seguradora" value={depForm.seguradora} onChange={e => setDepForm({ ...depForm, seguradora: e.target.value })} style={{ width: '100%', padding: '0.7rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
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
                    const planName = e.target.value;
                    const oldPlanName = contratoForm.plano;
                    const selPlano = planosDisponiveis.find(p => (p.name || p.nome) === planName);
                    const val = selPlano ? (selPlano.monthly_value || selPlano.monthlyValue || selPlano.valorMensalidade || '') : '';
                    setContratoForm({ ...contratoForm, plano: planName, valor: val });

                    // Lógica de Plano Vinculado
                    let produtosParaRemover = [];
                    if (oldPlanName) {
                      produtosParaRemover = produtosDisponiveis
                        .filter(p => p.plano_vinculado === oldPlanName || p.planoVinculado === oldPlanName || (p.metadata && p.metadata.planoVinculado === oldPlanName))
                        .map(p => p.nome || p.name || p.title);
                    }

                    let produtosParaAdicionar = [];
                    if (planName) {
                      produtosParaAdicionar = produtosDisponiveis
                        .filter(p => p.plano_vinculado === planName || p.planoVinculado === planName || (p.metadata && p.metadata.planoVinculado === planName))
                        .map(p => p.nome || p.name || p.title);
                    }
                    
                    if (produtosParaRemover.length > 0 || produtosParaAdicionar.length > 0) {
                      setTitular(prev => {
                        let curr = Array.isArray(prev.produtoVinculado) ? prev.produtoVinculado : (prev.produtoVinculado ? [prev.produtoVinculado] : []);
                        let updated = curr.filter(p => !produtosParaRemover.includes(p));
                        const merged = Array.from(new Set([...updated, ...produtosParaAdicionar]));
                        return { ...prev, produtoVinculado: merged };
                      });
                      setDependentes(prev => prev.map(d => {
                        let curr = Array.isArray(d.produtoVinculado) ? d.produtoVinculado : (d.produtoVinculado ? [d.produtoVinculado] : []);
                        let updated = curr.filter(p => !produtosParaRemover.includes(p));
                        const merged = Array.from(new Set([...updated, ...produtosParaAdicionar]));
                        return { ...d, produtoVinculado: merged };
                      }));
                    }
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

              <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ background: '#f8fafc', padding: '10px 15px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>
                  Controle de Produtos por Membro
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                        <th style={{ padding: '8px 12px' }}>Nome</th>
                        <th style={{ padding: '8px 12px' }}>Parentesco</th>
                        <th style={{ padding: '8px 12px' }}>Produto(s)</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>Vincular</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{titular.nome || 'Titular'}</td>
                        <td style={{ padding: '8px 12px' }}><span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700 }}>Titular</span></td>
                        <td style={{ padding: '8px 12px' }}>
                          {titular.produtoVinculado && titular.produtoVinculado.length > 0
                            ? (Array.isArray(titular.produtoVinculado) ? titular.produtoVinculado : [titular.produtoVinculado]).map((p, idx) => (
                                <span key={idx} style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, display: 'inline-block', margin: '2px' }}>{p}</span>
                              ))
                            : <span style={{ color: '#94a3b8', fontSize: '11px' }}>Nenhum</span>}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <button type="button" onClick={() => handleAbrirVincularProduto('titular', null)} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 8px', borderRadius: '6px', color: '#16a34a', cursor: 'pointer', fontWeight: 600, fontSize: '11px' }}>
                            <i className="fas fa-link"></i>
                          </button>
                        </td>
                      </tr>
                      {dependentes.map(d => (
                        <tr key={d.id_interno} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{d.nome}</td>
                          <td style={{ padding: '8px 12px' }}><span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 600 }}>{d.parentesco}</span></td>
                          <td style={{ padding: '8px 12px' }}>
                            {d.produtoVinculado && d.produtoVinculado.length > 0
                              ? (Array.isArray(d.produtoVinculado) ? d.produtoVinculado : [d.produtoVinculado]).map((p, idx) => (
                                  <span key={idx} style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, display: 'inline-block', margin: '2px' }}>{p}</span>
                                ))
                              : <span style={{ color: '#94a3b8', fontSize: '11px' }}>Nenhum</span>}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <button type="button" onClick={() => handleAbrirVincularProduto('dependente', d.id_interno)} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 8px', borderRadius: '6px', color: '#16a34a', cursor: 'pointer', fontWeight: 600, fontSize: '11px' }}>
                              <i className="fas fa-link"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
      {/* Modal Vincular Produto */}
      {isVincularModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '20px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.2rem', fontWeight: 700 }}>
                <i className="fas fa-link" style={{ color: '#16a34a', marginRight: '8px' }}></i>
                Vincular Produto
              </h3>
              <button onClick={() => { setIsVincularModalOpen(false); setVincularTarget(null); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.2rem' }}><i className="fas fa-times"></i></button>
            </div>
            <div style={{ marginBottom: '1rem', maxHeight: '250px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1rem', background: '#f8fafc' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', color: '#475569', marginBottom: '12px' }}>Selecione os Produtos</label>
              {produtosDisponiveis.map(p => {
                const pNome = p.nome || p.name || p.title;
                const isChecked = vincularProdutoSelecionado.includes(pNome);
                return (
                  <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor: 'pointer', padding: '8px', borderRadius: '6px', background: isChecked ? '#e0f2fe' : '#fff', border: isChecked ? '1px solid #7dd3fc' : '1px solid #e2e8f0' }}>
                    <input type="checkbox" checked={isChecked} onChange={(e) => {
                      if (e.target.checked) {
                        setVincularProdutoSelecionado([...vincularProdutoSelecionado, pNome]);
                      } else {
                        setVincularProdutoSelecionado(vincularProdutoSelecionado.filter(v => v !== pNome));
                      }
                    }} style={{ width: '16px', height: '16px' }} />
                    <span style={{ fontSize: '0.95rem', color: '#334155', fontWeight: isChecked ? 600 : 400 }}>{pNome} - <span style={{ color: '#166534' }}>R$ {p.valor || p.preco || p.value || '0,00'}</span></span>
                  </label>
                );
              })}
              {produtosDisponiveis.length === 0 && <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Nenhum produto cadastrado.</span>}
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              <button type="button" onClick={() => { setIsVincularModalOpen(false); setVincularTarget(null); setVincularProdutoSelecionado([]); }} style={{ padding: '0.7rem 1.4rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
              <button type="button" onClick={handleSalvarVincularProduto} style={{ padding: '0.7rem 1.6rem', borderRadius: '10px', border: 'none', background: '#16a34a', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                <i className="fas fa-check" style={{ marginRight: '6px' }}></i> Confirmar ({vincularProdutoSelecionado.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
