import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export default function MinhaConta() {
  const [empresa, setEmpresa] = useState(null);

  useEffect(() => {
    const activeCompName = localStorage.getItem('empresaSelecionadaNome') || 'Empresa Ativa';
    setEmpresa({ nome: activeCompName });
  }, []);

  return (
    <div style={{ padding: '10px 0' }}>
      <div className="breadcrumb" style={{ marginBottom: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
        <span>Conta</span> <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem', margin: '0 0.5rem' }}></i> <span className="active" style={{ color: '#1565C0', fontWeight: 600 }}>Minha Conta</span>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#2c3e50', margin: 0 }}>Minha Conta & Assinatura</h1>
      </div>

      <div style={{ background: 'white', padding: '2rem', borderRadius: '14px', border: '1px solid #e2e8f0', maxWidth: '650px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, color: '#1e293b' }}>{empresa?.nome || 'Minha Empresa'}</h3>
          <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.85rem' }}><i className="fas fa-check-circle"></i> Assinatura Ativa</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Plano Contratado</span>
            <strong style={{ display: 'block', fontSize: '1.1rem', color: '#1e293b', marginTop: '4px' }}>QUALIFY Pro</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Status</span>
            <strong style={{ display: 'block', fontSize: '1.1rem', color: '#10b981', marginTop: '4px' }}>Em Dia</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
