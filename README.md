# GeneNFT: Privacy-Preserving Genetic Data NFTs

GeneNFT is an innovative solution that harnesses Zama's Fully Homomorphic Encryption (FHE) technology to create, manage, and trade NFTs representing encrypted genetic data. Our application empowers researchers and individuals to preserve the privacy of sensitive genetic information while allowing for monetization and collaborative research, making it a game-changer in the field of genetics and data ownership.

## The Problem

In today’s digital landscape, cleartext genetic data poses significant privacy and security risks. Genetic information is uniquely identifiable and can be misused if it falls into the wrong hands. Unauthorized access to this data not only threatens individual privacy but can also lead to discrimination and unethical practices in research and health. As NFTs gain traction in various sectors, the challenge lies in responsibly handling and protecting this sensitive information while enabling its utilization for research and financial benefits.

## The Zama FHE Solution

Zama's FHE technology offers a robust solution to these privacy challenges. By allowing computations on encrypted data, GeneNFT ensures that genetic information remains confidential throughout the entire process of data handling and transaction. Using the **fhevm** to process encrypted inputs, our platform allows researchers to verify and use genetic data without ever exposing it in its raw form. This means that you can mint NFTs with genetic insights while guaranteeing that only the authorized parties can access and utilize the data in a secure way.

## Key Features

- 🔒 **Privacy-First Approach**: Genetic data is encrypted, ensuring confidentiality and security throughout every transaction.
- 💎 **NFT Minting**: Users can mint NFTs that represent encrypted genetic data, facilitating ownership and provenance tracking.
- 🔗 **Data Licensing**: Researchers can license access to genetic NFTs, enabling monetization while maintaining data privacy.
- 📊 **Secure Data Insights**: Perform computations on encrypted genetic data, yielding useful insights without compromising personal information.
- 🤝 **Collaborative Research**: Enable collaborative efforts in research by allowing secure access to genetic data without exposing sensitive information.

## Technical Architecture & Stack

The GeneNFT platform is built on a cutting-edge technology stack that integrates blockchain with advanced cryptographic techniques. At the core of our solution lies the Zama FHE technology, which ensures the privacy and security of the genetic data involved.

### Tech Stack:

- **Blockchain**: EVM-compatible blockchain
- **Smart Contracts**: Solidity programming for contract deployment
- **Data Encryption**: Zama's FHE libraries (fhevm)
- **Front-end Framework**: React (or similar)
- **Backend**: Node.js / Express
- **Database**: IPFS for decentralized storage

## Smart Contract / Core Logic

Here is a simplified snippet of how our smart contract handles NFT minting while leveraging Zama's FHE technology:solidity
pragma solidity ^0.8.0;

import "ZamaFHE.sol";

contract GeneNFT {
    struct NFT {
        uint64 id;
        bytes encryptedGeneticData;
        address owner;
    }
    
    mapping(uint64 => NFT) public nfts;
    uint64 public nextId;

    function mintNFT(bytes calldata encryptedData) external {
        nfts[nextId] = NFT(nextId, encryptedData, msg.sender);
        nextId++;
    }

    function getEncryptedData(uint64 id) external view returns (bytes memory) {
        return nfts[id].encryptedGeneticData;
    }

    function decryptData(uint64 id) external view returns (bytes memory) {
        require(msg.sender == nfts[id].owner, "Unauthorized access");
        return TFHE.decrypt(nfts[id].encryptedGeneticData);
    }
}

## Directory Structure

Here's an overview of the project directory structure:
GeneNFT/
├── contracts/
│   └── GeneNFT.sol
├── scripts/
│   └── mintNFT.js
├── src/
│   ├── index.js
│   └── App.js
├── tests/
│   └── GeneNFT.test.js
├── package.json
└── README.md

## Installation & Setup

### Prerequisites

To run the GeneNFT application, ensure you have the following installed:

- Node.js
- npm (Node package manager)
- Solidity environment (like Hardhat or Truffle) for smart contract development

### Installing Dependencies

1. First, navigate to the project directory.
2. Install the necessary dependencies using npm:bash
npm install
npm install fhevm // Install Zama's FHE library

## Build & Run

To build and run the application, use the following commands:

1. Compile the smart contracts:bash
npx hardhat compile

2. Deploy the smart contracts to your local blockchain or a testnet:bash
npx hardhat run scripts/deploy.js --network localhost

3. Start the front-end application:bash
npm start

## Acknowledgements

We extend our heartfelt thanks to Zama for providing the open-source FHE primitives that make this project possible. Their commitment to enhancing data privacy through advanced cryptography is at the core of what we do at GeneNFT.


