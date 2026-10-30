import { Component } from '@angular/core';
import { Navbar } from './navbar/navbar';
import { NavItems } from '../nav-items/nav-items';

@Component({
  imports: [Navbar, NavItems],
  selector: 'app-layout',
  templateUrl: './layout.html',
})
export class Layout {}
