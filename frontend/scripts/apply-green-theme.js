const fs = require('fs');
const path = require('path');

const repl = [
  ['#f0f9ff', '#f0fdf4'],
  ['#2196F3', '#15803d'],
  ['#2563eb', '#15803d'],
  ['#1976d2', '#166534'],
  ['#E3F2FD', '#dcfce7'],
  ['#e3f2fd', '#ecfdf5'],
  ['#FF9800', '#166534'],
  ['#7c3aed', '#047857'],
  ['#4CAF50', '#15803d'],
  ['#0284c7', '#059669'],
  ['#eff6ff', '#ecfdf5'],
  ['#dbeafe', '#bbf7d0'],
  ['#e0f2fe', '#d1fae5'],
  ['#bfdbfe', '#bbf7d0'],
  ['#0c4a6e', '#14532d'],
  ['#0369a1', '#166534'],
  ['#1d4ed8', '#15803d'],
  ['#F5F7FA', '#f0fdf4']
];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walk(p, out);
    else if (name.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const root = path.join(__dirname, '..', 'src');
const files = walk(root);
let count = 0;
for (const file of files) {
  let t = fs.readFileSync(file, 'utf8');
  const o = t;
  for (const [a, b] of repl) {
    if (t.includes(a)) t = t.split(a).join(b);
  }
  if (t !== o) {
    fs.writeFileSync(file, t);
    console.log('updated', path.relative(root, file));
    count++;
  }
}
console.log('files updated:', count);
