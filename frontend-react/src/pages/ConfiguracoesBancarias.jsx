import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ConfiguracoesBancarias() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [empresaAtiva, setEmpresaAtiva] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);

  const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:4570/api'
    : 'https://qualify-2026.onrender.com/api';

  useEffect(() => {
    const id = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
    const nome = localStorage.getItem('empresaSelecionadaNome') || 'Empresa Atual';
    
    if (!id) {
      alert('Selecione uma empresa primeiro.');
      navigate('/empresas/trocar');
      return;
    }
    setEmpresaAtiva({ id, nome });
  }, [navigate]);

  const testarConexao = async () => {
    if (!empresaAtiva) return;
    
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/config/${empresaAtiva.id}/bancaria/testar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      
      if (data.success) {
        setStatusMsg({ type: 'success', text: `✅ Conexão estabelecida! Ambiente: ${data.ambiente || 'Produção'}` });
      } else {
        setStatusMsg({ type: 'error', text: `❌ Falha na conexão: ${data.error || 'Verifique a chave Woovi'}` });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: '❌ Erro de rede ao testar conexão.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingTop: '10px' }}>
      <div className="breadcrumb" style={{ marginBottom: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
        <span>Sistema</span> <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem', margin: '0 0.5rem' }}></i> 
        <span>Configurações</span> <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem', margin: '0 0.5rem' }}></i>
        <span className="active" style={{ color: '#1565C0', fontWeight: 600 }}>Integração Bancária</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#2c3e50', margin: 0 }}>Integração Bancária (Woovi)</h1>
      </div>

      <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', maxWidth: '600px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '2rem' }}>
          <div style={{ width: '64px', height: '64px', background: '#e0f2fe', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9' }}>
            <i className="fas fa-university fa-2x"></i>
          </div>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem', color: '#1e293b' }}>Configuração Global</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
              Empresa ativa: <strong style={{ color: '#0f172a' }}>{empresaAtiva?.nome}</strong>
            </p>
          </div>
        </div>

        <p style={{ color: '#475569', lineHeight: '1.6', marginBottom: '2rem' }}>
          A integração com a Woovi é gerenciada centralmente pelo servidor via variável de ambiente (WOOVI_API_KEY). 
          Clique no botão abaixo para disparar um teste de conexão e verificar se a chave configurada no servidor tem acesso ao ambiente correto.
        </p>

        {statusMsg && (
          <div style={{ 
            padding: '1rem 1.2rem', 
            borderRadius: '10px', 
            marginBottom: '1.5rem',
            background: statusMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: statusMsg.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${statusMsg.type === 'success' ? '#86efac' : '#fca5a5'}`,
            fontWeight: 600
          }}>
            {statusMsg.text}
          </div>
        )}

        <button 
          onClick={testarConexao} 
          disabled={loading}
          style={{
            width: '100%',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '14px',
            borderRadius: '10px',
            fontSize: '1.1rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            opacity: loading ? 0.7 : 1,
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}
        >
          {loading ? (
            <><i className="fas fa-spinner fa-spin"></i> Testando Conexão...</>
          ) : (
            <><i className="fas fa-plug"></i> Testar Conexão com Woovi</>
          )}
        </button>
      </div>
    </div>
  );
}
