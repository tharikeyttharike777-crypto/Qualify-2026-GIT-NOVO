import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export default function Aniversariantes() {
  const [aniversariantes, setAniversariantes] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAniversariantes();
  }, [selectedMonth]);

  async function fetchAniversariantes() {
    setLoading(true);
    try {
      const companyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('empresaSelecionadaId');
      let query = supabase.from('familias').select('*');
      if (companyId) query = query.eq('company_id', companyId);

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        const list = [];
        data.forEach(fam => {
          // Checa titular
          if (fam.titular?.dataNascimento) {
            const dt = new Date(fam.titular.dataNascimento);
            if (!isNaN(dt.getTime()) && (dt.getMonth() + 1) === parseInt(selectedMonth)) {
              list.push({
                id: `${fam.id}-tit`,
                nome: fam.titular.nome,
                dataNasc: fam.titular.dataNascimento,
                dia: dt.getDate() + 1,
                tipo: 'Titular',
                contato: fam.titular.celular || '-'
              });
            }
          }
          // Checa dependentes
          if (Array.isArray(fam.dependentes)) {
            fam.dependentes.forEach((dep, idx) => {
              if (dep.dataNascimento) {
                const dt = new Date(dep.dataNascimento);
                if (!isNaN(dt.getTime()) && (dt.getMonth() + 1) === parseInt(selectedMonth)) {
                  list.push({
                    id: `${fam.id}-dep-${idx}`,
                    nome: dep.nome,
                    dataNasc: dep.dataNascimento,
                    dia: dt.getDate() + 1,
                    tipo: `Dependente (${dep.parentesco || ''})`,
                    contato: fam.titular?.celular || '-'
                  });
                }
              }
            });
          }
        });
        // Ordena por dia
        list.sort((a, b) => a.dia - b.dia);
        setAniversariantes(list);
      }
    } catch (err) {
      console.error("Erro ao pesquisar aniversariantes:", err);
    } finally {
      setLoading(false);
    }
  }

  const meses = [
    { v: 1, n: 'Janeiro' }, { v: 2, n: 'Fevereiro' }, { v: 3, n: 'Março' },
    { v: 4, n: 'Abril' }, { v: 5, n: 'Maio' }, { v: 6, n: 'Junho' },
    { v: 7, n: 'Julho' }, { v: 8, n: 'Agosto' }, { v: 9, n: 'Setembro' },
    { v: 10, n: 'Outubro' }, { v: 11, n: 'Novembro' }, { v: 12, n: 'Dezembro' }
  ];

  return (
    <div style={{ padding: '10px 0' }}>
      <div className="breadcrumb" style={{ marginBottom: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
        <span>Famílias</span> <i className="fas fa-chevron-right" style={{ fontSize: '0.75rem', margin: '0 0.5rem' }}></i> <span className="active" style={{ color: '#1565C0', fontWeight: 600 }}>Aniversariantes</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#2c3e50', margin: 0 }}>
          <i className="fas fa-birthday-cake" style={{ color: '#e11d48', marginRight: '10px' }}></i> Aniversariantes do Mês
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: 600, color: '#475569' }}>Mês:</label>
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', fontWeight: 600 }}>
            {meses.map(m => (
              <option key={m.v} value={m.v}>{m.n}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '14px 16px' }}>Dia</th>
              <th style={{ padding: '14px 16px' }}>Aniversariante</th>
              <th style={{ padding: '14px 16px' }}>Vínculo</th>
              <th style={{ padding: '14px 16px' }}>Data Nasc.</th>
              <th style={{ padding: '14px 16px' }}>Contato</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Buscando aniversariantes...
                </td>
              </tr>
            ) : aniversariantes.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  Nenhum aniversariante encontrado neste mês.
                </td>
              </tr>
            ) : (
              aniversariantes.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 800, color: '#e11d48', fontSize: '1.1rem' }}>Dia {a.dia}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1e293b' }}>{a.nome}</td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{a.tipo}</td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{a.dataNasc}</td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>{a.contato}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
