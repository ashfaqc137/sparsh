<script lang="ts">
  import ActivationGuardProvider from '../../src/ActivationGuardProvider.svelte'
  import type { ActivationGuardProviderProps } from '../../src/context.js'
  import Probe from './Probe.svelte'

  interface Props extends ActivationGuardProviderProps {
    onChange?: (isGuarded: boolean) => void
  }

  const { onChange, ...providerProps }: Props = $props()
</script>

<ActivationGuardProvider {...providerProps}>
  <Probe {onChange} />
</ActivationGuardProvider>
