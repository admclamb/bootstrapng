import { Component } from '@angular/core';
import { Button, ButtonTheme, buttonVariants } from 'bootstrapng';

@Component({
  imports: [Button],
  selector: 'app-button-doc',
  templateUrl: './button-doc.html',
})
export class ButtonDoc {
  protected readonly themes = Object.keys(buttonVariants.theme) as ButtonTheme[];
  protected readonly styles: Array<Exclude<keyof typeof buttonVariants.variants, 'text'>> = [
    'solid',
    'outline',
    'subtle',
  ];

  protected readonly toc = [
    { id: 'base-class', label: 'Base class' },
    { id: 'variants', label: 'Variants' },
    { id: 'text-buttons', label: 'Text buttons' },
    { id: 'sizes', label: 'Sizes' },
    { id: 'icon-buttons', label: 'Icon buttons' },
    { id: 'disabled-state', label: 'Disabled state' },
    { id: 'block-buttons', label: 'Block buttons' },
    { id: 'toggle-buttons', label: 'Toggle buttons' },
  ];
}
