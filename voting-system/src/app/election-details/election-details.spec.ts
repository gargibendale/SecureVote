import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElectionDetails } from './election-details';

describe('ElectionDetails', () => {
  let component: ElectionDetails;
  let fixture: ComponentFixture<ElectionDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElectionDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ElectionDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
