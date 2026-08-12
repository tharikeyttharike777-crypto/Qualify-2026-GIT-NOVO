import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

export default function CatalogoPlanos() {
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlanos = async () => {
      try {
        const { data, error } = await supabase.from('planos').select('*').eq('status', 'ativo').order('created_at', { ascending: false });
        if (error) throw error;
        setPlanos(data || []);
      } catch (err) {
        console.error('Erro ao buscar planos:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlanos();
  }, []);

  const formatCurrency = (val) => {
    const num = parseFloat(String(val).replace(',', '.'));
    return isNaN(num) ? 'R$ 0,00' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
      {/* Header Oficial da Plataforma (Adaptado para Público) */}
      <header className="header" style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
        <div className="header-left">
          <button className="hamburger-menu" onClick={() => navigate(-1)} aria-label="Voltar" title="Voltar">
            <i className="fas fa-arrow-left"></i>
          </button>
          <a href="/login" className="logo" style={{ textDecoration: 'none' }}>
            <span className="logo-text">QUALIFY - Catálogo de Planos</span>
          </a>
        </div>

        <div className="header-center">
          <div className="search-container" style={{ opacity: 0 }}>
            {/* Invisível, mas mantém o alinhamento da Topbar original */}
            <input type="text" className="search-input" disabled />
          </div>
        </div>

        <div className="header-right">
          <div className="company-info" style={{ cursor: 'pointer', background: '#3b82f6', color: 'white' }} onClick={() => navigate('/login')}>
            <i className="fas fa-sign-in-alt"></i>
            <span>Área do Cliente</span>
          </div>
        </div>
      </header>

      <div style={{ padding: '60px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 style={{ fontSize: '3rem', color: '#0f172a', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-1px' }}>
            Proteja quem você ama
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
            Escolha o plano ideal para a sua família e tenha acesso a dezenas de benefícios exclusivos com a nossa rede.
          </p>
        </div>
        
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#3b82f6', fontSize: '2rem' }}>
            <i className="fas fa-spinner fa-spin"></i>
          </div>
        ) : planos.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <i className="fas fa-box-open fa-3x" style={{ color: '#cbd5e1', marginBottom: '1rem' }}></i>
            <h2 style={{ fontSize: '1.5rem', color: '#1e293b' }}>Nenhum plano disponível</h2>
            <p>Os planos ativos aparecerão aqui em breve.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
            {planos.map((plano) => {
              // Extract metadata
              let meta = {};
              if (plano.metadata) {
                try { meta = typeof plano.metadata === 'string' ? JSON.parse(plano.metadata) : plano.metadata; } catch(e){}
              }

              const nome = plano.name || plano.nome || plano.title || 'Plano Básico';
              const descricao = plano.description || plano.descricao || meta.description || 'Assinatura completa de benefícios.';
              const mensalidade = plano.monthly_value || plano.mensalidade || meta.monthly_value || 0;
              const adesao = plano.adhesion_value || plano.adesao || meta.adhesion_value || 0;
              const maxPessoas = plano.max_people || meta.max_people || 5;

              return (
                <div key={plano.id} style={{ 
                  background: 'white', 
                  borderRadius: '24px', 
                  padding: '2.5rem', 
                  boxShadow: '0 10px 40px -10px rgba(0,0,0,0.08)', 
                  border: '1px solid #f1f5f9',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  cursor: 'default'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(0,0,0,0.12)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 10px 40px -10px rgba(0,0,0,0.08)'; }}
                >
                  
                  {/* Tag Popular (apenas visual para o primeiro) */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.5rem 0' }}>{nome}</h3>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem', minHeight: '45px' }}>{descricao}</p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '2rem' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-1px' }}>{formatCurrency(mensalidade)}</span>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>/mês</span>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2.5rem 0', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#475569' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                        <i className="fas fa-check"></i>
                      </div>
                      Até <strong>{maxPessoas}</strong> dependentes
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#475569' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                        <i className="fas fa-check"></i>
                      </div>
                      Acesso a toda rede credenciada
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#475569' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                        <i className="fas fa-info"></i>
                      </div>
                      Taxa de adesão: {formatCurrency(adesao)}
                    </li>
                  </ul>

                  <button 
                    onClick={() => navigate('/login')}
                    style={{ 
                      width: '100%', 
                      background: '#2563eb', 
                      color: 'white', 
                      border: 'none', 
                      padding: '16px', 
                      borderRadius: '12px', 
                      fontWeight: 700, 
                      fontSize: '1.05rem', 
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#1d4ed8'}
                    onMouseOut={(e) => e.currentTarget.style.background = '#2563eb'}
                  >
                    Assinar Agora
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
