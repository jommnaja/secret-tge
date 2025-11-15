// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHESecretTGE
 * @notice Privacy-first prediction dApp for guessing a project's Token Generation Event (TGE) date.
 *         Users submit encrypted predictions and may update them anytime. Contract stores only encrypted data.
 * @dev Uses FHE primitives for ingesting external encrypted values and allowing controlled decryption.
 */
contract FHESecretTGE is SepoliaConfig {
    /// @dev encrypted prediction per user
    mapping(address => euint32) private _encPredictions;

    /// @dev whether an address has ever predicted
    mapping(address => bool) private _hasPredicted;

    /// @dev last update timestamp of prediction (unix)
    mapping(address => uint256) private _predictedAt;

    /// @dev small on-chain record event (only metadata, no plaintext)
    event PredictionSubmitted(address indexed predictor, uint256 timestamp);

    /// @notice Submit or update an encrypted TGE prediction
    /// @param encryptedPrediction External encrypted integer representing the predicted date (format agreed off-chain)
    /// @param proof Zero-knowledge proof required by FHE.fromExternal
    function submitPrediction(externalEuint32 encryptedPrediction, bytes calldata proof) external {
        // convert external to internal encrypted value (verifies proof)
        euint32 internalEnc = FHE.fromExternal(encryptedPrediction, proof);

        _encPredictions[msg.sender] = internalEnc;
        _hasPredicted[msg.sender] = true;
        _predictedAt[msg.sender] = block.timestamp;

        // allow the predictor and this contract to decrypt the stored ciphertext
        FHE.allow(_encPredictions[msg.sender], msg.sender);
        FHE.allowThis(_encPredictions[msg.sender]);

        emit PredictionSubmitted(msg.sender, block.timestamp);
    }

    /// @notice Check whether an address has submitted a prediction
    /// @param user Address to check
    /// @return true if user has previously predicted
    function hasPrediction(address user) external view returns (bool) {
        return _hasPredicted[user];
    }

    /// @notice Retrieve encrypted prediction (decryptable only by allowed parties)
    /// @param user Address whose encrypted prediction to get
    /// @return Encrypted prediction value (euint32)
    function encryptedPredictionOf(address user) external view returns (euint32) {
        return _encPredictions[user];
    }

    /// @notice Get last update time of a prediction
    /// @param user Address to query
    /// @return unix timestamp when prediction was last submitted
    function predictionTimestamp(address user) external view returns (uint256) {
        return _predictedAt[user];
    }

    /**
     * @notice Optionally allow a user to grant decryption rights of their stored ciphertext to another address.
     * @dev Predictor must call this via an off-chain FHE flow where the ciphertext is accessible for allow().
     *      This helper exposes FHE.allow on the stored value so an external party can be granted decryption permission.
     * @param grantee Address to grant decryption permission to
     */
    function grantDecryption(address grantee) external {
        // must have an existing encrypted prediction
        require(_hasPredicted[msg.sender], "no prediction");
        FHE.allow(_encPredictions[msg.sender], grantee);
    }
}
