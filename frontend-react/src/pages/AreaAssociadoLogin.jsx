import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function AreaAssociadoLogin() {
  const navigate = useNavigate();
  const [documento, setDocumento] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!documento) {
      setErrorMsg('Por favor, informe seu CPF/CNPJ.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      // Limpa pontuações do documento para busca
      const cleanDoc = documento.replace(/[^\d]/g, '');
      
      // Busca todas as familias para encontrar pelo CPF (como está salvo com formatação, é mais seguro filtrar no JS)
      const { data: familias, error } = await supabase
        .from('familias')
        .select('id, titular, metadata');

      if (error) throw error;

      // Encontra a família correspondente
      const familiaEncontrada = familias?.find(f => {
        let meta = {};
        if (f.metadata) {
          try { meta = typeof f.metadata === 'string' ? JSON.parse(f.metadata) : f.metadata; } catch(e){}
        }
        const cpf = String(f.titular?.cpf || f.titular?.documento || meta.cpf || '').replace(/[^\d]/g, '');
        return cpf === cleanDoc;
      });

      if (familiaEncontrada) {
        // Sucesso! O cliente existe.
        const nomeTitular = familiaEncontrada.titular?.nome || familiaEncontrada.titular?.name || 'Associado';
        
        sessionStorage.setItem('associado_auth', JSON.stringify({
          id: familiaEncontrada.id,
          nome: nomeTitular,
          cpf: cleanDoc,
          family_id: familiaEncontrada.id
        }));
        
        navigate('/associado/painel');
      } else {
        setErrorMsg('Cadastro não encontrado. Verifique se o CPF/CNPJ está correto.');
      }
    } catch (err) {
      console.error('Erro no login:', err);
      setErrorMsg('Erro ao tentar conectar. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: '20px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: 'white', padding: '3rem 2.5rem', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', width: '100%', maxWidth: '420px', textAlign: 'center' }}>
        
        <div style={{ width: '72px', height: '72px', background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', margin: '0 auto 1.5rem' }}>
          <i className="fas fa-shield-alt fa-2x"></i>
        </div>
        
        <h1 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem', fontWeight: 800 }}>Portal do Cliente</h1>
        <p style={{ color: '#64748b', marginBottom: '2.5rem', fontSize: '0.95rem' }}>Acesse seus contratos e faturas.</p>

        {errorMsg && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '2rem', textAlign: 'left' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>CPF ou CNPJ do Titular</label>
            <input 
              type="text" 
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              placeholder="Digite apenas números" 
              style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', background: '#f8fafc', fontSize: '1rem', transition: 'border-color 0.2s' }} 
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              background: '#2563eb', 
              color: 'white', 
              border: 'none', 
              padding: '16px', 
              borderRadius: '12px', 
              fontWeight: 700, 
              fontSize: '1.05rem', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              transition: 'background 0.2s',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
            }}
          >
            {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Entrar no Painel'}
          </button>
        </form>
      </div>
    </div>
  );
}
