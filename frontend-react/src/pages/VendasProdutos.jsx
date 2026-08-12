import React from 'react';

export default function VendasProdutos() {
  return (
    <div style={{ paddingTop: '10px' }}>
      <div className="breadcrumb" style={{ marginBottom: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
        <span>Produtos</span> <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem', margin: '0 0.5rem' }}></i> <span className="active" style={{ color: '#1565C0', fontWeight: 600 }}>Venda Avulsa</span>
      </div>

      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#2c3e50', margin: 0 }}>Venda de Produtos Avulsos</h1>
      </div>

      <div className="dashboard-content" style={{ background: '#fff', padding: '3.5rem 2rem', borderRadius: '14px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'center', border: '1px solid #eaeaea' }}>
        <div style={{ width: '64px', height: '64px', background: 'rgba(33, 150, 243, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
          <i className="fas fa-shopping-cart" style={{ fontSize: '1.8rem', color: '#1565C0' }}></i>
        </div>
        <h2 style={{ color: '#2c3e50', marginBottom: '0.5rem', fontSize: '1.4rem' }}>Módulo em Migração</h2>
        <p style={{ color: '#64748b', maxWidth: '480px', margin: '0 auto', lineHeight: 1.5 }}>
          A venda avulsa de produtos sem vínculo com planos está sendo reescrita no novo ecossistema React.
        </p>
      </div>
    </div>
  );
}
