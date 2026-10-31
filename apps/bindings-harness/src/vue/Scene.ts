import { ActivationGuardProvider, type Decision } from '@sparshlabs/vue'
import { type PropType, defineComponent, h, onBeforeUnmount, ref } from 'vue'
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

// Render functions rather than an SFC, so the harness needs no Vue compiler plugin.
export const Scene = defineComponent({
  props: {
    scenario: { type: String as PropType<SceneProps['scenario']>, required: true },
    mode: { type: String as PropType<SceneProps['mode'] & string>, required: true },
    cooldownMs: { type: Number, required: true },
  },
  setup(props) {
    const phase = ref<Phase>('ready')
    const opened = ref('')
    const latest = ref<Decision | null>(null)
    let timer = 0
    onBeforeUnmount(() => window.clearTimeout(timer))

    const start = () => {
      window.clearTimeout(timer)
      opened.value = ''
      latest.value = null
      phase.value = 'armed'
      timer = window.setTimeout(() => {
        phase.value = 'changed'
      }, changeDelayMs(props.scenario))
    }
    const reset = () => {
      window.clearTimeout(timer)
      opened.value = ''
      latest.value = null
      phase.value = 'ready'
    }
    const act = (name: string) => {
      opened.value = name
      phase.value = 'ready'
    }

    const row = (testid: string, name: string, from: string, text: string, target: boolean) =>
      h(
        'button',
        {
          type: 'button',
          'data-testid': testid,
          class: ['pg-mail-row', target && 'pg-target'],
          onClick: () => act(name),
        },
        [h('span', [h('strong', from), h('small', text)])],
      )

    const body = () => {
      if (props.scenario === 'inbox') {
        return h('div', { class: 'pg-inbox' }, [
          phase.value === 'changed'
            ? row(
                'leo-message',
                'Leo’s message',
                'Leo Park',
                'Quick update: the launch is live!',
                false,
              )
            : null,
          row(
            'maya-message',
            'Maya’s message',
            'Maya Chen',
            'Can you take a look at this?',
            phase.value === 'armed',
          ),
        ])
      }
      if (props.scenario === 'late') {
        return h(
          'div',
          { class: 'pg-slot' },
          phase.value === 'changed'
            ? h(
                'button',
                {
                  type: 'button',
                  'data-testid': 'late-action',
                  class: 'pg-action pg-target',
                  onClick: () => act('Publish update'),
                },
                'Publish update',
              )
            : h('span', phase.value === 'armed' ? 'Waiting for action…' : 'A quiet space, for now'),
        )
      }
      return h('div', { class: 'pg-meaning' }, [
        h(
          'button',
          {
            type: 'button',
            'data-testid': 'meaning-action',
            'aria-disabled': String(phase.value !== 'changed'),
            class: [
              'pg-action',
              phase.value === 'armed' && 'pg-target',
              phase.value !== 'changed' && 'pg-disabled',
            ],
            onClick: () => phase.value === 'changed' && act('Publish update'),
          },
          phase.value === 'changed' ? 'Publish update' : 'Please wait…',
        ),
      ])
    }

    return () =>
      h(
        ActivationGuardProvider,
        {
          mode: props.mode,
          cooldownMs: props.cooldownMs,
          policies: POLICIES,
          onDecision: (decision: Decision) => {
            latest.value = decision
          },
        },
        {
          default: () =>
            h(
              'div',
              { class: 'pg-scene', 'data-testid': 'playground-scene', 'data-framework': 'vue' },
              [
                body(),
                phase.value === 'ready'
                  ? h('button', { type: 'button', onClick: start }, '▶ Start scenario')
                  : h('button', { type: 'button', onClick: reset }, '↻ Reset scenario'),
                h('p', instruction(props.scenario, phase.value)),
                opened.value
                  ? h(
                      'div',
                      { 'data-testid': 'scenario-result', class: 'pg-result' },
                      openedMessage(opened.value),
                    )
                  : null,
                latest.value
                  ? h(
                      'div',
                      {
                        'data-testid': 'decision-result',
                        class: `pg-result pg-result-${decisionTone(latest.value, props.mode)}`,
                      },
                      [
                        decisionMessage(latest.value, props.mode),
                        latest.value.reason ? h('small', decisionReason(latest.value)) : null,
                      ],
                    )
                  : null,
              ],
            ),
        },
      )
  },
})
