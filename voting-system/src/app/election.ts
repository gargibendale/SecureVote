export interface CandidateInput {
    name: string;
    party: string;
    description: string;
}

export interface CreateElectionRequest {
    title: string;
    description: string;
    start_date: string;   // ISO 8601 string — FastAPI parses datetime from this
    end_date: string;
    candidates: CandidateInput[];
}

export interface Candidate {
    candidate_id: number;
    name: string;
    party: string;
    description: string;
}

export interface Election {
    election_id: number;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    candidates: Candidate[];
    tx_hash: string;
    created_at: string;
    status: 'active' | 'ended' | 'pending';
}

export interface ElectionsResponse {
    elections: Election[];
}

export interface EndElectionResponse {
    tx_hash: string;
    election_id: number;
    message: string;
}

// The raw results map from backend: { "1": 42, "2": 18 }
export interface ResultsResponse {
    election_id: number;
    results: { [candidate_id: string]: number };
    total_votes: number;
}

// Enriched result per candidate (merged with candidate info)
export interface CandidateResult {
    candidate_id: number;
    name: string;
    party: string;
    votes: number;
    percentage: number; // calculated on frontend
}

export interface CastVoteResponse {
    status: string;        // "vote cast"
    tx_hash: string;       // blockchain transaction hash — shown to user as receipt
    election_id: number;
    candidate_id: number;
}

export interface FaceVerifyResponse {
    user_id: string;
    verified: boolean;
    score: number;
    threshold: number;
    timestamp: string;
}