export type Offering = {
  id: number;
  organizer: string;
  title: string;
  course_id: string;
  fee: number;
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
  fee: number;
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
  organizer_paid: number;
  student_refunded: number;
};

export type ContractTotals = {
  total_received: number;
  total_held: number;
  total_paid_to_organizers: number;
  total_refunded_to_students: number;
};
