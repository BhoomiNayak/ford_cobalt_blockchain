# Deployment Guide — Ford Cobalt Blockchain

## Production Stack

- **Blockchain**: Polygon Mainnet (low gas, Ethereum-compatible)
- **Backend**: AWS ECS / GCP Cloud Run
- **Database**: MongoDB Atlas + AWS RDS PostgreSQL
- **IPFS**: Pinata or Infura IPFS
- **Frontend**: Vercel / Cloudflare Pages

---

## 1. Deploy Smart Contracts to Polygon

### Prerequisites
- MATIC in deployer wallet for gas
- Polygonscan API key

```bash
cd contracts

# Install dependencies
npm install

# Set env vars
export PRIVATE_KEY=<deployer-private-key>
export POLYGON_RPC_URL=https://polygon-rpc.com
export POLYGONSCAN_API_KEY=<your-key>

# Deploy to Polygon mainnet
npx hardhat run scripts/deploy.js --network polygon

# Verify contracts on Polygonscan
npx hardhat verify --network polygon <MINE_REGISTRY_ADDRESS>
npx hardhat verify --network polygon <BATCH_TRACKING_ADDRESS> <MINE_REGISTRY_ADDRESS>
npx hardhat verify --network polygon <COMPLIANCE_VERIFIER_ADDRESS> <BATCH_TRACKING_ADDRESS> <MINE_REGISTRY_ADDRESS>
```

The deployer script saves addresses to `deployed-addresses.json` and exports ABIs to `../backend/abis/`.

---

## 2. Backend Production Setup

### Environment Variables (set in your cloud provider)

```bash
APP_ENV=production
SECRET_KEY=<256-bit-random-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=480

# MongoDB Atlas
MONGODB_URL=mongodb+srv://<user>:<pass>@cluster.mongodb.net/ford_cobalt?retryWrites=true
MONGODB_DB=ford_cobalt

# AWS RDS PostgreSQL
POSTGRES_URL=postgresql://<user>:<pass>@<rds-endpoint>:5432/ford_cobalt_auth

# Polygon
WEB3_PROVIDER_URL=https://polygon-mainnet.infura.io/v3/<project-id>
MINE_REGISTRY_ADDRESS=<from deployed-addresses.json>
BATCH_TRACKING_ADDRESS=<from deployed-addresses.json>
COMPLIANCE_VERIFIER_ADDRESS=<from deployed-addresses.json>
DEPLOYER_PRIVATE_KEY=<signer key — use AWS Secrets Manager>

# IPFS (Pinata)
IPFS_API_URL=https://api.pinata.cloud
IPFS_GATEWAY_URL=https://gateway.pinata.cloud/ipfs

# CORS
ALLOWED_ORIGINS=https://cobalt.ford.com
```

### Docker Build & Push

```bash
# Build
docker build -t ford-cobalt-backend:latest ./backend

# Push to ECR (example)
aws ecr get-login-password | docker login --username AWS --password-stdin <ecr-url>
docker tag ford-cobalt-backend:latest <ecr-url>/ford-cobalt-backend:latest
docker push <ecr-url>/ford-cobalt-backend:latest
```

### ECS Task Definition (key settings)
```json
{
  "cpu": "512",
  "memory": "1024",
  "healthCheck": {
    "command": ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"],
    "interval": 30,
    "timeout": 10,
    "retries": 3
  }
}
```

---

## 3. Frontend Production Build

```bash
cd frontend

# Build with production API URL
VITE_API_URL=https://api.cobalt.ford.com/api/v1 npm run build

# Deploy to Vercel
npx vercel --prod

# Or build Docker image
docker build --build-arg VITE_API_URL=https://api.cobalt.ford.com/api/v1 -t ford-cobalt-frontend .
```

---

## 4. Security Hardening

### Backend
- [ ] Rotate `SECRET_KEY` every 90 days
- [ ] Store `DEPLOYER_PRIVATE_KEY` in AWS Secrets Manager / GCP Secret Manager
- [ ] Enable HTTPS only (TLS 1.3)
- [ ] Set `ALLOWED_ORIGINS` to exact production domain
- [ ] Enable MongoDB Atlas IP allowlist
- [ ] Enable RDS encryption at rest
- [ ] Set rate limit to 60 req/min per IP in production

### Contracts
- [ ] Renounce DEFAULT_ADMIN_ROLE after initial setup (transfer to multisig)
- [ ] Use Gnosis Safe multisig for AUDITOR_ROLE operations
- [ ] Add time-lock on critical operations
- [ ] Run Slither / MythX audit before mainnet

### Frontend
- [ ] Enable Content Security Policy headers
- [ ] Remove source maps from production build
- [ ] Enable HSTS headers

---

## 5. Monitoring

### Backend
```bash
# Add to requirements.txt
prometheus-fastapi-instrumentator

# In main.py
from prometheus_fastapi_instrumentator import Instrumentator
Instrumentator().instrument(app).expose(app)
```

### Grafana Dashboards
- API request rate & latency
- Error rate by endpoint
- MongoDB connection pool
- Blockchain transaction success rate

### Alerts
- Compliance failure rate > 5%
- API p99 latency > 2s
- Failed transactions > 3 in 5 min
- IoT temperature alerts from shipments

---

## 6. Database Backup

### MongoDB Atlas
- Automated daily snapshots enabled
- Point-in-time recovery: 7 days
- Cross-region replica for DR

### PostgreSQL RDS
```bash
# Manual backup
aws rds create-db-snapshot \
  --db-instance-identifier ford-cobalt-auth \
  --db-snapshot-identifier ford-cobalt-auth-$(date +%Y%m%d)
```

---

## 7. Testnet Deployment (Mumbai)

For staging environment:
```bash
# Get test MATIC from faucet: https://faucet.polygon.technology

export MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
export PRIVATE_KEY=<testnet-key>

npx hardhat run scripts/deploy.js --network mumbai
npx hardhat verify --network mumbai <address>
```
