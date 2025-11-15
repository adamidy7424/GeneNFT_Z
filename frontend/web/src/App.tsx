import { ConnectButton } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import React, { JSX, useEffect, useState } from "react";
import { getContractReadOnly, getContractWithSigner } from "./components/useContract";
import "./App.css";
import { useAccount } from 'wagmi';
import { useFhevm, useEncrypt, useDecrypt } from '../fhevm-sdk/src';
import { ethers } from 'ethers';

interface GeneticNFT {
  id: number;
  name: string;
  geneSequence: string;
  researchValue: string;
  timestamp: number;
  creator: string;
  publicValue1: number;
  publicValue2: number;
  isVerified?: boolean;
  decryptedValue?: number;
  encryptedValueHandle?: string;
}

interface ResearchAnalysis {
  uniquenessScore: number;
  researchPotential: number;
  compatibility: number;
  privacyRisk: number;
  marketValue: number;
}

const App: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  const [geneticNFTs, setGeneticNFTs] = useState<GeneticNFT[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingNFT, setCreatingNFT] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{ visible: boolean; status: "pending" | "success" | "error"; message: string; }>({ 
    visible: false, 
    status: "pending" as const, 
    message: "" 
  });
  const [newNFTData, setNewNFTData] = useState({ name: "", geneSequence: "", researchValue: "" });
  const [selectedNFT, setSelectedNFT] = useState<GeneticNFT | null>(null);
  const [decryptedData, setDecryptedData] = useState<{ geneSequence: number | null; researchValue: number | null }>({ geneSequence: null, researchValue: null });
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [contractAddress, setContractAddress] = useState("");
  const [fhevmInitializing, setFhevmInitializing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVerified, setFilterVerified] = useState(false);

  const { status, initialize, isInitialized } = useFhevm();
  const { encrypt, isEncrypting} = useEncrypt();
  const { verifyDecryption, isDecrypting: fheIsDecrypting } = useDecrypt();

  useEffect(() => {
    const initFhevmAfterConnection = async () => {
      if (!isConnected) return;
      if (isInitialized || fhevmInitializing) return;
      
      try {
        setFhevmInitializing(true);
        await initialize();
      } catch (error) {
        setTransactionStatus({ 
          visible: true, 
          status: "error", 
          message: "FHEVM initialization failed" 
        });
        setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      } finally {
        setFhevmInitializing(false);
      }
    };

    initFhevmAfterConnection();
  }, [isConnected, isInitialized, initialize, fhevmInitializing]);

  useEffect(() => {
    const loadDataAndContract = async () => {
      if (!isConnected) {
        setLoading(false);
        return;
      }
      
      try {
        await loadData();
        const contract = await getContractReadOnly();
        if (contract) setContractAddress(await contract.getAddress());
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDataAndContract();
  }, [isConnected]);

  const loadData = async () => {
    if (!isConnected) return;
    
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      const businessIds = await contract.getAllBusinessIds();
      const nftsList: GeneticNFT[] = [];
      
      for (const businessId of businessIds) {
        try {
          const businessData = await contract.getBusinessData(businessId);
          nftsList.push({
            id: parseInt(businessId.replace('genenft-', '')) || Date.now(),
            name: businessData.name,
            geneSequence: businessId,
            researchValue: businessId,
            timestamp: Number(businessData.timestamp),
            creator: businessData.creator,
            publicValue1: Number(businessData.publicValue1) || 0,
            publicValue2: Number(businessData.publicValue2) || 0,
            isVerified: businessData.isVerified,
            decryptedValue: Number(businessData.decryptedValue) || 0
          });
        } catch (e) {
          console.error('Error loading business data:', e);
        }
      }
      
      setGeneticNFTs(nftsList);
    } catch (e) {
      setTransactionStatus({ visible: true, status: "error", message: "Failed to load data" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally { 
      setIsRefreshing(false); 
    }
  };

  const createNFT = async () => {
    if (!isConnected || !address) { 
      setTransactionStatus({ visible: true, status: "error", message: "Please connect wallet first" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return; 
    }
    
    setCreatingNFT(true);
    setTransactionStatus({ visible: true, status: "pending", message: "Creating Genetic NFT with Zama FHE..." });
    
    try {
      const contract = await getContractWithSigner();
      if (!contract) throw new Error("Failed to get contract with signer");
      
      const geneValue = parseInt(newNFTData.geneSequence) || 0;
      const businessId = `genenft-${Date.now()}`;
      
      const encryptedResult = await encrypt(contractAddress, address, geneValue);
      
      const tx = await contract.createBusinessData(
        businessId,
        newNFTData.name,
        encryptedResult.encryptedData,
        encryptedResult.proof,
        parseInt(newNFTData.researchValue) || 0,
        0,
        "Genetic NFT Data"
      );
      
      setTransactionStatus({ visible: true, status: "pending", message: "Waiting for transaction confirmation..." });
      await tx.wait();
      
      setTransactionStatus({ visible: true, status: "success", message: "Genetic NFT created successfully!" });
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
      
      await loadData();
      setShowCreateModal(false);
      setNewNFTData({ name: "", geneSequence: "", researchValue: "" });
    } catch (e: any) {
      const errorMessage = e.message?.includes("user rejected transaction") 
        ? "Transaction rejected by user" 
        : "Submission failed: " + (e.message || "Unknown error");
      setTransactionStatus({ visible: true, status: "error", message: errorMessage });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally { 
      setCreatingNFT(false); 
    }
  };

  const decryptData = async (businessId: string): Promise<number | null> => {
    if (!isConnected || !address) { 
      setTransactionStatus({ visible: true, status: "error", message: "Please connect wallet first" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return null; 
    }
    
    setIsDecrypting(true);
    try {
      const contractRead = await getContractReadOnly();
      if (!contractRead) return null;
      
      const businessData = await contractRead.getBusinessData(businessId);
      if (businessData.isVerified) {
        const storedValue = Number(businessData.decryptedValue) || 0;
        
        setTransactionStatus({ 
          visible: true, 
          status: "success", 
          message: "Data already verified on-chain" 
        });
        setTimeout(() => {
          setTransactionStatus({ visible: false, status: "pending", message: "" });
        }, 2000);
        
        return storedValue;
      }
      
      const contractWrite = await getContractWithSigner();
      if (!contractWrite) return null;
      
      const encryptedValueHandle = await contractRead.getEncryptedValue(businessId);
      
      const result = await verifyDecryption(
        [encryptedValueHandle],
        contractAddress,
        (abiEncodedClearValues: string, decryptionProof: string) => 
          contractWrite.verifyDecryption(businessId, abiEncodedClearValues, decryptionProof)
      );
      
      setTransactionStatus({ visible: true, status: "pending", message: "Verifying decryption on-chain..." });
      
      const clearValue = result.decryptionResult.clearValues[encryptedValueHandle];
      
      await loadData();
      
      setTransactionStatus({ visible: true, status: "success", message: "Genetic data decrypted and verified successfully!" });
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
      
      return Number(clearValue);
      
    } catch (e: any) { 
      if (e.message?.includes("Data already verified")) {
        setTransactionStatus({ 
          visible: true, 
          status: "success", 
          message: "Data is already verified on-chain" 
        });
        setTimeout(() => {
          setTransactionStatus({ visible: false, status: "pending", message: "" });
        }, 2000);
        
        await loadData();
        return null;
      }
      
      setTransactionStatus({ 
        visible: true, 
        status: "error", 
        message: "Decryption failed: " + (e.message || "Unknown error") 
      });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return null; 
    } finally { 
      setIsDecrypting(false); 
    }
  };

  const analyzeGeneticData = (nft: GeneticNFT, decryptedGene: number | null, decryptedResearch: number | null): ResearchAnalysis => {
    const geneValue = nft.isVerified ? (nft.decryptedValue || 0) : (decryptedGene || nft.publicValue1 || 5);
    const researchValue = nft.publicValue1 || 5;
    
    const baseUniqueness = Math.min(100, Math.round((geneValue * 0.7 + researchValue * 0.3) * 10));
    const timeFactor = Math.max(0.7, Math.min(1.3, 1 - (Date.now()/1000 - nft.timestamp) / (60 * 60 * 24 * 30)));
    const uniquenessScore = Math.round(baseUniqueness * timeFactor);
    
    const researchPotential = Math.round(geneValue * 0.8 + researchValue * 0.2);
    const compatibility = Math.round(researchValue * 8 + Math.log(geneValue + 1) * 2);
    
    const privacyRisk = Math.max(10, Math.min(90, 100 - (geneValue * 0.1 + researchValue * 5)));
    const marketValue = Math.min(95, Math.round((geneValue * 0.4 + researchValue * 0.6) * 12));

    return {
      uniquenessScore,
      researchPotential,
      compatibility,
      privacyRisk,
      marketValue
    };
  };

  const filteredNFTs = geneticNFTs.filter(nft => {
    const matchesSearch = nft.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !filterVerified || nft.isVerified;
    return matchesSearch && matchesFilter;
  });

  const renderDashboard = () => {
    const totalNFTs = geneticNFTs.length;
    const verifiedNFTs = geneticNFTs.filter(nft => nft.isVerified).length;
    const avgResearchValue = geneticNFTs.length > 0 
      ? geneticNFTs.reduce((sum, nft) => sum + nft.publicValue1, 0) / geneticNFTs.length 
      : 0;
    
    const recentNFTs = geneticNFTs.filter(nft => 
      Date.now()/1000 - nft.timestamp < 60 * 60 * 24 * 7
    ).length;

    return (
      <div className="dashboard-panels">
        <div className="panel tech-panel">
          <h3>Total Genetic NFTs</h3>
          <div className="stat-value">{totalNFTs}</div>
          <div className="stat-trend">+{recentNFTs} this week</div>
        </div>
        
        <div className="panel tech-panel">
          <h3>Verified Data</h3>
          <div className="stat-value">{verifiedNFTs}/{totalNFTs}</div>
          <div className="stat-trend">FHE Verified</div>
        </div>
        
        <div className="panel tech-panel">
          <h3>Avg Research Value</h3>
          <div className="stat-value">{avgResearchValue.toFixed(1)}/10</div>
          <div className="stat-trend">Encrypted Protection</div>
        </div>
      </div>
    );
  };

  const renderAnalysisChart = (nft: GeneticNFT, decryptedGene: number | null, decryptedResearch: number | null) => {
    const analysis = analyzeGeneticData(nft, decryptedGene, decryptedResearch);
    
    return (
      <div className="analysis-chart">
        <div className="chart-row">
          <div className="chart-label">Uniqueness Score</div>
          <div className="chart-bar">
            <div 
              className="bar-fill" 
              style={{ width: `${analysis.uniquenessScore}%` }}
            >
              <span className="bar-value">{analysis.uniquenessScore}</span>
            </div>
          </div>
        </div>
        <div className="chart-row">
          <div className="chart-label">Research Potential</div>
          <div className="chart-bar">
            <div 
              className="bar-fill" 
              style={{ width: `${Math.min(100, analysis.researchPotential)}%` }}
            >
              <span className="bar-value">{analysis.researchPotential}</span>
            </div>
          </div>
        </div>
        <div className="chart-row">
          <div className="chart-label">Compatibility</div>
          <div className="chart-bar">
            <div 
              className="bar-fill" 
              style={{ width: `${analysis.compatibility}%` }}
            >
              <span className="bar-value">{analysis.compatibility}</span>
            </div>
          </div>
        </div>
        <div className="chart-row">
          <div className="chart-label">Privacy Risk</div>
          <div className="chart-bar">
            <div 
              className="bar-fill risk" 
              style={{ width: `${analysis.privacyRisk}%` }}
            >
              <span className="bar-value">{analysis.privacyRisk}</span>
            </div>
          </div>
        </div>
        <div className="chart-row">
          <div className="chart-label">Market Value</div>
          <div className="chart-bar">
            <div 
              className="bar-fill growth" 
              style={{ width: `${analysis.marketValue}%` }}
            >
              <span className="bar-value">{analysis.marketValue}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFHEFlow = () => {
    return (
      <div className="fhe-flow">
        <div className="flow-step">
          <div className="step-icon">1</div>
          <div className="step-content">
            <h4>Gene Encryption</h4>
            <p>Genetic data encrypted with Zama FHE 🔐</p>
          </div>
        </div>
        <div className="flow-arrow">→</div>
        <div className="flow-step">
          <div className="step-icon">2</div>
          <div className="step-content">
            <h4>NFT Minting</h4>
            <p>Encrypted data stored on-chain as Genetic NFT</p>
          </div>
        </div>
        <div className="flow-arrow">→</div>
        <div className="flow-step">
          <div className="step-icon">3</div>
          <div className="step-content">
            <h4>Research Authorization</h4>
            <p>Selective decryption for approved research</p>
          </div>
        </div>
        <div className="flow-arrow">→</div>
        <div className="flow-step">
          <div className="step-icon">4</div>
          <div className="step-content">
            <h4>Profit Sharing</h4>
            <p>Revenue distribution through smart contracts</p>
          </div>
        </div>
      </div>
    );
  };

  if (!isConnected) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="logo">
            <h1>GeneNFT_Z 🔬</h1>
            <p>基因隐私NFT - 加密授权科研</p>
          </div>
          <div className="header-actions">
            <div className="wallet-connect-wrapper">
              <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false}/>
            </div>
          </div>
        </header>
        
        <div className="connection-prompt">
          <div className="connection-content">
            <div className="connection-icon">🧬</div>
            <h2>连接钱包进入基因隐私NFT系统</h2>
            <p>通过FHE全同态加密技术保护您的基因数据隐私，实现安全的科研授权变现</p>
            <div className="connection-steps">
              <div className="step">
                <span>1</span>
                <p>连接钱包开始使用</p>
              </div>
              <div className="step">
                <span>2</span>
                <p>FHE系统自动初始化</p>
              </div>
              <div className="step">
                <span>3</span>
                <p>创建加密基因NFT并授权研究</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isInitialized || fhevmInitializing) {
    return (
      <div className="loading-screen">
        <div className="fhe-spinner"></div>
        <p>初始化FHE加密系统...</p>
        <p>状态: {fhevmInitializing ? "初始化FHEVM" : status}</p>
        <p className="loading-note">这可能需要一些时间</p>
      </div>
    );
  }

  if (loading) return (
    <div className="loading-screen">
      <div className="fhe-spinner"></div>
      <p>加载加密基因NFT系统...</p>
    </div>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <h1>GeneNFT_Z 🧬</h1>
          <p>基因隐私NFT · 加密授权科研</p>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="create-btn neon-btn"
          >
            + 铸造基因NFT
          </button>
          <div className="wallet-connect-wrapper">
            <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false}/>
          </div>
        </div>
      </header>
      
      <div className="main-content-container">
        <div className="dashboard-section">
          <h2>基因数据加密看板 (FHE 🔐)</h2>
          {renderDashboard()}
          
          <div className="panel tech-panel full-width">
            <h3>FHE 🔐 同态加密流程</h3>
            {renderFHEFlow()}
          </div>

          <div className="search-filter-section">
            <div className="search-box">
              <input
                type="text"
                placeholder="搜索基因NFT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-options">
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={filterVerified}
                  onChange={(e) => setFilterVerified(e.target.checked)}
                />
                <span>仅显示已验证数据</span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="nfts-section">
          <div className="section-header">
            <h2>基因NFT收藏 ({filteredNFTs.length})</h2>
            <div className="header-actions">
              <button 
                onClick={loadData} 
                className="refresh-btn neon-btn" 
                disabled={isRefreshing}
              >
                {isRefreshing ? "刷新中..." : "刷新列表"}
              </button>
            </div>
          </div>
          
          <div className="nfts-grid">
            {filteredNFTs.length === 0 ? (
              <div className="no-nfts">
                <p>未找到基因NFT</p>
                <button 
                  className="create-btn neon-btn" 
                  onClick={() => setShowCreateModal(true)}
                >
                  铸造第一个NFT
                </button>
              </div>
            ) : filteredNFTs.map((nft, index) => (
              <div 
                className={`nft-card ${selectedNFT?.id === nft.id ? "selected" : ""} ${nft.isVerified ? "verified" : ""}`} 
                key={index}
                onClick={() => setSelectedNFT(nft)}
              >
                <div className="card-header">
                  <div className="nft-title">{nft.name}</div>
                  <div className={`verification-badge ${nft.isVerified ? "verified" : "pending"}`}>
                    {nft.isVerified ? "✅ 已验证" : "🔓 待验证"}
                  </div>
                </div>
                <div className="card-content">
                  <div className="nft-meta">
                    <span>研究价值: {nft.publicValue1}/10</span>
                    <span>创建: {new Date(nft.timestamp * 1000).toLocaleDateString()}</span>
                  </div>
                  <div className="nft-creator">
                    创建者: {nft.creator.substring(0, 6)}...{nft.creator.substring(38)}
                  </div>
                  {nft.isVerified && nft.decryptedValue && (
                    <div className="decrypted-info">
                      基因序列值: {nft.decryptedValue}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {showCreateModal && (
        <ModalCreateNFT 
          onSubmit={createNFT} 
          onClose={() => setShowCreateModal(false)} 
          creating={creatingNFT} 
          nftData={newNFTData} 
          setNFTData={setNewNFTData}
          isEncrypting={isEncrypting}
        />
      )}
      
      {selectedNFT && (
        <NFTDetailModal 
          nft={selectedNFT} 
          onClose={() => { 
            setSelectedNFT(null); 
            setDecryptedData({ geneSequence: null, researchValue: null }); 
          }} 
          decryptedData={decryptedData} 
          setDecryptedData={setDecryptedData} 
          isDecrypting={isDecrypting || fheIsDecrypting} 
          decryptData={() => decryptData(selectedNFT.geneSequence)}
          renderAnalysisChart={renderAnalysisChart}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="fhe-spinner"></div>}
              {transactionStatus.status === "success" && <div className="success-icon">✓</div>}
              {transactionStatus.status === "error" && <div className="error-icon">✗</div>}
            </div>
            <div className="transaction-message">{transactionStatus.message}</div>
          </div>
        </div>
      )}
    </div>
  );
};

const ModalCreateNFT: React.FC<{
  onSubmit: () => void; 
  onClose: () => void; 
  creating: boolean;
  nftData: any;
  setNFTData: (data: any) => void;
  isEncrypting: boolean;
}> = ({ onSubmit, onClose, creating, nftData, setNFTData, isEncrypting }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'geneSequence') {
      const intValue = value.replace(/[^\d]/g, '');
      setNFTData({ ...nftData, [name]: intValue });
    } else {
      setNFTData({ ...nftData, [name]: value });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="create-nft-modal">
        <div className="modal-header">
          <h2>铸造新的基因NFT</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice">
            <strong>FHE 🔐 同态加密</strong>
            <p>基因序列值将使用Zama FHE进行加密（仅限整数）</p>
          </div>
          
          <div className="form-group">
            <label>NFT名称 *</label>
            <input 
              type="text" 
              name="name" 
              value={nftData.name} 
              onChange={handleChange} 
              placeholder="输入基因NFT名称..." 
            />
          </div>
          
          <div className="form-group">
            <label>基因序列值（整数） *</label>
            <input 
              type="number" 
              name="geneSequence" 
              value={nftData.geneSequence} 
              onChange={handleChange} 
              placeholder="输入基因序列数值..." 
              step="1"
              min="0"
            />
            <div className="data-type-label">FHE加密整数</div>
          </div>
          
          <div className="form-group">
            <label>研究价值评分 (1-10) *</label>
            <input 
              type="number" 
              min="1" 
              max="10" 
              name="researchValue" 
              value={nftData.researchValue} 
              onChange={handleChange} 
              placeholder="输入研究价值评分..." 
            />
            <div className="data-type-label">公开数据</div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="cancel-btn">取消</button>
          <button 
            onClick={onSubmit} 
            disabled={creating || isEncrypting || !nftData.name || !nftData.geneSequence || !nftData.researchValue} 
            className="submit-btn neon-btn"
          >
            {creating || isEncrypting ? "加密并铸造中..." : "铸造基因NFT"}
          </button>
        </div>
      </div>
    </div>
  );
};

const NFTDetailModal: React.FC<{
  nft: GeneticNFT;
  onClose: () => void;
  decryptedData: { geneSequence: number | null; researchValue: number | null };
  setDecryptedData: (value: { geneSequence: number | null; researchValue: number | null }) => void;
  isDecrypting: boolean;
  decryptData: () => Promise<number | null>;
  renderAnalysisChart: (nft: GeneticNFT, decryptedGene: number | null, decryptedResearch: number | null) => JSX.Element;
}> = ({ nft, onClose, decryptedData, setDecryptedData, isDecrypting, decryptData, renderAnalysisChart }) => {
  const handleDecrypt = async () => {
    if (decryptedData.geneSequence !== null) { 
      setDecryptedData({ geneSequence: null, researchValue: null }); 
      return; 
    }
    
    const decrypted = await decryptData();
    if (decrypted !== null) {
      setDecryptedData({ geneSequence: decrypted, researchValue: decrypted });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="nft-detail-modal">
        <div className="modal-header">
          <h2>基因NFT详情</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="nft-info">
            <div className="info-item">
              <span>NFT名称:</span>
              <strong>{nft.name}</strong>
            </div>
            <div className="info-item">
              <span>创建者:</span>
              <strong>{nft.creator.substring(0, 6)}...{nft.creator.substring(38)}</strong>
            </div>
            <div className="info-item">
              <span>创建时间:</span>
              <strong>{new Date(nft.timestamp * 1000).toLocaleDateString()}</strong>
            </div>
            <div className="info-item">
              <span>研究价值评分:</span>
              <strong>{nft.publicValue1}/10</strong>
            </div>
          </div>
          
          <div className="data-section">
            <h3>加密基因数据</h3>
            
            <div className="data-row">
              <div className="data-label">基因序列值:</div>
              <div className="data-value">
                {nft.isVerified && nft.decryptedValue ? 
                  `${nft.decryptedValue} (链上已验证)` : 
                  decryptedData.geneSequence !== null ? 
                  `${decryptedData.geneSequence} (本地解密)` : 
                  "🔒 FHE加密整数"
                }
              </div>
              <button 
                className={`decrypt-btn neon-btn ${(nft.isVerified || decryptedData.geneSequence !== null) ? 'decrypted' : ''}`}
                onClick={handleDecrypt} 
                disabled={isDecrypting}
              >
                {isDecrypting ? (
                  "🔓 验证中..."
                ) : nft.isVerified ? (
                  "✅ 已验证"
                ) : decryptedData.geneSequence !== null ? (
                  "🔄 重新验证"
                ) : (
                  "🔓 验证解密"
                )}
              </button>
            </div>
            
            <div className="fhe-info">
              <div className="fhe-icon">🔐</div>
              <div>
                <strong>FHE 🔐 自中继解密</strong>
                <p>数据在链上加密。点击"验证解密"执行离线解密，使用FHE.checkSignatures进行链上验证。</p>
              </div>
            </div>
          </div>
          
          {(nft.isVerified || decryptedData.geneSequence !== null) && (
            <div className="analysis-section">
              <h3>实时研究分析</h3>
              {renderAnalysisChart(
                nft, 
                nft.isVerified ? nft.decryptedValue || null : decryptedData.geneSequence, 
                null
              )}
              
              <div className="decrypted-values">
                <div className="value-item">
                  <span>基因序列值:</span>
                  <strong>
                    {nft.isVerified ? 
                      `${nft.decryptedValue} (链上已验证)` : 
                      `${decryptedData.geneSequence} (本地解密)`
                    }
                  </strong>
                  <span className={`data-badge ${nft.isVerified ? 'verified' : 'local'}`}>
                    {nft.isVerified ? '链上验证' : '本地解密'}
                  </span>
                </div>
                <div className="value-item">
                  <span>研究价值:</span>
                  <strong>{nft.publicValue1}/10</strong>
                  <span className="data-badge public">公开数据</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="close-btn">关闭</button>
          {!nft.isVerified && (
            <button 
              onClick={handleDecrypt} 
              disabled={isDecrypting}
              className="verify-btn neon-btn"
            >
              {isDecrypting ? "链上验证中..." : "链上验证"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;


