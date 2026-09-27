// Runs `npm run build` after each change in src/ or static/.
// `vite build --watch` loops with SvelteKit: each build writes .svelte-kit/generated, and the watcher sees it.
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';

let building = false;
let queued = false;
let timer;

const build = () => {
	if (building) {
		queued = true;
		return;
	}
	building = true;
	console.log('watch: build started');

	spawn('npm', ['run', 'build', '--silent'], { stdio: 'inherit' }).on('exit', (code) => {
		console.log(code === 0 ? 'watch: build done' : `watch: build failed (exit ${code})`);
		building = false;
		if (queued) {
			queued = false;
			build();
		}
	});
};

// An editor save can fire several events. Wait for them to stop before the build starts.
const schedule = () => {
	clearTimeout(timer);
	timer = setTimeout(build, 150);
};

for (const dir of ['src', 'static']) watch(dir, { recursive: true }, schedule);

build();
