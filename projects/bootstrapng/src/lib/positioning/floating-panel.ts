import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  ElementRef,
  inject,
  input,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import type { Placement } from '@floating-ui/dom';
import { floatingPosition } from './floating-position';

export type FloatingContent = string | TemplateRef<unknown>;

@Component({
  selector: 'bng-floating-panel',
  imports: [NgTemplateOutlet],
  template: `
    <div
      #arrow
      [class]="kind() + '-arrow'"
      [style.position]="'absolute'"
      [style.left.px]="position()?.middlewareData?.arrow?.x"
      [style.top.px]="position()?.middlewareData?.arrow?.y"
    ></div>
    @if (kind() === 'popover' && title()) {
      <h2 class="popover-header">{{ title() }}</h2>
    }
    <div [class]="kind() === 'tooltip' ? 'tooltip-inner' : 'popover-body'">
      @if (template(); as template) {
        <ng-container [ngTemplateOutlet]="template" />
      } @else {
        {{ content() }}
      }
    </div>
  `,
  host: {
    '[class]': 'kind() + " bs-" + kind() + "-auto"',
    '[class.show]': 'visible()',
    '[attr.id]': 'id()',
    '[attr.role]': 'kind() === "tooltip" ? "tooltip" : "dialog"',
    '[attr.aria-label]': 'kind() === "popover" ? title() || "More information" : null',
    '[attr.inert]': 'visible() ? null : ""',
    '[style.position]': '"fixed"',
    '[style.left.px]': 'position()?.x',
    '[style.top.px]': 'position()?.y',
    '[style.visibility]': 'position() ? null : "hidden"',
    '[attr.data-bs-placement]': 'position()?.placement',
  },
})
export class FloatingPanel {
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly anchor = input.required<HTMLElement>();
  readonly kind = input.required<'tooltip' | 'popover'>();
  readonly id = input.required<string>();
  readonly title = input('');
  readonly content = input.required<FloatingContent>();
  readonly placement = input<Placement>('top');
  readonly visible = signal(true);
  private readonly arrow = viewChild<ElementRef<HTMLElement>>('arrow');
  protected readonly position = floatingPosition(
    () => (this.visible() ? this.anchor() : null),
    this.element,
    this.placement,
    () => this.arrow()?.nativeElement ?? null,
  );

  protected template() {
    const content = this.content();
    return content instanceof TemplateRef ? content : null;
  }
}
