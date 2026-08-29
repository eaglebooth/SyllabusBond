"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { connectWallet, readContract, resolveCreatedOfferingId, writeContract } from "@/lib/genlayer";
import { parseGenInput } from "@/lib/amount";

export default function CreateOfferingPage() {
  const [account, setAccount] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [createdId, setCreatedId] = useState<bigint | null>(null);

  // Step 1: Course Identity
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [feeEth, setFeeEth] = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [termsUrl, setTermsUrl] = useState("");
  const [termsDigest, setTermsDigest] = useState("");

  // Step 2: Locked Commitments
  const [curriculumDigest, setCurriculumDigest] = useState("");
  const [instructor, setInstructor] = useState("");

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleConnectWallet = async () => {
    const res = await connectWallet();
    if (res.success && typeof res.data === "string") {
      setAccount(res.data);
    }
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      setErrorMsg("Please connect your wallet before publishing an offering.");
      return;
    }
    if (!title || !courseId || !feeEth || !durationHours || !termsUrl || !termsDigest) {
      setErrorMsg("Please fill in all course identity fields.");
      return;
    }
    setStep(2);
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!curriculumDigest || !instructor) {
      setErrorMsg("Please provide both curriculum digest and instructor identity.");
      return;
    }
    setStep(3);
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setErrorMsg("");
    setStatusMsg("Step 1/2: Submitting course terms to GenLayer contract...");

    try {
      const feeAmount = parseGenInput(feeEth);
      const durHours = BigInt(parseInt(durationHours, 10));
      const beforeResult = await readContract("get_counts");
      const beforeCount = beforeResult.success && beforeResult.data ? Number((beforeResult.data as { offering_count?: unknown }).offering_count) : NaN;
      if (!Number.isInteger(beforeCount)) throw new Error("Could not read the offering counter before submission.");

      const res1 = await writeContract("create_offering", [
        title,
        courseId,
        feeAmount,
        durHours,
        termsUrl,
        termsDigest,
      ]);

      if (!res1.success) {
        setErrorMsg(res1.error || "Failed to create offering.");
        setLoading(false);
        return;
      }

      const offeringId = await resolveCreatedOfferingId(beforeCount, account, title, courseId);
      if (offeringId === null) {
        setErrorMsg("Offering was accepted, but its ID could not be matched safely to this organizer and course.");
        return;
      }
      setCreatedId(offeringId);

      setStatusMsg("Step 2/2: Locking curriculum digest and instructor on-chain...");

      const res2 = await writeContract("lock_offering_curriculum", [
        offeringId,
        curriculumDigest,
        instructor,
      ]);

      if (res2.success) {
        const verified = await readContract("get_offering", [offeringId]);
        const offering = verified.success ? verified.data as { id?: number; status?: string } : null;
        if (!offering || Number(offering.id) !== Number(offeringId) || offering.status !== "OPEN") {
          setErrorMsg("Transactions were accepted, but the OPEN offering could not be verified by read-back.");
          return;
        }
        setIsSuccess(true);
      } else {
        setErrorMsg(res2.error || "Failed to lock curriculum.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error executing transactions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfaf7] text-[#1c1917]">
      <Header
        account={account}
        onConnectWallet={handleConnectWallet}
      />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8 w-full">
        <div>
          <Link href="/offerings" className="text-xs text-[#78716c] hover:text-[#1c1917] inline-block mb-3">
            ← Back to offerings
          </Link>
          <span className="text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider block">
            Organizer Studio
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#1c1917] tracking-tight">
            Publish an Escrow Offering
          </h1>
          <p className="text-xs sm:text-sm text-[#57534e] mt-1">
            Commit course schedule, tuition fee, instructor identity, and syllabus digest to immutable on-chain custody.
          </p>
        </div>

        {/* Stepper Navigation */}
        <div className="flex items-center justify-between border-b pb-4 text-xs font-semibold">
          <button
            onClick={() => setStep(1)}
            className={`pb-2 border-b-2 transition-colors cursor-pointer ${
              step === 1 ? "border-[#1e3a8a] text-[#1e3a8a]" : "border-transparent text-[#78716c]"
            }`}
          >
            1. Course Identity
          </button>
          <button
            onClick={() => step >= 2 && setStep(2)}
            disabled={step < 2}
            className={`pb-2 border-b-2 transition-colors cursor-pointer ${
              step === 2 ? "border-[#1e3a8a] text-[#1e3a8a]" : "border-transparent text-[#78716c]"
            }`}
          >
            2. Locked Commitments
          </button>
          <button
            onClick={() => step >= 3 && setStep(3)}
            disabled={step < 3}
            className={`pb-2 border-b-2 transition-colors cursor-pointer ${
              step === 3 ? "border-[#1e3a8a] text-[#1e3a8a]" : "border-transparent text-[#78716c]"
            }`}
          >
            3. Review & Lock
          </button>
        </div>

        {isSuccess ? (
          <div className="card-ledger p-8 text-center space-y-4 max-w-lg mx-auto">
            <div className="badge-academic badge-verified text-sm py-1 px-3 mx-auto">
              Offering Published & Locked
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#1c1917]">
              Course Ready for Enrollment
            </h2>
            <p className="text-xs text-[#57534e] leading-relaxed">
              Your syllabus commitment is now live on GenLayer. Students can inspect your terms and enroll with trustless escrow protection.
            </p>
            <div className="pt-2">
              <Link href="/offerings" className="btn-academic text-xs">
                View in Offerings Directory →
              </Link>
            </div>
          </div>
        ) : (
          <div className="card-ledger p-6 sm:p-8 space-y-6">
            {errorMsg && (
              <div className="notice-danger text-xs">
                {errorMsg}
              </div>
            )}

            {statusMsg && !errorMsg && (
              <div className="notice-info text-xs font-mono">
                {statusMsg}
              </div>
            )}

            {/* Step 1: Course Identity */}
            {step === 1 && (
              <form onSubmit={handleStep1Submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#44403c] mb-1">
                    Course Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Distributed Systems & Consensus Engineering"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input-academic"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#44403c] mb-1">
                      Course Code / Identifier
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CS-401-2026"
                      value={courseId}
                      onChange={(e) => setCourseId(e.target.value)}
                      className="input-academic font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#44403c] mb-1">
                      Scheduled Duration (Hours)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      required
                      placeholder="e.g. 40"
                      value={durationHours}
                      onChange={(e) => setDurationHours(e.target.value)}
                      className="input-academic"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#44403c] mb-1">
                    Tuition Escrow Fee (GEN)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0.05"
                    value={feeEth}
                    onChange={(e) => setFeeEth(e.target.value)}
                    className="input-academic font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#44403c] mb-1">
                    Public Terms Document URL
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="https://arweave.net/... or https://ipfs.io/ipfs/..."
                    value={termsUrl}
                    onChange={(e) => setTermsUrl(e.target.value)}
                    className="input-academic font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#44403c] mb-1">
                    Terms SHA-256 Digest
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="sha256:..."
                    value={termsDigest}
                    onChange={(e) => setTermsDigest(e.target.value)}
                    className="input-academic font-mono"
                  />
                  <p className="text-[12px] text-[#78716c] mt-1 leading-normal">
                    The cryptographic SHA-256 hash of your terms file. GenLayer validates raw fetched bytes against this hash.
                  </p>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <button type="submit" className="btn-academic text-xs">
                    Next: Locked Commitments →
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Locked Commitments */}
            {step === 2 && (
              <form onSubmit={handleStep2Submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#44403c] mb-1">
                    Primary Instructor Identity
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Alex Mercer"
                    value={instructor}
                    onChange={(e) => setInstructor(e.target.value)}
                    className="input-academic"
                  />
                  <p className="text-[12px] text-[#78716c] mt-1 leading-normal">
                    The committed instructor. Substituting instructors without student consent is assessed by the AI jury as a material delivery breach.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#44403c] mb-1">
                    Detailed Curriculum SHA-256 Digest
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="sha256:..."
                    value={curriculumDigest}
                    onChange={(e) => setCurriculumDigest(e.target.value)}
                    className="input-academic font-mono"
                  />
                  <p className="text-[12px] text-[#78716c] mt-1 leading-normal">
                    Digest of your detailed syllabus modules. This hash prevents silent omissions of difficult course topics.
                  </p>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-secondary text-xs"
                  >
                    ← Back
                  </button>
                  <button type="submit" className="btn-academic text-xs">
                    Next: Review & Summary →
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Review & Submit */}
            {step === 3 && (
              <div className="space-y-5">
                <h3 className="font-serif text-base font-bold text-[#1c1917]">
                  Review Offering Parameters Before Locking
                </h3>

                <div className="p-4 bg-[#f6f3eb] rounded border border-[#eae5d9] space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#78716c]">Course Title:</span>
                    <span className="font-semibold text-[#1c1917]">{title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#78716c]">Course Code:</span>
                    <span className="font-mono font-semibold text-[#1c1917]">{courseId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#78716c]">Scheduled Hours:</span>
                    <span className="font-semibold text-[#1c1917]">{durationHours} Hours</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#78716c]">Tuition Escrow Fee:</span>
                    <span className="font-mono font-bold text-[#1e3a8a]">{feeEth} GEN</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#78716c]">Lead Instructor:</span>
                    <span className="font-semibold text-[#1c1917]">{instructor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#78716c]">Curriculum Digest:</span>
                    <span className="font-mono text-[11px] text-[#57534e]">{curriculumDigest.slice(0, 20)}...</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={loading}
                    className="btn-secondary text-xs"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleFinalSubmit}
                    disabled={loading}
                    className="btn-academic text-xs"
                  >
                    {loading ? "Publishing on GenLayer..." : "Confirm & Lock on GenLayer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t bg-[#ffffff] py-8 text-xs text-[#78716c]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-serif font-bold text-[#1c1917]">SyllabusBond</span> — Course delivery escrow protocol
          </div>
          <div className="font-mono text-[11px]">Status: LIVE · STUDIONET</div>
        </div>
      </footer>
    </div>
  );
}
