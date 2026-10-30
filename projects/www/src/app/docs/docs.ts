import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Navbar } from '../layout/navbar/navbar';

@Component({
  imports: [Navbar, RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-docs',
  templateUrl: './docs.html',
})
export class Docs {
  protected readonly nav = [
    {
      heading: 'Getting started',
      icon: 'bi-book-half',
      items: ['Install', 'Approach', 'JavaScript', 'Accessibility'],
    },
    {
      heading: 'Layout',
      icon: 'bi-grid-fill',
      items: ['Breakpoints', 'Containers', 'Grid', 'Gutters', 'Utilities'],
    },
    {
      heading: 'Forms',
      icon: 'bi-ui-radios',
      items: ['Overview', 'Form control', 'Checkbox', 'Radio', 'Switch'],
    },
    {
      heading: 'Components',
      icon: 'bi-menu-button-wide-fill',
      items: ['Alert', 'Badge', 'Button', 'Card', 'Dialog', 'Drawer', 'Menu', 'Toast', 'Tooltip'],
      activeItem: 'Button',
    },
    {
      heading: 'Helpers',
      icon: 'bi-magic',
      items: ['Icon link', 'Position', 'Stacks'],
    },
    {
      heading: 'Utilities',
      icon: 'bi-braces-asterisk',
      items: ['Colors', 'Display', 'Flex', 'Spacing'],
    },
  ];
}
