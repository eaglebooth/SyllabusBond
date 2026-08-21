"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { OfferingCard } from "@/components/OfferingCard";
import { Offering, Enrollment } from "@/lib/types";
import { connectWallet, readContract, configuredAddress } from "@/lib/genlayer";

export default function OfferingsPage() {
  const [account, setAccount] = useState("");
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [enrollments, setEnrollments] = useState<Record<number, Enrollment>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
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
      }
    } catch {
      // Clean catch
    } finally {
      setIsRefreshing(false);
    }
  }, [activeAddress]);

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

  const filtered = offerings.filter((o) => {
    const matchSearch =
      o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.course_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.instructor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = filterStatus === "ALL" || o.status === filterStatus;
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfaf7] text-[#1c1917]">
      <Header
        account={account}
        onConnectWallet={handleConnectWallet}
        onRefresh={fetchState}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8 w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b">
          <div>
            <span className="text-xs font-semibold text-[#1e3a8a] uppercase tracking-wider block">
              Marketplace
            </span>
            <h1 className="font-serif text-3xl font-bold text-[#1c1917] tracking-tight">
              Protected Course Offerings
            </h1>
            <p className="text-xs sm:text-sm text-[#57534e] mt-1">
              Browse locked syllabus commitments and enroll with smart escrow tuition protection.
            </p>
          </div>

          <Link href="/create" className="btn-academic text-xs self-start sm:self-auto">
            Publish offering
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <input
            type="text"
            placeholder="Search by title, instructor, or course code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-academic text-xs max-w-md"
          />

          <div className="flex items-center gap-1.5 text-xs self-end sm:self-auto">
            <span className="text-[#78716c] font-medium mr-1">Status:</span>
            {["ALL", "OPEN", "AWAITING_CURRICULUM_LOCK"].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`py-1 px-2.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  filterStatus === st
                    ? "bg-[#1e3a8a] text-white"
                    : "bg-[#ffffff] border border-[#d5cec0] text-[#57534e] hover:bg-[#f6f3eb]"
                }`}
              >
                {st === "ALL" ? "All" : st === "OPEN" ? "Active" : "Pending Lock"}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="card-ledger p-12 text-center space-y-3 max-w-lg mx-auto my-8">
            <h3 className="font-serif text-base font-bold text-[#1c1917]">No Offerings Found</h3>
            <p className="text-xs text-[#57534e] leading-relaxed">
              {offerings.length === 0
                ? "No course offerings are registered on this contract yet. Connect your wallet to publish the first one."
                : "No offerings matched your query."}
            </p>
            <div className="pt-2">
              <Link href="/create" className="btn-academic text-xs">
                Publish an offering
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((offering) => (
              <OfferingCard
                key={offering.id}
                offering={offering}
                account={account}
                isEnrolled={Boolean(enrollments[offering.id])}
                onEnrolledSuccess={fetchState}
                onSelectEnrollment={(id) => {
                  window.location.href = `/workspace?id=${id}`;
                }}
              />
            ))}
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
