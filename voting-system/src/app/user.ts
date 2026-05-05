export enum UserRole {
    ADMIN = 'admin',
    USER = 'user',
}

export interface UserSignupPayload {
    name: string;
    dob: string;
    email: string;
    aadhaar: string;
    password: string;
}

export interface UserPublic {
    user_id: string;
    name: string;
    email: string;
    dob: string;
    role: UserRole[];
    ekyc_verified: boolean;
    biometric_data: boolean;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
    user: UserPublic;
}

export interface SignupResponse {
    message: string;
    user_id: string;
}
