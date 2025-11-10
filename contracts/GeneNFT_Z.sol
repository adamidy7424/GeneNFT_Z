pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract GeneNFT is ZamaEthereumConfig {
    struct GeneticData {
        string dnaSequence;
        euint32 encryptedGenes;
        uint256 researchId;
        string metadataURI;
        address owner;
        uint256 timestamp;
        uint32 decryptedGenes;
        bool isDecrypted;
    }

    mapping(string => GeneticData) public geneticData;
    string[] public dnaSequences;

    event GeneticDataCreated(string indexed dnaSequence, address indexed owner);
    event DecryptionCompleted(string indexed dnaSequence, uint32 decryptedGenes);

    constructor() ZamaEthereumConfig() {}

    function createGeneticData(
        string calldata dnaSequence,
        externalEuint32 encryptedGenes,
        bytes calldata inputProof,
        uint256 researchId,
        string calldata metadataURI
    ) external {
        require(bytes(geneticData[dnaSequence].dnaSequence).length == 0, "Genetic data already exists");
        require(FHE.isInitialized(FHE.fromExternal(encryptedGenes, inputProof)), "Invalid encrypted input");

        geneticData[dnaSequence] = GeneticData({
            dnaSequence: dnaSequence,
            encryptedGenes: FHE.fromExternal(encryptedGenes, inputProof),
            researchId: researchId,
            metadataURI: metadataURI,
            owner: msg.sender,
            timestamp: block.timestamp,
            decryptedGenes: 0,
            isDecrypted: false
        });

        FHE.allowThis(geneticData[dnaSequence].encryptedGenes);
        FHE.makePubliclyDecryptable(geneticData[dnaSequence].encryptedGenes);
        dnaSequences.push(dnaSequence);

        emit GeneticDataCreated(dnaSequence, msg.sender);
    }

    function decryptGeneticData(
        string calldata dnaSequence,
        bytes memory abiEncodedClearValue,
        bytes memory decryptionProof
    ) external {
        require(bytes(geneticData[dnaSequence].dnaSequence).length > 0, "Genetic data does not exist");
        require(!geneticData[dnaSequence].isDecrypted, "Data already decrypted");

        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(geneticData[dnaSequence].encryptedGenes);

        FHE.checkSignatures(cts, abiEncodedClearValue, decryptionProof);
        uint32 decodedValue = abi.decode(abiEncodedClearValue, (uint32));

        geneticData[dnaSequence].decryptedGenes = decodedValue;
        geneticData[dnaSequence].isDecrypted = true;

        emit DecryptionCompleted(dnaSequence, decodedValue);
    }

    function getEncryptedGenes(string calldata dnaSequence) external view returns (euint32) {
        require(bytes(geneticData[dnaSequence].dnaSequence).length > 0, "Genetic data does not exist");
        return geneticData[dnaSequence].encryptedGenes;
    }

    function getGeneticData(string calldata dnaSequence) external view returns (
        uint256 researchId,
        string memory metadataURI,
        address owner,
        uint256 timestamp,
        bool isDecrypted,
        uint32 decryptedGenes
    ) {
        require(bytes(geneticData[dnaSequence].dnaSequence).length > 0, "Genetic data does not exist");
        GeneticData storage data = geneticData[dnaSequence];

        return (
            data.researchId,
            data.metadataURI,
            data.owner,
            data.timestamp,
            data.isDecrypted,
            data.decryptedGenes
        );
    }

    function getAllDnaSequences() external view returns (string[] memory) {
        return dnaSequences;
    }

    function isAvailable() public pure returns (bool) {
        return true;
    }
}


