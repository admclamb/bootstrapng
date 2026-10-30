import { Component } from '@angular/core';
import { Logo } from '../../branding/logo/logo';
import { RouterLink } from '@angular/router';
import { ModeSelect } from '../../mode-select/mode-select';

@Component({
  imports: [Logo, RouterLink, ModeSelect],
  selector: 'app-navbar',
  templateUrl: './navbar.html',
})
export class Navbar {}
