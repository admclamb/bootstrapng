import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Bootstrapng } from './bootstrapng';

describe('Bootstrapng', () => {
  let component: Bootstrapng;
  let fixture: ComponentFixture<Bootstrapng>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Bootstrapng],
    }).compileComponents();

    fixture = TestBed.createComponent(Bootstrapng);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
