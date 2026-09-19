import { parseAbi } from "viem";

export const certificateAbi = parseAbi([
  "function approvedIssuers(address issuer) view returns (bool)",
  "function setApprovedIssuer(address issuer, bool approved)",
  "function issueCertificate(address issuer, address holder, string buildingId, string countryCode, string postalAddress, string issuerIdentifier, string issuerRegistryUrl, bool electrical, bool energy, bool planning, bytes32 electricalHash, bytes32 energyHash, bytes32 planningHash) returns (uint256 tokenId)",
  "function setReportHash(uint256 tokenId, uint8 component, bytes32 reportHash)",
  "function invalidatePlanning(uint256 tokenId)",
  "function getCertificateMeta(uint256 tokenId) view returns (string buildingId, string countryCode, string postalAddress, address issuer, string issuerIdentifier, string issuerRegistryUrl, uint64 mintedAt, address holder)",
  "function getComponent(uint256 tokenId, uint8 kind) view returns (bool present, uint64 issuedAt, uint64 expiresAt, bool invalidated, bytes32 reportHash, bool valid)",
  "function tokensOf(address holder) view returns (uint256[])",
  "function tokensByBuilding(string countryCode, string buildingId) view returns (uint256[])",
  "function verifyReportHash(uint256 tokenId, uint8 component, bytes32 reportHash) view returns (bool)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "event CertificateIssued(uint256 indexed tokenId, address indexed issuer, string buildingId)",
]);
