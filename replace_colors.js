import fs from 'fs';
import path from 'path';

const SRC_DIR = path.join(process.cwd(), 'src');

const replacements = [
    { find: /#fe5a35/g, replace: '#f43f5e' }, // Rose 500
    { find: /#ea4926/g, replace: '#e11d48' }, // Rose 600
    
    // Orange -> Rose for all tailwind classes
    { find: /bg-orange-/g, replace: 'bg-rose-' },
    { find: /text-orange-/g, replace: 'text-rose-' },
    { find: /border-orange-/g, replace: 'border-rose-' },
    { find: /ring-orange-/g, replace: 'ring-rose-' },
    { find: /from-orange-/g, replace: 'from-rose-' },
    { find: /to-orange-/g, replace: 'to-rose-' },
    { find: /shadow-orange-/g, replace: 'shadow-rose-' },
    
    // Gray -> Stone (Warm/Slate gray)
    { find: /text-gray-900/g, replace: 'text-stone-800' }, // Darker, softer black
    { find: /text-gray-/g, replace: 'text-stone-' },
    { find: /bg-gray-/g, replace: 'bg-stone-' },
    { find: /border-gray-/g, replace: 'border-stone-' },
];

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let updated = false;
            
            for (const r of replacements) {
                if (r.find.test(content)) {
                    content = content.replace(r.find, r.replace);
                    updated = true;
                }
            }
            
            if (updated) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated:', fullPath);
            }
        }
    }
}

processDir(SRC_DIR);

// Also process index.css
const indexCssPath = path.join(process.cwd(), 'index.css');
if (fs.existsSync(indexCssPath)) {
    let content = fs.readFileSync(indexCssPath, 'utf8');
    let updated = false;
    for (const r of replacements) {
        if (r.find.test(content)) {
            content = content.replace(r.find, r.replace);
            updated = true;
        }
    }
    // Set root background to stone-50 (#fafaf9) instead of gray-50 (#f9fafb/ #fafafa)
    if (content.includes('background-color: #fafafa;')) {
        content = content.replace('background-color: #fafafa;', 'background-color: #fafaf9;');
        updated = true;
    }
    if (updated) {
        fs.writeFileSync(indexCssPath, content, 'utf8');
        console.log('Updated:', indexCssPath);
    }
}

console.log('Done!');
