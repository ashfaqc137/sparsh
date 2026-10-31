<script lang="ts">
  import { ActivationGuard } from '../../src/ActivationGuard.js'
  import ActivationGuardProvider from '../../src/ActivationGuardProvider.svelte'
</script>

<ActivationGuardProvider mode="report">
  <ActivationGuard mode={{ age: 'report' }}>
    <button type="button">Click</button>
  </ActivationGuard>
</ActivationGuardProvider>
