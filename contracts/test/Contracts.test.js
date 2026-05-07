const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Ford Cobalt Blockchain System", function () {
  let mineRegistry, batchTracking, complianceVerifier;
  let owner, auditor, operator, transporter, processor, ford;

  async function deploy(contractFactory, ...args) {
    const contract = await contractFactory.deploy(...args);
    await contract.waitForDeployment();
    return contract;
  }

  async function contractAddress(contract) {
    return await contract.getAddress();
  }

  function findEvent(contract, receipt, eventName) {
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === eventName) return parsed;
      } catch {
        // Ignore logs emitted by other contracts.
      }
    }
    return undefined;
  }

  beforeEach(async function () {
    [owner, auditor, operator, transporter, processor, ford] = await ethers.getSigners();

    // Deploy MineRegistry
    const MineRegistry = await ethers.getContractFactory("MineRegistry");
    mineRegistry = await deploy(MineRegistry);

    // Deploy BatchTracking
    const BatchTracking = await ethers.getContractFactory("BatchTracking");
    batchTracking = await deploy(BatchTracking, await contractAddress(mineRegistry));

    // Deploy ComplianceVerifier
    const ComplianceVerifier = await ethers.getContractFactory("ComplianceVerifier");
    complianceVerifier = await deploy(
      ComplianceVerifier,
      await contractAddress(batchTracking),
      await contractAddress(mineRegistry)
    );

    // Grant roles
    const AUDITOR_ROLE = await mineRegistry.AUDITOR_ROLE();
    const OPERATOR_ROLE = await batchTracking.OPERATOR_ROLE();
    const TRANSPORTER_ROLE = await batchTracking.TRANSPORTER_ROLE();
    const PROCESSOR_ROLE = await batchTracking.PROCESSOR_ROLE();
    const VERIFIER_ROLE = await complianceVerifier.VERIFIER_ROLE();

    await mineRegistry.grantRole(AUDITOR_ROLE, auditor.address);
    await batchTracking.grantRole(OPERATOR_ROLE, operator.address);
    await batchTracking.grantRole(TRANSPORTER_ROLE, transporter.address);
    await batchTracking.grantRole(PROCESSOR_ROLE, processor.address);
    await complianceVerifier.grantRole(VERIFIER_ROLE, auditor.address);
  });

  // ────────────────────────────────────────────────────────────────
  // MineRegistry Tests
  // ────────────────────────────────────────────────────────────────
  describe("MineRegistry", function () {
    it("should register a mine and emit event", async function () {
      const tx = await mineRegistry.connect(auditor).registerMine(
        "Katanga Mine",
        "DRC",
        "-10.5,25.3",
        "OP-001",
        operator.address,
        ["ISO14001", "RMI"],
        "QmHash123"
      );
      const receipt = await tx.wait();
      const event = findEvent(mineRegistry, receipt, "MineRegistered");
      expect(event).to.not.be.undefined;
      expect(event.args.name).to.equal("Katanga Mine");
    });

    it("should update mine status", async function () {
      const tx = await mineRegistry.connect(auditor).registerMine(
        "Katanga Mine", "DRC", "-10.5,25.3", "OP-001", operator.address, [], "QmHash"
      );
      const receipt = await tx.wait();
      const mineId = findEvent(mineRegistry, receipt, "MineRegistered").args.mineId;

      await mineRegistry.connect(auditor).updateMineStatus(mineId, 1); // ACTIVE
      const mine = await mineRegistry.getMine(mineId);
      expect(mine.status).to.equal(1);
    });

    it("should revert if non-auditor tries to register", async function () {
      await expect(
        mineRegistry.connect(operator).registerMine(
          "Fake Mine", "DRC", "0,0", "OP-002", operator.address, [], ""
        )
      ).to.be.reverted;
    });

    it("should revert with empty mine name", async function () {
      await expect(
        mineRegistry.connect(auditor).registerMine(
          "", "DRC", "0,0", "OP-001", operator.address, [], ""
        )
      ).to.be.revertedWith("Name required");
    });

    it("should return all mine ids", async function () {
      for (let i = 0; i < 3; i++) {
        await mineRegistry.connect(auditor).registerMine(
          `Mine ${i}`, "DRC", "0,0", `OP-00${i}`, operator.address, [], ""
        );
      }
      const ids = await mineRegistry.getAllMineIds();
      expect(ids.length).to.equal(3);
    });

    it("should update audit date and IPFS hash", async function () {
      const tx = await mineRegistry.connect(auditor).registerMine(
        "Mine A", "DRC", "0,0", "OP-001", operator.address, [], "OldHash"
      );
      const receipt = await tx.wait();
      const mineId = findEvent(mineRegistry, receipt, "MineRegistered").args.mineId;

      await mineRegistry.connect(auditor).updateAudit(mineId, "NewHash");
      const mine = await mineRegistry.getMine(mineId);
      expect(mine.metadataIpfsHash).to.equal("NewHash");
      expect(mine.lastAuditDate).to.be.gt(0);
    });

    it("should pause and prevent registration", async function () {
      await mineRegistry.pause();
      await expect(
        mineRegistry.connect(auditor).registerMine(
          "Paused Mine", "DRC", "0,0", "OP-001", operator.address, [], ""
        )
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  // ────────────────────────────────────────────────────────────────
  // BatchTracking Tests
  // ────────────────────────────────────────────────────────────────
  describe("BatchTracking", function () {
    let mineId;

    beforeEach(async function () {
      const tx = await mineRegistry.connect(auditor).registerMine(
        "Active Mine", "DRC", "-10.5,25.3", "OP-001", operator.address, ["ISO14001"], "QmHash"
      );
      const receipt = await tx.wait();
      mineId = findEvent(mineRegistry, receipt, "MineRegistered").args.mineId;
      await mineRegistry.connect(auditor).updateMineStatus(mineId, 1); // ACTIVE
    });

    it("should create a batch from an active mine", async function () {
      const now = await time.latest();
      const tx = await batchTracking.connect(operator).createBatch(
        mineId, now, 5000, 9500, "-10.5,25.3", "QmPhoto"
      );
      const receipt = await tx.wait();
      const event = findEvent(batchTracking, receipt, "BatchCreated");
      expect(event.args.mineId).to.equal(mineId);
      expect(event.args.weightKg).to.equal(5000);
    });

    it("should reject batch from inactive mine", async function () {
      await mineRegistry.connect(auditor).updateMineStatus(mineId, 2); // SUSPENDED
      const now = await time.latest();
      await expect(
        batchTracking.connect(operator).createBatch(mineId, now, 1000, 9000, "0,0", "")
      ).to.be.revertedWith("Mine not active");
    });

    it("should add custody records and retrieve provenance", async function () {
      const now = await time.latest();
      const tx = await batchTracking.connect(operator).createBatch(
        mineId, now, 5000, 9500, "-10.5,25.3", "QmPhoto"
      );
      const receipt = await tx.wait();
      const batchId = findEvent(batchTracking, receipt, "BatchCreated").args.batchId;

      await batchTracking.connect(operator).addCustody(
        batchId, "OP-001", 0, "-10.5,25.3", "0x", "Extracted at mine"
      );
      await batchTracking.connect(transporter).addCustody(
        batchId, "TRANS-001", 1, "-8.0,20.0", "0x", "In transit to port"
      );

      const [, chain] = await batchTracking.getProvenance(batchId);
      expect(chain.length).to.equal(2);
      expect(chain[0].actorId).to.equal("OP-001");
      expect(chain[1].actorId).to.equal("TRANS-001");
    });

    it("should reject batch with 0 weight", async function () {
      const now = await time.latest();
      await expect(
        batchTracking.connect(operator).createBatch(mineId, now, 0, 9500, "0,0", "")
      ).to.be.revertedWith("Weight must be positive");
    });

    it("should reject purity above 100%", async function () {
      const now = await time.latest();
      await expect(
        batchTracking.connect(operator).createBatch(mineId, now, 1000, 10001, "0,0", "")
      ).to.be.revertedWith("Purity exceeds 100%");
    });

    it("should update batch status", async function () {
      const now = await time.latest();
      const tx = await batchTracking.connect(operator).createBatch(
        mineId, now, 5000, 9500, "0,0", ""
      );
      const receipt = await tx.wait();
      const batchId = findEvent(batchTracking, receipt, "BatchCreated").args.batchId;

      await batchTracking.connect(operator).updateBatchStatus(batchId, 1); // IN_TRANSIT
      const batch = await batchTracking.getBatch(batchId);
      expect(batch.status).to.equal(1);
    });

    it("should return batches by mine", async function () {
      const now = await time.latest();
      await batchTracking.connect(operator).createBatch(mineId, now, 1000, 9000, "0,0", "");
      await batchTracking.connect(operator).createBatch(mineId, now + 1, 2000, 9500, "0,0", "");
      const batches = await batchTracking.getBatchesByMine(mineId);
      expect(batches.length).to.equal(2);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // ComplianceVerifier Tests
  // ────────────────────────────────────────────────────────────────
  describe("ComplianceVerifier", function () {
    let mineId, batchId;

    beforeEach(async function () {
      // Register and activate mine
      let tx = await mineRegistry.connect(auditor).registerMine(
        "Compliant Mine", "DRC", "0,0", "OP-001", operator.address, ["RMI"], "QmHash"
      );
      let receipt = await tx.wait();
      mineId = findEvent(mineRegistry, receipt, "MineRegistered").args.mineId;
      await mineRegistry.connect(auditor).updateMineStatus(mineId, 1);

      // Create batch
      const now = await time.latest();
      tx = await batchTracking.connect(operator).createBatch(
        mineId, now, 5000, 9800, "0,0", "QmPhoto"
      );
      receipt = await tx.wait();
      batchId = findEvent(batchTracking, receipt, "BatchCreated").args.batchId;
    });

    it("should pass compliance check", async function () {
      const tx = await complianceVerifier.connect(auditor).checkCompliance(
        batchId, true, true, true, true, true, "QmReport"
      );
      const receipt = await tx.wait();
      const event = findEvent(complianceVerifier, receipt, "ComplianceVerified");
      expect(event.args.status).to.equal(1); // PASSED
    });

    it("should fail compliance if any check fails", async function () {
      const tx = await complianceVerifier.connect(auditor).checkCompliance(
        batchId, false, true, true, true, true, "QmReport"
      );
      const receipt = await tx.wait();
      const event = findEvent(complianceVerifier, receipt, "ComplianceVerified");
      expect(event.args.status).to.equal(2); // FAILED
    });

    it("should mint ESG certificate for compliant batch", async function () {
      await complianceVerifier.connect(auditor).checkCompliance(
        batchId, true, true, true, true, true, "QmReport"
      );

      const tx = await complianceVerifier.connect(auditor).mintESGCertificate(
        batchId, ford.address, "ipfs://QmCert", 365
      );
      const receipt = await tx.wait();
      const event = findEvent(complianceVerifier, receipt, "ESGCertificateMinted");
      expect(event.args.batchId).to.equal(batchId);

      const cert = await complianceVerifier.getCertificate(batchId);
      expect(cert.tokenId).to.equal(1);
      expect(cert.revoked).to.equal(false);
    });

    it("should reject certificate mint for failed compliance", async function () {
      await complianceVerifier.connect(auditor).checkCompliance(
        batchId, false, true, true, true, true, "QmReport"
      );
      await expect(
        complianceVerifier.connect(auditor).mintESGCertificate(
          batchId, ford.address, "ipfs://QmCert", 365
        )
      ).to.be.revertedWith("Batch must pass compliance");
    });

    it("should revoke a certificate", async function () {
      await complianceVerifier.connect(auditor).checkCompliance(
        batchId, true, true, true, true, true, "QmReport"
      );
      await complianceVerifier.connect(auditor).mintESGCertificate(
        batchId, ford.address, "ipfs://QmCert", 365
      );
      await complianceVerifier.connect(auditor).revokeCertificate(batchId, "Audit failure");

      const cert = await complianceVerifier.getCertificate(batchId);
      expect(cert.revoked).to.equal(true);

      const valid = await complianceVerifier.isCertificateValid(batchId);
      expect(valid).to.equal(false);
    });

    it("should validate certificate expiry", async function () {
      await complianceVerifier.connect(auditor).checkCompliance(
        batchId, true, true, true, true, true, "QmReport"
      );
      await complianceVerifier.connect(auditor).mintESGCertificate(
        batchId, ford.address, "ipfs://QmCert", 1 // 1 day validity
      );

      expect(await complianceVerifier.isCertificateValid(batchId)).to.equal(true);

      // Fast-forward 2 days
      await time.increase(2 * 24 * 60 * 60);
      expect(await complianceVerifier.isCertificateValid(batchId)).to.equal(false);
    });
  });
});
