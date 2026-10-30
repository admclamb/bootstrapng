import { effect, Injectable, signal } from '@angular/core';

export type ColorMode = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'bng-color-mode';

function readStoredMode(): ColorMode {
  if (typeof localStorage === 'undefined') return 'auto';
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'auto' ? stored : 'auto';
}

@Injectable({ providedIn: 'root' })
export class ColorModeStore {
  readonly mode = signal<ColorMode>(readStoredMode());

  constructor() {
    effect(() => {
      const mode = this.mode();
      if (typeof document === 'undefined') return;

      if (mode === 'auto') document.documentElement.removeAttribute('data-bs-theme');
      else document.documentElement.setAttribute('data-bs-theme', mode);

      localStorage.setItem(STORAGE_KEY, mode);
    });
  }

  set(mode: ColorMode) {
    this.mode.set(mode);
  }
}
