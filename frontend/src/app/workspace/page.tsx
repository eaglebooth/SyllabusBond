"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { EnrollmentWorkspace } from "@/components/EnrollmentWorkspace";
import { Offering, Enrollment } from "@/lib/types";
import { connectWallet, readContract, configuredAddress } from "@/lib/genlayer";

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id") ? parseInt(searchParams.get("id")!, 10) : null;

  const [account, setAccount] = useState("");
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [enrollments, setEnrollments] = useState<Record<number, Enrollment>>({});
  const [selectedOfferingId, setSelectedOfferingId] = useState<number | null>(initialId);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const activeAddress = configuredAddress();

  const fetchState = useCallback(async () => {
    if (!activeAddress || activeAddress === "0x0000000000000000000000000000000000000000") return;
    setIsRefreshing(true);
    try {
      const countsRes = await readContract("get_counts");
      if (countsRes.success && countsRes.data) {
        const counts = countsRes.data as { offering_count: number; enrollment_count: number };
        const offCount = counts.offering_count || 0;
        const enrCount = counts.enrollment_count || 0;

        const fetchedOfferings: Offering[] = [];
        for (let i = 0; i < offCount; i++) {
          const offRes = await readContract("get_offering", [BigInt(i)]);
          if (offRes.success && offRes.data) fetchedOfferings.push(offRes.data as Offering);
        }
        setOfferings(fetchedOfferings);

        const fetchedEnrollments: Record<number, Enrollment> = {};
        for (let i = 0; i < enrCount; i++) {
          const enrRes = await readContract("get_enrollment", [BigInt(i)]);
          if (enrRes.success && enrRes.data) {
            const enr = enrRes.data as Enrollment;
            fetchedEnrollments[enr.offering_id] = enr;
          }
        }
        setEnrollments(fetchedEnrollments);

        if (selectedOfferingId === null && fetchedOfferings.length > 0) {
          setSelectedOfferingId(fetchedOfferings[0].id);
        }
      }
    } catch {
      // Clean catch
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedOfferingId, activeAddress]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleConnectWallet = async () => {
    const res = await connectWallet();
    if (res.success && typeof res.data === "string") {
      setAccount(res.data);
      fetchState();
    }
  };

  const selectedOffering = selectedOfferingId !== null ? offerings.find((o) => o.id === selectedOfferingId) : null;
  const selectedEnrollment = selectedOfferingId !== null ? enrollments[selectedOfferingId] : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfaf7] text-[#1c1917]">
      <Header
        account={account}
        onConnectWallet={handleConnectWallet}
        onRefresh={fetchState}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b">
          <div>
            <span className="text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider block">
              Execution Workspace
            </span>
            <h1 className="font-serif text-3xl font-bold text-[#1c1917] tracking-tight">
              Evidence & Delivery Management
            </h1>
            <p className="text-xs sm:text-sm text-[#57534e] mt-1">
              Submit proof packets, review challenge windows, or trigger consensus adjudication.
            </p>
          </div>

          {offerings.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-[#78716c]">Select Case:</label>
              <select
                value={selectedOfferingId ?? ""}
                onChange={(e) => setSelectedOfferingId(parseInt(e.target.value, 10))}
                className="input-academic text-xs"
              >
                {offerings.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.id} - {o.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {selectedOffering && selectedEnrollment ? (
          <EnrollmentWorkspace
            offering={selectedOffering}
            enrollment={selectedEnrollment}
            account={account}
            onRefresh={fetchState}
            onBack={() => {
              window.location.href = "/offerings";
            }}
          />
        ) : (
          <div className="card-ledger p-12 text-center max-w-md mx-auto space-y-3">
            <h3 className="font-serif text-base font-bold text-[#1c1917]">No Active Enrollment</h3>
            <p className="text-xs text-[#57534e]">
              Enroll in a course offering or publish a syllabus to access this workspace.
            </p>
            <div className="pt-2">
              <Link href="/offerings" className="btn-academic text-xs">
                Browse Offerings →
              </Link>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t bg-[#ffffff] py-8 text-xs text-[#78716c]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-serif font-bold text-[#1c1917]">SyllabusBond</span> — Course delivery escrow protocol
          </div>
          <div className="font-mono text-[11px]">Status: LOCAL_ONLY</div>
        </div>
      </footer>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fbfaf7]" />}>
      <WorkspaceContent />
    </Suspense>
  );
}
