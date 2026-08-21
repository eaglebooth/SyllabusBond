import unittest
from tests.test_production_contract_paths import (
    load_production_harness,
    SenderAddress,
    UserError,
    ORGANIZER,
    STUDENT_A,
    OTHER,
    URL_TERMS,
    URL_DELIVERY,
    URL_DISPUTE,
    DIGEST_TERMS,
    DIGEST_CURRICULUM,
    DIGEST_DELIVERY,
    DIGEST_DISPUTE,
    DIGEST_OTHER,
)


class LifecycleBehaviorTests(unittest.TestCase):
    def test_full_happy_path_delivered(self):
        contract, gl = load_production_harness()
        fee = 1_000_000

        # 1. Organizer creates offering and locks curriculum
        gl.message.sender_address = SenderAddress(ORGANIZER)
        off_id = contract.create_offering("Deep Learning Bootcamp", "DL-01", fee, 40, URL_TERMS, DIGEST_TERMS)
        contract.lock_offering_curriculum(off_id, DIGEST_CURRICULUM, "Dr. Alice")

        # 2. Student enrolls with exact payable fee
        gl.message.sender_address = SenderAddress(STUDENT_A)
        gl.message.value = fee
        enr_id = contract.enroll(off_id)
        self.assertEqual(contract.enrollment_status[enr_id], "FUNDED")
        self.assertEqual(contract.total_held, fee)

        # 3. Organizer submits delivery evidence
        gl.message.sender_address = SenderAddress(ORGANIZER)
        contract.submit_delivery_evidence(enr_id, URL_DELIVERY, DIGEST_DELIVERY)
        self.assertEqual(contract.enrollment_status[enr_id], "CHALLENGE_WINDOW")

        # 4. Challenge window concludes without dispute
        gl.message.sender_address = SenderAddress(STUDENT_A)
        contract.confirm_ready_for_review(enr_id)
        self.assertEqual(contract.enrollment_status[enr_id], "READY_FOR_REVIEW")

        # 5. Adjudication mock result: DELIVERED
        contract.enrollment_status[enr_id] = "ADJUDICATED"
        contract.enrollment_decision[enr_id] = "DELIVERED"
        contract.enrollment_curriculum_fidelity[enr_id] = "FULL"
        contract.enrollment_instructor_fidelity[enr_id] = "MATCH"

        # 6. Settle
        gl.message.sender_address = SenderAddress(ORGANIZER)
        self.assertEqual(contract.settle(enr_id), "SETTLED")
        self.assertEqual(contract.enrollment_organizer_paid[enr_id], fee)
        self.assertEqual(contract.enrollment_student_refunded[enr_id], 0)
        self.assertEqual(contract.total_held, 0)
        self.assertEqual(contract.total_paid_to_organizers, fee)
        self.assertEqual(contract.total_refunded_to_students, 0)

        # 7. Double settlement prevented
        with self.assertRaisesRegex(UserError, "NOT_READY_FOR_SETTLEMENT"):
            contract.settle(enr_id)

    def test_not_delivered_full_refund_path(self):
        contract, gl = load_production_harness()
        fee = 500_000

        gl.message.sender_address = SenderAddress(ORGANIZER)
        off_id = contract.create_offering("Python for Finance", "PY-01", fee, 20, URL_TERMS, DIGEST_TERMS)
        contract.lock_offering_curriculum(off_id, DIGEST_CURRICULUM, "Dr. Alice")

        gl.message.sender_address = SenderAddress(STUDENT_A)
        gl.message.value = fee
        enr_id = contract.enroll(off_id)

        gl.message.sender_address = SenderAddress(ORGANIZER)
        contract.submit_delivery_evidence(enr_id, URL_DELIVERY, DIGEST_DELIVERY)

        # Student submits dispute evidence
        gl.message.sender_address = SenderAddress(STUDENT_A)
        contract.submit_dispute_evidence(enr_id, URL_DISPUTE, DIGEST_DISPUTE)
        self.assertEqual(contract.enrollment_status[enr_id], "READY_FOR_REVIEW")

        # Adjudication returns NOT_DELIVERED
        contract.enrollment_status[enr_id] = "ADJUDICATED"
        contract.enrollment_decision[enr_id] = "NOT_DELIVERED"
        contract.enrollment_curriculum_fidelity[enr_id] = "BREACH"
        contract.enrollment_instructor_fidelity[enr_id] = "MATCH"

        gl.message.sender_address = SenderAddress(STUDENT_A)
        self.assertEqual(contract.settle(enr_id), "SETTLED")
        self.assertEqual(contract.enrollment_organizer_paid[enr_id], 0)
        self.assertEqual(contract.enrollment_student_refunded[enr_id], fee)
        self.assertEqual(contract.total_held, 0)
        self.assertEqual(contract.total_refunded_to_students, fee)

    def test_student_pre_delivery_cancellation(self):
        contract, gl = load_production_harness()
        fee = 200_000

        gl.message.sender_address = SenderAddress(ORGANIZER)
        off_id = contract.create_offering("Rust Systems", "RS-01", fee, 30, URL_TERMS, DIGEST_TERMS)
        contract.lock_offering_curriculum(off_id, DIGEST_CURRICULUM, "Dr. Alice")

        gl.message.sender_address = SenderAddress(STUDENT_A)
        gl.message.value = fee
        enr_id = contract.enroll(off_id)

        # Cancellation by unauthorized party
        gl.message.sender_address = SenderAddress(OTHER)
        with self.assertRaisesRegex(UserError, "STUDENT_ONLY"):
            contract.cancel_enrollment(enr_id)

        # Cancellation by student
        gl.message.sender_address = SenderAddress(STUDENT_A)
        self.assertEqual(contract.cancel_enrollment(enr_id), "CANCELLED")
        self.assertEqual(contract.enrollment_status[enr_id], "CANCELLED")
        self.assertEqual(contract.enrollment_student_refunded[enr_id], fee)
        self.assertEqual(contract.total_held, 0)

    def test_recovery_lifecycle(self):
        contract, gl = load_production_harness()
        fee = 300_000

        gl.message.sender_address = SenderAddress(ORGANIZER)
        off_id = contract.create_offering("Quantum Computing", "QC-01", fee, 15, URL_TERMS, DIGEST_TERMS)
        contract.lock_offering_curriculum(off_id, DIGEST_CURRICULUM, "Dr. Alice")

        gl.message.sender_address = SenderAddress(STUDENT_A)
        gl.message.value = fee
        enr_id = contract.enroll(off_id)

        # Case enters RECOVERY_WAIT (due to missing/unresolvable sources)
        contract.enrollment_status[enr_id] = "RECOVERY_WAIT"

        # Party executes recovery
        gl.message.sender_address = SenderAddress(STUDENT_A)
        self.assertEqual(contract.claim_recovery(enr_id), "RECOVERED")
        self.assertEqual(contract.enrollment_status[enr_id], "RECOVERED")
        self.assertEqual(contract.enrollment_organizer_paid[enr_id], 150_000)
        self.assertEqual(contract.enrollment_student_refunded[enr_id], 150_000)
        self.assertEqual(contract.total_held, 0)

    def test_race_condition_prevention(self):
        contract, gl = load_production_harness()
        fee = 100_000

        gl.message.sender_address = SenderAddress(ORGANIZER)
        off_id = contract.create_offering("Web Security", "SEC-01", fee, 10, URL_TERMS, DIGEST_TERMS)
        contract.lock_offering_curriculum(off_id, DIGEST_CURRICULUM, "Dr. Alice")

        gl.message.sender_address = SenderAddress(STUDENT_A)
        gl.message.value = fee
        enr_id = contract.enroll(off_id)

        # Status is FUNDED: settle or recovery cannot be called prematurely
        with self.assertRaisesRegex(UserError, "NOT_READY_FOR_SETTLEMENT"):
            contract.settle(enr_id)
        with self.assertRaisesRegex(UserError, "NOT_IN_RECOVERY_STATE"):
            contract.claim_recovery(enr_id)


if __name__ == "__main__":
    unittest.main()
