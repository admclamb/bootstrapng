import { Component } from '@angular/core';
import { Logo } from '../../branding/logo/logo';
import { RouterLink } from '@angular/router';

@Component({
  imports: [Logo, RouterLink],
  selector: 'app-navbar',
  templateUrl: './navbar.html',
})
export class Navbar {}
