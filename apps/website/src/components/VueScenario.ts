import type { Decision, Mode } from '@sparshlabs/core'
import { ActivationGuardProvider } from '@sparshlabs/vue'
import { type PropType, defineComponent, h, onBeforeUnmount, ref } from 'vue'
import { formatDecisionReason } from './formatDecisionReason'

type Scenario = 'inbox' | 'late' | 'meaning'

export const VueScenario = defineComponent({
  props: {
    scenario: { type: String as () => Scenario, required: true },
    mode: { type: String as () => Mode, required: true },
    cooldownMs: { type: Number, required: true },
    onDecision: { type: Function as PropType<(d: Decision) => void>, required: true },
    onReset: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    const phase = ref<'ready' | 'armed' | 'changed'>('ready')
    const opened = ref('')
    const decisions = ref<Decision[]>([])
    let timer = 0
    onBeforeUnmount(() => window.clearTimeout(timer))
    const report = (decision: Decision) => {
      decisions.value = [decision, ...decisions.value].slice(0, 3)
      props.onDecision(decision)
    }
    const start = () => {
      window.clearTimeout(timer)
      timer = 0
      opened.value = ''
      decisions.value = []
      props.onReset()
      phase.value = 'armed'
      timer = window.setTimeout(
        () => {
          phase.value = 'changed'
        },
        props.scenario === 'meaning' ? 450 : props.scenario === 'inbox' ? 1400 : 900,
      )
    }
    const reset = () => {
      window.clearTimeout(timer)
      timer = 0
      opened.value = ''
      decisions.value = []
      phase.value = 'ready'
      props.onReset()
    }
    const act = (name: string) => {
      opened.value = name
      phase.value = 'ready'
    }
    const button = (label: string, action: () => void, cls: string) =>
      h(
        'button',
        {
          class: cls,
          onClick: action,
          ...(cls.includes('pg-action') ? { 'data-testid': 'late-action' } : {}),
        },
        label,
      )
    return () =>
      h(
        ActivationGuardProvider,
        {
          mode: props.mode,
          cooldownMs: props.cooldownMs,
          policies: ['age', 'continuity', 'semantics'],
          onDecision: report,
        },
        {
          default: () =>
            h(
              'div',
              { class: 'pg-scene', 'data-testid': 'playground-scene', 'data-framework': 'vue' },
              [
                h('div', { class: 'pg-scene-top' }, [
                  h('span', { class: 'pg-live-dot' }),
                  ` LIVE ${props.mode.toUpperCase()} MODE`,
                ]),
                props.scenario === 'inbox'
                  ? h('div', { class: 'pg-inbox' }, [
                      h('div', { class: 'pg-mail-head' }, [
                        h('span', 'Inbox'),
                        h('span', '3 unread'),
                      ]),
                      phase.value === 'changed'
                        ? h(
                            'button',
                            {
                              'data-testid': 'leo-message',
                              class: 'pg-mail-row pg-new',
                              onClick: () => act('Leo’s message'),
                            },
                            [
                              h('b', { class: 'pg-avatar pg-avatar-blue' }, 'L'),
                              h('span', [
                                h('strong', ['Leo Park ', h('i', 'NEW')]),
                                h('small', 'Quick update: the launch is live!'),
                              ]),
                              h('time', 'now'),
                            ],
                          )
                        : null,
                      h(
                        'button',
                        {
                          'data-testid': 'maya-message',
                          class: ['pg-mail-row', phase.value === 'armed' && 'pg-target']
                            .filter(Boolean)
                            .join(' '),
                          onClick: () => act('Maya’s message'),
                        },
                        [
                          h('b', { class: 'pg-avatar' }, 'M'),
                          h('span', [
                            h('strong', 'Maya Chen'),
                            h('small', 'Can you take a look at this?'),
                          ]),
                          h('time', '9:41'),
                        ],
                      ),
                      h('div', { class: 'pg-mail-row pg-muted' }, [
                        h('b', { class: 'pg-avatar pg-avatar-gold' }, 'A'),
                        h('span', [
                          h('strong', 'Alex Morgan'),
                          h('small', 'Thanks for sending this over.'),
                        ]),
                        h('time', '9:18'),
                      ]),
                    ])
                  : null,
                props.scenario === 'late'
                  ? h('div', { class: 'pg-late' }, [
                      h('span', { class: 'pg-slot-label' }, 'YOUR TAP LANDS HERE'),
                      h(
                        'div',
                        { class: 'pg-slot' },
                        phase.value === 'changed'
                          ? button(
                              'Publish update ↗',
                              () => act('Publish update'),
                              'pg-action pg-target',
                            )
                          : h(
                              'span',
                              { class: 'pg-empty-slot' },
                              phase.value === 'armed'
                                ? 'Waiting for action…'
                                : 'A quiet space, for now',
                            ),
                      ),
                    ])
                  : null,
                props.scenario === 'meaning'
                  ? h('div', { class: 'pg-meaning' }, [
                      h('div', { class: 'pg-upload-icon' }, '↥'),
                      h('strong', 'Publish your update'),
                      h(
                        'span',
                        phase.value === 'changed'
                          ? 'Ready to go'
                          : phase.value === 'armed'
                            ? 'Checking your changes…'
                            : 'Your draft is saved',
                      ),
                      h(
                        'button',
                        {
                          'data-testid': 'meaning-action',
                          'aria-disabled': phase.value !== 'changed',
                          class: [
                            'pg-action',
                            phase.value === 'armed' && 'pg-target',
                            phase.value !== 'changed' && 'pg-disabled',
                          ]
                            .filter(Boolean)
                            .join(' '),
                          onClick: () => phase.value === 'changed' && act('Publish update'),
                        },
                        phase.value === 'changed'
                          ? 'Publish update'
                          : [
                              h('span', { class: 'pg-spinner', 'aria-hidden': 'true' }),
                              'Please wait…',
                            ],
                      ),
                    ])
                  : null,
                button(
                  phase.value === 'ready' ? '▶  Start scenario' : '↻  Reset scenario',
                  phase.value === 'ready' ? start : reset,
                  phase.value === 'ready' ? 'pg-start' : 'pg-reset',
                ),
                h(
                  'p',
                  { class: 'pg-instruction' },
                  phase.value === 'ready'
                    ? props.scenario === 'inbox'
                      ? 'Press start, press and hold Maya’s row, then release after Leo arrives.'
                      : props.scenario === 'late'
                        ? 'Press start, then tap the highlighted space as soon as the button appears.'
                        : 'Press start, then press and hold the button until it becomes available.'
                    : props.scenario === 'meaning'
                      ? 'Hold the button through the change to see sparsh catch the shift.'
                      : props.scenario === 'inbox'
                        ? 'Keep holding Maya’s row. Release after Leo takes her place.'
                        : 'Go now — the interface is changing under your tap.',
                ),
                opened.value
                  ? h(
                      'div',
                      { class: 'pg-result pg-result-ok', 'data-testid': 'scenario-result' },
                      `✓  ${opened.value} opened. That tap reached the intended action.`,
                    )
                  : null,
                decisions.value[0]
                  ? h(
                      'div',
                      {
                        'data-testid': 'decision-result',
                        class: [
                          'pg-result',
                          decisions.value[0].allowed
                            ? 'pg-result-ok'
                            : props.mode === 'report'
                              ? 'pg-result-report'
                              : 'pg-result-block',
                        ].join(' '),
                      },
                      [
                        decisions.value[0].allowed
                          ? '✓  Tap allowed — this target was stable.'
                          : props.mode === 'report'
                            ? `◉  sparsh spotted a ${decisions.value[0].policy ?? 'suspicious'} tap. Report mode lets it through.`
                            : `✋  sparsh caught the ${decisions.value[0].policy ?? 'suspicious'} tap before it landed.`,
                        decisions.value[0].reason
                          ? h('small', formatDecisionReason(decisions.value[0].reason))
                          : null,
                      ],
                    )
                  : null,
              ],
            ),
        },
      )
  },
})
