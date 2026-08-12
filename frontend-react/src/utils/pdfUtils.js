import { jsPDF } from 'jspdf';

export async function gerarPdfCarteirinhaBuffer(contrato, family, forceDownload = true) {
  return new Promise((resolve, reject) => {
    try {
      // Configuração CR80 (Cartão de Crédito) em milímetros
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
        : (rawTit || meta.titular || contrato?.cliente || 'CLIENTE NÃO IDENTIFICADO');
      
      const titularCpf = (() => {
        if (rawTit && typeof rawTit === 'object' && (rawTit.cpf || rawTit.documento)) return rawTit.cpf || rawTit.documento;
        if (meta.cpf) return meta.cpf;
        if (famMeta.titular && typeof famMeta.titular === 'object' && famMeta.titular.cpf) return famMeta.titular.cpf;
        if (family?.cpf) return family.cpf;
        if (contrato?.cpf) return contrato.cpf;
        if (contrato?.cpf_titular) return contrato.cpf_titular;
        return '000.000.000-00';
      })();

      const planoNome = contrato?.plano || meta.plano || 'Plano Padrão';
      const numeroContrato = contrato?.numero || contrato?.id || '0000';
      const validade = 'Válido enquanto o contrato estiver ativo';

      // Cores
      const corFundo = '#1e293b'; // Slate 800
      const corFundoEscuro = '#0f172a'; // Slate 900
      const corTexto = '#ffffff';
      const corDestaque = '#38bdf8'; // Light blue
      const corMutada = '#94a3b8'; // Slate 400

      // ==========================================
      // FRENTE DO CARTÃO (Página 1)
      // ==========================================
      
      // Background
      doc.setFillColor(corFundo);
      doc.rect(0, 0, 85.6, 53.98, 'F');

      // Faixa Superior (Destaque) - Aumentada para dar espaço
      doc.setFillColor(corFundoEscuro);
      doc.rect(0, 0, 85.6, 14, 'F');

      // Cabeçalho / Logo Textual
      doc.setTextColor(corDestaque);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('QUALIFY', 6, 9);
      
      doc.setTextColor(corMutada);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('CLUBE DE BENEFÍCIOS', 26, 9);

      // Título do Cartão (movido um pouco para a direita e reduzido se necessário)
      doc.setTextColor(corTexto);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text('CARTÃO DO ASSOCIADO', 80, 9, { align: 'right' });

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

      // CPF e Contrato (Lado a lado, mais espaçados)
      doc.setTextColor(corMutada);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('CPF', 6, 35);
      doc.text('Nº DO CONTRATO', 42, 35);

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
      // VERSO DO CARTÃO (Página 2)
      // ==========================================
      doc.addPage([53.98, 85.6], 'landscape');
      
      // Background do Verso
      doc.setFillColor(corFundoEscuro);
      doc.rect(0, 0, 85.6, 53.98, 'F');

      // Faixa Magnética (Apenas visual)
      doc.setFillColor('#000000');
      doc.rect(0, 6, 85.6, 10, 'F');

      // Área de assinatura (Tarja branca)
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
        'Este cartão é de uso pessoal e intransferível.',
        'Sua validade está condicionada ao pagamento em dia',
        'das mensalidades e vigência do contrato.',
        'Em caso de perda ou roubo, comunique imediatamente a central.',
        '',
        'Central de Atendimento: (00) 0000-0000',
        'contato@qualify.com.br'
      ];
      
      doc.text(textoLegal, 6, 32);

      // Rodapé / Validade no verso
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
