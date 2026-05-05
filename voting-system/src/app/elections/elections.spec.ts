import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Elections } from './elections';

describe('Elections', () => {
  let component: Elections;
  let fixture: ComponentFixture<Elections>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Elections]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Elections);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
