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
			// Chrome rejects extension files that start with "_", so rename the default "_app".
			appDir: 'app',
			adapter: adapter()
		})
	]
});
