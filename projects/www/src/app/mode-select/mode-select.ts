import { Component, computed, inject } from '@angular/core';
import { Button, Menu, MenuItem, MenuTrigger } from 'bootstrapng';
import { ColorMode, ColorModeStore } from '../theme/color-mode';

@Component({
  imports: [Button, Menu, MenuItem, MenuTrigger],
  selector: 'app-mode-select',
  templateUrl: './mode-select.html',
})
export class ModeSelect {
  private readonly store = inject(ColorModeStore);

  protected readonly mode = this.store.mode;
  protected readonly icon = computed(() => {
    switch (this.mode()) {
      case 'light':
        return 'bi-sun';
      case 'dark':
        return 'bi-moon-stars';
      default:
        return 'bi-circle-half';
    }
  });

  protected setMode(mode: ColorMode) {
    this.store.set(mode);
  }
}
