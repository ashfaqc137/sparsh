---
"@sparshlabs/react": patch
"@sparshlabs/vue": patch
---

Re-export the `Phase` type from `@sparshlabs/core`, as the API reference already shows, so
`Decision['event']['phase']` can be typed without a direct `@sparshlabs/core` import.
