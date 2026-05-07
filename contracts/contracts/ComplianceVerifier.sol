// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./BatchTracking.sol";
import "./MineRegistry.sol";

/**
 * @title ComplianceVerifier
 * @notice Verifies ESG compliance and mints NFT certificates for compliant batches
 */
contract ComplianceVerifier is AccessControl, ERC721URIStorage {
    using Counters for Counters.Counter;

    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    enum ComplianceStatus { PENDING, PASSED, FAILED, UNDER_REVIEW }

    struct ComplianceCheck {
        bool laborStandards;       // No child/forced labor
        bool environmentalSafety;  // Environmental standards met
        bool conflictFree;         // Not from conflict zone
        bool documentationValid;   // All docs present & valid
        bool auditPassed;          // Physical audit passed
        uint256 checkedAt;
        address verifier;
        string reportIpfsHash;
        ComplianceStatus status;
    }

    struct ESGCertificate {
        uint256 tokenId;
        bytes32 batchId;
        uint256 issuedAt;
        uint256 expiresAt;
        string metadataUri;
        bool revoked;
    }

    BatchTracking public immutable batchTracking;
    MineRegistry public immutable mineRegistry;
    Counters.Counter private _tokenIds;

    mapping(bytes32 => ComplianceCheck) public complianceChecks;
    mapping(bytes32 => ESGCertificate) public certificates;    // batchId => cert
    mapping(uint256 => bytes32) public tokenToBatch;           // tokenId => batchId

    event ComplianceVerified(bytes32 indexed batchId, ComplianceStatus status, address verifier, uint256 timestamp);
    event ESGCertificateMinted(bytes32 indexed batchId, uint256 indexed tokenId, address recipient);
    event CertificateRevoked(bytes32 indexed batchId, uint256 indexed tokenId, string reason);

    constructor(address batchTrackingAddress, address mineRegistryAddress)
        ERC721("Ford ESG Certificate", "FESG")
    {
        batchTracking = BatchTracking(batchTrackingAddress);
        mineRegistry = MineRegistry(mineRegistryAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
    }

    /**
     * @notice Run compliance checks on a batch
     */
    function checkCompliance(
        bytes32 batchId,
        bool laborStandards,
        bool environmentalSafety,
        bool conflictFree,
        bool documentationValid,
        bool auditPassed,
        string calldata reportIpfsHash
    ) external onlyRole(VERIFIER_ROLE) returns (ComplianceStatus) {
        bool allPassed = laborStandards && environmentalSafety &&
                         conflictFree && documentationValid && auditPassed;

        ComplianceStatus status = allPassed
            ? ComplianceStatus.PASSED
            : ComplianceStatus.FAILED;

        complianceChecks[batchId] = ComplianceCheck({
            laborStandards: laborStandards,
            environmentalSafety: environmentalSafety,
            conflictFree: conflictFree,
            documentationValid: documentationValid,
            auditPassed: auditPassed,
            checkedAt: block.timestamp,
            verifier: msg.sender,
            reportIpfsHash: reportIpfsHash,
            status: status
        });

        emit ComplianceVerified(batchId, status, msg.sender, block.timestamp);
        return status;
    }

    /**
     * @notice Mint ESG certificate NFT for a compliant batch
     * @param recipient Address to receive the NFT (typically Ford's wallet)
     * @param metadataUri IPFS URI for certificate metadata
     * @param validityDays Certificate validity in days
     */
    function mintESGCertificate(
        bytes32 batchId,
        address recipient,
        string calldata metadataUri,
        uint256 validityDays
    ) external onlyRole(VERIFIER_ROLE) returns (uint256) {
        require(
            complianceChecks[batchId].status == ComplianceStatus.PASSED,
            "Batch must pass compliance"
        );
        require(certificates[batchId].tokenId == 0, "Certificate already exists");
        require(recipient != address(0), "Invalid recipient");

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(recipient, newTokenId);
        _setTokenURI(newTokenId, metadataUri);

        certificates[batchId] = ESGCertificate({
            tokenId: newTokenId,
            batchId: batchId,
            issuedAt: block.timestamp,
            expiresAt: block.timestamp + (validityDays * 1 days),
            metadataUri: metadataUri,
            revoked: false
        });

        tokenToBatch[newTokenId] = batchId;

        emit ESGCertificateMinted(batchId, newTokenId, recipient);
        return newTokenId;
    }

    /**
     * @notice Revoke an ESG certificate
     */
    function revokeCertificate(bytes32 batchId, string calldata reason)
        external
        onlyRole(VERIFIER_ROLE)
    {
        require(certificates[batchId].tokenId != 0, "No certificate found");
        certificates[batchId].revoked = true;
        emit CertificateRevoked(batchId, certificates[batchId].tokenId, reason);
    }

    function getComplianceCheck(bytes32 batchId) external view returns (ComplianceCheck memory) {
        return complianceChecks[batchId];
    }

    function getCertificate(bytes32 batchId) external view returns (ESGCertificate memory) {
        return certificates[batchId];
    }

    function isCertificateValid(bytes32 batchId) external view returns (bool) {
        ESGCertificate memory cert = certificates[batchId];
        return cert.tokenId != 0 &&
               !cert.revoked &&
               block.timestamp <= cert.expiresAt;
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
