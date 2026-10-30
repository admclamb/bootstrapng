import { afterRenderEffect, signal } from '@angular/core';
import {
  autoUpdate,
  arrow,
  computePosition,
  flip,
  offset,
  shift,
  type ComputePositionReturn,
  type Placement,
} from '@floating-ui/dom';

export function floatingPosition(
  reference: () => HTMLElement | null,
  floating: HTMLElement,
  placement: () => Placement,
  arrowElement: () => HTMLElement | null = () => null,
) {
  const position = signal<ComputePositionReturn | null>(null);

  afterRenderEffect((onCleanup) => {
    const anchor = reference();
    const preferredPlacement = placement();
    const tip = arrowElement();
    if (!anchor) return;
    position.set(null);

    let active = true;
    const stop = autoUpdate(
      anchor,
      floating,
      () => {
        void computePosition(anchor, floating, {
          strategy: 'fixed',
          placement: preferredPlacement,
          middleware: [
            offset(tip ? 8 : 2),
            flip(),
            shift({ padding: 8 }),
            ...(tip ? [arrow({ element: tip })] : []),
          ],
        }).then(
          (result) => {
            if (active) position.set(result);
          },
          () => {
            if (active) position.set(null);
          },
        );
      },
      { animationFrame: true },
    );

    onCleanup(() => {
      active = false;
      stop();
    });
  });

  return position.asReadonly();
}
