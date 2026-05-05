import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageElections } from './manage-elections';

describe('ManageElections', () => {
  let component: ManageElections;
  let fixture: ComponentFixture<ManageElections>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageElections]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageElections);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
