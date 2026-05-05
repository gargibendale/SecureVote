import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CastVotePage } from './cast-vote-page';

describe('CastVotePage', () => {
  let component: CastVotePage;
  let fixture: ComponentFixture<CastVotePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CastVotePage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CastVotePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
