import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Biometrics } from './biometrics';

describe('Biometrics', () => {
  let component: Biometrics;
  let fixture: ComponentFixture<Biometrics>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Biometrics]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Biometrics);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
