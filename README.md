# Ford Cobalt Blockchain — Ethical Supply Chain Traceability

A production-ready blockchain system for tracing cobalt from DRC mines to Ford EV batteries, ensuring ESG compliance at every custody handoff.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  Dashboard │ Batches │ Mines │ Shipments │ ESG Report │ Admin│
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API + JWT
┌──────────────────────────▼──────────────────────────────────┐
│                    Backend (FastAPI)                          │
│  Auth │ Mines │ Batches │ Shipments │ Compliance │ ESG      │
└────────┬───────────────────────────────────┬────────────────┘
         │ Web3.py                           │ Motor / SQLAlchemy
┌────────▼───────────┐            ┌──────────▼──────────────┐
│  Ethereum / Polygon │            │  MongoDB │ PostgreSQL   │
│  ─────────────────  │            │  Batches │ Users/Auth   │
│  MineRegistry.sol   │            │  Ships   │ API Keys     │
│  BatchTracking.sol  │            │  Audits  │              │
│  ComplianceVerifier │            └─────────────────────────┘
└────────────────────┘
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Python 3.11+

### 1. Clone & Configure
```bash
git clone https://github.com/your-org/ford-cobalt-blockchain
cd ford-cobalt-blockchain
cp .env.example .env
# Edit .env with your settings
```

### 2. Run Everything (Docker)
```bash
docker-compose up
```

Services start at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/api/docs
- **Hardhat Node**: http://localhost:8545
- **IPFS**: http://localhost:5001

### 3. Local Development

#### Smart Contracts
```bash
cd contracts
npm install
npx hardhat node                       # Start local blockchain
npx hardhat test                       # Run all tests
npx hardhat coverage                   # Coverage report
npx hardhat run scripts/deploy.js --network localhost
```

#### Backend
```bash
cd backend
pip install -r requirements.txt
cp ../.env.example .env
uvicorn main:app --reload
```

#### Frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev                            # http://localhost:3000
```

## Smart Contracts

| Contract | Purpose |
|----------|---------|
| `MineRegistry.sol` | Register & manage mining sites. ACTIVE/SUSPENDED/REVOKED states. |
| `BatchTracking.sol` | Create cobalt batches, log custody chain, track provenance. |
| `ComplianceVerifier.sol` | ESG compliance checks + ERC-721 certificate minting. |

### Key Design Decisions
- **Immutable custody chain** — on-chain append-only records
- **Role-based access** — OpenZeppelin AccessControl (AUDITOR, OPERATOR, TRANSPORTER, VERIFIER)
- **ESG NFTs** — ERC-721 certificates with expiry for compliant batches
- **Pausable** — emergency stop on all contracts

## API Reference

Full Swagger docs at `/api/docs`. Key endpoints:

```
POST   /api/v1/auth/login              JWT login
POST   /api/v1/mines/register          Register mining site
PUT    /api/v1/mines/{id}/compliance   Update mine status
POST   /api/v1/batches/create          Create cobalt batch
POST   /api/v1/batches/{id}/custody    Add custody handoff
GET    /api/v1/batches/{id}/provenance Full provenance trail
GET    /api/v1/batches/search          Search with filters
POST   /api/v1/shipments/create        Create shipment
POST   /api/v1/shipments/{id}/iot      Log IoT sensor data
GET    /api/v1/compliance/batches      All compliance records
POST   /api/v1/compliance/verify       Run compliance checks
GET    /api/v1/esg/report              ESG report + PDF export
```

## User Roles

| Role | Mine Register | Create Batch | Verify Compliance | Admin |
|------|:---:|:---:|:---:|:---:|
| admin | ✓ | ✓ | ✓ | ✓ |
| auditor | ✓ | ✓ | ✓ | — |
| operator | — | ✓ | — | — |
| viewer | — | — | — | — |

## Data Flow

```
1. Auditor registers mine (on-chain + MongoDB)
2. Auditor activates mine (PENDING → ACTIVE)
3. Operator creates cobalt batch (on-chain, references mineId)
4. Each actor adds custody record (miner → transporter → processor → refinery)
5. IoT devices log sensor data to shipment tracking
6. Auditor runs compliance checks (labor, environmental, conflict-free)
7. If PASSED → mint ERC-721 ESG Certificate NFT to Ford's wallet
8. ESG report aggregates all metrics for Ford's sustainability reporting
```

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full guide including:
- Polygon mainnet deployment
- Environment hardening
- SSL/TLS setup
- Monitoring with Grafana

## Testing

```bash
# Contracts (100% coverage)
cd contracts && npx hardhat coverage

# Backend
cd backend && pytest --cov=. -v

# Frontend lint
cd frontend && npm run lint
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Solidity 0.8.19, Hardhat, OpenZeppelin |
| Backend | Python 3.11, FastAPI, Web3.py |
| Frontend | React 18, TypeScript, Vite, Ethers.js |
| Database | MongoDB (batches/shipments) + PostgreSQL (auth) |
| Storage | IPFS (documents/photos) |
| DevOps | Docker, docker-compose, GitHub Actions |

## License

MIT — Ford Motor Company Internal Use
