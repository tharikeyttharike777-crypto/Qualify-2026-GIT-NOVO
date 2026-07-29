const fs = require('fs');
const path = require('path');

const pagesDir = 'pages';
let files = [];
try {
    files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html')).map(f => `pages/${f}`);
} catch (e) { }

files.push('index.html');

let modifiedCount = 0;
files.forEach(file => {
    if (!fs.existsSync(file)) return;
    
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    content = content.replace(/<a[^>]*href="perfil\.html"[^>]*>[\s\S]*?<\/a>/gi, (match) => {
        if(match.includes('display: none') || match.includes('display:none')) return match;
        return match.replace('<a ', '<a style="display: none !important;" ');
    });
    
    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        modifiedCount++;
    }
});
console.log('Perfil link hidden in ' + modifiedCount + ' files');
