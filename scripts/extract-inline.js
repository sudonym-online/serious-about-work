// MV3 blocks inline scripts in extension pages. This moves the SvelteKit boot script into build/boot.js.
// With --watch, it runs again each time a rebuild writes build/index.html.
import { existsSync, readFileSync, watchFile, writeFileSync } from 'node:fs';

const htmlPath = 'build/index.html';
const watch = process.argv.includes('--watch');

const extract = () => {
	const html = readFileSync(htmlPath, 'utf8');

	// A bare <script> tag has inline code. Tags with src= do not match.
	const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];

	if (inline.length === 0) {
		if (!watch) console.log('extract-inline: no inline script in index.html, nothing to do');
		return true;
	}

	if (inline.length > 1) {
		console.error(`extract-inline: expected 1 inline script, found ${inline.length}`);
		return false;
	}

	const [tag, code] = inline[0];

	writeFileSync('build/boot.js', code.trim() + '\n');

	// Keep it a classic script. The boot code reads document.currentScript, which is null in modules.
	writeFileSync(htmlPath, html.replace(tag, '<script src="/boot.js"></script>'));

	console.log('extract-inline: moved inline script to build/boot.js');
	return true;
};

if (watch) {
	// Poll, because the adapter deletes and writes the build folder again on each rebuild.
	watchFile(htmlPath, { interval: 300 }, () => {
		if (existsSync(htmlPath)) extract();
	});
	if (existsSync(htmlPath)) extract();
	console.log('extract-inline: watching build/index.html');
} else if (!extract()) {
	process.exit(1);
}
