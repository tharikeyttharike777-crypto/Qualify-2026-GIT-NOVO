import React from 'react';

export default function ConfirmModal({ isOpen, title = 'Confirmar Exclusão', message, onConfirm, onCancel, confirmText = 'Sim, Excluir', cancelText = 'Cancelar' }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '440px',
        padding: '2rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        textAlign: 'center',
        border: '1px solid #e2e8f0'
      }}>
        {/* Warning Icon Badge */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.8rem',
          margin: '0 auto 1.2rem auto'
        }}>
          <i className="fas fa-exclamation-triangle"></i>
        </div>

        <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '1.3rem', fontWeight: 700 }}>
          {title}
        </h3>

        <p style={{ margin: '0 0 1.8rem 0', color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5 }}>
          {message || 'Tem certeza de que deseja realizar esta ação? Esta operação não pode ser desfeita.'}
        </p>

        <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '0.75rem 1.2rem',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#334155',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '0.75rem 1.2rem',
              borderRadius: '10px',
              border: 'none',
              background: '#dc2626',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.95rem',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
            }}
          >
            <i className="fas fa-trash" style={{ marginRight: '6px' }}></i> {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
