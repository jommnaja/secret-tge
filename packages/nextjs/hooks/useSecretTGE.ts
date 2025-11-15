"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDeployedContractInfo } from "./helper";
import { useWagmiEthers } from "./wagmi/useWagmiEthers";
import { FhevmInstance } from "@fhevm-sdk";
import { buildParamsFromAbi, useFHEDecrypt, useFHEEncryption, useInMemoryStorage } from "@fhevm-sdk";
import { ethers } from "ethers";
import { useReadContract } from "wagmi";

export const useSecretTGE = (options: { instance?: FhevmInstance; mockChains?: Record<number, string> }) => {
  const { instance, mockChains } = options;
  const { storage: decryptionCache } = useInMemoryStorage();
  const { accounts, chainId, ethersSigner, ethersReadonlyProvider, isConnected } = useWagmiEthers(mockChains);

  const activeChain = typeof chainId === "number" ? chainId : undefined;

  const { data: tgeContractInfo } = useDeployedContractInfo({
    contractName: "FHESecretTGE",
    chainId: activeChain,
  });

  const [statusMsg, setStatusMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const hasContract = Boolean(tgeContractInfo?.address && tgeContractInfo?.abi);

  const getContractInstance = (mode: "read" | "write") => {
    if (!hasContract) return undefined;
    const providerOrSigner = mode === "read" ? ethersReadonlyProvider : ethersSigner;
    if (!providerOrSigner) return undefined;
    return new ethers.Contract(tgeContractInfo!.address, tgeContractInfo!.abi, providerOrSigner);
  };

  // Fetch user's encrypted prediction
  const { data: rawPrediction, refetch: reloadPrediction } = useReadContract({
    address: hasContract ? tgeContractInfo!.address : undefined,
    abi: hasContract ? tgeContractInfo!.abi : undefined,
    functionName: "encryptedPredictionOf",
    args: [accounts ? accounts[0] : ""],
    query: { enabled: hasContract && Boolean(ethersReadonlyProvider) },
  });

  const predictionHandle = useMemo(() => rawPrediction as string | undefined, [rawPrediction]);

  const userHasPredicted = useMemo(() => {
    if (!predictionHandle) return false;
    return predictionHandle !== ethers.ZeroHash && predictionHandle !== "0x0";
  }, [predictionHandle]);

  const decryptParams = useMemo(() => {
    if (!userHasPredicted || !predictionHandle || !tgeContractInfo?.address) return undefined;
    return [{ handle: predictionHandle, contractAddress: tgeContractInfo.address }] as const;
  }, [predictionHandle, userHasPredicted, tgeContractInfo?.address]);

  const {
    canDecrypt,
    decrypt,
    results,
    isDecrypting,
    message: decryptMsg,
  } = useFHEDecrypt({
    instance,
    ethersSigner: ethersSigner as any,
    chainId,
    requests: decryptParams,
    fhevmDecryptionSignatureStorage: decryptionCache,
  });

  useEffect(() => {
    if (decryptMsg) setStatusMsg(decryptMsg);
  }, [decryptMsg]);

  const clearPredictionValue = useMemo(() => {
    if (!predictionHandle || !results) return undefined;
    const val = results[predictionHandle];
    if (typeof val === "undefined") return undefined;
    return { handle: predictionHandle, clear: val } as const;
  }, [predictionHandle, results]);

  const predictionDecrypted = useMemo(() => {
    if (!predictionHandle || !results) return false;
    const val = results[predictionHandle];
    return typeof val !== "undefined" && BigInt(val) !== BigInt(0);
  }, [predictionHandle, results]);

  // ✅ Call hook at top-level
  const { encryptWith } = useFHEEncryption({
    instance,
    ethersSigner: ethersSigner as any,
    contractAddress: tgeContractInfo?.address,
  });

  const submitPrediction = useCallback(
    async (time: string, datePrediction: number) => {
      if (loading || !accounts?.[0] || !hasContract) return;
      setLoading(true);
      setStatusMsg(`Encrypting prediction ${datePrediction} for ${time}...`);

      try {
        // Chỉ gọi encryptWith, KHÔNG gọi hook trong callback
        const encrypted = await encryptWith(builder => {
          (builder as any)["add32"](datePrediction);
        });

        if (!encrypted) throw new Error("Encryption failed");

        const writeContract = getContractInstance("write");
        if (!writeContract) throw new Error("Contract signer missing");

        const params = buildParamsFromAbi(encrypted, tgeContractInfo!.abi, "submitPrediction");

        const tx = await writeContract.submitPrediction(...params, {
          gasLimit: 300_000,
        });

        setStatusMsg("Waiting for transaction confirmation...");
        await tx.wait();
        setStatusMsg(`Prediction submitted for ${time}`);
        await reloadPrediction();
      } catch (err) {
        setStatusMsg(`Error submitting prediction: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    },
    [accounts, hasContract, tgeContractInfo?.abi, encryptWith, loading, reloadPrediction],
  );

  useEffect(() => setStatusMsg(""), [accounts, chainId]);

  return {
    contractAddress: tgeContractInfo?.address,
    canDecrypt,
    decryptMyPrediction: decrypt,
    predictionDecrypted,
    submitPrediction,
    clearPrediction: clearPredictionValue?.clear,
    predictionHandle,
    isDecrypting,
    statusMsg,
    userHasPredicted,
    accounts,
    chainId,
    isConnected,
    ethersSigner,
    reloadPrediction,
    loading,
  };
};
