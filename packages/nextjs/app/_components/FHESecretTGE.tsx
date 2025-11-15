"use client";

import { useEffect, useMemo, useState } from "react";
import { useFhevm } from "@fhevm-sdk";
import "@mantine/core/styles.css";
import { DatePicker } from "@mantine/dates";
import "@mantine/dates/styles.css";
import { AnimatePresence, motion } from "framer-motion";
import FadeLoader from "react-spinners/FadeLoader";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { useSecretTGE } from "~~/hooks/useSecretTGE";

// --- Constants ---
const PRIMARY_COLOR = "#1db954"; // màu xanh neon cho các nút
const TEXT_COLOR = "#e0e0e0"; // chữ sáng trên nền tối
const BUTTON_BASE_STYLES =
  "px-2 py-3 rounded-lg font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200";

// FHEVM Mock Chains Configuration
const MOCK_CHAIN_ID_SEPOLIA = 11155111;
const ALCHEMY_URL = `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;
const INITIAL_MOCK_CHAINS = {
  [MOCK_CHAIN_ID_SEPOLIA]: ALCHEMY_URL,
};

export const FHESecretTGE = () => {
  const { isConnected, chain } = useAccount();
  const chainId = chain?.id;

  const provider = useMemo(() => (typeof window !== "undefined" ? (window as any).ethereum : undefined), []);

  const { instance: fhevmInstance } = useFhevm({
    provider,
    chainId,
    initialMockChains: INITIAL_MOCK_CHAINS,
    enabled: true,
  });

  const tge = useSecretTGE({
    instance: fhevmInstance,
    mockChains: INITIAL_MOCK_CHAINS,
  });

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (tge.loading || tge.isDecrypting) return;
    if (!selectedDate) {
      return;
    }
    let dateObj = new Date(selectedDate);
    if (isNaN(dateObj.getTime())) {
      console.error("Invalid date selected:", selectedDate);
      return;
    }
    const timestampInSeconds = Math.floor(dateObj.getTime() / 1000);
    try {
      await tge.submitPrediction("defaultProject", timestampInSeconds);
    } catch (err) {
      console.error("Failed to submit prediction:", err);
    }
  };

  // Chuyển timestamp hoặc ISO string sang Date "local midnight"
  function toSimpleDate(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  useEffect(() => {
    if (tge.predictionDecrypted && tge.clearPrediction) {
      const date = new Date(Number(tge.clearPrediction) * 1000);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0"); // Month từ 0
      const dd = String(date.getDate()).padStart(2, "0");

      const formatted = `${yyyy}-${mm}-${dd}`;

      if (date) {
        console.log(formatted);
        setSelectedDate(formatted);
      }
    }
  }, [tge.predictionDecrypted, tge.clearPrediction]);

  if (!isConnected) {
    return (
      <div className="flex min-h-[calc(100vh-56px)] w-full items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-[#111111] border border-gray-800 shadow-2xl rounded-xl p-10 max-w-md text-center"
        >
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-3 text-[#e0e0e0]">Wallet Not Connected</h2>
          <p className="text-gray-400 mb-6">Please connect your wallet to participate.</p>
          <RainbowKitCustomConnectButton />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative w-full min-h-[calc(100vh-60px)] text-gray-200 overflow-hidden flex flex-col items-center justify-start py-10 px-4"
    >
      {/* Background Gradient */}
      <motion.div
        className="absolute inset-0 -z-10"
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        style={{
          backgroundImage: "linear-gradient(135deg, #0a0a0a, #1a1a2e, #162447, #1f4068)",
          backgroundSize: "400% 400%",
        }}
      />

      {/* Loading Overlay */}
      {(tge.loading || tge.isDecrypting) && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 backdrop-blur-sm">
          <FadeLoader color={PRIMARY_COLOR} size={45} />
        </div>
      )}

      <motion.div
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="flex flex-col items-start max-w-3xl space-y-4 px-4 md:px-0"
      >
        <h1 className="text-4xl md:text-6xl font-extrabold text-[#1db954] drop-shadow-2xl">
          Secret FHE TGE Prediction
        </h1>

        <p className="text-gray-300 text-lg md:text-xl leading-relaxed">
          This DApp allows the community to <span className="text-[#00ffff] font-semibold">anonymously submit </span>
          and <span className="text-[#00ffff] font-semibold">view predictions</span> for the TGE (Token Generation
          Event) date of <strong className="text-[#1db954]">Zama</strong>.
        </p>

        <p className="text-gray-300 text-lg md:text-xl leading-relaxed">
          <strong className="text-[#1db954]">Zama</strong> is a platform leveraging
          <em className="text-[#00ffff] font-semibold"> Fully Homomorphic Encryption (FHE)</em> on Ethereum, allowing{" "}
          <span className="text-[#ff6ec7] font-semibold"> computations on encrypted data </span>
          without revealing sensitive information. Through this DApp, participants can safely provide their time-based
          predictions, which can later be decrypted once the TGE date is revealed.
        </p>
      </motion.div>

      {/* Main Row */}
      <div className="flex flex-col md:flex-row mt-10 w-full max-w-[780px] md:space-y-0 md:space-x-12">
        {/* Left: DatePicker */}
        <div className="flex-1 flex justify-center">
          <DatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            label="Select TGE Date"
            placeholder="Pick a date..."
            classNames={{
              input:
                "w-full md:w-[400px] h-16 text-lg rounded-xl shadow-md border-gray-700 bg-[#1a1a1a] text-[#e0e0e0]",
              label: "text-[#e0e0e0] text-lg font-medium",
            }}
            styles={{
              day: { color: PRIMARY_COLOR, fontSize: "1.1rem", width: "3rem", height: "3rem" },
              monthLabel: { fontSize: "1.2rem", fontWeight: 600, color: "#e0e0e0" },
              weekday: { fontSize: "1rem", color: "#a0a0a0" },
              dropdown: { minWidth: "420px", padding: "1rem", backgroundColor: "#111111", color: "#e0e0e0" },
            }}
          />
        </div>

        {/* Right: Buttons + Status + Decrypted */}
        <div className="flex-1 flex flex-col items-center md:items-start">
          <p className="text-gray-300 text-lg md:text-xl leading-relaxed mb-44">
            Submit and view your predictions for the TGE date of <strong className="text-[#1db954]">Zama</strong>.
          </p>

          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full justify-center md:justify-start">
            <button
              disabled={!selectedDate || tge.loading || tge.isDecrypting}
              onClick={handleSubmit}
              className={`${BUTTON_BASE_STYLES} bg-[#1db954] hover:bg-[#17a74a]`}
            >
              {tge.loading ? "⏳ Submitting..." : "✅ Submit Prediction"}
            </button>

            <button
              disabled={!tge.canDecrypt || tge.isDecrypting || tge.loading}
              onClick={tge.decryptMyPrediction}
              className={`${BUTTON_BASE_STYLES} bg-[#00aaff] hover:bg-[#008fcc]`}
            >
              {tge.isDecrypting ? "⏳ Decrypting..." : "🔓 Decrypt Prediction"}
            </button>
          </div>

          {/* Status Message */}
          {tge.statusMsg && (
            <AnimatePresence>
              <motion.div
                className="w-full p-4 bg-[#2a2a2a] text-[#ffc107] rounded-lg shadow-lg text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                {tge.statusMsg}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
};
