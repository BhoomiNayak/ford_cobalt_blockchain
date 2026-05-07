// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title MineRegistry
 * @notice Registry for cobalt mining sites in Ford's supply chain
 */
contract MineRegistry is AccessControl, Pausable {
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum MineStatus { PENDING, ACTIVE, SUSPENDED, REVOKED }

    struct Mine {
        bytes32 mineId;
        string name;
        string country;
        string coordinates; // "lat,lng"
        address operatorAddress;
        string operatorId;
        string[] certifications;
        MineStatus status;
        uint256 registeredAt;
        uint256 lastAuditDate;
        string metadataIpfsHash; // IPFS hash for docs/photos
    }

    mapping(bytes32 => Mine) private mines;
    bytes32[] private mineIds;
    mapping(address => bytes32[]) private operatorMines;

    event MineRegistered(bytes32 indexed mineId, string name, address indexed operator, uint256 timestamp);
    event MineStatusUpdated(bytes32 indexed mineId, MineStatus oldStatus, MineStatus newStatus, uint256 timestamp);
    event MineAuditUpdated(bytes32 indexed mineId, uint256 auditDate, string ipfsHash);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(AUDITOR_ROLE, msg.sender);
    }

    modifier mineExists(bytes32 mineId) {
        require(mines[mineId].registeredAt != 0, "Mine does not exist");
        _;
    }

    /**
     * @notice Register a new mining site
     */
    function registerMine(
        string calldata name,
        string calldata country,
        string calldata coordinates,
        string calldata operatorId,
        address operatorAddress,
        string[] calldata certifications,
        string calldata metadataIpfsHash
    ) external onlyRole(AUDITOR_ROLE) whenNotPaused returns (bytes32) {
        require(bytes(name).length > 0, "Name required");
        require(bytes(country).length > 0, "Country required");
        require(operatorAddress != address(0), "Invalid operator");

        bytes32 mineId = keccak256(abi.encodePacked(name, operatorId, block.timestamp));

        mines[mineId] = Mine({
            mineId: mineId,
            name: name,
            country: country,
            coordinates: coordinates,
            operatorAddress: operatorAddress,
            operatorId: operatorId,
            certifications: certifications,
            status: MineStatus.PENDING,
            registeredAt: block.timestamp,
            lastAuditDate: 0,
            metadataIpfsHash: metadataIpfsHash
        });

        mineIds.push(mineId);
        operatorMines[operatorAddress].push(mineId);

        emit MineRegistered(mineId, name, operatorAddress, block.timestamp);
        return mineId;
    }

    /**
     * @notice Update mine status
     */
    function updateMineStatus(bytes32 mineId, MineStatus newStatus)
        external
        onlyRole(AUDITOR_ROLE)
        mineExists(mineId)
        whenNotPaused
    {
        MineStatus oldStatus = mines[mineId].status;
        mines[mineId].status = newStatus;
        emit MineStatusUpdated(mineId, oldStatus, newStatus, block.timestamp);
    }

    /**
     * @notice Update audit date and documentation
     */
    function updateAudit(bytes32 mineId, string calldata ipfsHash)
        external
        onlyRole(AUDITOR_ROLE)
        mineExists(mineId)
    {
        mines[mineId].lastAuditDate = block.timestamp;
        mines[mineId].metadataIpfsHash = ipfsHash;
        emit MineAuditUpdated(mineId, block.timestamp, ipfsHash);
    }

    function getMine(bytes32 mineId) external view mineExists(mineId) returns (Mine memory) {
        return mines[mineId];
    }

    function getAllMineIds() external view returns (bytes32[] memory) {
        return mineIds;
    }

    function getMinesByOperator(address operator) external view returns (bytes32[] memory) {
        return operatorMines[operator];
    }

    function isMineActive(bytes32 mineId) external view returns (bool) {
        return mines[mineId].status == MineStatus.ACTIVE;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}
