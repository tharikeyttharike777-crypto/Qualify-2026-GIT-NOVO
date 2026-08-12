import { jsPDF } from 'jspdf';

export async function gerarPdfCarteirinhaBuffer(contrato, family, forceDownload = true) {
  return new Promise((resolve, reject) => {
    try {
      // ConfiguraÃ§Ã£o CR80 (CartÃ£o de CrÃ©dito) em milÃ­metros
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [53.98, 85.6]
      });

      // Extrai dados seguros
      let meta = {};
      if (contrato?.metadata) {
        try { meta = typeof contrato.metadata === 'string' ? JSON.parse(contrato.metadata) : contrato.metadata; } catch(e){}
      }
      let famMeta = {};
      if (family?.metadata) {
        try { famMeta = typeof family.metadata === 'string' ? JSON.parse(family.metadata) : family.metadata; } catch(e){}
      }

      const rawTit = family?.titular || contrato?.titular;
      const titularNome = (rawTit && typeof rawTit === 'object') 
        ? (rawTit.nome || rawTit.name || meta.titular) 
        : (rawTit || meta.titular || contrato?.cliente || 'CLIENTE NÃƒO IDENTIFICADO');
      
      const titularCpf = (() => {
        if (rawTit && typeof rawTit === 'object' && (rawTit.cpf || rawTit.documento)) return rawTit.cpf || rawTit.documento;
        if (meta.cpf) return meta.cpf;
        if (famMeta.titular && typeof famMeta.titular === 'object' && famMeta.titular.cpf) return famMeta.titular.cpf;
        if (family?.cpf) return family.cpf;
        if (contrato?.cpf) return contrato.cpf;
        if (contrato?.cpf_titular) return contrato.cpf_titular;
        return '000.000.000-00';
      })();

      const planoNome = contrato?.plano || meta.plano || 'Plano PadrÃ£o';
      const numeroContrato = contrato?.numero || contrato?.id || '0000';
      const validade = 'VÃ¡lido enquanto o contrato estiver ativo';

      // Cores
      const corFundo = '#1e293b'; // Slate 800
      const corFundoEscuro = '#0f172a'; // Slate 900
      const corTexto = '#ffffff';
      const corDestaque = '#38bdf8'; // Light blue
      const corMutada = '#94a3b8'; // Slate 400

      // ==========================================
      // FRENTE DO CARTÃƒO (PÃ¡gina 1)
      // ==========================================
      
      // Background
      doc.setFillColor(corFundo);
      doc.rect(0, 0, 85.6, 53.98, 'F');

      // Faixa Superior (Destaque) - Aumentada para dar espaÃ§o
      doc.setFillColor(corFundoEscuro);
      doc.rect(0, 0, 85.6, 14, 'F');

      // CabeÃ§alho / Logo Textual
      doc.setTextColor(corDestaque);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('QUALIFY', 6, 9);
      
      doc.setTextColor(corMutada);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('CLUBE DE BENEFÃCIOS', 26, 9);

      // TÃ­tulo do CartÃ£o (movido um pouco para a direita e reduzido se necessÃ¡rio)
      doc.setTextColor(corTexto);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text('CARTÃƒO DO ASSOCIADO', 80, 9, { align: 'right' });

      // Separador visual
      doc.setDrawColor('#334155');
      doc.setLineWidth(0.2);
      doc.line(6, 17, 80, 17);

      // Dados do Associado
      doc.setTextColor(corMutada);
      doc.setFontSize(6);
      doc.text('NOME DO TITULAR', 6, 23);
      doc.setTextColor(corTexto);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      // Trunca o nome se for muito longo
      const nomeCurto = String(titularNome).length > 30 ? String(titularNome).substring(0, 30) + '...' : String(titularNome);
      doc.text(nomeCurto.toUpperCase(), 6, 28);

      // CPF e Contrato (Lado a lado, mais espaÃ§ados)
      doc.setTextColor(corMutada);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('CPF', 6, 35);
      doc.text('NÂº DO CONTRATO', 42, 35);

      doc.setTextColor(corTexto);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(String(titularCpf), 6, 39);
      doc.text(String(numeroContrato), 42, 39);

      // Plano
      doc.setTextColor(corMutada);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('PLANO CONTRATADO', 6, 46);
      
      doc.setTextColor(corDestaque);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(String(planoNome).toUpperCase(), 6, 50);

      // ==========================================
      // VERSO DO CARTÃƒO (PÃ¡gina 2)
      // ==========================================
      doc.addPage([53.98, 85.6], 'landscape');
      
      // Background do Verso
      doc.setFillColor(corFundoEscuro);
      doc.rect(0, 0, 85.6, 53.98, 'F');

      // Faixa MagnÃ©tica (Apenas visual)
      doc.setFillColor('#000000');
      doc.rect(0, 6, 85.6, 10, 'F');

      // Ãrea de assinatura (Tarja branca)
      doc.setFillColor('#ffffff');
      doc.rect(6, 20, 50, 7, 'F');
      
      doc.setTextColor(corMutada);
      doc.setFontSize(5);
      doc.setFont('helvetica', 'italic');
      doc.text('Assinatura do Titular', 31, 25, { align: 'center' });

      // Textos Legais
      doc.setTextColor(corTexto);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      
      const textoLegal = [
        'Este cartÃ£o Ã© de uso pessoal e intransferÃ­vel.',
        'Sua validade estÃ¡ condicionada ao pagamento em dia',
        'das mensalidades e vigÃªncia do contrato.',
        'Em caso de perda ou roubo, comunique imediatamente a central.',
        '',
        'Central de Atendimento: (00) 0000-0000',
        'contato@qualify.com.br'
      ];
      
      doc.text(textoLegal, 6, 32);

      // RodapÃ© / Validade no verso
      doc.setFillColor(corFundo);
      doc.rect(0, 48, 85.6, 6, 'F');
      
      doc.setTextColor(corDestaque);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'bold');
      doc.text(validade.toUpperCase(), 42.8, 52, { align: 'center' });


      if (forceDownload) {
        doc.save(`Carteirinha_${String(titularNome).replace(/\s+/g, '_')}.pdf`);
        resolve(true);
      } else {
        const buffer = doc.output('arraybuffer');
        resolve(buffer);
      }
    } catch (err) {
      reject(err);
    }
  });
}
import { supabase } from '../services/supabase';
import jsPDFAutoTable from 'jspdf-autotable';

export async function gerarPdfContratoBuffer(contract, family, supabaseInstance) {
    const sb = supabaseInstance || supabase;
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();
    
    const numeroContrato = contract?.numero || contract?.id || 'S/N';
    
    let cMeta = {};
    if (contract?.metadata) {
      try { cMeta = typeof contract.metadata === 'string' ? JSON.parse(contract.metadata) : contract.metadata; } catch(e){}
    }
    
    const nomePlano = contract?.plano || cMeta.plano || 'Plano QUALIFY';
    
    const titularNome = (family?.titular && typeof family.titular === 'object') 
      ? (family.titular.nome || family.titular.name)
      : (contract?.titular || contract?.cliente || cMeta.titular || 'CLIENTE NÃO IDENTIFICADO');
      
    const titularCpf = (family?.titular && typeof family.titular === 'object')
      ? (family.titular.cpf || family.titular.documento)
      : (contract?.cpf || cMeta.cpf || family?.cpf || '');
      
    let dependentes = [];
    if (family?.dependentes && Array.isArray(family.dependentes)) {
      dependentes = family.dependentes;
    } else if (cMeta.dependentes && Array.isArray(cMeta.dependentes)) {
      dependentes = cMeta.dependentes;
    }
    
    let clausulasTexto = [
      '1. O presente contrato tem vigência conforme período estipulado, podendo ser renovado automaticamente.',
      '2. O CONTRATANTE se compromete a manter os pagamentos em dia conforme modalidade escolhida.',
      '3. Os serviços serão prestados conforme especificações do plano contratado.',
      '4. O cancelamento deve ser solicitado com no mínimo 30 (trinta) dias de antecedência.',
      '5. Em caso de inadimplência superior a 60 dias, o contrato poderá ser suspenso.',
      '6. Ambas as partes concordam com as condições aqui estabelecidas, firmando o presente instrumento.'
    ].join('\n\n');

    let planoId = contract?.plano_id || cMeta.plano_id || cMeta.planoId;
    let planoName = contract?.plano || cMeta.plano;

    if (planoId || planoName) {
      let query = sb.from('planos').select('id, metadata, name');
      if (planoId) {
          query = query.eq('id', planoId);
      } else if (planoName) {
          query = query.ilike('name', `%${planoName}%`);
      }
      
      const { data: planosList } = await query;
      if (planosList && planosList.length > 0) {
        const planos = planosList[0];
        let pMeta = {};
        try { pMeta = typeof planos.metadata === 'string' ? JSON.parse(planos.metadata) : (planos.metadata || {}); } catch(e){}
        
        const source = pMeta.clausulas || pMeta.contrato || pMeta.descricao || pMeta.plan_clause || pMeta.planClause;
        if (source) clausulasTexto = source;
      }
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 20;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30);
    doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', pageWidth / 2, y, { align: 'center' });
    y += 10;
    
    doc.setFontSize(11);
    doc.text(`Contrato nº ${numeroContrato} — Plano ${nomePlano}`, pageWidth / 2, y, { align: 'center' });
    y += 15;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const companyName = window.localStorage.getItem('empresaSelecionadaNome') || 'VITAPLAN CLUBE DE BENEFÍCIOS LTDA';
    const valorStr = parseFloat(contract?.valor || cMeta.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    const textoObjeto = `O presente contrato tem por objeto a prestação de serviços de ${nomePlano}, celebrado entre ${companyName} ("CONTRATADA"), e ${titularNome} ("CONTRATANTE"), CPF/CNPJ ${titularCpf || 'não informado'}, sob o valor mensal de ${valorStr}, com cobrança via ${contract?.forma_pagamento || cMeta.forma_pagamento || 'Pix'}, conforme condições abaixo estabelecidas.`;
    
    const objLines = doc.splitTextToSize(textoObjeto, pageWidth - 40);
    doc.text(objLines, 20, y);
    y += objLines.length * 6 + 10;
    
    if (dependentes && dependentes.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Lista de Dependentes:', 20, y);
      y += 5;
      const depData = dependentes.map(d => [d.nome || '—', d.parentesco || '—', d.cpf || d.documento || '—']);
      autoTable(doc, {
        startY: y,
        head: [['Nome', 'Parentesco', 'CPF']],
        body: depData,
        theme: 'striped',
        styles: { fontSize: 9 },
        margin: { left: 20, right: 20 }
      });
      y = doc.lastAutoTable.finalY + 15;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('Cláusulas do Contrato:', 20, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    const clauseLines = doc.splitTextToSize(clausulasTexto, pageWidth - 40);
    
    for (let i = 0; i < clauseLines.length; i++) {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }
      doc.text(clauseLines[i], 20, y);
      y += 5;
    }
    
    y += 20;
    if (y > pageHeight - 40) {
       doc.addPage();
       y = 30;
    }
    
    doc.line(30, y, pageWidth / 2 - 10, y);
    doc.line(pageWidth / 2 + 10, y, pageWidth - 30, y);
    y += 5;
    doc.setFontSize(8);
    doc.text('Assinatura da CONTRATADA', 30, y);
    doc.text('Assinatura do CONTRATANTE', pageWidth / 2 + 10, y);
    
    doc.save(`Contrato_${numeroContrato}.pdf`);
}
