const fs = require('fs');

const pagesDir = 'pages';
let files = [];
try {
    files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html')).map(f => `pages/${f}`);
} catch(e) {}
files.push('index.html');

let hidePerfilCount = 0;
let renameIntCount = 0;

files.forEach(file => {
    if(!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    let lines = content.split('\n');
    let modified = false;
    
    for(let i=0; i<lines.length; i++) {
        // Safe hide perfil
        if(lines[i].includes('href="perfil.html"')) {
            if(!lines[i].includes('display: none')) {
                lines[i] = lines[i].replace('<a ', '<a style="display: none !important;" ');
                modified = true;
                hidePerfilCount++;
            }
        }
        
        // Rename Integrações Bancárias -> Integrações
        if(lines[i].includes('Integrações Bancárias') || lines[i].includes('IntegraÃ§Ãµes BancÃ¡rias')) {
            lines[i] = lines[i].replace(/Integrações Bancárias/g, 'Integrações');
            lines[i] = lines[i].replace(/IntegraÃ§Ãµes BancÃ¡rias/g, 'Integrações');
            modified = true;
            renameIntCount++;
        }
    }
    
    if(modified) {
        fs.writeFileSync(file, lines.join('\n'), 'utf8');
    }
});

console.log(`Hid perfil in ${hidePerfilCount} places.`);
console.log(`Renamed Integrações Bancárias in ${renameIntCount} places.`);
