import angular from '@analogjs/vite-plugin-angular'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

// Five frameworks in one Vite app: each compiler plugin is scoped to its own folder so React's
// and Solid's JSX never meet, and the Angular compiler only sees `src/angular/`.
export default defineConfig({
  plugins: [
    react({ include: /\/src\/react\/.*\.tsx$/ }),
    solid({ include: /\/src\/solid\/.*\.tsx$/ }),
    svelte(),
    angular({
      jit: false,
      tsconfig: 'tsconfig.angular.json',
      transformFilter: (_code, id) => id.includes('/src/angular/'),
    }),
  ],
  server: { port: 4323, strictPort: true },
  preview: { port: 4323, strictPort: true },
})
