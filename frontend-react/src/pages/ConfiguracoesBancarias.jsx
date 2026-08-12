import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function ConfiguracoesBancarias() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [empresaAtiva, setEmpresaAtiva] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  const [wooviKey, setWooviKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:4570/api'
    : 'https://qualify-2026.onrender.com/api';

  useEffect(() => {
    const id = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
    const nome = localStorage.getItem('empresaSelecionadaNome') || 'Empresa Atual';
    
    if (!id) {
      alert('Selecione uma empresa primeiro.');
      navigate('/trocar-empresa');
      return;
    }
    setEmpresaAtiva({ id, nome });
    carregarConfiguracoes(id);
  }, [navigate]);

  const carregarConfiguracoes = async (empresaId) => {
    try {
      const { data, error } = await supabase.from('empresas').select('metadata').eq('id', empresaId).single();
      if (!error && data?.metadata) {
        let meta = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata;
        if (meta.woovi_app_id) {
          setWooviKey(meta.woovi_app_id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar configurações bancárias:', err);
    }
  };

  const salvarConfiguracoes = async () => {
    if (!empresaAtiva) return;
    setIsSaving(true);
    setStatusMsg(null);
    try {
      const { data: emp, error: fetchErr } = await supabase.from('empresas').select('metadata').eq('id', empresaAtiva.id).single();
      if (fetchErr) throw fetchErr;

      let meta = typeof emp.metadata === 'string' ? JSON.parse(emp.metadata || '{}') : (emp.metadata || {});
      meta.woovi_app_id = wooviKey;

      const { error: updateErr } = await supabase.from('empresas').update({ metadata: meta }).eq('id', empresaAtiva.id);
      if (updateErr) throw updateErr;

      setStatusMsg({ type: 'success', text: '✅ Configurações salvas com sucesso!' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: '❌ Erro ao salvar chaves: ' + err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const testarConexao = async () => {
    if (!empresaAtiva) return;
    
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/config/${empresaAtiva.id}/bancaria/testar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId: wooviKey }) // Passa a chave para o backend testar
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
        <h1 style={{ fontSize: '1.8rem', color: '#2c3e50', margin: 0 }}>Meios de Pagamento</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* WOOVI CARD */}
        <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '2rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
            <div style={{ width: '56px', height: '56px', background: '#e0f2fe', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9' }}>
              <i className="fas fa-university fa-2x"></i>
            </div>
            <div>
              <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem', color: '#1e293b' }}>Woovi (OpenPix)</h2>
              <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>RECOMENDADO</span>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#475569' }}>App ID (Chave de Produção)</label>
            <input 
              type="password" 
              value={wooviKey}
              onChange={(e) => setWooviKey(e.target.value)}
              placeholder="Ex: Q2xpZW50X0lkXzFhMmI..." 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '1rem' }} 
            />
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '8px' }}>
              Para gerar sua chave, acesse o painel da Woovi &gt; Desenvolvedores &gt; API.
            </p>
          </div>

          {statusMsg && (
            <div style={{ 
              padding: '1rem', 
              borderRadius: '8px', 
              marginBottom: '1.5rem',
              background: statusMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: statusMsg.type === 'success' ? '#166534' : '#991b1b',
              fontWeight: 600,
              fontSize: '0.9rem'
            }}>
              {statusMsg.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={testarConexao} 
              disabled={loading || !wooviKey}
              style={{
                flex: 1,
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: (loading || !wooviKey) ? 'not-allowed' : 'pointer',
                opacity: (loading || !wooviKey) ? 0.7 : 1
              }}
            >
              {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plug"></i>} Testar API
            </button>
            <button 
              onClick={salvarConfiguracoes} 
              disabled={isSaving}
              style={{
                flex: 1,
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
            >
              {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>} Salvar
            </button>
          </div>
        </div>



      </div>
    </div>
  );
}
