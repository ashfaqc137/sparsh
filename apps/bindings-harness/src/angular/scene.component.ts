import { Component, type OnDestroy, input, signal } from '@angular/core'
import { ActivationGuardDirective, type Decision, type Mode } from '@sparshlabs/angular'
import {
  POLICIES,
  type Phase,
  type Scenario,
  changeDelayMs,
  decisionMessage,
  decisionReason,
  decisionTone,
  instruction,
  openedMessage,
} from '../shared'

// `sparshGuard` goes straight on the scene element: the Angular binding is a directive, so it
// needs no wrapper.
@Component({
  selector: 'harness-scene',
  imports: [ActivationGuardDirective],
  template: `
    <div
      class="pg-scene"
      data-testid="playground-scene"
      data-framework="angular"
      sparshGuard
      [mode]="mode()"
      [cooldownMs]="cooldownMs()"
      [policies]="policies"
      (decision)="latest.set($event)"
    >
      @switch (scenario()) {
        @case ('inbox') {
          <div class="pg-inbox">
            @if (phase() === 'changed') {
              <button
                type="button"
                data-testid="leo-message"
                class="pg-mail-row"
                (click)="act('Leo’s message')"
              >
                <span><strong>Leo Park</strong><small>Quick update: the launch is live!</small></span>
              </button>
            }
            <button
              type="button"
              data-testid="maya-message"
              class="pg-mail-row"
              [class.pg-target]="phase() === 'armed'"
              (click)="act('Maya’s message')"
            >
              <span><strong>Maya Chen</strong><small>Can you take a look at this?</small></span>
            </button>
          </div>
        }
        @case ('late') {
          <div class="pg-slot">
            @if (phase() === 'changed') {
              <button
                type="button"
                data-testid="late-action"
                class="pg-action pg-target"
                (click)="act('Publish update')"
              >
                Publish update
              </button>
            } @else {
              <span>{{ phase() === 'armed' ? 'Waiting for action…' : 'A quiet space, for now' }}</span>
            }
          </div>
        }
        @default {
          <div class="pg-meaning">
            <button
              type="button"
              data-testid="meaning-action"
              class="pg-action"
              [attr.aria-disabled]="phase() !== 'changed' ? 'true' : 'false'"
              [class.pg-target]="phase() === 'armed'"
              [class.pg-disabled]="phase() !== 'changed'"
              (click)="phase() === 'changed' && act('Publish update')"
            >
              {{ phase() === 'changed' ? 'Publish update' : 'Please wait…' }}
            </button>
          </div>
        }
      }
      @if (phase() === 'ready') {
        <button type="button" (click)="start()">▶ Start scenario</button>
      } @else {
        <button type="button" (click)="reset()">↻ Reset scenario</button>
      }
      <p>{{ instruction(scenario(), phase()) }}</p>
      @if (opened()) {
        <div data-testid="scenario-result" class="pg-result">{{ openedMessage(opened()) }}</div>
      }
      @if (latest(); as decision) {
        <div
          data-testid="decision-result"
          [class]="'pg-result pg-result-' + decisionTone(decision, mode())"
        >
          {{ decisionMessage(decision, mode()) }}
          @if (decision.reason) {
            <small>{{ decisionReason(decision) }}</small>
          }
        </div>
      }
    </div>
  `,
})
export class SceneComponent implements OnDestroy {
  readonly scenario = input.required<Scenario>()
  readonly mode = input.required<Mode>()
  readonly cooldownMs = input.required<number>()

  protected readonly policies = POLICIES
  protected readonly phase = signal<Phase>('ready')
  protected readonly opened = signal('')
  protected readonly latest = signal<Decision | null>(null)
  protected readonly instruction = instruction
  protected readonly openedMessage = openedMessage
  protected readonly decisionMessage = decisionMessage
  protected readonly decisionReason = decisionReason
  protected readonly decisionTone = decisionTone
  private timer = 0

  protected start(): void {
    window.clearTimeout(this.timer)
    this.opened.set('')
    this.latest.set(null)
    this.phase.set('armed')
    this.timer = window.setTimeout(() => this.phase.set('changed'), changeDelayMs(this.scenario()))
  }

  protected reset(): void {
    window.clearTimeout(this.timer)
    this.opened.set('')
    this.latest.set(null)
    this.phase.set('ready')
  }

  protected act(name: string): void {
    this.opened.set(name)
    this.phase.set('ready')
  }

  ngOnDestroy(): void {
    window.clearTimeout(this.timer)
  }
}
