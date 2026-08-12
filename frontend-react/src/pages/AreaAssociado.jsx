import React from 'react';

export default function AreaAssociado() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '20px' }}>
      <header style={{ background: 'white', padding: '1rem 2rem', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>Painel do Associado</h1>
        <button style={{ border: 'none', background: '#f1f5f9', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#475569' }}>Sair</button>
      </header>
      
      <div style={{ background: 'white', padding: '3rem 2rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', background: '#e0f2fe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9', margin: '0 auto 1.5rem' }}>
          <i className="fas fa-id-card fa-3x"></i>
        </div>
        <h2 style={{ color: '#1e293b', marginBottom: '1rem' }}>Bem-vindo à Nova Área do Associado</h2>
        <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
          Estamos finalizando a migração desta área para oferecer uma experiência mais rápida e segura. Seus contratos e boletos estarão disponíveis aqui em breve.
        </p>
      </div>
    </div>
  );
}
