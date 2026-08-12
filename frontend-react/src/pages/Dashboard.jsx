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
    // A pedido do usuário, os KPIs e gráficos foram removidos.
    setLoading(false);
  }

  const goTo = (path) => navigate(path);

  return (
    <div style={{ paddingTop: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#1e293b', margin: 0, fontWeight: 700 }}>Visão Geral</h1>
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
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="shortcut-btn" onClick={() => goTo('/contratos/ativos')} style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}>
              <div style={{ background: '#e0f2fe', color: '#0284c7', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-file-contract"></i></div>
              <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Todos os Contratos</span>
            </div>
            {/* O sidebar não tem outros menus de contratos específicos além da gestão */}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: '#334155' }}>
            Famílias & Associados
          </div>
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="shortcut-btn" onClick={() => goTo('/familias/nova')} style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}>
              <div style={{ background: '#dcfce7', color: '#16a34a', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-user-plus"></i></div>
              <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Nova Família</span>
            </div>
            <div className="shortcut-btn" onClick={() => goTo('/familias/pesquisar')} style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}>
              <div style={{ background: '#f3e8ff', color: '#9333ea', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-users"></i></div>
              <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Pesquisar Famílias</span>
            </div>
            <div className="shortcut-btn" onClick={() => goTo('/familias/associados')} style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}>
              <div style={{ background: '#e0e7ff', color: '#4f46e5', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-user-friends"></i></div>
              <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Pesquisar Associados</span>
            </div>
            <div className="shortcut-btn" onClick={() => goTo('/familias/pets')} style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}>
              <div style={{ background: '#ffedd5', color: '#ea580c', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-paw"></i></div>
              <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Pesquisar Pet's</span>
            </div>
            <div className="shortcut-btn" onClick={() => goTo('/familias/aniversariantes')} style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}>
              <div style={{ background: '#fce7f3', color: '#db2777', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-birthday-cake"></i></div>
              <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Aniversariantes</span>
            </div>
            <div className="shortcut-btn" onClick={() => goTo('/perfil')} style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}>
              <div style={{ background: '#f1f5f9', color: '#475569', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-user-circle"></i></div>
              <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Meu Perfil</span>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: '#334155' }}>
            Financeiro
          </div>
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="shortcut-btn" onClick={() => goTo('/financeiro/movimentacoes')} style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}>
              <div style={{ background: '#dbeafe', color: '#2563eb', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-exchange-alt"></i></div>
              <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Minhas Movimentações</span>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: '#334155' }}>
            Planos
          </div>
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="shortcut-btn" onClick={() => goTo('/planos/novo')} style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}>
              <div style={{ background: '#e0e7ff', color: '#4338ca', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-plus-circle"></i></div>
              <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Novo Plano</span>
            </div>
            <div className="shortcut-btn" onClick={() => goTo('/planos/pesquisa')} style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}>
              <div style={{ background: '#ffedd5', color: '#ea580c', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-search-dollar"></i></div>
              <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Pesquisa de Planos</span>
            </div>
            <div className="shortcut-btn" onClick={() => goTo('/produtos')} style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}>
              <div style={{ background: '#f3e8ff', color: '#9333ea', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-box-open"></i></div>
              <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Produtos</span>
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
