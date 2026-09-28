import { readFileSync, writeFileSync } from 'node:fs';

const htmlPath = 'build/index.html';
const html = readFileSync(htmlPath, 'utf8');

const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];

if (inline.length === 0) {
	console.log('extract-inline: no inline script in index.html, nothing to do');
	process.exit(0);
}

if (inline.length > 1) {
	console.error(`extract-inline: expected 1 inline script, found ${inline.length}`);
	process.exit(1);
}

const [tag, code] = inline[0];

writeFileSync('build/boot.js', code.trim() + '\n');

writeFileSync(htmlPath, html.replace(tag, '<script src="/boot.js"></script>'));

console.log('extract-inline: moved inline script to build/boot.js');
