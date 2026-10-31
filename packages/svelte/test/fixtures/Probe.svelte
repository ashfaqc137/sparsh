<!-- Uses the hook on a button and reports every `isGuarded()` value it sees. -->
<script lang="ts">
  import { useActivationGuard } from '../../src/useActivationGuard.svelte.js'

  const { onChange }: { onChange?: (isGuarded: boolean) => void } = $props()
  const { ref, isGuarded } = useActivationGuard()

  $effect(() => {
    onChange?.(isGuarded())
  })
</script>

<button type="button" id="btn" {@attach ref} data-guarded={String(isGuarded())}>
  guarded:{isGuarded()}
</button>
