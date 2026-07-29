const fs = require('fs');
const path = require('path');

const directoryToScan = __dirname;
const allowedExtensions = ['.html', '.js', '.css', '.json'];

// We only replace exact known mojibake sequences to avoid corrupting valid UTF-8
const mojibakeMap = {
    'ção': 'ção',
    'ções': 'ções',
    'ç': 'ç',
    'ã': 'ã',
    'á': 'á',
    'é': 'é',
    'í': 'í',
    'ó': 'ó',
    'ú': 'ú',
    'â': 'â',
    'ê': 'ê',
    'ô': 'ô',
    'õ': 'õ',
    'à': 'à',
    'Ç': 'Ç',
    'Ã': 'Ã',
    'Â': 'Â',
    'Ê': 'Ê',
    'Ô': 'Ô',
    'Õ': 'Õ',
    'Ã\u0081': 'Á',
    'Ã\u0089': 'É',
    'Ã\u008d': 'Í',
    'Ã\u0093': 'Ó',
    'Ã\u009a': 'Ú',
    'Ã\u0080': 'À'
};

function fixMojibake(content) {
    let result = content;
    // Replace combinations first
    for (const [bad, good] of Object.entries(mojibakeMap)) {
        if (result.includes(bad)) {
            result = result.split(bad).join(good);
        }
    }
    return result;
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'backend') {
            continue; // Skip large or irrelevant directories
        }
        
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (allowedExtensions.includes(path.extname(fullPath))) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('Ã')) {
                const fixed = fixMojibake(content);
                if (fixed !== content) {
                    fs.writeFileSync(fullPath, fixed, 'utf8');
                    console.log(`Fixed: ${fullPath}`);
                }
            }
        }
    }
}

processDirectory(directoryToScan);
console.log('Done!');
