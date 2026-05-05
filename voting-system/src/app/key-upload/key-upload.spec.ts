import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KeyUpload } from './key-upload';

describe('KeyUpload', () => {
  let component: KeyUpload;
  let fixture: ComponentFixture<KeyUpload>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeyUpload]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KeyUpload);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
