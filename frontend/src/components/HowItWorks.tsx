import React from "react";
import { Lock, FileCheck2, Scale, DollarSign, Sparkles, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";

export const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="bg-black text-white rounded-3xl p-8 sm:p-12 lg:p-16 my-12 space-y-16">
      {/* Section 1: How It Works Header */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <div className="flex justify-center">
          <span className="eyebrow-badge-dark">
            HOW IT WORKS
          </span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
          Three simple steps.<br />Endless confidence.
        </h2>
        <p className="text-sm sm:text-base text-zinc-400 leading-relaxed font-normal">
          From locking course commitments to automated AI verification, SyllabusBond transforms educational trust into an autonomous on-chain escrow.
        </p>
      </div>

      {/* Interactive Hub Diagram Card */}
      <div className="card-dark p-8 sm:p-12 max-w-4xl mx-auto relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-4 max-w-sm">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Connect everything.
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Lock syllabus modules, scheduled hours, and instructor identities into one verifiable smart escrow in just a few clicks.
          </p>
        </div>

        {/* Central Glowing Consensus Hub Graphic */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-purple-600/10 blur-2xl"></div>
          
          {/* Orbital Ring */}
          <div className="absolute w-52 h-52 rounded-full border border-dashed border-purple-500/20 animate-spin" style={{ animationDuration: '30s' }}></div>
          <div className="absolute w-36 h-36 rounded-full border border-purple-500/30"></div>

          {/* Central Logo */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-purple-500/30 z-10">
            <Scale className="w-8 h-8" />
          </div>

          {/* Satellites */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-zinc-900 border border-purple-400/40 flex items-center justify-center text-purple-300 text-xs">
            <Lock className="w-4 h-4" />
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-zinc-900 border border-purple-400/40 flex items-center justify-center text-purple-300 text-xs">
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-900 border border-purple-400/40 flex items-center justify-center text-purple-300 text-xs">
            <FileCheck2 className="w-4 h-4" />
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-900 border border-purple-400/40 flex items-center justify-center text-purple-300 text-xs">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Section 2: Features Grid */}
      <div id="features" className="pt-10 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="flex justify-center">
            <span className="eyebrow-badge-dark">
              AI CONSENSUS JURY
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Everything your cohort needs.<br />One intelligent escrow.
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-normal">
            Powerful GenLayer AI jury features designed to protect tuition, verify curriculum delivery, and settle disbursements objectively.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="card-dark p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-700/40 flex items-center justify-center text-purple-400">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Cryptographic Terms Lock
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Curriculum outlines, session counts, and instructors are bound to immutable SHA-256 digests before enrollment. No unapproved changes allowed.
            </p>
          </div>

          <div className="card-dark p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-700/40 flex items-center justify-center text-purple-400">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Semantic AI Adjudication
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              GenLayer LLM nodes re-hash raw delivery bytes and evaluate whether topics were fulfilled, truncated, or substituted.
            </p>
          </div>

          <div className="card-dark p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-700/40 flex items-center justify-center text-purple-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Deterministic Settlement
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Funds are automatically transferred: 100% payout for DELIVERED, 50/50 split for MATERIALLY_REDUCED, or 100% refund for NOT_DELIVERED.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
