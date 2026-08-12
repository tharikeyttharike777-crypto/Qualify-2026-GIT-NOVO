import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import ConfirmModal from '../components/common/ConfirmModal';

export default function Contratos() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);

  const isCobrancaMode = location.pathname.toLowerCase().includes('inadimplente') || location.pathname.toLowerCase().includes('renegociacao');

  // Confirm Modal state
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: 'Confirmar Exclusão',
    message: '',
    onConfirm: () => {}
  });

  // Pre-seleciona a aba correta conforme a URL navegada (/inadimplentes, /contratos/ativos, etc)
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('inadimplente') || path.includes('renegociacao')) {
      setActiveTab('inadimplente');
    } else if (path.includes('cancelado')) {
      setActiveTab('cancelado');
    } else if (path.includes('ativo') || path.includes('adimplente')) {
      setActiveTab('ativo');
    } else {
      setActiveTab('all');
    }
  }, [location.pathname]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchContracts();
  }, []);

  async function fetchContracts() {
    setLoading(true);
    const contractsList = [];

    try {
      const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
      
      // 1. Tenta buscar no Supabase
      let { data, error } = await supabase.from('contratos').select('*');
      if (companyId && data) {
        const filteredComp = data.filter(c => !c.company_id || String(c.company_id) === String(companyId));
        if (filteredComp.length > 0) data = filteredComp;
      }

      if (!error && Array.isArray(data)) {
        data.forEach(c => {
          let meta = {};
          if (c.metadata) {
            try { meta = typeof c.metadata === 'string' ? JSON.parse(c.metadata) : c.metadata; } catch(e){}
          }
          contractsList.push({
            id: c.id,
            numero: c.numero || meta.numero || c.id,
            titular: c.titular || c.cliente || meta.titular || meta.cliente || 'Em Cadastramento',
            plano: c.plano || c.planoNome || meta.plano || meta.planoNome || 'Plano QUALIFY',
            status: String(c.status || meta.status || 'ativo').toLowerCase()
          });
        });
      }
    } catch (err) {
      console.warn("Aviso ao carregar contratos Supabase:", err);
    }

    setContracts(contractsList);
    setLoading(false);
  }

  const handleDeleteContract = (c) => {
    const displayNum = c.numero || c.id;
    setConfirmModalState({
      isOpen: true,
      title: 'Excluir Contrato',
      message: `Tem certeza que deseja excluir o contrato #${displayNum}? Esta ação não poderá ser desfeita.`,
      onConfirm: async () => {
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id);
          if (isUuid) {
            await supabase.from('contratos').delete().eq('id', c.id);
          }
          if (c.numero) await supabase.from('contratos').delete().eq('numero', c.numero);
          
          // ALSO remove from embedded familias to prevent ghosts
          let { data: famData } = await supabase.from('familias').select('*');
          if (Array.isArray(famData)) {
            for (let fam of famData) {
               let meta = {};
               if (fam.metadata) {
                 try { meta = typeof fam.metadata === 'string' ? JSON.parse(fam.metadata) : fam.metadata; } catch(e){}
               }
               const rawConts = fam.contratos || meta.contratos || [];
               if (rawConts.length > 0) {
                 const newConts = rawConts.filter(cc => String(cc.id) !== String(c.id) && String(cc.numero) !== String(c.numero));
                 if (newConts.length !== rawConts.length) {
                   meta.contratos = newConts;
                   await supabase.from('familias').update({ metadata: meta }).eq('id', fam.id);
                 }
               }
            }
          }

          // ALSO remove from localStorage to prevent ghosts
          const localContratosStr = localStorage.getItem('contratos');
          if (localContratosStr) {
            let parsed = JSON.parse(localContratosStr);
            parsed = parsed.filter(cc => String(cc.id) !== String(c.id) && String(cc.numero) !== String(c.numero));
            localStorage.setItem('contratos', JSON.stringify(parsed));
          }

          setContracts(prev => prev.filter(item => item.id !== c.id));
        } catch (e) {
          alert("Erro ao excluir: " + e.message);
        }
        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteSelected = () => {
    setConfirmModalState({
      isOpen: true,
      title: 'Excluir Contratos Selecionados',
      message: `Tem certeza que deseja excluir os ${selectedIds.length} contrato(s) selecionado(s)?`,
      onConfirm: async () => {
        for (const id of selectedIds) {
          try {
            const c = contracts.find(x => x.id === id);
            if (!c) continue;

            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id);
            if (isUuid) {
              await supabase.from('contratos').delete().eq('id', c.id);
            }
            if (c.numero) await supabase.from('contratos').delete().eq('numero', c.numero);

            // Prevent ghosts
            let { data: famData } = await supabase.from('familias').select('*');
            if (Array.isArray(famData)) {
              for (let fam of famData) {
                 let meta = {};
                 if (fam.metadata) {
                   try { meta = typeof fam.metadata === 'string' ? JSON.parse(fam.metadata) : fam.metadata; } catch(e){}
                 }
                 const rawConts = fam.contratos || meta.contratos || [];
                 if (rawConts.length > 0) {
                   const newConts = rawConts.filter(cc => String(cc.id) !== String(c.id) && String(cc.numero) !== String(c.numero));
                   if (newConts.length !== rawConts.length) {
                     meta.contratos = newConts;
                     await supabase.from('familias').update({ metadata: meta }).eq('id', fam.id);
                   }
                 }
              }
            }
          } catch(e){}
        }
        
        try {
          const localContratosStr = localStorage.getItem('contratos');
          if (localContratosStr) {
            let parsed = JSON.parse(localContratosStr);
            parsed = parsed.filter(cc => !selectedIds.includes(cc.id));
            localStorage.setItem('contratos', JSON.stringify(parsed));
          }
        } catch(e){}

        setContracts(prev => prev.filter(c => !selectedIds.includes(c.id)));
        setSelectedIds([]);
        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Filter logic
  const filteredContracts = contracts.filter(c => {
    const st = String(c.status || '').toLowerCase();
    
    // Tab filter
    if (activeTab === 'ativo' && st !== 'ativo' && st !== 'adimplente') return false;
    if (activeTab === 'inadimplente' && st !== 'inadimplente' && st !== 'atrasado' && st !== 'renegociacao') return false;
    if (activeTab === 'cancelado' && st !== 'cancelado' && st !== 'encerrado') return false;

    // Search query
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const numero = String(c.numero || c.id || '').toLowerCase();
    const titular = String(c.titular || '').toLowerCase();
    const plano = String(c.plano || '').toLowerCase();

    return numero.includes(q) || titular.includes(q) || plano.includes(q) || st.includes(q);
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage) || 1;
  const currentItems = filteredContracts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(currentItems.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // KPI Calculations
  const totalCarteira = contracts.length;
  const totalAtivos = contracts.filter(c => ['ativo', 'adimplente'].includes(String(c.status || '').toLowerCase())).length;
  const totalPendentes = contracts.filter(c => ['inadimplente', 'atrasado', 'renegociacao', 'pendente'].includes(String(c.status || '').toLowerCase())).length;
  const totalCancelados = contracts.filter(c => ['cancelado', 'encerrado', 'inativo'].includes(String(c.status || '').toLowerCase())).length;

  return (
    <div style={{ paddingTop: '10px' }}>
      {/* Banner de Título */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: '24px 30px', borderRadius: '16px', marginBottom: '25px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div>
          <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
            <i className="fas fa-layer-group" style={{ marginRight: '6px', color: '#3b82f6' }}></i> {isCobrancaMode ? 'Gestão Financeira' : 'Administração Geral'}
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', color: 'white' }}>
            <i className={`fas ${isCobrancaMode ? 'fa-exclamation-triangle' : 'fa-file-contract'}`} style={{ marginRight: '12px', color: isCobrancaMode ? '#ef4444' : '#10b981' }}></i> {isCobrancaMode ? 'Gestão de Inadimplência' : 'Central de Contratos & Adesões'}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
          <button onClick={() => navigate('/familias/nova')} style={{ background: '#10b981', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
            <i className="fas fa-plus-circle"></i> Novo Contrato
          </button>
        </div>
      </div>

      {/* Cards KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '25px' }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Total na Carteira</span>
            <strong style={{ fontSize: '1.7rem', fontWeight: 800, color: '#1e293b', display: 'block', marginTop: '4px' }}>{totalCarteira}</strong>
          </div>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
            <i className="fas fa-folder-open"></i>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #dcfce7', borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ color: '#166534', fontSize: '0.85rem', fontWeight: 600 }}>Contratos Ativos</span>
            <strong style={{ fontSize: '1.7rem', fontWeight: 800, color: '#15803d', display: 'block', marginTop: '4px' }}>{totalAtivos}</strong>
          </div>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
            <i className="fas fa-check-circle"></i>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #fef3c7', borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ color: '#92400e', fontSize: '0.85rem', fontWeight: 600 }}>Renovações / Pendentes</span>
            <strong style={{ fontSize: '1.7rem', fontWeight: 800, color: '#d97706', display: 'block', marginTop: '4px' }}>{totalPendentes}</strong>
          </div>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#fef3c7', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
            <i className="fas fa-exclamation-triangle"></i>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid #fee2e2', borderRadius: '14px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ color: '#991b1b', fontSize: '0.85rem', fontWeight: 600 }}>Inadimplentes / Cancel.</span>
            <strong style={{ fontSize: '1.7rem', fontWeight: 800, color: '#dc2626', display: 'block', marginTop: '4px' }}>{totalCancelados}</strong>
          </div>
          <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
            <i className="fas fa-times-circle"></i>
          </div>
        </div>
      </div>

      {/* Abas de Filtro */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px' }}>
        <button onClick={() => { setActiveTab('all'); setCurrentPage(1); }} style={{ background: activeTab === 'all' ? '#3b82f6' : 'white', color: activeTab === 'all' ? 'white' : '#475569', border: activeTab === 'all' ? 'none' : '1px solid #cbd5e1', padding: '10px 22px', borderRadius: '30px', fontWeight: 700, cursor: 'pointer' }}>
          <i className="fas fa-list"></i> Todos
        </button>
        <button onClick={() => { setActiveTab('ativo'); setCurrentPage(1); }} style={{ background: activeTab === 'ativo' ? '#3b82f6' : 'white', color: activeTab === 'ativo' ? 'white' : '#475569', border: activeTab === 'ativo' ? 'none' : '1px solid #cbd5e1', padding: '10px 22px', borderRadius: '30px', fontWeight: 600, cursor: 'pointer' }}>
          <i className="fas fa-check-circle" style={{ color: activeTab === 'ativo' ? 'white' : '#10b981' }}></i> Ativos
        </button>
        <button onClick={() => { setActiveTab('inadimplente'); setCurrentPage(1); }} style={{ background: activeTab === 'inadimplente' ? '#3b82f6' : 'white', color: activeTab === 'inadimplente' ? 'white' : '#475569', border: activeTab === 'inadimplente' ? 'none' : '1px solid #cbd5e1', padding: '10px 22px', borderRadius: '30px', fontWeight: 600, cursor: 'pointer' }}>
          <i className="fas fa-exclamation-circle" style={{ color: activeTab === 'inadimplente' ? 'white' : '#f59e0b' }}></i> Em Atraso / Renegociação
        </button>
        <button onClick={() => { setActiveTab('cancelado'); setCurrentPage(1); }} style={{ background: activeTab === 'cancelado' ? '#3b82f6' : 'white', color: activeTab === 'cancelado' ? 'white' : '#475569', border: activeTab === 'cancelado' ? 'none' : '1px solid #cbd5e1', padding: '10px 22px', borderRadius: '30px', fontWeight: 600, cursor: 'pointer' }}>
          <i className="fas fa-times-circle" style={{ color: activeTab === 'cancelado' ? 'white' : '#ef4444' }}></i> Cancelados / Encerrados
        </button>
      </div>

      {/* Busca e Ações em massa */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center', background: 'white', padding: '12px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <i className="fas fa-search" style={{ color: '#94a3b8', fontSize: '1.1rem' }}></i>
        <input
          type="text"
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          placeholder="Pesquisar por nº, titular, plano ou status..."
          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.95rem', color: '#334155', fontWeight: 500 }}
        />
      </div>

      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1e293b', color: 'white', padding: '12px 20px', borderRadius: '12px', marginBottom: '15px' }}>
          <span><strong>{selectedIds.length}</strong> contrato(s) selecionado(s)</span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setSelectedIds([])} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Limpar</button>
            <button onClick={handleDeleteSelected} style={{ background: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Excluir Selecionados</button>
          </div>
        </div>
      )}

      {/* Tabela de Contratos */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '16px 20px', width: '40px' }}>
                <input type="checkbox" onChange={toggleSelectAll} checked={currentItems.length > 0 && currentItems.every(c => selectedIds.includes(c.id))} />
              </th>
              <th style={{ padding: '16px 12px' }}>Nº Contrato</th>
              <th style={{ padding: '16px 12px' }}>Titular / Cliente</th>
              <th style={{ padding: '16px 12px' }}>Plano</th>
              <th style={{ padding: '16px 12px' }}>Status</th>
              <th style={{ padding: '16px 20px', textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Carregando contratos...
                </td>
              </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  <i className="fas fa-folder-open" style={{ fontSize: '2rem', color: '#cbd5e1', display: 'block', marginBottom: '8px' }}></i>
                  Nenhum contrato encontrado.
                </td>
              </tr>
            ) : (
              currentItems.map(c => {
                const st = String(c.status || 'ativo').toLowerCase();
                let badgeStyle = { background: '#e6f7e9', color: '#2b7a3d' };
                if (['inadimplente', 'atrasado', 'renegociacao'].includes(st)) badgeStyle = { background: '#fff4e5', color: '#b15e00' };
                if (['cancelado', 'encerrado'].includes(st)) badgeStyle = { background: '#fdecea', color: '#b42318' };

                const displayNum = String(c.numero || c.id || '').length > 10 ? String(c.numero || c.id).slice(0, 8) : (c.numero || c.id);

                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} />
                    </td>
                    <td style={{ padding: '16px 12px', fontWeight: 700, color: '#1565C0' }}>#{displayNum}</td>
                    <td style={{ padding: '16px 12px', fontWeight: 600, color: '#1e293b' }}>{c.titular}</td>
                    <td style={{ padding: '16px 12px', color: '#475569' }}>{c.plano}</td>
                    <td style={{ padding: '16px 12px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize', ...badgeStyle }}>
                        {c.status || 'Ativo'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button onClick={() => navigate(`/contratos/editar?numero=${c.numero || c.id}`)} style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '6px', color: '#1565C0', cursor: 'pointer', fontWeight: 600 }} title="Editar Contrato">
                          <i className="fas fa-edit"></i> Editar
                        </button>
                        <button onClick={() => handleDeleteContract(c)} style={{ background: '#fee2e2', border: 'none', padding: '6px 12px', borderRadius: '6px', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }} title="Excluir Contrato">
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

      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        onConfirm={confirmModalState.onConfirm}
        onCancel={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Paginação */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
          <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Página {currentPage} de {totalPages}</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>Anterior</button>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>Próxima</button>
          </div>
        </div>
      )}
    </div>
  );
}
