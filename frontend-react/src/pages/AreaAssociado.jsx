import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

export default function AreaAssociado() {
  const navigate = useNavigate();
  const [associado, setAssociado] = useState(null);
  const [contrato, setContrato] = useState(null);
  const [cobrancas, setCobrancas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);

  useEffect(() => {
    const authData = sessionStorage.getItem('associado_auth');
    if (!authData) {
      navigate('/area-associado-login');
      return;
    }
    
    const parsed = JSON.parse(authData);
    setAssociado(parsed);
    loadData(parsed);
  }, [navigate]);

  const loadData = async (user) => {
    try {
      // Busca todos os contratos (pois o family_id pode estar dentro do JSONB metadata)
      const { data: allContracts, error: contErr } = await supabase
        .from('contratos')
        .select('*');
      
      if (contErr) throw contErr;

      // Encontra o contrato usando múltiplas estratégias (fallback para dados legados sem family_id)
      let cont = null;
      if (allContracts && allContracts.length > 0) {
        cont = allContracts.find(c => {
          let meta = {};
          if (c.metadata) try { meta = typeof c.metadata === 'string' ? JSON.parse(c.metadata) : c.metadata; } catch(e){}
          
          const fId = c.family_id || meta.family_id || meta.familyId;
          const matchFid = fId && String(fId) === String(user.id);
          
          const cCpf = String(c.cpf || c.documento || meta.cpf || '').replace(/[^\d]/g, '');
          const uCpf = String(user.cpf).replace(/[^\d]/g, '');
          const matchCpf = cCpf && uCpf && cCpf === uCpf;
          
          const cTit = String(c.titular || c.cliente || meta.titular || meta.cliente || '').trim().toLowerCase();
          const uTit = String(user.nome).trim().toLowerCase();
          const matchName = cTit && uTit && cTit === uTit;

          const isActive = String(c.status || meta.status || 'ativo').toLowerCase() === 'ativo';

          return (matchFid || matchCpf || matchName) && isActive;
        });
      }

      setContrato(cont);

      // Busca as cobranças deste contrato
      const numeroBusca = cont ? (cont.numero || cont.id) : '000000';
      const { data: cobs, error: cobErr } = await supabase
        .from('cobrancas')
        .select('*')
        .eq('contrato_numero', numeroBusca)
        .order('vencimento', { ascending: false });
      
      if (cobErr) throw cobErr;
      setCobrancas(cobs || []);

    } catch (err) {
      console.error('Erro ao carregar painel:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('associado_auth');
    navigate('/area-associado-login');
  };

  const handleBaixarCarteirinha = async () => {
    setIsGeneratingCard(true);
    try {
      const familyMock = {
        id: associado?.id,
        titular: {
          nome: associado?.nome,
          cpf: associado?.cpf
        },
        cpf: associado?.cpf
      };
      
      const { gerarPdfCarteirinhaBuffer } = await import('../utils/pdfUtils');
      await gerarPdfCarteirinhaBuffer(contrato, familyMock, true);
    } catch (error) {
      alert('Erro ao gerar carteirinha: ' + error.message);
    } finally {
      setIsGeneratingCard(false);
    }
  };

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleGerarContrato = async () => {
    if (!contrato) {
      alert('Contrato não encontrado.');
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      const numeroContrato = contrato.numero || contrato.id || 'S/N';
      let meta = {};
      if (contrato.metadata) try { meta = typeof contrato.metadata === 'string' ? JSON.parse(contrato.metadata) : contrato.metadata; } catch(e){}
      const nomePlano = contrato.plano || meta.plano || 'Plano QUALIFY';
      const titularNome = contrato.titular || contrato.cliente || meta.titular || associado?.nome || 'CLIENTE NÃO IDENTIFICADO';
      
      // Fetch plan clauses
      let clausulasTexto = [
        '1. O presente contrato tem vigência conforme período estipulado, podendo ser renovado automaticamente.',
        '2. O CONTRATANTE se compromete a manter os pagamentos em dia conforme modalidade escolhida.',
        '3. Os serviços serão prestados conforme especificações do plano contratado.',
        '4. O cancelamento deve ser solicitado com no mínimo 30 (trinta) dias de antecedência.',
        '5. Em caso de inadimplência superior a 60 dias, o contrato poderá ser suspenso.',
        '6. Ambas as partes concordam com as condições aqui estabelecidas, firmando o presente instrumento.'
      ].join('\n\n');
      
      // Cabeçalho
      doc.setFillColor(30, 41, 59); // Slate 800
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('QUALIFY', 14, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Clube de Benefícios', 14, 28);
      
      doc.setFontSize(16);
      doc.text('CONTRATO DE ADESÃO', 196, 24, { align: 'right' });
      
      doc.setTextColor(0, 0, 0);
      
      // Detalhes do Contrato
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('1. DADOS DO CONTRATO', 14, 55);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Número: #${numeroContrato}`, 14, 65);
      doc.text(`Titular: ${titularNome}`, 14, 72);
      doc.text(`Plano Contratado: ${nomePlano}`, 14, 79);
      
      const docDate = new Date().toLocaleDateString('pt-BR');
      doc.text(`Data de Emissão: ${docDate}`, 14, 86);
      
      // Cláusulas
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('2. TERMOS E CONDIÇÕES', 14, 105);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const splitText = doc.splitTextToSize(clausulasTexto, 180);
      doc.text(splitText, 14, 115);
      
      // Assinatura
      doc.setDrawColor(150, 150, 150);
      doc.line(14, 220, 90, 220);
      doc.text(String(titularNome).toUpperCase(), 14, 227);
      doc.setFontSize(8);
      doc.text('CONTRATANTE / TITULAR', 14, 232);
      
      doc.line(110, 220, 186, 220);
      doc.setFontSize(10);
      doc.text('QUALIFY CLUBE DE BENEFÍCIOS', 110, 227);
      doc.setFontSize(8);
      doc.text('CONTRATADA', 110, 232);
      
      // Rodapé
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Este documento foi gerado digitalmente e possui validade jurídica entre as partes.', 105, 280, { align: 'center' });
      
      doc.save(`Contrato_${numeroContrato}.pdf`);
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar PDF: ' + error.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const formatCurrency = (val) => {
    const num = parseFloat(String(val).replace(',', '.'));
    return isNaN(num) ? 'R$ 0,00' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const formatDate = (val) => {
    if (!val) return '—';
    const [y, m, d] = val.split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
    return val;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <i className="fas fa-spinner fa-spin fa-3x" style={{ color: '#3b82f6' }}></i>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Inter', sans-serif" }}>
      <header style={{ background: '#1e293b', padding: '1.2rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-user"></i>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{associado?.nome}</h1>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>CPF: {associado?.cpf}</span>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          style={{ border: '1px solid #334155', background: 'transparent', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#e2e8f0', transition: 'background 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.background = '#334155'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <i className="fas fa-sign-out-alt"></i> Sair
        </button>
      </header>
      
      <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 20px' }}>
        
        {/* Painel de Resumo e Ações Rápidas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '2rem' }}>
          
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '1.1rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>Seu Plano Atual</h2>
            <div style={{ fontSize: '1.8rem', color: '#0f172a', fontWeight: 800, marginBottom: '1rem' }}>
              {contrato?.plano || 'Plano Padrão'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700 }}>
                {String(contrato?.status || 'Ativo').toUpperCase()}
              </span>
            </div>
          </div>

            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#3b82f6', borderRadius: '12px', padding: '24px', color: 'white', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 600 }}>Área de Documentos</h3>
                <p style={{ margin: '0 0 20px', fontSize: '0.9rem', opacity: 0.9 }}>
                  Acesse sua carteirinha para garantir seus benefícios ou baixe seu contrato atualizado.
                </p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button onClick={handleBaixarCarteirinha} disabled={isGeneratingCard} style={{ flex: 1, minWidth: '160px', background: 'white', color: '#3b82f6', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: isGeneratingCard ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', opacity: isGeneratingCard ? 0.7 : 1 }}>
                    <i className={`fas ${isGeneratingCard ? 'fa-spinner fa-spin' : 'fa-id-badge'}`}></i> {isGeneratingCard ? 'Gerando...' : 'Baixar Carteirinha'}
                  </button>
                  <button onClick={handleGerarContrato} disabled={isGeneratingPdf} style={{ flex: 1, minWidth: '160px', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: isGeneratingPdf ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', opacity: isGeneratingPdf ? 0.7 : 1 }}>
                    <i className={`fas ${isGeneratingPdf ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i> {isGeneratingPdf ? 'Gerando...' : 'Baixar Contrato'}
                  </button>
                </div>
              </div>
            </div>

        </div>

        {/* Histórico de Faturas */}
        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#1e293b' }}>Suas Faturas</h2>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Descrição</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Vencimento</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Valor</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '16px 20px', fontWeight: 600, textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {cobrancas.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Nenhuma fatura encontrada.</td></tr>
                ) : (
                  cobrancas.map(c => {
                    const isPago = c.status === 'pago';
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '16px 20px', color: '#1e293b', fontWeight: 500 }}>{c.descricao || c.tipo || 'Mensalidade'}</td>
                        <td style={{ padding: '16px 20px', color: '#475569' }}>{formatDate(c.vencimento)}</td>
                        <td style={{ padding: '16px 20px', color: '#0f172a', fontWeight: 600 }}>{formatCurrency(c.valor)}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ 
                            background: isPago ? '#dcfce7' : '#fef3c7', 
                            color: isPago ? '#166534' : '#92400e', 
                            padding: '4px 10px', 
                            borderRadius: '12px', 
                            fontSize: '0.75rem', 
                            fontWeight: 700,
                            textTransform: 'uppercase'
                          }}>
                            {c.status || 'Pendente'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          {!isPago && c.link_pagamento ? (
                            <a href={c.link_pagamento} target="_blank" rel="noreferrer" style={{ background: '#10b981', color: 'white', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
                              Pagar Agora
                            </a>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                              {isPago ? 'Liquidado' : 'Boleto indisponível'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
