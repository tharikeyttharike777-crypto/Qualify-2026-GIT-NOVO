import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalContratos: 0,
    ativos: 0,
    inadimplentes: 0,
    cancelados: 0,
  });
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
      
      let query = supabase.from('contratos').select('status, created_at, valor');
      if (companyId) query = query.eq('company_id', companyId);

      const { data, error } = await query;
      
      if (!error && Array.isArray(data)) {
        let ativos = 0;
        let inadimplentes = 0;
        let cancelados = 0;

        data.forEach(c => {
          const st = String(c.status || 'ativo').toLowerCase();
          if (st === 'ativo' || st === 'adimplente') ativos++;
          else if (st === 'inadimplente' || st === 'atrasado' || st === 'renegociacao') inadimplentes++;
          else if (st === 'cancelado' || st === 'encerrado') cancelados++;
        });

        setStats({
          totalContratos: data.length,
          ativos,
          inadimplentes,
          cancelados
        });

        // Group by month for chart (Last 6 months)
        const months = {};
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const monthStr = d.toLocaleString('pt-BR', { month: 'short' });
          months[monthStr] = { name: monthStr.toUpperCase(), novos: 0, valor: 0 };
        }

        data.forEach(c => {
          if (!c.created_at) return;
          const d = new Date(c.created_at);
          const diffMonths = (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth());
          if (diffMonths >= 0 && diffMonths <= 5) {
            const mStr = d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
            if (months[mStr.toLowerCase()]) {
              months[mStr.toLowerCase()].novos++;
              months[mStr.toLowerCase()].valor += parseFloat(c.valor || 0);
            }
          }
        });
        
        setChartData(Object.values(months));
      }
    } catch (err) {
      console.error("Erro ao carregar KPIs:", err);
    } finally {
      setLoading(false);
    }
  }

  const goTo = (path) => navigate(path);

  return (
    <div style={{ paddingTop: '10px' }}>
      <div className="breadcrumb" style={{ marginBottom: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
        <span>Sistema</span> <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem', margin: '0 0.5rem' }}></i> <span className="active" style={{ color: '#1565C0', fontWeight: 600 }}>Dashboard</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#2c3e50', margin: 0 }}>Visão Geral</h1>
        <button onClick={loadDashboardData} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i> Atualizar
        </button>
      </div>

      {/* KPIs Principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>
        <div style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', color: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 10px 20px -5px rgba(37,99,235,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total de Contratos</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '4px' }}>{stats.totalContratos}</div>
          </div>
          <i className="fas fa-file-contract" style={{ fontSize: '3rem', opacity: 0.3 }}></i>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 10px 20px -5px rgba(16,185,129,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ativos / Adimplentes</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '4px' }}>{stats.ativos}</div>
          </div>
          <i className="fas fa-check-circle" style={{ fontSize: '3rem', opacity: 0.3 }}></i>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 10px 20px -5px rgba(245,158,11,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inadimplentes</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '4px' }}>{stats.inadimplentes}</div>
          </div>
          <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', opacity: 0.3 }}></i>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 10px 20px -5px rgba(239,68,68,0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cancelados</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '4px' }}>{stats.cancelados}</div>
          </div>
          <i className="fas fa-times-circle" style={{ fontSize: '3rem', opacity: 0.3 }}></i>
        </div>
      </div>

      {/* Gráfico */}
      <div style={{ background: 'white', padding: '1.8rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 1.5rem', color: '#1e293b', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fas fa-chart-bar" style={{ color: '#3b82f6' }}></i> Evolução de Novos Contratos (6 meses)
        </h3>
        
        {loading ? (
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <i className="fas fa-spinner fa-spin fa-2x"></i>
          </div>
        ) : (
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="novos" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Novos Contratos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Atalhos */}
      <h3 style={{ margin: '0 0 1.5rem', color: '#1e293b', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <i className="fas fa-th-large" style={{ color: '#8b5cf6' }}></i> Acesso Rápido
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: '#334155' }}>
            Contratos
          </div>
          <div style={{ padding: '12px' }}>
            <div className="shortcut-btn" onClick={() => goTo('/contratos/ativos')} style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}>
              <div style={{ background: '#e0f2fe', color: '#0284c7', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-file-contract"></i></div>
              <span style={{ fontWeight: 600, color: '#475569' }}>Todos os Contratos</span>
            </div>
            <div className="shortcut-btn" onClick={() => goTo('/inadimplentes')} style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}>
              <div style={{ background: '#fee2e2', color: '#dc2626', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-exclamation-triangle"></i></div>
              <span style={{ fontWeight: 600, color: '#475569' }}>Inadimplentes</span>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: '#334155' }}>
            Famílias & Associados
          </div>
          <div style={{ padding: '12px' }}>
            <div className="shortcut-btn" onClick={() => goTo('/familias/nova')} style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}>
              <div style={{ background: '#dcfce7', color: '#16a34a', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-user-plus"></i></div>
              <span style={{ fontWeight: 600, color: '#475569' }}>Nova Família</span>
            </div>
            <div className="shortcut-btn" onClick={() => goTo('/familias/pesquisar')} style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}>
              <div style={{ background: '#f3e8ff', color: '#9333ea', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-users"></i></div>
              <span style={{ fontWeight: 600, color: '#475569' }}>Pesquisar Famílias</span>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: '#334155' }}>
            Financeiro & Planos
          </div>
          <div style={{ padding: '12px' }}>
            <div className="shortcut-btn" onClick={() => goTo('/financeiro/cobranca')} style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}>
              <div style={{ background: '#fef3c7', color: '#d97706', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-money-bill-wave"></i></div>
              <span style={{ fontWeight: 600, color: '#475569' }}>Gestão de Cobranças</span>
            </div>
            <div className="shortcut-btn" onClick={() => goTo('/planos/pesquisa')} style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}>
              <div style={{ background: '#ffedd5', color: '#ea580c', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-search-dollar"></i></div>
              <span style={{ fontWeight: 600, color: '#475569' }}>Gerenciar Planos</span>
            </div>
          </div>
        </div>

      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .shortcut-btn:hover { background: #f8fafc !important; transform: translateX(4px); }
      `}} />
    </div>
  );
}
