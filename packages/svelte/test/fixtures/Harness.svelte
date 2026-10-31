<!-- A provider around one button. Every prop except `label`/`onButtonPointerUp` goes to the
     provider, so tests can drive it with a `$state` props object. -->
<script lang="ts">
  import ActivationGuardProvider from '../../src/ActivationGuardProvider.svelte'
  import type { ActivationGuardProviderProps } from '../../src/context.js'

  interface Props extends ActivationGuardProviderProps {
    label?: string
    onButtonPointerUp?: () => void
  }

  const { label = 'Click', onButtonPointerUp, ...providerProps }: Props = $props()
</script>

<ActivationGuardProvider {...providerProps}>
  <button type="button" id="btn" onpointerup={onButtonPointerUp}>{label}</button>
</ActivationGuardProvider>
