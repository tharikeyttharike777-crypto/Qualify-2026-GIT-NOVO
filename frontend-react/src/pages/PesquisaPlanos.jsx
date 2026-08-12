import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import ConfirmModal from '../components/common/ConfirmModal';

export default function PesquisaPlanos() {
  const navigate = useNavigate();
  const [planos, setPlanos] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    fetchPlanos();
  }, []);

  async function fetchPlanos() {
    setLoading(true);
    const plansList = [];

    try {
      const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
      
      // 1. Tenta buscar no Supabase
      let { data, error } = await supabase.from('planos').select('*');
      if (companyId && data) {
        const filteredComp = data.filter(p => !p.company_id || String(p.company_id) === String(companyId));
        if (filteredComp.length > 0) data = filteredComp;
      }

      if (!error && Array.isArray(data)) {
        data.forEach(p => {
          let meta = {};
          if (p.metadata) {
            try { meta = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata; } catch(e){}
          }
          plansList.push({
            id: p.id,
            nome: p.name || p.nome || p.title || p.plano || meta.name || meta.nome || 'Plano QUALIFY',
            adesao: p.adhesion_value || p.adhesionValue || meta.adhesionValue || p.valorAdesao || p.adesao || '0,00',
            mensalidade: p.monthly_value || p.monthlyValue || meta.monthlyValue || p.valorMensalidade || p.mensalidade || p.valor || '0,00',
            anual: p.annual_value || p.annualValue || meta.annualValue || p.valorAnual || p.anual || '0,00',
            carencia: p.grace_period || p.gracePeriod || meta.gracePeriod || p.carencia || 'Padrão'
          });
        });
      }
    } catch (err) {
      console.warn("Aviso ao buscar planos Supabase:", err);
    }

    // 2. Resgate local storage se necessário
    try {
      const localPlanosStr = localStorage.getItem('planos');
      if (localPlanosStr) {
        const parsed = JSON.parse(localPlanosStr);
        if (Array.isArray(parsed)) {
          parsed.forEach(p => {
            const nome = p.name || p.nome || p.title || p.plano;
            if (nome && !plansList.some(item => item.nome.toLowerCase() === String(nome).toLowerCase())) {
              plansList.push({
                id: p.id || Date.now(),
                nome: nome,
                adesao: p.adhesion_value || p.adhesionValue || p.adesao || '0,00',
                mensalidade: p.monthly_value || p.monthlyValue || p.mensalidade || p.valor || '0,00',
                anual: p.annual_value || p.annualValue || p.anual || '0,00',
                carencia: p.gracePeriod || p.carencia || 'Padrão'
              });
            }
          });
        }
      }
    } catch (e) {}

    setPlanos(plansList);
    setLoading(false);
  }

  const filtered = planos.filter(p => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return String(p.nome || '').toLowerCase().includes(q);
  });

  const handleDelete = (id) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Excluir Plano',
      message: 'Deseja realmente excluir este plano? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await supabase.from('planos').delete().eq('id', id);
          setPlanos(prev => prev.filter(p => p.id !== id));
        } catch (err) {
          alert("Erro ao excluir: " + err.message);
        }
        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const formatCurrency = (val) => {
    if (!val) return 'R$ 0,00';
    const s = String(val).trim();
    if (s.startsWith('R$')) return s;
    return `R$ ${s}`;
  };

  return (
    <div style={{ padding: '10px 0' }}>
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        onConfirm={confirmModalState.onConfirm}
        onCancel={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
      />
      <div className="breadcrumb" style={{ marginBottom: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
        <span>Planos</span> <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem', margin: '0 0.5rem' }}></i> <span className="active" style={{ color: '#1565C0', fontWeight: 600 }}>Pesquisa de Planos</span>
      </div>

      <div style={{ background: '#ffffff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: 'white', display: 'flex', alignItems: 'center', justify: 'center', fontSize: '22px' }}>
            <i className="fas fa-box-open"></i>
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Catálogo & Pesquisa de Planos</h1>
            <p style={{ color: '#64748b', margin: 0, fontSize: '0.85rem' }}>Gerencie planos comerciais, tabelas de carência, valores e coberturas</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="text"
            placeholder="Filtrar por plano..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
          />
          <button onClick={() => navigate('/planos/novo')} style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-plus"></i> Novo Plano
          </button>
        </div>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '12px 20px', fontSize: '0.9rem', color: '#334155', fontWeight: 600 }}>
          {filtered.length} plano(s) encontrado(s)
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '14px 16px' }}>Plano</th>
              <th style={{ padding: '14px 16px' }}>Adesão</th>
              <th style={{ padding: '14px 16px' }}>Mensalidade</th>
              <th style={{ padding: '14px 16px' }}>Anual</th>
              <th style={{ padding: '14px 16px' }}>Carência</th>
              <th style={{ padding: '14px 16px', textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Carregando planos...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  Nenhum plano encontrado.
                </td>
              </tr>
            ) : (
              filtered.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1e293b' }}>{p.nome}</td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{formatCurrency(p.adesao)}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#10b981' }}>{formatCurrency(p.mensalidade)}</td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{formatCurrency(p.anual)}</td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{p.carencia}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <button onClick={() => navigate(`/planos/novo?id=${p.id}`)} style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '6px', color: '#1565C0', cursor: 'pointer', fontWeight: 600, marginRight: '6px' }}>
                      <i className="fas fa-edit"></i>
                    </button>
                    <button onClick={() => handleDelete(p.id)} style={{ background: '#fee2e2', border: 'none', padding: '6px 12px', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
