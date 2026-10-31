<script lang="ts">
  import { ActivationGuardProvider, type Decision } from '@sparshlabs/svelte'
  import {
    POLICIES,
    type Phase,
    type SceneProps,
    changeDelayMs,
    decisionMessage,
    decisionReason,
    decisionTone,
    instruction,
    openedMessage,
  } from '../shared'

  const { scenario, mode, cooldownMs }: SceneProps = $props()

  let phase: Phase = $state('ready')
  let opened = $state('')
  let latest: Decision | null = $state(null)
  let timer = 0
  $effect(() => () => window.clearTimeout(timer))

  function start() {
    window.clearTimeout(timer)
    opened = ''
    latest = null
    phase = 'armed'
    timer = window.setTimeout(() => {
      phase = 'changed'
    }, changeDelayMs(scenario))
  }
  function reset() {
    window.clearTimeout(timer)
    opened = ''
    latest = null
    phase = 'ready'
  }
  function act(name: string) {
    opened = name
    phase = 'ready'
  }
</script>

<ActivationGuardProvider
  {mode}
  {cooldownMs}
  policies={POLICIES}
  onDecision={(decision) => {
    latest = decision
  }}
>
  <div class="pg-scene" data-testid="playground-scene" data-framework="svelte">
    {#if scenario === 'inbox'}
      <div class="pg-inbox">
        {#if phase === 'changed'}
          <button
            type="button"
            data-testid="leo-message"
            class="pg-mail-row"
            onclick={() => act('Leo’s message')}
          >
            <span><strong>Leo Park</strong><small>Quick update: the launch is live!</small></span>
          </button>
        {/if}
        <button
          type="button"
          data-testid="maya-message"
          class="pg-mail-row"
          class:pg-target={phase === 'armed'}
          onclick={() => act('Maya’s message')}
        >
          <span><strong>Maya Chen</strong><small>Can you take a look at this?</small></span>
        </button>
      </div>
    {:else if scenario === 'late'}
      <div class="pg-slot">
        {#if phase === 'changed'}
          <button
            type="button"
            data-testid="late-action"
            class="pg-action pg-target"
            onclick={() => act('Publish update')}
          >
            Publish update
          </button>
        {:else}
          <span>{phase === 'armed' ? 'Waiting for action…' : 'A quiet space, for now'}</span>
        {/if}
      </div>
    {:else}
      <div class="pg-meaning">
        <button
          type="button"
          data-testid="meaning-action"
          aria-disabled={String(phase !== 'changed')}
          class="pg-action"
          class:pg-target={phase === 'armed'}
          class:pg-disabled={phase !== 'changed'}
          onclick={() => phase === 'changed' && act('Publish update')}
        >
          {phase === 'changed' ? 'Publish update' : 'Please wait…'}
        </button>
      </div>
    {/if}
    {#if phase === 'ready'}
      <button type="button" onclick={start}>▶ Start scenario</button>
    {:else}
      <button type="button" onclick={reset}>↻ Reset scenario</button>
    {/if}
    <p>{instruction(scenario, phase)}</p>
    {#if opened}
      <div data-testid="scenario-result" class="pg-result">{openedMessage(opened)}</div>
    {/if}
    {#if latest}
      <div data-testid="decision-result" class="pg-result pg-result-{decisionTone(latest, mode)}">
        {decisionMessage(latest, mode)}
        {#if latest.reason}<small>{decisionReason(latest)}</small>{/if}
      </div>
    {/if}
  </div>
</ActivationGuardProvider>
