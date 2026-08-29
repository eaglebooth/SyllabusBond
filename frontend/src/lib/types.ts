import type { GenAmount } from "@/lib/amount";

export type Offering = {
  id: number;
  organizer: string;
  title: string;
  course_id: string;
  fee: GenAmount;
  duration_hours: number;
  terms_url: string;
  terms_digest: string;
  curriculum_digest: string;
  instructor: string;
  status: "AWAITING_CURRICULUM_LOCK" | "OPEN" | "CLOSED";
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
    | "SETTLED"
    | "RECOVERY_WAIT"
    | "RECOVERED"
    | "CANCELLED";
  decision: "PENDING" | "DELIVERED" | "MATERIALLY_REDUCED" | "NOT_DELIVERED" | "EVIDENCE_UNAVAILABLE" | "CANCELLED" | "RECOVERED";
  curriculum_fidelity: "FULL" | "PARTIAL" | "BREACH" | "UNVERIFIED";
  instructor_fidelity: "MATCH" | "SUBSTITUTED" | "UNVERIFIED";
  reason: string;
  organizer_paid: GenAmount;
  student_refunded: GenAmount;
};

export type ContractTotals = {
  total_received: GenAmount;
  total_held: GenAmount;
  total_paid_to_organizers: GenAmount;
  total_refunded_to_students: GenAmount;
};
