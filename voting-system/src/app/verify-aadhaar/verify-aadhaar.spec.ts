import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerifyAadhaar } from './verify-aadhaar';

describe('VerifyAadhaar', () => {
  let component: VerifyAadhaar;
  let fixture: ComponentFixture<VerifyAadhaar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyAadhaar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerifyAadhaar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
