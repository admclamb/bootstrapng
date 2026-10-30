import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavItems } from './nav-items';

describe('NavItems', () => {
  let component: NavItems;
  let fixture: ComponentFixture<NavItems>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavItems],
    }).compileComponents();

    fixture = TestBed.createComponent(NavItems);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
