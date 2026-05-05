import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VoterCredentials } from './voter-credentials';

describe('VoterCredentials', () => {
  let component: VoterCredentials;
  let fixture: ComponentFixture<VoterCredentials>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VoterCredentials]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VoterCredentials);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
