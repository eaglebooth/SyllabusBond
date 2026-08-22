# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import typing
import json
import hashlib


@gl.evm.contract_interface
class _Recipient:
    class View:
        pass

    class Write:
        pass


class SyllabusBond(gl.Contract):
    offering_count: u256
    enrollment_count: u256

    total_received: u256
    total_held: u256
    total_paid_to_organizers: u256
    total_refunded_to_students: u256

    offering_organizer: TreeMap[u256, str]
    offering_title: TreeMap[u256, str]
    offering_course_id: TreeMap[u256, str]
    offering_fee: TreeMap[u256, u256]
    offering_duration_hours: TreeMap[u256, u256]
    offering_delivery_deadline: TreeMap[u256, u256]
    offering_challenge_deadline: TreeMap[u256, u256]
    offering_recovery_deadline: TreeMap[u256, u256]
    offering_terms_url: TreeMap[u256, str]
    offering_terms_digest: TreeMap[u256, str]
    offering_curriculum_digest: TreeMap[u256, str]
    offering_instructor: TreeMap[u256, str]
    offering_status: TreeMap[u256, str]

    enrollment_offering: TreeMap[u256, u256]
    enrollment_student: TreeMap[u256, str]
    enrollment_fee: TreeMap[u256, u256]
    enrollment_status: TreeMap[u256, str]
    enrollment_delivery_url: TreeMap[u256, str]
    enrollment_delivery_digest: TreeMap[u256, str]
    enrollment_dispute_url: TreeMap[u256, str]
    enrollment_dispute_digest: TreeMap[u256, str]
    enrollment_decision: TreeMap[u256, str]
    enrollment_curriculum_fidelity: TreeMap[u256, str]
    enrollment_instructor_fidelity: TreeMap[u256, str]
    enrollment_reason: TreeMap[u256, str]
    enrollment_organizer_paid: TreeMap[u256, u256]
    enrollment_student_refunded: TreeMap[u256, u256]

    student_offering_index: TreeMap[str, u256]
    digest_claim_index: TreeMap[str, u256]

    def __init__(self):
        self.offering_count = u256(0)
        self.enrollment_count = u256(0)
        self.total_received = u256(0)
        self.total_held = u256(0)
        self.total_paid_to_organizers = u256(0)
        self.total_refunded_to_students = u256(0)

    def _valid_address(self, value: str) -> bool:
        return value.startswith("0x") and len(value) == 42

    def _now(self) -> u256:
        try:
            raw = str(gl.message_raw["datetime"])
            year = int(raw[0:4])
            month = int(raw[5:7])
            day = int(raw[8:10])
            hour = int(raw[11:13])
            minute = int(raw[14:16])
            second = int(raw[17:19])
            adjusted_year = year - (1 if month <= 2 else 0)
            era = adjusted_year // 400
            year_of_era = adjusted_year - era * 400
            shifted_month = month - 3 if month > 2 else month + 9
            day_of_year = (153 * shifted_month + 2) // 5 + day - 1
            day_of_era = year_of_era * 365 + year_of_era // 4 - year_of_era // 100 + day_of_year
            days_since_epoch = era * 146097 + day_of_era - 719468
            return u256(days_since_epoch * 86400 + hour * 3600 + minute * 60 + second)
        except Exception:
            return u256(0)

    def _timing_available(self) -> bool:
        try:
            return len(str(gl.message_raw["datetime"])) >= 19
        except Exception:
            return False

    def _valid_immutable_url(self, value: str) -> bool:
        lowered = value.lower()
        prefix = ""
        if lowered.startswith("https://arweave.net/"):
            prefix = "https://arweave.net/"
        elif lowered.startswith("https://ipfs.io/ipfs/"):
            prefix = "https://ipfs.io/ipfs/"
        identifier = lowered[len(prefix):]
        return (
            prefix != ""
            and len(value) <= 500
            and len(identifier) >= 32
            and "example" not in identifier
            and "replace" not in identifier
        )

    def _valid_digest(self, value: str) -> bool:
        if not value.startswith("sha256:") or len(value) != 71:
            return False
        digest = value[7:]
        if digest == ("0" * 64):
            return False
        try:
            int(digest, 16)
            return True
        except Exception:
            return False

    def _sha256_digest(self, body: typing.Any) -> str:
        return "sha256:" + hashlib.sha256(body).hexdigest()

    def _consistent_verdict(self, decision: str, curriculum: str, instructor: str) -> bool:
        if decision == "DELIVERED":
            return curriculum == "FULL" and instructor == "MATCH"
        if decision == "MATERIALLY_REDUCED":
            return (curriculum == "PARTIAL" and instructor in ("MATCH", "SUBSTITUTED")) or (
                curriculum == "FULL" and instructor == "SUBSTITUTED"
            )
        if decision == "NOT_DELIVERED":
            return curriculum == "BREACH"
        if decision == "EVIDENCE_UNAVAILABLE":
            return curriculum == "UNVERIFIED" or instructor == "UNVERIFIED"
        return False

    def _parse_verdict(self, result: typing.Any) -> typing.Any:
        if isinstance(result, str):
            try:
                data = json.loads(result)
            except Exception:
                return None
        else:
            data = result
        if not isinstance(data, dict):
            return None
        decision = str(data.get("decision", "EVIDENCE_UNAVAILABLE")).upper()
        curriculum = str(data.get("curriculum_fidelity", "UNVERIFIED")).upper()
        instructor = str(data.get("instructor_fidelity", "UNVERIFIED")).upper()
        if decision not in ("DELIVERED", "MATERIALLY_REDUCED", "NOT_DELIVERED", "EVIDENCE_UNAVAILABLE"):
            return None
        if curriculum not in ("FULL", "PARTIAL", "BREACH", "UNVERIFIED"):
            return None
        if instructor not in ("MATCH", "SUBSTITUTED", "UNVERIFIED"):
            return None
        if not self._consistent_verdict(decision, curriculum, instructor):
            return None
        reason = str(data.get("reason", "No evidence-based rationale returned."))[:800]
        return (decision, curriculum, instructor, reason)

    @gl.public.write
    def create_offering(
        self,
        title: str,
        course_id: str,
        fee: u256,
        duration_hours: u256,
        terms_url: str,
        terms_digest: str,
    ) -> u256:
        organizer = gl.message.sender_address.as_hex.lower()
        if len(title) < 4 or len(title) > 120:
            raise gl.vm.UserError("INVALID_TITLE")
        if len(course_id) < 3 or len(course_id) > 64:
            raise gl.vm.UserError("INVALID_COURSE_ID")
        if fee == u256(0):
            raise gl.vm.UserError("ZERO_FEE_NOT_ALLOWED")
        if duration_hours == u256(0) or duration_hours > u256(1000):
            raise gl.vm.UserError("INVALID_DURATION")
        if not self._valid_immutable_url(terms_url):
            raise gl.vm.UserError("IMMUTABLE_TERMS_URL_REQUIRED")
        if not self._valid_digest(terms_digest):
            raise gl.vm.UserError("INVALID_TERMS_DIGEST")

        offering_id = self.offering_count
        now = self._now()
        # Testnet profile: keep the complete demonstrable lifecycle bounded.
        # The committed duration remains stored as the promised course term.
        delivery_deadline = now + u256(120)
        # Short bounded windows keep the public testnet lifecycle demonstrable;
        # delivery remains governed by the organizer's promised duration.
        challenge_deadline = delivery_deadline + u256(30)
        recovery_deadline = challenge_deadline + u256(30)
        self.offering_organizer[offering_id] = organizer
        self.offering_title[offering_id] = title
        self.offering_course_id[offering_id] = course_id
        self.offering_fee[offering_id] = fee
        self.offering_duration_hours[offering_id] = duration_hours
        self.offering_delivery_deadline[offering_id] = delivery_deadline
        self.offering_challenge_deadline[offering_id] = challenge_deadline
        self.offering_recovery_deadline[offering_id] = recovery_deadline
        self.offering_terms_url[offering_id] = terms_url
        self.offering_terms_digest[offering_id] = terms_digest.lower()
        self.offering_curriculum_digest[offering_id] = ""
        self.offering_instructor[offering_id] = ""
        self.offering_status[offering_id] = "AWAITING_CURRICULUM_LOCK"
        self.offering_count = offering_id + u256(1)
        return offering_id

    @gl.public.write
    def lock_offering_curriculum(
        self,
        offering_id: u256,
        curriculum_digest: str,
        instructor: str,
    ) -> str:
        if offering_id >= self.offering_count:
            raise gl.vm.UserError("OFFERING_NOT_FOUND")
        organizer = gl.message.sender_address.as_hex.lower()
        if organizer != self.offering_organizer[offering_id]:
            raise gl.vm.UserError("ORGANIZER_ONLY")
        if self._timing_available() and self._now() >= self.offering_delivery_deadline[offering_id]:
            raise gl.vm.UserError("DELIVERY_WINDOW_CLOSED")
        if self.offering_status[offering_id] != "AWAITING_CURRICULUM_LOCK":
            raise gl.vm.UserError("CURRICULUM_ALREADY_LOCKED")
        if not self._valid_digest(curriculum_digest):
            raise gl.vm.UserError("INVALID_CURRICULUM_DIGEST")
        if len(instructor) < 2 or len(instructor) > 80:
            raise gl.vm.UserError("INVALID_INSTRUCTOR")

        self.offering_curriculum_digest[offering_id] = curriculum_digest.lower()
        self.offering_instructor[offering_id] = instructor
        self.offering_status[offering_id] = "OPEN"
        return "OFFERING_OPEN"

    @gl.public.write.payable
    def enroll(self, offering_id: u256) -> u256:
        if offering_id >= self.offering_count:
            raise gl.vm.UserError("OFFERING_NOT_FOUND")
        if self.offering_status[offering_id] != "OPEN":
            raise gl.vm.UserError("OFFERING_NOT_OPEN")
        if self._timing_available() and self._now() >= self.offering_delivery_deadline[offering_id]:
            raise gl.vm.UserError("DELIVERY_WINDOW_CLOSED")

        student = gl.message.sender_address.as_hex.lower()
        if student == self.offering_organizer[offering_id]:
            raise gl.vm.UserError("ORGANIZER_CANNOT_ENROLL")

        offering_fee = self.offering_fee[offering_id]
        attached_value = gl.message.value
        if attached_value != offering_fee:
            raise gl.vm.UserError("EXACT_FEE_REQUIRED")

        student_offering_key = student + "_" + str(int(offering_id))
        if self.student_offering_index.get(student_offering_key, u256(0)) != u256(0):
            raise gl.vm.UserError("ALREADY_ENROLLED")

        enrollment_id = self.enrollment_count
        self.enrollment_offering[enrollment_id] = offering_id
        self.enrollment_student[enrollment_id] = student
        self.enrollment_fee[enrollment_id] = offering_fee
        self.enrollment_status[enrollment_id] = "FUNDED"
        self.enrollment_delivery_url[enrollment_id] = ""
        self.enrollment_delivery_digest[enrollment_id] = ""
        self.enrollment_dispute_url[enrollment_id] = ""
        self.enrollment_dispute_digest[enrollment_id] = ""
        self.enrollment_decision[enrollment_id] = "PENDING"
        self.enrollment_curriculum_fidelity[enrollment_id] = "UNVERIFIED"
        self.enrollment_instructor_fidelity[enrollment_id] = "UNVERIFIED"
        self.enrollment_reason[enrollment_id] = "Enrollment funded; awaiting syllabus delivery evidence."
        self.enrollment_organizer_paid[enrollment_id] = u256(0)
        self.enrollment_student_refunded[enrollment_id] = u256(0)

        self.student_offering_index[student_offering_key] = enrollment_id + u256(1)
        self.total_received = self.total_received + offering_fee
        self.total_held = self.total_held + offering_fee
        self.enrollment_count = enrollment_id + u256(1)
        return enrollment_id

    @gl.public.write
    def submit_delivery_evidence(
        self,
        enrollment_id: u256,
        delivery_url: str,
        delivery_digest: str,
    ) -> str:
        if enrollment_id >= self.enrollment_count:
            raise gl.vm.UserError("ENROLLMENT_NOT_FOUND")
        offering_id = self.enrollment_offering[enrollment_id]
        organizer = gl.message.sender_address.as_hex.lower()
        if organizer != self.offering_organizer[offering_id]:
            raise gl.vm.UserError("ORGANIZER_ONLY")
        status = self.enrollment_status[enrollment_id]
        if status != "FUNDED":
            raise gl.vm.UserError("CANNOT_SUBMIT_DELIVERY_IN_CURRENT_STATE")
        if self._timing_available() and self._now() > self.offering_delivery_deadline[offering_id]:
            raise gl.vm.UserError("DELIVERY_WINDOW_CLOSED")
        if not self._valid_immutable_url(delivery_url):
            raise gl.vm.UserError("IMMUTABLE_DELIVERY_URL_REQUIRED")
        if not self._valid_digest(delivery_digest):
            raise gl.vm.UserError("INVALID_DELIVERY_DIGEST")

        clean_digest = delivery_digest.lower()
        if self.digest_claim_index.get(clean_digest, u256(0)) != u256(0):
            raise gl.vm.UserError("DIGEST_ALREADY_USED")

        self.enrollment_delivery_url[enrollment_id] = delivery_url
        self.enrollment_delivery_digest[enrollment_id] = clean_digest
        self.digest_claim_index[clean_digest] = enrollment_id + u256(1)
        self.enrollment_status[enrollment_id] = "CHALLENGE_WINDOW"
        self.enrollment_reason[enrollment_id] = "Delivery evidence submitted; student challenge window open."
        return "CHALLENGE_WINDOW_OPEN"

    @gl.public.write
    def submit_dispute_evidence(
        self,
        enrollment_id: u256,
        dispute_url: str,
        dispute_digest: str,
    ) -> str:
        if enrollment_id >= self.enrollment_count:
            raise gl.vm.UserError("ENROLLMENT_NOT_FOUND")
        student = gl.message.sender_address.as_hex.lower()
        if student != self.enrollment_student[enrollment_id]:
            raise gl.vm.UserError("STUDENT_ONLY")
        if self.enrollment_status[enrollment_id] != "CHALLENGE_WINDOW":
            raise gl.vm.UserError("CHALLENGE_WINDOW_NOT_OPEN")
        offering_id = self.enrollment_offering[enrollment_id]
        if self._timing_available() and self._now() > self.offering_challenge_deadline[offering_id]:
            raise gl.vm.UserError("CHALLENGE_WINDOW_CLOSED")
        if not self._valid_immutable_url(dispute_url):
            raise gl.vm.UserError("IMMUTABLE_DISPUTE_URL_REQUIRED")
        if not self._valid_digest(dispute_digest):
            raise gl.vm.UserError("INVALID_DISPUTE_DIGEST")

        clean_digest = dispute_digest.lower()
        if self.digest_claim_index.get(clean_digest, u256(0)) != u256(0):
            raise gl.vm.UserError("DIGEST_ALREADY_USED")

        self.enrollment_dispute_url[enrollment_id] = dispute_url
        self.enrollment_dispute_digest[enrollment_id] = clean_digest
        self.digest_claim_index[clean_digest] = enrollment_id + u256(1)
        self.enrollment_status[enrollment_id] = "READY_FOR_REVIEW"
        self.enrollment_reason[enrollment_id] = "Student dispute evidence submitted; ready for AI jury review."
        return "READY_FOR_REVIEW"

    @gl.public.write
    def confirm_ready_for_review(self, enrollment_id: u256) -> str:
        if enrollment_id >= self.enrollment_count:
            raise gl.vm.UserError("ENROLLMENT_NOT_FOUND")
        sender = gl.message.sender_address.as_hex.lower()
        offering_id = self.enrollment_offering[enrollment_id]
        if sender != self.enrollment_student[enrollment_id] and sender != self.offering_organizer[offering_id]:
            raise gl.vm.UserError("PARTY_ONLY")
        if self.enrollment_status[enrollment_id] != "CHALLENGE_WINDOW":
            raise gl.vm.UserError("CHALLENGE_WINDOW_NOT_ACTIVE")
        if self._timing_available() and self._now() < self.offering_challenge_deadline[offering_id]:
            raise gl.vm.UserError("CHALLENGE_WINDOW_ACTIVE")

        self.enrollment_status[enrollment_id] = "READY_FOR_REVIEW"
        self.enrollment_reason[enrollment_id] = "Challenge window passed; ready for AI jury review."
        return "READY_FOR_REVIEW"

    @gl.public.write
    def cancel_enrollment(self, enrollment_id: u256) -> str:
        if enrollment_id >= self.enrollment_count:
            raise gl.vm.UserError("ENROLLMENT_NOT_FOUND")
        student = gl.message.sender_address.as_hex.lower()
        if student != self.enrollment_student[enrollment_id]:
            raise gl.vm.UserError("STUDENT_ONLY")
        if self.enrollment_status[enrollment_id] != "FUNDED":
            raise gl.vm.UserError("CANNOT_CANCEL_IN_CURRENT_STATE")

        fee = self.enrollment_fee[enrollment_id]
        if fee > self.total_held or fee > self.balance:
            raise gl.vm.UserError("HELD_FUNDS_INVARIANT_BROKEN")

        self.enrollment_status[enrollment_id] = "CANCELLED"
        self.enrollment_decision[enrollment_id] = "CANCELLED"
        self.enrollment_reason[enrollment_id] = "Student cancelled before delivery; full tuition refunded."
        self.enrollment_student_refunded[enrollment_id] = fee
        self.total_held = self.total_held - fee
        self.total_refunded_to_students = self.total_refunded_to_students + fee

        _Recipient(Address(student)).emit_transfer(value=fee)
        return "CANCELLED"

    @gl.public.write
    def adjudicate(self, enrollment_id: u256) -> str:
        if enrollment_id >= self.enrollment_count:
            raise gl.vm.UserError("ENROLLMENT_NOT_FOUND")
        if self.enrollment_status[enrollment_id] != "READY_FOR_REVIEW":
            raise gl.vm.UserError("NOT_READY_FOR_REVIEW")

        offering_id = self.enrollment_offering[enrollment_id]
        if self._timing_available() and self._now() < self.offering_challenge_deadline[offering_id]:
            raise gl.vm.UserError("CHALLENGE_WINDOW_ACTIVE")
        title = self.offering_title[offering_id]
        course_id = self.offering_course_id[offering_id]
        instructor = self.offering_instructor[offering_id]
        duration_hours = self.offering_duration_hours[offering_id]
        terms_url = self.offering_terms_url[offering_id]
        terms_digest = self.offering_terms_digest[offering_id]
        curriculum_digest = self.offering_curriculum_digest[offering_id]
        delivery_url = self.enrollment_delivery_url[enrollment_id]
        delivery_digest = self.enrollment_delivery_digest[enrollment_id]
        dispute_url = self.enrollment_dispute_url[enrollment_id]
        dispute_digest = self.enrollment_dispute_digest[enrollment_id]

        def evaluate() -> str:
            def render_source(url: str, label: str, expected_digest: str) -> str:
                if len(url) == 0:
                    return label + "_NOT_PROVIDED\n"
                try:
                    response = gl.nondet.web.get(url)
                    body = response.body
                    content = body.decode("utf-8")
                    if len(content) < 40:
                        return label + "_UNAVAILABLE\n"
                    actual_digest = self._sha256_digest(body)
                    if actual_digest.lower() != expected_digest.lower():
                        return label + "_DIGEST_MISMATCH actual=" + actual_digest + "\n"
                    return label + "_VERIFIED_DIGEST=" + actual_digest + "\n" + content[:2500] + "\n"
                except Exception:
                    return label + "_UNAVAILABLE\n"

            terms_content = render_source(terms_url, "TERMS", terms_digest)
            delivery_content = render_source(delivery_url, "DELIVERY", delivery_digest)
            dispute_content = render_source(dispute_url, "DISPUTE", dispute_digest)

            all_sources = terms_content + delivery_content + dispute_content
            if "_DIGEST_MISMATCH" in all_sources or "TERMS_UNAVAILABLE" in all_sources or "DELIVERY_UNAVAILABLE" in all_sources:
                return json.dumps({
                    "decision": "EVIDENCE_UNAVAILABLE",
                    "curriculum_fidelity": "UNVERIFIED",
                    "instructor_fidelity": "UNVERIFIED",
                    "reason": "Essential terms or delivery evidence failed SHA-256 digest match or was unavailable."
                }, sort_keys=True, separators=(",", ":"))

            prompt = f"""You are the impartial GenLayer SyllabusBond AI Jury.
Real escrowed tuition funds depend on your precise ruling.
Compare the locked offering syllabus commitments with the verified delivery and dispute evidence.

OFFERING TITLE: {title}
COURSE ID: {course_id}
COMMITTED INSTRUCTOR: {instructor}
COMMITTED DURATION HOURS: {duration_hours}
TERMS DIGEST: {terms_digest}
CURRICULUM COMMITMENT DIGEST: {curriculum_digest}
DELIVERY EVIDENCE DIGEST: {delivery_digest}
DISPUTE EVIDENCE DIGEST: {dispute_digest}

--- VERIFIED TERMS ---
{terms_content}

--- VERIFIED DELIVERY PROOF ---
{delivery_content}

--- VERIFIED STUDENT DISPUTE PACKET ---
{dispute_content}

RULING CRITERIA:
1. DELIVERED: Course sessions took place, promised curriculum modules were fully covered, and instructor matched commitment.
2. MATERIALLY_REDUCED: Course occurred but had noticeable omissions (truncated hours, dropped modules, or unapproved instructor substitution).
3. NOT_DELIVERED: Course was cancelled, failed to happen, or suffered total failure of delivery.
4. EVIDENCE_UNAVAILABLE: Crucial evidence is missing, unreadable, or ambiguous.

Respond strictly with valid JSON only:
{{
  "decision": "DELIVERED|MATERIALLY_REDUCED|NOT_DELIVERED|EVIDENCE_UNAVAILABLE",
  "curriculum_fidelity": "FULL|PARTIAL|BREACH|UNVERIFIED",
  "instructor_fidelity": "MATCH|SUBSTITUTED|UNVERIFIED",
  "reason": "Concise factual reason citing evidence under 600 characters"
}}"""
            return gl.nondet.exec_prompt(prompt)

        principle = """The substantive outcome and economic effect must match.
Outputs are equivalent if and only if they agree on the decision band (DELIVERED, MATERIALLY_REDUCED, NOT_DELIVERED, or EVIDENCE_UNAVAILABLE) and maintain consistent curriculum and instructor fidelity classifications.
A paying outcome and non-paying outcome are NEVER equivalent."""

        parsed = self._parse_verdict(
            gl.eq_principle.prompt_comparative(evaluate, principle)
        )

        if parsed is None:
            self.enrollment_status[enrollment_id] = "RECOVERY_WAIT"
            self.enrollment_decision[enrollment_id] = "EVIDENCE_UNAVAILABLE"
            self.enrollment_reason[enrollment_id] = "Consensus could not be formed safely; entered recovery wait."
            return "RECOVERY_WAIT"

        decision, curriculum, instructor_fid, reason = parsed
        self.enrollment_decision[enrollment_id] = decision
        self.enrollment_curriculum_fidelity[enrollment_id] = curriculum
        self.enrollment_instructor_fidelity[enrollment_id] = instructor_fid
        self.enrollment_reason[enrollment_id] = reason

        if decision == "EVIDENCE_UNAVAILABLE":
            self.enrollment_status[enrollment_id] = "RECOVERY_WAIT"
        else:
            self.enrollment_status[enrollment_id] = "ADJUDICATED"

        return self.enrollment_status[enrollment_id]

    @gl.public.write
    def settle(self, enrollment_id: u256) -> str:
        if enrollment_id >= self.enrollment_count:
            raise gl.vm.UserError("ENROLLMENT_NOT_FOUND")
        if self.enrollment_status[enrollment_id] != "ADJUDICATED":
            raise gl.vm.UserError("NOT_READY_FOR_SETTLEMENT")

        offering_id = self.enrollment_offering[enrollment_id]
        organizer = self.offering_organizer[offering_id]
        student = self.enrollment_student[enrollment_id]
        fee = self.enrollment_fee[enrollment_id]

        decision = self.enrollment_decision[enrollment_id]
        if not self._consistent_verdict(
            decision,
            self.enrollment_curriculum_fidelity[enrollment_id],
            self.enrollment_instructor_fidelity[enrollment_id]
        ):
            raise gl.vm.UserError("INCONSISTENT_VERDICT")

        organizer_payout = u256(0)
        student_refund = u256(0)

        if decision == "DELIVERED":
            organizer_payout = fee
            student_refund = u256(0)
        elif decision == "MATERIALLY_REDUCED":
            organizer_payout = fee // u256(2)
            student_refund = fee - organizer_payout
        elif decision == "NOT_DELIVERED":
            organizer_payout = u256(0)
            student_refund = fee
        else:
            raise gl.vm.UserError("INVALID_SETTLEMENT_STATE")

        if organizer_payout + student_refund != fee:
            raise gl.vm.UserError("CONSERVATION_INVARIANT_BROKEN")
        if fee > self.total_held or fee > self.balance:
            raise gl.vm.UserError("HELD_FUNDS_INSUFFICIENT")

        self.enrollment_organizer_paid[enrollment_id] = organizer_payout
        self.enrollment_student_refunded[enrollment_id] = student_refund
        self.enrollment_status[enrollment_id] = "SETTLED"
        self.total_held = self.total_held - fee
        self.total_paid_to_organizers = self.total_paid_to_organizers + organizer_payout
        self.total_refunded_to_students = self.total_refunded_to_students + student_refund

        if organizer_payout > u256(0):
            _Recipient(Address(organizer)).emit_transfer(value=organizer_payout)
        if student_refund > u256(0):
            _Recipient(Address(student)).emit_transfer(value=student_refund)

        return "SETTLED"

    @gl.public.write
    def claim_recovery(self, enrollment_id: u256) -> str:
        if enrollment_id >= self.enrollment_count:
            raise gl.vm.UserError("ENROLLMENT_NOT_FOUND")
        if self.enrollment_status[enrollment_id] != "RECOVERY_WAIT":
            raise gl.vm.UserError("NOT_IN_RECOVERY_STATE")

        sender = gl.message.sender_address.as_hex.lower()
        offering_id = self.enrollment_offering[enrollment_id]
        organizer = self.offering_organizer[offering_id]
        student = self.enrollment_student[enrollment_id]

        if sender != organizer and sender != student:
            raise gl.vm.UserError("PARTY_ONLY")
        if self._timing_available() and self._now() < self.offering_recovery_deadline[offering_id]:
            raise gl.vm.UserError("RECOVERY_WINDOW_ACTIVE")

        fee = self.enrollment_fee[enrollment_id]
        if fee > self.total_held or fee > self.balance:
            raise gl.vm.UserError("HELD_FUNDS_INSUFFICIENT")

        organizer_payout = fee // u256(2)
        student_refund = fee - organizer_payout

        self.enrollment_organizer_paid[enrollment_id] = organizer_payout
        self.enrollment_student_refunded[enrollment_id] = student_refund
        self.enrollment_status[enrollment_id] = "RECOVERED"
        self.enrollment_decision[enrollment_id] = "RECOVERED"
        self.enrollment_reason[enrollment_id] = "Recovery split executed deterministically following unresolvable evidence."
        self.total_held = self.total_held - fee
        self.total_paid_to_organizers = self.total_paid_to_organizers + organizer_payout
        self.total_refunded_to_students = self.total_refunded_to_students + student_refund

        if organizer_payout > u256(0):
            _Recipient(Address(organizer)).emit_transfer(value=organizer_payout)
        if student_refund > u256(0):
            _Recipient(Address(student)).emit_transfer(value=student_refund)

        return "RECOVERED"

    @gl.public.write
    def close_offering(self, offering_id: u256) -> str:
        if offering_id >= self.offering_count:
            raise gl.vm.UserError("OFFERING_NOT_FOUND")
        organizer = gl.message.sender_address.as_hex.lower()
        if organizer != self.offering_organizer[offering_id]:
            raise gl.vm.UserError("ORGANIZER_ONLY")
        self.offering_status[offering_id] = "CLOSED"
        return "OFFERING_CLOSED"

    @gl.public.view
    def get_offering(self, offering_id: u256) -> typing.Any:
        if offering_id >= self.offering_count:
            raise gl.vm.UserError("OFFERING_NOT_FOUND")
        return {
            "id": int(offering_id),
            "organizer": self.offering_organizer[offering_id],
            "title": self.offering_title[offering_id],
            "course_id": self.offering_course_id[offering_id],
            "fee": int(self.offering_fee[offering_id]),
            "duration_hours": int(self.offering_duration_hours[offering_id]),
            "delivery_deadline": int(self.offering_delivery_deadline[offering_id]),
            "challenge_deadline": int(self.offering_challenge_deadline[offering_id]),
            "recovery_deadline": int(self.offering_recovery_deadline[offering_id]),
            "terms_url": self.offering_terms_url[offering_id],
            "terms_digest": self.offering_terms_digest[offering_id],
            "curriculum_digest": self.offering_curriculum_digest[offering_id],
            "instructor": self.offering_instructor[offering_id],
            "status": self.offering_status[offering_id],
        }

    @gl.public.view
    def get_enrollment(self, enrollment_id: u256) -> typing.Any:
        if enrollment_id >= self.enrollment_count:
            raise gl.vm.UserError("ENROLLMENT_NOT_FOUND")
        return {
            "id": int(enrollment_id),
            "offering_id": int(self.enrollment_offering[enrollment_id]),
            "student": self.enrollment_student[enrollment_id],
            "fee": int(self.enrollment_fee[enrollment_id]),
            "status": self.enrollment_status[enrollment_id],
            "decision": self.enrollment_decision[enrollment_id],
            "curriculum_fidelity": self.enrollment_curriculum_fidelity[enrollment_id],
            "instructor_fidelity": self.enrollment_instructor_fidelity[enrollment_id],
            "reason": self.enrollment_reason[enrollment_id],
            "organizer_paid": int(self.enrollment_organizer_paid[enrollment_id]),
            "student_refunded": int(self.enrollment_student_refunded[enrollment_id]),
        }

    @gl.public.view
    def get_enrollment_evidence(self, enrollment_id: u256) -> typing.Any:
        if enrollment_id >= self.enrollment_count:
            raise gl.vm.UserError("ENROLLMENT_NOT_FOUND")
        return {
            "id": int(enrollment_id),
            "delivery_url": self.enrollment_delivery_url[enrollment_id],
            "delivery_digest": self.enrollment_delivery_digest[enrollment_id],
            "dispute_url": self.enrollment_dispute_url[enrollment_id],
            "dispute_digest": self.enrollment_dispute_digest[enrollment_id],
        }

    @gl.public.view
    def get_totals(self) -> typing.Any:
        return {
            "total_received": int(self.total_received),
            "total_held": int(self.total_held),
            "total_paid_to_organizers": int(self.total_paid_to_organizers),
            "total_refunded_to_students": int(self.total_refunded_to_students),
        }

    @gl.public.view
    def get_counts(self) -> typing.Any:
        return {
            "offering_count": int(self.offering_count),
            "enrollment_count": int(self.enrollment_count),
        }

    @gl.public.view
    def check_enrollment_status(self, offering_id: u256, student: str) -> typing.Any:
        student_offering_key = student.lower() + "_" + str(int(offering_id))
        val = self.student_offering_index.get(student_offering_key, u256(0))
        if val == u256(0):
            return {"enrolled": False, "enrollment_id": -1}
        return {"enrolled": True, "enrollment_id": int(val - u256(1))}
