// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./MineRegistry.sol";

/**
 * @title BatchTracking
 * @notice Tracks cobalt batches through the custody chain
 */
contract BatchTracking is AccessControl, Pausable {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant TRANSPORTER_ROLE = keccak256("TRANSPORTER_ROLE");
    bytes32 public constant PROCESSOR_ROLE = keccak256("PROCESSOR_ROLE");

    enum BatchStatus { EXTRACTED, IN_TRANSIT, PROCESSING, DELIVERED, REJECTED, FLAGGED }
    enum ActorRole { MINE, TRANSPORTER, PROCESSOR, REFINERY, MANUFACTURER }

    struct CustodyRecord {
        address actor;
        string actorId;
        ActorRole role;
        uint256 timestamp;
        string location;   // "lat,lng"
        bytes signature;   // off-chain signature
        string notes;
    }

    struct Batch {
        bytes32 batchId;
        bytes32 mineId;
        uint256 extractionDate;
        uint256 weightKg;       // in grams (no floats in Solidity)
        uint256 purityBps;      // basis points: 9500 = 95.00%
        string geolocation;
        string photoIpfsHash;
        BatchStatus status;
        uint256 createdAt;
        CustodyRecord[] custodyChain;
    }

    MineRegistry public immutable mineRegistry;
    mapping(bytes32 => Batch) private batches;
    bytes32[] private batchIds;
    mapping(bytes32 => bytes32[]) private mineBatches; // mineId => batchIds

    event BatchCreated(bytes32 indexed batchId, bytes32 indexed mineId, uint256 weightKg, uint256 timestamp);
    event CustodyAdded(bytes32 indexed batchId, address indexed actor, ActorRole role, uint256 timestamp);
    event BatchStatusChanged(bytes32 indexed batchId, BatchStatus oldStatus, BatchStatus newStatus);

    constructor(address mineRegistryAddress) {
        mineRegistry = MineRegistry(mineRegistryAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    modifier batchExists(bytes32 batchId) {
        require(batches[batchId].createdAt != 0, "Batch does not exist");
        _;
    }

    /**
     * @notice Create a new cobalt batch from a registered active mine
     */
    function createBatch(
        bytes32 mineId,
        uint256 extractionDate,
        uint256 weightKg,
        uint256 purityBps,
        string calldata geolocation,
        string calldata photoIpfsHash
    ) external onlyRole(OPERATOR_ROLE) whenNotPaused returns (bytes32) {
        require(mineRegistry.isMineActive(mineId), "Mine not active");
        require(weightKg > 0, "Weight must be positive");
        require(purityBps <= 10000, "Purity exceeds 100%");

        bytes32 batchId = keccak256(abi.encodePacked(mineId, weightKg, extractionDate, block.timestamp));

        Batch storage newBatch = batches[batchId];
        newBatch.batchId = batchId;
        newBatch.mineId = mineId;
        newBatch.extractionDate = extractionDate;
        newBatch.weightKg = weightKg;
        newBatch.purityBps = purityBps;
        newBatch.geolocation = geolocation;
        newBatch.photoIpfsHash = photoIpfsHash;
        newBatch.status = BatchStatus.EXTRACTED;
        newBatch.createdAt = block.timestamp;

        batchIds.push(batchId);
        mineBatches[mineId].push(batchId);

        emit BatchCreated(batchId, mineId, weightKg, block.timestamp);
        return batchId;
    }

    /**
     * @notice Add a custody handoff record
     */
    function addCustody(
        bytes32 batchId,
        string calldata actorId,
        ActorRole role,
        string calldata location,
        bytes calldata signature,
        string calldata notes
    ) external batchExists(batchId) whenNotPaused {
        require(
            hasRole(OPERATOR_ROLE, msg.sender) ||
            hasRole(TRANSPORTER_ROLE, msg.sender) ||
            hasRole(PROCESSOR_ROLE, msg.sender),
            "Not authorized"
        );

        CustodyRecord memory record = CustodyRecord({
            actor: msg.sender,
            actorId: actorId,
            role: role,
            timestamp: block.timestamp,
            location: location,
            signature: signature,
            notes: notes
        });

        batches[batchId].custodyChain.push(record);
        emit CustodyAdded(batchId, msg.sender, role, block.timestamp);
    }

    /**
     * @notice Get full provenance trail for a batch
     */
    function getProvenance(bytes32 batchId) external view batchExists(batchId) returns (
        Batch memory batch,
        CustodyRecord[] memory chain
    ) {
        batch = batches[batchId];
        chain = batches[batchId].custodyChain;
    }

    function updateBatchStatus(bytes32 batchId, BatchStatus newStatus)
        external
        onlyRole(OPERATOR_ROLE)
        batchExists(batchId)
    {
        BatchStatus oldStatus = batches[batchId].status;
        batches[batchId].status = newStatus;
        emit BatchStatusChanged(batchId, oldStatus, newStatus);
    }

    function getBatch(bytes32 batchId) external view batchExists(batchId) returns (Batch memory) {
        return batches[batchId];
    }

    function getAllBatchIds() external view returns (bytes32[] memory) {
        return batchIds;
    }

    function getBatchesByMine(bytes32 mineId) external view returns (bytes32[] memory) {
        return mineBatches[mineId];
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}
