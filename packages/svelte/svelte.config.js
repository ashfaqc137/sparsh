import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

// Read by `svelte-package` (and `svelte-check`): strips `lang="ts"` from the shipped `.svelte`
// files so consumers compile plain JS components.
export default {
  preprocess: vitePreprocess({ script: true }),
}
