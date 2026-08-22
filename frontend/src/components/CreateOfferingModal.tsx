"use client";

import React, { useState } from "react";
import { PlusCircle, Lock, BookOpen, Clock, AlertCircle, Sparkles, X } from "lucide-react";
import { writeContract } from "@/lib/genlayer";
import { readContract } from "@/lib/genlayer";

type CreateOfferingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export const CreateOfferingModal: React.FC<CreateOfferingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [createdOfferingId, setCreatedOfferingId] = useState<bigint | null>(null);

  // Step 1: Base Offering
  const [title, setTitle] = useState("Autonomous AI Agents & Intelligent Contracts");
  const [courseId, setCourseId] = useState("AI-AGENTS-2026");
  const [feeEth, setFeeEth] = useState("0.05");
  const [durationHours, setDurationHours] = useState("32");
  const [termsUrl, setTermsUrl] = useState("https://arweave.net/terms-syllabusbond-v1-immutable-source-proof");
  const [termsDigest, setTermsDigest] = useState("sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");

  // Step 2: Curriculum & Instructor Lock
  const [curriculumDigest, setCurriculumDigest] = useState("sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069");
  const [instructor, setInstructor] = useState("Dr. Elena Rostova");

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setStatusMsg("Submitting offering commitments to GenLayer...");

    try {
      const feeWei = BigInt(Math.floor(parseFloat(feeEth) * 1e18));
      const durHours = BigInt(parseInt(durationHours, 10));

      const res = await writeContract("create_offering", [
        title,
        courseId,
        feeWei,
        durHours,
        termsUrl,
        termsDigest,
      ]);

      if (res.success) {
        const receipt = (res.data ?? {}) as Record<string, unknown>;
        let offeringId: bigint | null = null;
        for (const key of ["returnData", "result", "returnValue", "data"]) {
          const value = receipt[key];
          if (typeof value === "number" || typeof value === "string" || typeof value === "bigint") {
            try { offeringId = BigInt(value); break; } catch { /* try next representation */ }
          }
        }
        if (offeringId === null) {
          const counts = await readContract("get_counts", []);
          const countData = (counts.data ?? {}) as Record<string, unknown>;
          const count = countData.offering_count;
          if (typeof count === "number" || typeof count === "string" || typeof count === "bigint") offeringId = BigInt(count) - BigInt(1);
        }
        if (offeringId === null || offeringId < BigInt(0)) {
          setErrorMsg("Offering accepted, but no reliable offering ID was returned.");
          return;
        }
        setCreatedOfferingId(offeringId);
        setStatusMsg("Offering committed! Now locking curriculum & instructor...");
        setStep(2);
      } else {
        setErrorMsg(res.error || "Failed to create offering.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error creating offering.");
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setStatusMsg("Locking curriculum digest & instructor identity on-chain...");

    try {
      const res = await writeContract("lock_offering_curriculum", [
        createdOfferingId as bigint,
        curriculumDigest,
        instructor,
      ]);

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error || "Failed to lock curriculum.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error locking curriculum.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white border border-zinc-200 rounded-3xl max-w-xl w-full p-8 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div>
            <span className="eyebrow-badge mb-1">
              Step {step} of 2
            </span>
            <h3 className="text-xl font-bold text-zinc-900 tracking-tight">
              {step === 1 ? "Publish Syllabus Offering" : "Lock Curriculum & Instructor"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-zinc-200 hover:bg-zinc-100 flex items-center justify-center text-zinc-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {statusMsg && !errorMsg && (
          <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-700">
            {statusMsg}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Course / Offering Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Course Identifier</label>
                <input
                  type="text"
                  required
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Committed Duration (Hours)</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  required
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Tuition Fee (GEN)</label>
              <input
                type="text"
                required
                value={feeEth}
                onChange={(e) => setFeeEth(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Immutable Terms URL (Arweave/IPFS)</label>
              <input
                type="text"
                required
                value={termsUrl}
                onChange={(e) => setTermsUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Terms SHA-256 Digest</label>
              <input
                type="text"
                required
                value={termsDigest}
                onChange={(e) => setTermsDigest(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 font-mono"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn-halo-outline text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-halo-dark text-xs py-2 px-5"
              >
                {loading ? "Committing..." : "Proceed to Lock"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleStep2Submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Lead Instructor Identity</label>
              <input
                type="text"
                required
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Curriculum Commitment Digest (SHA-256)</label>
              <input
                type="text"
                required
                value={curriculumDigest}
                onChange={(e) => setCurriculumDigest(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 font-mono"
              />
              <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">
                This cryptographic digest locks the syllabus modules on-chain. GenLayer will verify delivery evidence against this hash.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={loading}
                className="btn-halo-outline text-xs py-2 px-4"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-halo-primary text-xs py-2 px-5"
              >
                <Lock className="w-3.5 h-3.5" />
                {loading ? "Finalizing..." : "Lock & Open Offering"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
