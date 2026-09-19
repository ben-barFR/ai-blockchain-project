// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title BuildingCertificate
/// @notice Platform-issued ERC-721 representing a building assessment.
/// Electrical and energy components expire after 5 years. Planning is
/// indefinite until invalidated (e.g. a new planning permission).
contract BuildingCertificate is ERC721, Ownable, ReentrancyGuard {
    uint64 public constant FIVE_YEARS = 5 * 365 days;

    struct Component {
        bool present;
        uint64 issuedAt;
        uint64 expiresAt; // 0 = indefinite
        bool invalidated;
        bytes32 reportHash;
    }

    struct Certificate {
        string buildingId;
        string countryCode;
        string postalAddress;
        address issuer;
        string issuerIdentifier;
        string issuerRegistryUrl;
        Component electrical;
        Component energy;
        Component planning;
        uint64 mintedAt;
    }

    uint256 private _nextTokenId = 1;

    mapping(address => bool) public approvedIssuers;
    mapping(uint256 => Certificate) private _certs;
    mapping(address => uint256[]) private _heldTokens;
    mapping(bytes32 => uint256[]) private _byBuilding;

    event IssuerApproved(address indexed issuer, bool approved);
    event CertificateIssued(uint256 indexed tokenId, address indexed issuer, string buildingId);
    event PlanningInvalidated(uint256 indexed tokenId, address indexed by);
    event ReportHashSet(uint256 indexed tokenId, uint8 component, bytes32 reportHash);

    constructor(address initialOwner)
        ERC721("Building Certificate", "BLDCRT")
        Ownable(initialOwner)
    {}

    function setApprovedIssuer(address issuer, bool approved) external onlyOwner {
        approvedIssuers[issuer] = approved;
        emit IssuerApproved(issuer, approved);
    }

    function issueCertificate(
        address issuer,
        address holder,
        string calldata buildingId,
        string calldata countryCode,
        string calldata postalAddress,
        string calldata issuerIdentifier,
        string calldata issuerRegistryUrl,
        bool electrical,
        bool energy,
        bool planning,
        bytes32 electricalHash,
        bytes32 energyHash,
        bytes32 planningHash
    ) external onlyOwner nonReentrant returns (uint256 tokenId) {
        require(approvedIssuers[issuer], "Issuer not approved");
        require(holder != address(0), "Need holder");
        require(
            bytes(buildingId).length > 0 || bytes(postalAddress).length > 0,
            "Need id or address"
        );
        require(electrical || energy || planning, "Need a component");

        tokenId = _nextTokenId++;
        uint64 nowTs = uint64(block.timestamp);
        Certificate storage cert = _certs[tokenId];
        cert.buildingId = buildingId;
        cert.countryCode = countryCode;
        cert.postalAddress = postalAddress;
        cert.issuer = issuer;
        cert.issuerIdentifier = issuerIdentifier;
        cert.issuerRegistryUrl = issuerRegistryUrl;
        cert.mintedAt = nowTs;

        if (electrical) {
            cert.electrical = Component(true, nowTs, nowTs + FIVE_YEARS, false, electricalHash);
        }
        if (energy) {
            cert.energy = Component(true, nowTs, nowTs + FIVE_YEARS, false, energyHash);
        }
        if (planning) {
            cert.planning = Component(true, nowTs, 0, false, planningHash);
        }

        _safeMint(holder, tokenId);
        _byBuilding[_buildingKey(countryCode, buildingId)].push(tokenId);
        emit CertificateIssued(tokenId, issuer, buildingId);
    }

    function setReportHash(uint256 tokenId, uint8 component, bytes32 reportHash) external {
        require(_ownerOf(tokenId) != address(0), "Unknown token");
        require(reportHash != bytes32(0), "Empty hash");
        Certificate storage cert = _certs[tokenId];
        require(msg.sender == owner() || msg.sender == cert.issuer, "Not allowed");
        Component storage comp = _component(cert, component);
        require(comp.present, "Missing component");
        require(comp.reportHash == bytes32(0), "Hash locked");
        comp.reportHash = reportHash;
        emit ReportHashSet(tokenId, component, reportHash);
    }

    function invalidatePlanning(uint256 tokenId) external {
        require(_ownerOf(tokenId) != address(0), "Unknown token");
        Certificate storage cert = _certs[tokenId];
        require(cert.planning.present, "No planning");
        require(!cert.planning.invalidated, "Already invalid");
        require(msg.sender == owner() || msg.sender == cert.issuer, "Not allowed");
        cert.planning.invalidated = true;
        emit PlanningInvalidated(tokenId, msg.sender);
    }

    function getCertificateMeta(uint256 tokenId)
        external
        view
        returns (
            string memory buildingId,
            string memory countryCode,
            string memory postalAddress,
            address issuer,
            string memory issuerIdentifier,
            string memory issuerRegistryUrl,
            uint64 mintedAt,
            address holder
        )
    {
        require(_ownerOf(tokenId) != address(0), "Unknown token");
        Certificate storage cert = _certs[tokenId];
        return (
            cert.buildingId,
            cert.countryCode,
            cert.postalAddress,
            cert.issuer,
            cert.issuerIdentifier,
            cert.issuerRegistryUrl,
            cert.mintedAt,
            ownerOf(tokenId)
        );
    }

    function getComponent(uint256 tokenId, uint8 kind)
        external
        view
        returns (
            bool present,
            uint64 issuedAt,
            uint64 expiresAt,
            bool invalidated,
            bytes32 reportHash,
            bool valid
        )
    {
        require(_ownerOf(tokenId) != address(0), "Unknown token");
        Component storage comp = _component(_certs[tokenId], kind);
        present = comp.present;
        issuedAt = comp.issuedAt;
        expiresAt = comp.expiresAt;
        invalidated = comp.invalidated;
        reportHash = comp.reportHash;
        valid = _isValid(comp);
    }

    function tokensOf(address holder) external view returns (uint256[] memory) {
        return _heldTokens[holder];
    }

    function tokensByBuilding(string calldata countryCode, string calldata buildingId)
        external
        view
        returns (uint256[] memory)
    {
        return _byBuilding[_buildingKey(countryCode, buildingId)];
    }

    function verifyReportHash(uint256 tokenId, uint8 component, bytes32 reportHash)
        external
        view
        returns (bool)
    {
        if (_ownerOf(tokenId) == address(0) || reportHash == bytes32(0)) return false;
        Component storage comp = _component(_certs[tokenId], component);
        return comp.present && comp.reportHash == reportHash;
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address from)
    {
        from = super._update(to, tokenId, auth);
        if (from != address(0)) {
            _removeHeld(from, tokenId);
        }
        if (to != address(0)) {
            _heldTokens[to].push(tokenId);
        }
    }

    function _removeHeld(address holder, uint256 tokenId) private {
        uint256[] storage held = _heldTokens[holder];
        for (uint256 i = 0; i < held.length; i++) {
            if (held[i] == tokenId) {
                held[i] = held[held.length - 1];
                held.pop();
                break;
            }
        }
    }

    function _component(Certificate storage cert, uint8 kind)
        private
        view
        returns (Component storage)
    {
        if (kind == 0) return cert.electrical;
        if (kind == 1) return cert.energy;
        if (kind == 2) return cert.planning;
        revert("Bad component");
    }

    function _isValid(Component storage comp) private view returns (bool) {
        if (!comp.present || comp.invalidated) return false;
        if (comp.expiresAt == 0) return true;
        return block.timestamp <= comp.expiresAt;
    }

    function _buildingKey(string memory countryCode, string memory buildingId)
        private
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(countryCode, "|", buildingId));
    }
}
