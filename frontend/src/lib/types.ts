import type { GenAmount } from "@/lib/amount";

export type Offering = {
  id: number;
  organizer: string;
  title: string;
  course_id: string;
  fee: GenAmount;
  duration_hours: number;
  delivery_deadline: number;
  challenge_deadline: number;
  recovery_deadline: number;
  terms_url: string;
  terms_digest: string;
  curriculum_digest: string;
  instructor: string;
  status: "AWAITING_CURRICULUM_LOCK" | "OPEN" | "CLOSED";
  module_count: number;
};

export type EnrollmentEvidence = {
  id: number;
  delivery_url: string;
  delivery_digest: string;
  dispute_url: string;
  dispute_digest: string;
  appeal_url: string;
  appeal_digest: string;
};

export type Enrollment = {
  id: number;
  offering_id: number;
  student: string;
  fee: GenAmount;
  status:
    | "FUNDED"
    | "CHALLENGE_WINDOW"
    | "READY_FOR_REVIEW"
    | "ADJUDICATED"
    | "APPEAL_PENDING"
    | "APPEAL_RESOLVED"
    | "SETTLED"
    | "RECOVERY_WAIT"
    | "MODULE_AWAITING"
    | "MODULE_REVIEW"
    | "MODULE_DISPUTED"
    | "MODULE_RECOVERY_WAIT"
    | "RECOVERED"
    | "CANCELLED";
  decision: "PENDING" | "DELIVERED" | "MATERIALLY_REDUCED" | "NOT_DELIVERED" | "EVIDENCE_UNAVAILABLE" | "CANCELLED" | "RECOVERED";
  curriculum_fidelity: "FULL" | "PARTIAL" | "BREACH" | "UNVERIFIED";
  instructor_fidelity: "MATCH" | "SUBSTITUTED" | "UNVERIFIED";
  reason: string;
  organizer_paid: GenAmount;
  student_refunded: GenAmount;
  pre_appeal_decision: string;
  appeal_appellant: string;
  appeal_stake: GenAmount;
  appeal_result: "NONE" | "PENDING" | "UPHELD" | "OVERTURNED" | "UNRESOLVED";
  appeal_deadline: number;
  appeal_recovery_deadline: number;
  next_module: number;
  released_amount: GenAmount;
  remaining_amount: GenAmount;
  module_recovery_deadline: number;
};

export type ModuleProgress = {
  enrollment_id: number;
  module_count: number;
  next_module: number;
  released_amount: GenAmount;
  remaining_amount: GenAmount;
  recovery_deadline: number;
  status: Enrollment["status"];
};

export type ModuleCheckpoint = {
  enrollment_id: number;
  module_index: number;
  evidence_url: string;
  evidence_digest: string;
  dispute_url: string;
  dispute_digest: string;
  status: "NOT_SUBMITTED" | "REVIEW" | "DISPUTED" | "ACCEPTED" | "REJECTED" | "UNAVAILABLE";
  decision: "PENDING" | "ACCEPTED" | "REJECTED" | "UNAVAILABLE";
  reason: string;
  review_deadline: number;
};

export type ContractTotals = {
  total_received: GenAmount;
  total_held: GenAmount;
  total_paid_to_organizers: GenAmount;
  total_refunded_to_students: GenAmount;
};
