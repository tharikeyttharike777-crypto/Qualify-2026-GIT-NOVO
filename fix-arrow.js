const fs = require('fs');
let c = fs.readFileSync('pages/trocar-empresa.html', 'utf8');
c = c.replace(/<button id="voltarBtn" class="btn-voltar">.*<\/button>/, '<button id="voltarBtn" class="btn-voltar"><i class="fas fa-arrow-left"></i> Voltar</button>');
fs.writeFileSync('pages/trocar-empresa.html', c);
console.log('Fixed');
