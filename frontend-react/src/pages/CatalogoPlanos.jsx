import React from 'react';

export default function CatalogoPlanos() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', color: '#1e293b', marginBottom: '1rem' }}>Conheça Nossos Planos</h1>
        <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '3rem' }}>
          Escolha a melhor proteção para você e sua família.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <div style={{ width: '60px', height: '60px', background: '#e0f2fe', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9', margin: '0 auto 1.5rem' }}>
              <i className="fas fa-shield-alt fa-2x"></i>
            </div>
            <h2 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '1rem' }}>Catálogo Digital</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem', lineHeight: 1.5 }}>
              Nosso catálogo interativo está sendo migrado para a nova plataforma. Em breve você poderá assinar planos diretamente por aqui.
            </p>
            <button style={{ width: '100%', background: '#3b82f6', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>
              Voltar ao Início
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
