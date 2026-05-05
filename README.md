# SecureVote
Link to full research paper: [SecureVote-IEEE-paper](https://drive.google.com/file/d/1Yzr7eWTyKe9wbXMbzPY64Fl0xNa-VYMz/view?usp=sharing)
## Overview
This project is a secure and transparent voting system built using blockchain and biometric authentication. It aims to address some of the core issues in traditional and electronic voting systems, such as voter fraud, impersonation, lack of transparency, and low participation. The system combines Ethereum smart contracts with off-chain storage and AI-based face verification to create a practical and scalable voting solution.
## Why this project?
Voting today often comes with friction and trust issues. People may avoid voting due to long queues or travel requirements. At the same time, systems are vulnerable to impersonation, double voting, and coercion. **This project was built to explore how modern technologies can improve this process in a realistic way**.
## What problems does it solve?
* **Increases voter participation:** Since voting can be done remotely, there is no need to commute or stand in long queues.
* **Prevents impersonation and fraud:** Each voter is verified using a combination of facial recognition (InsightFace) and cryptographic keys.
* **Ensures transparency and trust:** Votes are recorded on the Ethereum blockchain, making them immutable and publicly verifiable.
* **Supports coercion resistance:** The system allows controlled re-voting. Only the latest vote is counted, so voters can change their vote if they were pressured earlier.
## Tech Stack
**Frontend:** Angular + Typescript \
**Backend:** FastAPI \
**Blockchain:** Ethereum (Sepolia Testnet) \
**Smart contract:** Solidity \
**Database:** MongoDB \
**Face Recognition:** InsightFace \
**Web3 integration:** Web3.py \
**Cryptographic module:** HS256 (used in JWT-based auth), Ed25519 (used in public-private key system for voter credentials), Fernet (used in biometric encryption)
## 🚀How to run the project locally

### 1. Clone the Repository

```bash
git clone https://github.com/gargibendale/SecureVote.git
cd SecureVote
```

---

### 2. Backend Setup (FastAPI)

Install `uv` (if not already installed). Create a virtual environment and install dependencies:

```bash
uv venv
uv pip install -r requirements.txt
```

Run the backend server:

```bash
uv run fastapi dev
```

Backend will be available at:
[http://127.0.0.1:8000](http://127.0.0.1:8000)

---

### 3. Frontend Setup (Angular)

Navigate to the frontend directory ( /voting-system/ ):

```bash
cd frontend
npm install
ng serve
```

Frontend will be available at:
[http://localhost:4200](http://localhost:4200)

---

### 4. Blockchain Setup (Sepolia Testnet)

1. Create a wallet using MetaMask
2. Get Sepolia test ETH from a faucet
3. Deploy the smart contract using Remix IDE or Hardhat
4. Copy the deployed **contract address**
5. Use your **wallet private key (owner key)**

Add the following to your `.env` file:

```env
CONTRACT_ADDRESS=your_contract_address
OWNER_PRIVATE_KEY=your_wallet_private_key
```

---

### 5. Database Setup (MongoDB Atlas)

1. Create a MongoDB Atlas account
2. Create a cluster
3. Create a database and required collections
4. Obtain your connection string (URI)

Add this to your `.env` file:

```env
MONGO_URI=your_mongodb_connection_string
```

Aadhaar eKYC Simulation (Required Data)

This project uses a **simulated Aadhaar registry** to perform eKYC verification during voter registration. Since real Aadhaar integration is not used, you need to populate the database with mock Aadhaar records.

- Create a collection (e.g., `aadhaar_registry`) in your MongoDB database  
- Insert sample records containing basic identity details (such as name, Aadhaar number, etc.)  
- These records are used to validate users during the registration process  

Without this dataset, the eKYC verification step will fail and users will not be able to register.


---

### 6. Run the Application

* Start the backend server
* Start the frontend server
* Open the frontend in your browser at [http://localhost:4200](http://localhost:4200)

The application should now be running locally.

## How to get the voter credentials?

1. Perform eKyc verification (with simulated Aadhaar registry)
2. Submit biometrics (front, left, right angles)
3. Get voter credentials (This step registers user as a voter and provides private key which must be stored securely in PC. It'll be be used later to verify user while voting).

## Future improvements

- Notification alerts for upcoming elections
- Detailed election audits in admin console
- Android/iOS compatibility
- Liveness detection
- Layer-2 rollups (e.g. Polygon) for reduced gas fees and higher transaction throughput

## Demo Screenshots

**Home page**
<img width="1919" height="1126" alt="Image" src="https://github.com/user-attachments/assets/6c964c1c-1a18-44ec-8268-abce15c7075d" />

**Admin console**
<img width="1897" height="995" alt="Image" src="https://github.com/user-attachments/assets/d39c5e85-c1b5-4f70-9562-c6b155603efe" />

**Elections page**
<img width="1893" height="992" alt="Image" src="https://github.com/user-attachments/assets/e969a524-ea9f-4e2c-8f68-b4a43a3a32d0" />

**Election details**
<img width="1485" height="976" alt="Image" src="https://github.com/user-attachments/assets/06e3fc30-3ced-4225-9340-e11c46b18ae7" />

**Step 1: key upload**
<img width="1896" height="992" alt="Image" src="https://github.com/user-attachments/assets/2dce4cce-b33b-4458-924a-a951d96b7dfd" />

**Step 2: face verification**
<img width="947" height="498" alt="Image" src="https://github.com/user-attachments/assets/f69a59a1-6e57-4677-87c7-c90ed67d9e9f" />

**Step 3: voting**
<img width="1893" height="987" alt="Image" src="https://github.com/user-attachments/assets/0f991415-1dd2-4fdd-9953-15b9849d3e5b" />

**Results page**
<img width="1894" height="991" alt="Image" src="https://github.com/user-attachments/assets/fa63a2ac-27b5-4aa0-a8f1-00224566bd8f" />

**On-chain proof (visit [Blockscout](https://eth-sepolia.blockscout.com/address/0x97FB236eE65d37D8a4AAE8bC1148606E258F740b?tab=logs))**
<img width="1864" height="701" alt="Image" src="https://github.com/user-attachments/assets/9c2f11cd-a09f-4690-98e3-a3972d3225df" />
