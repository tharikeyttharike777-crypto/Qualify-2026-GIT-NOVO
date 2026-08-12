import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export default function ContasReceber() {
  const [contas, setContas] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContas();
  }, []);

  async function fetchContas() {
    setLoading(true);
    try {
      const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
      let query = supabase.from('contas_receber').select('*');
      if (companyId) query = query.eq('company_id', companyId);

      const { data, error } = await query;
      if (error) throw error;
      if (data) setContas(data);
    } catch (err) {
      console.error("Erro ao carregar contas a receber:", err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = contas.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return String(c.descricao || c.titular || '').toLowerCase().includes(q);
  });

  return (
    <div style={{ padding: '10px 0' }}>
      <div className="breadcrumb" style={{ marginBottom: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
        <span>Financeiro</span> <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem', margin: '0 0.5rem' }}></i> <span className="active" style={{ color: '#1565C0', fontWeight: 600 }}>Contas a Receber</span>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#2c3e50', margin: 0 }}>Contas a Receber</h1>
      </div>

      <div style={{ background: 'white', padding: '12px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <i className="fas fa-search" style={{ color: '#94a3b8' }}></i>
        <input
          type="text"
          placeholder="Pesquisar por descrição ou pagador..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.95rem', color: '#334155' }}
        />
      </div>

      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '14px 16px' }}>Descrição</th>
              <th style={{ padding: '14px 16px' }}>Vencimento</th>
              <th style={{ padding: '14px 16px' }}>Valor</th>
              <th style={{ padding: '14px 16px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Carregando contas...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>{c.descricao || c.titular}</td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{c.vencimento || '-'}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#10b981' }}>R$ {c.valor || '0,00'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: c.status === 'pago' ? '#dcfce7' : '#fef3c7', color: c.status === 'pago' ? '#166534' : '#b45309', padding: '3px 8px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600 }}>
                      {c.status || 'Aguardando'}
                    </span>
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
