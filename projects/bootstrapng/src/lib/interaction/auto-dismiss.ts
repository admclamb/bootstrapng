import { isPlatformBrowser } from '@angular/common';
import { effect, inject, PLATFORM_ID } from '@angular/core';

export function autoDismiss(
  delay: () => number,
  paused: () => boolean,
  dismiss: () => void,
  enabled: () => boolean = () => true,
) {
  const browser = isPlatformBrowser(inject(PLATFORM_ID));
  let previousDelay: number | undefined;
  let remaining = 0;

  effect((onCleanup) => {
    const duration = delay();
    const suspended = paused();
    const active = enabled();
    if (duration !== previousDelay) {
      previousDelay = duration;
      remaining = duration;
    }
    if (!active) remaining = duration;
    if (!browser || !active || !Number.isFinite(duration) || duration < 0 || suspended) return;

    const started = Date.now();
    const timer = setTimeout(dismiss, Math.max(0, remaining));
    onCleanup(() => {
      clearTimeout(timer);
      remaining = Math.max(0, remaining - (Date.now() - started));
    });
  });
}
