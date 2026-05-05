import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ElectionService } from '../election-service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-create-election',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './create-election.html',
  styleUrl: './create-election.scss',
})
export class CreateElection implements OnInit {
  form!: FormGroup;
  loading = false;
  error: string | null = null;
  success = false;

  constructor(
    private fb: FormBuilder,         // FormBuilder: a factory that produces form controls
    private electionService: ElectionService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(1)]],
      description: ['', Validators.required],
      start_date: ['', Validators.required],
      end_date: ['', Validators.required],
      candidates: this.fb.array([this.newCandidate()])  // start with one candidate row
    });
  }

  // Getter shortcut so the template can reference `candidates` directly
  get candidates(): FormArray {
    return this.form.get('candidates') as FormArray;
  }

  // Factory: creates a fresh candidate FormGroup
  newCandidate(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1)]],
      party: ['', [Validators.required, Validators.minLength(1)]],
      description: ['', Validators.required]
    });
  }

  addCandidate(): void {
    this.candidates.push(this.newCandidate());
  }

  removeCandidate(index: number): void {
    if (this.candidates.length > 1) {  // backend requires min 1 candidate
      this.candidates.removeAt(index);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();  // reveal validation errors on untouched fields
      return;
    }

    this.loading = true;
    this.error = null;

    const raw = this.form.value;

    // Convert local datetime-local input values to ISO 8601 strings
    // FastAPI's datetime field expects: "2025-06-01T10:00:00"
    const payload = {
      ...raw,
      start_date: new Date(raw.start_date).toISOString(),
      end_date: new Date(raw.end_date).toISOString()
    };

    this.electionService.createElection(payload).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        setTimeout(() => this.router.navigate(['/elections']), 1500);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.detail || 'Failed to create election. Please try again.';
      }
    });
  }
}
