import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import ConfirmModal from '../components/common/ConfirmModal';

export default function PesquisarAssociados() {
  const navigate = useNavigate();
  const [associados, setAssociados] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Confirm Modal state
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: 'Confirmar Exclusão',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    fetchAssociados();
  }, []);

  async function fetchAssociados() {
    setLoading(true);
    const list = [];

    try {
      const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
      let { data, error } = await supabase.from('familias').select('*');

      if (companyId && data) {
        const filteredComp = data.filter(f => !f.company_id || String(f.company_id) === String(companyId));
        if (filteredComp.length > 0) data = filteredComp;
      }

      if (!error && Array.isArray(data)) {
        data.forEach(fam => {
          let meta = {};
          if (fam.metadata) {
            try { meta = typeof fam.metadata === 'string' ? JSON.parse(fam.metadata) : fam.metadata; } catch(e){}
          }
          const titular = fam.titular || meta.titular || {};
          const dependentes = fam.dependentes || meta.dependentes || [];

          if (titular.nome || fam.nome) {
            list.push({
              id: `${fam.id}-titular`,
              nome: titular.nome || fam.nome,
              cpf: titular.cpf || fam.cpf || '-',
              tipo: 'Titular',
              familiaId: fam.id,
              displayFamId: String(fam.id || '').length > 10 ? String(fam.id).slice(0, 8) : fam.id,
              celular: titular.celular || fam.celular || '-'
            });
          }

          if (Array.isArray(dependentes)) {
            dependentes.forEach((dep, idx) => {
              if (dep.nome) {
                list.push({
                  id: `${fam.id}-dep-${idx}`,
                  depIndex: idx,
                  nome: dep.nome,
                  cpf: dep.cpf || '-',
                  tipo: `Dependente (${dep.parentesco || 'Outro'})`,
                  familiaId: fam.id,
                  displayFamId: String(fam.id || '').length > 10 ? String(fam.id).slice(0, 8) : fam.id,
                  celular: titular.celular || '-'
                });
              }
            });
          }
        });
      }
    } catch (err) {
      console.warn("Aviso ao carregar associados Supabase:", err);
    }

    setAssociados(list);
    setLoading(false);
  }

  const handleDeleteAssociado = (item) => {
    setConfirmModalState({
      isOpen: true,
      title: 'Excluir Associado',
      message: `Tem certeza que deseja excluir "${item.nome}"?`,
      onConfirm: async () => {
        try {
          if (item.tipo === 'Titular') {
            await supabase.from('familias').delete().eq('id', item.familiaId);
          } else {
            const { data: famData } = await supabase.from('familias').select('*').eq('id', item.familiaId).single();
            if (famData && Array.isArray(famData.dependentes)) {
              const updatedDeps = famData.dependentes.filter((_, idx) => idx !== item.depIndex);
              await supabase.from('familias').update({ dependentes: updatedDeps }).eq('id', item.familiaId);
            }
          }
          setAssociados(prev => prev.filter(a => a.id !== item.id));
        } catch (e) {
          alert("Erro ao excluir: " + e.message);
        }
        setConfirmModalState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const filtered = associados.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return String(a.nome || '').toLowerCase().includes(q) || String(a.cpf || '').toLowerCase().includes(q);
  });

  return (
    <div style={{ padding: '10px 0' }}>
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        onConfirm={confirmModalState.onConfirm}
        onCancel={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
      />

      <div className="breadcrumb" style={{ marginBottom: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
        <span>Famílias</span> <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem', margin: '0 0.5rem' }}></i> <span className="active" style={{ color: '#1565C0', fontWeight: 600 }}>Pesquisar Associados</span>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#2c3e50', margin: 0 }}>Pesquisar Associados</h1>
      </div>

      <div style={{ background: 'white', padding: '12px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <i className="fas fa-search" style={{ color: '#94a3b8' }}></i>
        <input
          type="text"
          placeholder="Pesquisar por nome do associado ou CPF..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.95rem', color: '#334155' }}
        />
      </div>

      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '14px 16px' }}>Nome do Associado</th>
              <th style={{ padding: '14px 16px' }}>Tipo</th>
              <th style={{ padding: '14px 16px' }}>CPF</th>
              <th style={{ padding: '14px 16px' }}>Contato</th>
              <th style={{ padding: '14px 16px' }}>Cód. Família</th>
              <th style={{ padding: '14px 16px', textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Carregando associados...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  Nenhum associado encontrado.
                </td>
              </tr>
            ) : (
              filtered.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>{a.nome}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: a.tipo === 'Titular' ? '#dbeafe' : '#f1f5f9', color: a.tipo === 'Titular' ? '#1e40af' : '#475569', padding: '3px 8px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600 }}>
                      {a.tipo}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{a.cpf || '-'}</td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{a.celular || '-'}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1565C0' }}>#{a.displayFamId}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button onClick={() => navigate(`/familias/nova?id=${a.familiaId}`)} style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '6px', color: '#1565C0', cursor: 'pointer', fontWeight: 600 }} title="Acessar / Editar Família">
                        <i className="fas fa-edit"></i> Acessar
                      </button>
                      <button onClick={() => handleDeleteAssociado(a)} style={{ background: '#fee2e2', border: 'none', padding: '6px 12px', borderRadius: '6px', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }} title="Excluir Associado">
                        <i className="fas fa-trash"></i> Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
