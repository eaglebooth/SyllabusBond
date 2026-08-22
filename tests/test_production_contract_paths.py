import ast
import copy
import hashlib
import json
import types
import typing
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "SyllabusBond.py"
SOURCE = CONTRACT.read_text(encoding="utf-8")
TREE = ast.parse(SOURCE)

ORGANIZER = "0x" + "1" * 40
STUDENT_A = "0x" + "2" * 40
STUDENT_B = "0x" + "3" * 40
OTHER = "0x" + "4" * 40

URL_TERMS = "https://arweave.net/" + "t" * 43
URL_DELIVERY = "https://ipfs.io/ipfs/" + "d" * 46
URL_DISPUTE = "https://arweave.net/" + "p" * 43

DIGEST_TERMS = "sha256:" + "1" * 64
DIGEST_CURRICULUM = "sha256:" + "2" * 64
DIGEST_DELIVERY = "sha256:" + "3" * 64
DIGEST_DISPUTE = "sha256:" + "4" * 64
DIGEST_OTHER = "sha256:" + "5" * 64


class UserError(Exception):
    pass


class SenderAddress:
    def __init__(self, value):
        self.as_hex = value


class FakeMap(dict):
    pass


def load_production_harness():
    contract = next(
        node for node in TREE.body
        if isinstance(node, ast.ClassDef) and node.name == "SyllabusBond"
    )
    names = {
        "_valid_address",
        "_valid_immutable_url",
        "_valid_digest",
        "_sha256_digest",
        "_consistent_verdict",
        "_parse_verdict",
        "_now",
        "_timing_available",
        "create_offering",
        "lock_offering_curriculum",
        "enroll",
        "submit_delivery_evidence",
        "submit_dispute_evidence",
        "confirm_ready_for_review",
        "settle",
        "claim_recovery",
        "cancel_enrollment",
        "close_offering",
    }
    methods = []
    for node in contract.body:
        if isinstance(node, ast.FunctionDef) and node.name in names:
            method = copy.deepcopy(node)
            method.decorator_list = []
            methods.append(method)
    harness = ast.ClassDef(
        name="ProductionHarness",
        bases=[],
        keywords=[],
        body=methods,
        decorator_list=[],
    )
    module = ast.fix_missing_locations(ast.Module(body=[harness], type_ignores=[]))
    gl = types.SimpleNamespace(
        message=types.SimpleNamespace(
            sender_address=SenderAddress(ORGANIZER),
            value=0,
        ),
        vm=types.SimpleNamespace(UserError=UserError),
    )
    namespace = {
        "Address": lambda value: value,
        "_Recipient": lambda _address: types.SimpleNamespace(emit_transfer=lambda value: None),
        "gl": gl,
        "hashlib": hashlib,
        "json": json,
        "typing": typing,
        "u256": int,
    }
    exec(compile(module, str(CONTRACT), "exec"), namespace)
    instance = namespace["ProductionHarness"]()
    instance.balance = 10_000_000_000_000_000_000 # 10 GEN
    instance.offering_count = 0
    instance.enrollment_count = 0
    instance.total_received = 0
    instance.total_held = 0
    instance.total_paid_to_organizers = 0
    instance.total_refunded_to_students = 0

    for field in (
        "offering_organizer",
        "offering_title",
        "offering_course_id",
        "offering_fee",
        "offering_duration_hours",
        "offering_delivery_deadline",
        "offering_challenge_deadline",
        "offering_recovery_deadline",
        "offering_terms_url",
        "offering_terms_digest",
        "offering_curriculum_digest",
        "offering_instructor",
        "offering_status",
        "enrollment_offering",
        "enrollment_student",
        "enrollment_fee",
        "enrollment_status",
        "enrollment_delivery_url",
        "enrollment_delivery_digest",
        "enrollment_dispute_url",
        "enrollment_dispute_digest",
        "enrollment_decision",
        "enrollment_curriculum_fidelity",
        "enrollment_instructor_fidelity",
        "enrollment_reason",
        "enrollment_organizer_paid",
        "enrollment_student_refunded",
        "student_offering_index",
        "digest_claim_index",
    ):
        setattr(instance, field, FakeMap())
    return instance, gl


class ProductionContractPathTests(unittest.TestCase):
    def test_digest_verification(self):
        contract, _ = load_production_harness()
        body = b"CS101 Intro to AI & LLM Systems - Syllabus and Schedule"
        expected = "sha256:" + hashlib.sha256(body).hexdigest()
        self.assertEqual(contract._sha256_digest(body), expected)
        self.assertNotEqual(contract._sha256_digest(body + b"!"), expected)

    def test_sender_authorization_and_offering_creation(self):
        contract, gl = load_production_harness()
        gl.message.sender_address = SenderAddress(ORGANIZER)
        off_id = contract.create_offering(
            "Fullstack AI Masterclass",
            "AI-2026-X",
            1_000_000_000_000_000_000, # 1 GEN
            40,
            URL_TERMS,
            DIGEST_TERMS,
        )
        self.assertEqual(off_id, 0)
        self.assertEqual(contract.offering_status[0], "AWAITING_CURRICULUM_LOCK")

        # Unauthorized locking
        gl.message.sender_address = SenderAddress(OTHER)
        with self.assertRaisesRegex(UserError, "ORGANIZER_ONLY"):
            contract.lock_offering_curriculum(0, DIGEST_CURRICULUM, "Dr. Alice")

        # Authorized locking
        gl.message.sender_address = SenderAddress(ORGANIZER)
        self.assertEqual(
            contract.lock_offering_curriculum(0, DIGEST_CURRICULUM, "Dr. Alice"),
            "OFFERING_OPEN"
        )
        self.assertEqual(contract.offering_status[0], "OPEN")

    def test_exact_fee_enforcement_and_duplicate_enrollment(self):
        contract, gl = load_production_harness()
        gl.message.sender_address = SenderAddress(ORGANIZER)
        contract.create_offering("Web3 Architecture", "W3-01", 1_000, 20, URL_TERMS, DIGEST_TERMS)
        contract.lock_offering_curriculum(0, DIGEST_CURRICULUM, "Prof. Bob")

        # Organizer cannot enroll
        gl.message.value = 1_000
        with self.assertRaisesRegex(UserError, "ORGANIZER_CANNOT_ENROLL"):
            contract.enroll(0)

        # Wrong fee
        gl.message.sender_address = SenderAddress(STUDENT_A)
        gl.message.value = 999
        with self.assertRaisesRegex(UserError, "EXACT_FEE_REQUIRED"):
            contract.enroll(0)

        # Correct fee
        gl.message.value = 1_000
        enr_id = contract.enroll(0)
        self.assertEqual(enr_id, 0)
        self.assertEqual(contract.total_received, 1_000)
        self.assertEqual(contract.total_held, 1_000)

        # Duplicate enrollment prevented
        with self.assertRaisesRegex(UserError, "ALREADY_ENROLLED"):
            contract.enroll(0)

    def test_anti_reuse_protection(self):
        contract, gl = load_production_harness()
        gl.message.sender_address = SenderAddress(ORGANIZER)
        contract.create_offering("Course A", "CA-01", 1_000, 20, URL_TERMS, DIGEST_TERMS)
        contract.lock_offering_curriculum(0, DIGEST_CURRICULUM, "Prof. Bob")

        gl.message.sender_address = SenderAddress(STUDENT_A)
        gl.message.value = 1_000
        contract.enroll(0)

        gl.message.sender_address = SenderAddress(STUDENT_B)
        gl.message.value = 1_000
        contract.enroll(0)

        # Organizer submits delivery for enrollment 0
        gl.message.sender_address = SenderAddress(ORGANIZER)
        contract.submit_delivery_evidence(0, URL_DELIVERY, DIGEST_DELIVERY)

        # Organizer tries to reuse the same delivery digest for enrollment 1
        with self.assertRaisesRegex(UserError, "DIGEST_ALREADY_USED"):
            contract.submit_delivery_evidence(1, URL_DELIVERY, DIGEST_DELIVERY)

    def test_materially_reduced_remainder(self):
        contract, gl = load_production_harness()
        # Odd fee: 101 wei
        fee = 101
        gl.message.sender_address = SenderAddress(ORGANIZER)
        contract.create_offering("Workshop", "WS-01", fee, 10, URL_TERMS, DIGEST_TERMS)
        contract.lock_offering_curriculum(0, DIGEST_CURRICULUM, "Prof. Bob")

        gl.message.sender_address = SenderAddress(STUDENT_A)
        gl.message.value = fee
        contract.enroll(0)

        contract.enrollment_status[0] = "ADJUDICATED"
        contract.enrollment_decision[0] = "MATERIALLY_REDUCED"
        contract.enrollment_curriculum_fidelity[0] = "PARTIAL"
        contract.enrollment_instructor_fidelity[0] = "MATCH"

        contract.settle(0)

        # 101 // 2 = 50 for organizer, 101 - 50 = 51 for student
        self.assertEqual(contract.enrollment_organizer_paid[0], 50)
        self.assertEqual(contract.enrollment_student_refunded[0], 51)
        self.assertEqual(contract.total_paid_to_organizers, 50)
        self.assertEqual(contract.total_refunded_to_students, 51)
        self.assertEqual(contract.total_held, 0)


if __name__ == "__main__":
    unittest.main()
