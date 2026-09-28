import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			router: { type: 'hash' },
			appDir: 'app',
			files: { serviceWorker: 'src/background' },
			serviceWorker: { register: false },
			adapter: adapter()
		})
	]
});
