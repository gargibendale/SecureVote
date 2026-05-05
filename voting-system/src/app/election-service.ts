import { Injectable, inject } from '@angular/core';
import { CastVoteResponse, CreateElectionRequest, FaceVerifyResponse } from './election';
import { Observable, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Election, ElectionsResponse, ResultsResponse } from './election';
import { EndElectionResponse } from './election';
import { HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ElectionService {
  http = inject(HttpClient);
  private base = 'http://127.0.0.1:8000';
  getElectionByIdUrl = "http://127.0.0.1:8000/elections"
  createElectionUrl = "http://127.0.0.1:8000/elections/";
  createElection(payload: CreateElectionRequest): Observable<any> {
    return this.http.post(this.createElectionUrl, payload);
  }

  electionsUrl = 'http://127.0.0.1:8000/elections/elections';
  getElections(): Observable<Election[]> {
    return this.http.get<ElectionsResponse>(this.electionsUrl).pipe(
      map((res) => res.elections)
    );
  }

  // In election-service.ts — add this method
  getElectionById(id: number): Observable<Election> {
    return this.http.get<Election>(`${this.getElectionByIdUrl}/elections/${id}`);
  }

  endElection(electionId: number): Observable<EndElectionResponse> {
    return this.http.post<EndElectionResponse>(
      `http://127.0.0.1:8000/elections/${electionId}/end`,
      {}
    );
  }

  // Takes election_id and the list of candidate_ids to query
  // Builds the query string as ?candidate_ids=1&candidate_ids=2 using HttpParams
  getResults(electionId: number, candidateIds: number[]): Observable<ResultsResponse> {
    let params = new HttpParams();
    candidateIds.forEach(id => {
      params = params.append('candidate_ids', id.toString());
      // .append() (not .set()) because we need duplicate keys for the list
    });
    return this.http.get<ResultsResponse>(
      `http://127.0.0.1:8000/elections/elections/${electionId}/results`,
      { params }
    );
  }

  // In your api service (e.g. vote-api.service.ts)
  castVote(payload: {
    pubkey_hash: string;
    election_id: number;
    candidate_id: number;
    nonce: string;
    signature: string;
  }): Observable<CastVoteResponse> {
    return this.http.post<CastVoteResponse>('http://127.0.0.1:8000/elections/vote', payload);
  }

  verifyFace(payload: {
    userId: string,
    front: File,
    sideLeft: File,
    sideRight: File
  }

  ): Observable<FaceVerifyResponse> {
    const form = new FormData();
    form.append('user_id', payload.userId);
    form.append('front_image', payload.front);
    form.append('side_left_image', payload.sideLeft);
    form.append('side_right_image', payload.sideRight);

    return this.http.post<FaceVerifyResponse>(`http://127.0.0.1:8000/securevote/verify_face`, form);
  }

}
