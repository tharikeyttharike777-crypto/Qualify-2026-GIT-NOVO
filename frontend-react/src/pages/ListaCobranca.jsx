import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export default function ListaCobranca() {
  const [cobrancas, setCobrancas] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pendentes'); // 'pendentes', 'pagos', 'vencidos', 'todos'
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchCobrancas();
  }, []);

  async function fetchCobrancas() {
    setLoading(true);
    try {
      const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
      let query = supabase.from('cobrancas').select('*').order('vencimento', { ascending: false });
      if (companyId) query = query.eq('company_id', companyId);

      const { data, error } = await query;
      if (error) throw error;
      if (data) setCobrancas(data);
    } catch (err) {
      console.error("Erro ao carregar cobranças:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleDarBaixa = async (id) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase.from('cobrancas').update({ status: 'PAGO' }).eq('id', id);
      if (error) throw error;
      setCobrancas(prev => prev.map(c => c.id === id ? { ...c, status: 'PAGO' } : c));
    } catch (err) {
      console.error("Erro ao dar baixa:", err);
      alert('Erro ao dar baixa na cobrança.');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusNormalized = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'PAID' || s === 'PAGO' || s === 'CONFIRMED') return 'PAGO';
    if (s === 'OVERDUE' || s === 'VENCIDO') return 'VENCIDO';
    if (s === 'CANCELLED' || s === 'CANCELADO') return 'CANCELADO';
    return 'PENDENTE';
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    return isNaN(num) ? 'R$ 0,00' : `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (val) => {
    if (!val) return '-';
    try {
      const d = new Date(val);
      if (isNaN(d)) return val;
      return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch(e) { return val; }
  };

  const filtered = cobrancas.filter(c => {
    const q = search.toLowerCase();
    const searchMatch = !search || String(c.pagador_nome || c.titular || '').toLowerCase().includes(q) || String(c.numero || c.id || '').toLowerCase().includes(q);
    
    if (!searchMatch) return false;

    const stat = getStatusNormalized(c.status);
    if (activeTab === 'pendentes') return stat === 'PENDENTE';
    if (activeTab === 'pagos') return stat === 'PAGO';
    if (activeTab === 'vencidos') return stat === 'VENCIDO';
    return true; // todos
  });

  // KPIs calculations
  const totalReceber = cobrancas.filter(c => getStatusNormalized(c.status) === 'PENDENTE').reduce((acc, c) => acc + parseFloat(c.valor || 0), 0);
  const totalRecebido = cobrancas.filter(c => getStatusNormalized(c.status) === 'PAGO').reduce((acc, c) => acc + parseFloat(c.valor || 0), 0);
  const totalVencido = cobrancas.filter(c => getStatusNormalized(c.status) === 'VENCIDO').reduce((acc, c) => acc + parseFloat(c.valor || 0), 0);

  return (
    <div style={{ padding: '10px 0' }}>
      <div className="breadcrumb" style={{ marginBottom: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
        <span>Financeiro</span> <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem', margin: '0 0.5rem' }}></i> <span className="active" style={{ color: '#1565C0', fontWeight: 600 }}>Gestão Financeira</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#2c3e50', margin: 0 }}>Gestão Financeira</h1>
        <button onClick={fetchCobrancas} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <i className="fas fa-sync-alt"></i> Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase' }}>A Receber (Pendentes)</div>
          <div style={{ color: '#b45309', fontSize: '1.8rem', fontWeight: 800 }}>{formatCurrency(totalReceber)}</div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Total Recebido</div>
          <div style={{ color: '#059669', fontSize: '1.8rem', fontWeight: 800 }}>{formatCurrency(totalRecebido)}</div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0', borderLeft: '4px solid #ef4444', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Total Vencido</div>
          <div style={{ color: '#b91c1c', fontSize: '1.8rem', fontWeight: 800 }}>{formatCurrency(totalVencido)}</div>
        </div>
      </div>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          
          <div style={{ display: 'flex', gap: '0.5rem', background: '#f8fafc', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <button onClick={() => setActiveTab('pendentes')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', background: activeTab === 'pendentes' ? '#fff' : 'transparent', color: activeTab === 'pendentes' ? '#f59e0b' : '#64748b', boxShadow: activeTab === 'pendentes' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>Em Aberto</button>
            <button onClick={() => setActiveTab('vencidos')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', background: activeTab === 'vencidos' ? '#fff' : 'transparent', color: activeTab === 'vencidos' ? '#ef4444' : '#64748b', boxShadow: activeTab === 'vencidos' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>Vencidos</button>
            <button onClick={() => setActiveTab('pagos')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', background: activeTab === 'pagos' ? '#fff' : 'transparent', color: activeTab === 'pagos' ? '#10b981' : '#64748b', boxShadow: activeTab === 'pagos' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>Recebidos</button>
            <button onClick={() => setActiveTab('todos')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', background: activeTab === 'todos' ? '#fff' : 'transparent', color: activeTab === 'todos' ? '#1565C0' : '#64748b', boxShadow: activeTab === 'todos' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>Todos</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', minWidth: '300px' }}>
            <i className="fas fa-search" style={{ color: '#94a3b8' }}></i>
            <input
              type="text"
              placeholder="Pesquisar cliente ou número..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent', color: '#334155' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 16px' }}>Vencimento</th>
                <th style={{ padding: '14px 16px' }}>Cliente</th>
                <th style={{ padding: '14px 16px' }}>Descrição</th>
                <th style={{ padding: '14px 16px' }}>Valor</th>
                <th style={{ padding: '14px 16px' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px', fontSize: '1.2rem' }}></i> Carregando cobranças...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    <i className="fas fa-file-invoice-dollar" style={{ fontSize: '2rem', color: '#cbd5e1', display: 'block', marginBottom: '1rem' }}></i>
                    Nenhuma cobrança encontrada para este filtro.
                  </td>
                </tr>
              ) : (
                filtered.map(c => {
                  const stat = getStatusNormalized(c.status);
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '14px 16px', color: '#475569', fontWeight: 600 }}>
                        <i className="far fa-calendar-alt" style={{ marginRight: '6px', color: '#94a3b8' }}></i>
                        {formatDate(c.vencimento)}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1e293b' }}>
                        {c.pagador_nome || c.titular || 'Cliente não identificado'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.9rem' }}>
                        {c.descricao || 'Cobrança Avulsa'}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#1565C0', fontSize: '1.05rem' }}>
                        {formatCurrency(c.valor)}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {stat === 'PENDENTE' && <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #fde68a' }}><i className="fas fa-clock" style={{ marginRight: '4px' }}></i> Pendente</span>}
                        {stat === 'PAGO' && <span style={{ background: '#dcfce7', color: '#047857', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #a7f3d0' }}><i className="fas fa-check" style={{ marginRight: '4px' }}></i> Pago</span>}
                        {stat === 'VENCIDO' && <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #fca5a5' }}><i className="fas fa-exclamation-triangle" style={{ marginRight: '4px' }}></i> Vencido</span>}
                        {stat === 'CANCELADO' && <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #cbd5e1' }}><i className="fas fa-ban" style={{ marginRight: '4px' }}></i> Cancelado</span>}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {stat !== 'PAGO' && stat !== 'CANCELADO' && (
                          <button 
                            onClick={() => handleDarBaixa(c.id)}
                            disabled={updatingId === c.id}
                            style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', boxShadow: '0 2px 4px rgba(16,185,129,0.2)' }}
                          >
                            {updatingId === c.id ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-check-double"></i> Dar Baixa</>}
                          </button>
                        )}
                        {stat === 'PAGO' && (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}><i className="fas fa-lock"></i> Baixado</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

