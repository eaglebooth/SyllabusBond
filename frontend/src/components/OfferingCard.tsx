"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Offering } from "@/lib/types";
import { writeContract } from "@/lib/genlayer";

type OfferingCardProps = {
  offering: Offering;
  account: string;
  isEnrolled: boolean;
  onEnrolledSuccess: () => void;
  onSelectEnrollment: (offeringId: number) => void;
};

export const OfferingCard: React.FC<OfferingCardProps> = ({
  offering,
  account,
  isEnrolled,
  onEnrolledSuccess,
  onSelectEnrollment,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const feeFormatted = (offering.fee / 1e18).toFixed(4);
  const isOrganizer = account.toLowerCase() === offering.organizer.toLowerCase();

  const handleEnroll = async () => {
    if (!account) {
      setErrorMsg("Please connect your wallet first.");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await writeContract("enroll", [BigInt(offering.id)], BigInt(offering.fee));
      if (res.success) {
        onEnrolledSuccess();
      } else {
        setErrorMsg(res.error || "Enrollment transaction failed.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Enrollment error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-ledger p-5 flex flex-col justify-between space-y-4 card-ledger-hover">
      <div className="space-y-3">
        {/* Header with Course Code and Status */}
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-xs font-semibold text-[#1e3a8a] bg-[#eff6ff] px-2 py-0.5 rounded border border-[#bfdbfe]">
            {offering.course_id}
          </span>
          <span
            className={`badge-academic ${
              offering.status === "OPEN"
                ? "badge-verified"
                : offering.status === "AWAITING_CURRICULUM_LOCK"
                ? "badge-pending"
                : "badge-neutral"
            }`}
          >
            {offering.status === "OPEN" ? "Active" : offering.status === "AWAITING_CURRICULUM_LOCK" ? "Pending Lock" : offering.status}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-serif text-lg font-bold text-[#1c1917] leading-snug">
          {offering.title}
        </h3>

        {/* Details Table */}
        <div className="space-y-1.5 text-xs text-[#57534e] pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-[#78716c]">Instructor:</span>
            <span className="font-semibold text-[#1c1917]">{offering.instructor || "Pending Lock"}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#78716c]">Committed Duration:</span>
            <span className="font-semibold text-[#1c1917]">{offering.duration_hours} Hours</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#78716c]">Syllabus Digest:</span>
            <span className="font-mono text-[11px] text-[#57534e]">
              {offering.terms_digest ? `${offering.terms_digest.slice(0, 12)}...` : "Unset"}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="notice-danger text-xs p-2">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Footer & Action */}
      <div className="pt-3 border-t flex items-center justify-between gap-3">
        <div>
          <span className="text-[11px] text-[#78716c] uppercase block font-semibold">Tuition Escrow</span>
          <span className="font-mono text-sm font-bold text-[#1c1917]">{feeFormatted} GEN</span>
        </div>

        {isEnrolled || isOrganizer ? (
          <button
            onClick={() => onSelectEnrollment(offering.id)}
            className="btn-secondary text-xs px-3 min-h-[36px]"
          >
            {isEnrolled ? "View workspace →" : "Manage delivery →"}
          </button>
        ) : (
          <button
            onClick={handleEnroll}
            disabled={loading || offering.status !== "OPEN"}
            className="btn-academic text-xs px-3 min-h-[36px]"
          >
            {loading ? "Locking..." : "Enroll & Escrow"}
          </button>
        )}
      </div>
    </div>
  );
};
