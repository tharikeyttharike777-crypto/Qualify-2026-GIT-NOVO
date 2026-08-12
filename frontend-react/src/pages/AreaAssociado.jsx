import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function AreaAssociado() {
  const navigate = useNavigate();
  const [associado, setAssociado] = useState(null);
  const [contrato, setContrato] = useState(null);
  const [cobrancas, setCobrancas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);

  useEffect(() => {
    const authData = sessionStorage.getItem('associado_auth');
    if (!authData) {
      navigate('/area-associado-login');
      return;
    }
    
    const parsed = JSON.parse(authData);
    setAssociado(parsed);
    loadData(parsed);
  }, [navigate]);

  const loadData = async (user) => {
    try {
      // Busca o contrato
      const { data: cont, error: contErr } = await supabase
        .from('contratos')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (contErr) throw contErr;
      setContrato(cont);

      // Busca as cobranças deste contrato
      const { data: cobs, error: cobErr } = await supabase
        .from('cobrancas')
        .select('*')
        .eq('contrato_numero', cont.numero || cont.id)
        .order('vencimento', { ascending: false });
      
      if (cobErr) throw cobErr;
      setCobrancas(cobs || []);

    } catch (err) {
      console.error('Erro ao carregar painel:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('associado_auth');
    navigate('/area-associado-login');
  };

  const handleBaixarCarteirinha = async () => {
    setIsGeneratingCard(true);
    try {
      const { gerarPdfCarteirinhaBuffer } = await import('../utils/pdfUtils');
      await gerarPdfCarteirinhaBuffer(contrato, null, true);
    } catch (error) {
      alert('Erro ao gerar carteirinha: ' + error.message);
    } finally {
      setIsGeneratingCard(false);
    }
  };

  const formatCurrency = (val) => {
    const num = parseFloat(String(val).replace(',', '.'));
    return isNaN(num) ? 'R$ 0,00' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const formatDate = (val) => {
    if (!val) return '—';
    const [y, m, d] = val.split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
    return val;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <i className="fas fa-spinner fa-spin fa-3x" style={{ color: '#3b82f6' }}></i>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Inter', sans-serif" }}>
      <header style={{ background: '#1e293b', padding: '1.2rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-user"></i>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{associado?.nome}</h1>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>CPF: {associado?.cpf}</span>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          style={{ border: '1px solid #334155', background: 'transparent', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#e2e8f0', transition: 'background 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.background = '#334155'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <i className="fas fa-sign-out-alt"></i> Sair
        </button>
      </header>
      
      <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 20px' }}>
        
        {/* Painel de Resumo e Ações Rápidas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '2rem' }}>
          
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '1.1rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>Seu Plano Atual</h2>
            <div style={{ fontSize: '1.8rem', color: '#0f172a', fontWeight: 800, marginBottom: '1rem' }}>
              {contrato?.plano || 'Plano Padrão'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700 }}>
                {String(contrato?.status || 'Ativo').toUpperCase()}
              </span>
            </div>
          </div>

          <div style={{ background: 'gradient(to right, #2563eb, #3b82f6)', backgroundColor: '#2563eb', color: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 10px 25px rgba(37,99,235,0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', fontWeight: 600 }}>Carteirinha Digital</h2>
            <p style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '1.5rem' }}>Apresente na rede credenciada para garantir seus benefícios.</p>
            <button 
              onClick={handleBaixarCarteirinha}
              disabled={isGeneratingCard}
              style={{ background: 'white', color: '#2563eb', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 700, cursor: isGeneratingCard ? 'not-allowed' : 'pointer' }}
            >
              {isGeneratingCard ? <><i className="fas fa-spinner fa-spin"></i> Gerando...</> : <><i className="fas fa-id-card"></i> Baixar Carteirinha</>}
            </button>
          </div>

        </div>

        {/* Histórico de Faturas */}
        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#1e293b' }}>Suas Faturas</h2>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Descrição</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Vencimento</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Valor</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {cobrancas.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Nenhuma fatura encontrada.</td></tr>
                ) : (
                  cobrancas.map(c => {
                    const isPago = c.status === 'pago';
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 20px', color: '#1e293b', fontWeight: 500 }}>{c.descricao || c.tipo || 'Mensalidade'}</td>
                        <td style={{ padding: '16px 20px', color: '#475569' }}>{formatDate(c.vencimento)}</td>
                        <td style={{ padding: '16px 20px', color: '#0f172a', fontWeight: 600 }}>{formatCurrency(c.valor)}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ 
                            background: isPago ? '#dcfce7' : '#fef3c7', 
                            color: isPago ? '#166534' : '#92400e', 
                            padding: '4px 10px', 
                            borderRadius: '12px', 
                            fontSize: '0.75rem', 
                            fontWeight: 700,
                            textTransform: 'uppercase'
                          }}>
                            {c.status || 'Pendente'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          {!isPago && c.link_pagamento ? (
                            <a href={c.link_pagamento} target="_blank" rel="noreferrer" style={{ background: '#10b981', color: 'white', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
                              Pagar Agora
                            </a>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                              {isPago ? 'Liquidado' : 'Boleto indisponível'}
                            </span>
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
    </div>
  );
}
