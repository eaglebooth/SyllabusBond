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
        "_parse_appeal_verdict",
        "_now",
        "_timing_available",
        "create_offering",
        "lock_offering_curriculum",
        "enroll",
        "submit_delivery_evidence",
        "submit_dispute_evidence",
        "confirm_ready_for_review",
        "open_appeal",
        "adjudicate_appeal",
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
        nondet=types.SimpleNamespace(
            web=types.SimpleNamespace(get=lambda _url: None),
            exec_prompt=lambda _prompt: "",
        ),
        eq_principle=types.SimpleNamespace(prompt_comparative=lambda callback, _principle: callback()),
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
        "enrollment_pre_appeal_decision",
        "enrollment_appeal_appellant",
        "enrollment_appeal_url",
        "enrollment_appeal_digest",
        "enrollment_appeal_stake",
        "enrollment_appeal_result",
        "enrollment_appeal_deadline",
        "enrollment_appeal_recovery_deadline",
    ):
        setattr(instance, field, FakeMap())
    return instance, gl


class ProductionContractPathTests(unittest.TestCase):
    def test_appeal_adjudication_accepts_verified_text_containing_old_sentinel(self):
        contract, gl = load_production_harness()
        bodies = {
            URL_TERMS: b"Locked terms with literal _DIGEST_MISMATCH used as harmless course text.",
            URL_DELIVERY: b"Delivery record confirms all promised sessions and instructor attendance.",
            URL_DISPUTE: b"Student dispute packet requests review of attendance documentation.",
            "https://arweave.net/" + "a" * 43: b"Appeal record supplies new evidence supporting complete delivery.",
        }
        appeal_url = "https://arweave.net/" + "a" * 43
        digest = lambda body: "sha256:" + hashlib.sha256(body).hexdigest()
        gl.nondet.web.get = lambda url: types.SimpleNamespace(body=bodies[url])
        gl.nondet.exec_prompt = lambda _prompt: json.dumps({
            "appeal_result": "UPHELD",
            "decision": "DELIVERED",
            "curriculum_fidelity": "FULL",
            "instructor_fidelity": "MATCH",
            "reason": "Verified record confirms delivery.",
        })

        contract.offering_count = 1
        contract.enrollment_count = 1
        contract.enrollment_status[0] = "APPEAL_PENDING"
        contract.enrollment_offering[0] = 0
        contract.enrollment_pre_appeal_decision[0] = "DELIVERED"
        contract.offering_terms_url[0] = URL_TERMS
        contract.offering_terms_digest[0] = digest(bodies[URL_TERMS])
        contract.offering_instructor[0] = "Prof. Bob"
        contract.offering_duration_hours[0] = 20
        contract.enrollment_delivery_url[0] = URL_DELIVERY
        contract.enrollment_delivery_digest[0] = digest(bodies[URL_DELIVERY])
        contract.enrollment_dispute_url[0] = URL_DISPUTE
        contract.enrollment_dispute_digest[0] = digest(bodies[URL_DISPUTE])
        contract.enrollment_appeal_url[0] = appeal_url
        contract.enrollment_appeal_digest[0] = digest(bodies[appeal_url])
        contract.enrollment_appeal_recovery_deadline[0] = 9999999999

        self.assertEqual(contract.adjudicate_appeal(0), "APPEAL_RESOLVED")
        self.assertEqual(contract.enrollment_appeal_result[0], "UPHELD")
        self.assertEqual(contract.enrollment_decision[0], "DELIVERED")

    def test_appeal_adjudication_fails_closed_on_digest_mismatch(self):
        contract, gl = load_production_harness()
        appeal_url = "https://arweave.net/" + "a" * 43
        bodies = {
            URL_TERMS: b"Locked course terms and syllabus commitment source document.",
            URL_DELIVERY: b"Organizer delivery evidence source document for review.",
            appeal_url: b"Tampered appeal bytes that no longer match the commitment.",
        }
        digest = lambda body: "sha256:" + hashlib.sha256(body).hexdigest()
        gl.nondet.web.get = lambda url: types.SimpleNamespace(body=bodies[url])
        contract.offering_count = 1
        contract.enrollment_count = 1
        contract.enrollment_status[0] = "APPEAL_PENDING"
        contract.enrollment_offering[0] = 0
        contract.enrollment_pre_appeal_decision[0] = "DELIVERED"
        contract.offering_terms_url[0] = URL_TERMS
        contract.offering_terms_digest[0] = digest(bodies[URL_TERMS])
        contract.offering_instructor[0] = "Prof. Bob"
        contract.offering_duration_hours[0] = 20
        contract.enrollment_delivery_url[0] = URL_DELIVERY
        contract.enrollment_delivery_digest[0] = digest(bodies[URL_DELIVERY])
        contract.enrollment_dispute_url[0] = ""
        contract.enrollment_dispute_digest[0] = ""
        contract.enrollment_appeal_url[0] = appeal_url
        contract.enrollment_appeal_digest[0] = DIGEST_OTHER
        contract.enrollment_appeal_recovery_deadline[0] = 9999999999

        self.assertEqual(contract.adjudicate_appeal(0), "RECOVERY_WAIT")
        self.assertEqual(contract.enrollment_appeal_result[0], "UNRESOLVED")
        self.assertEqual(contract.enrollment_decision[0], "EVIDENCE_UNAVAILABLE")

    def test_appeal_parser_requires_economically_consistent_result(self):
        contract, _ = load_production_harness()
        upheld = contract._parse_appeal_verdict({
            "appeal_result": "UPHELD", "decision": "DELIVERED",
            "curriculum_fidelity": "FULL", "instructor_fidelity": "MATCH", "reason": "Record confirms delivery."
        }, "DELIVERED")
        self.assertEqual(upheld[:2], ("UPHELD", "DELIVERED"))
        overturned = contract._parse_appeal_verdict({
            "appeal_result": "OVERTURNED", "decision": "NOT_DELIVERED",
            "curriculum_fidelity": "BREACH", "instructor_fidelity": "MATCH", "reason": "New evidence proves non-delivery."
        }, "DELIVERED")
        self.assertEqual(overturned[:2], ("OVERTURNED", "NOT_DELIVERED"))
        self.assertIsNone(contract._parse_appeal_verdict({
            "appeal_result": "UPHELD", "decision": "NOT_DELIVERED",
            "curriculum_fidelity": "BREACH", "instructor_fidelity": "MATCH", "reason": "Contradiction."
        }, "DELIVERED"))
        self.assertIsNone(contract._parse_appeal_verdict({
            "appeal_result": "OVERTURNED", "decision": "DELIVERED",
            "curriculum_fidelity": "FULL", "instructor_fidelity": "MATCH", "reason": "Contradiction."
        }, "DELIVERED"))

    def test_stake_backed_appeal_opening_and_duplicate_protection(self):
        contract, gl = load_production_harness()
        fee = 1_000
        gl.message.sender_address = SenderAddress(ORGANIZER)
        contract.create_offering("Appealable Course", "AP-01", fee, 20, URL_TERMS, DIGEST_TERMS)
        contract.lock_offering_curriculum(0, DIGEST_CURRICULUM, "Prof. Bob")
        gl.message.sender_address = SenderAddress(STUDENT_A)
        gl.message.value = fee
        contract.enroll(0)
        contract.enrollment_status[0] = "ADJUDICATED"
        contract.enrollment_decision[0] = "DELIVERED"
        contract.enrollment_curriculum_fidelity[0] = "FULL"
        contract.enrollment_instructor_fidelity[0] = "MATCH"

        gl.message.value = 99
        with self.assertRaisesRegex(UserError, "EXACT_APPEAL_STAKE_REQUIRED"):
            contract.open_appeal(0, URL_DISPUTE, DIGEST_OTHER)

        gl.message.value = 100
        self.assertEqual(contract.open_appeal(0, URL_DISPUTE, DIGEST_OTHER), "APPEAL_PENDING")
        self.assertEqual(contract.enrollment_pre_appeal_decision[0], "DELIVERED")
        self.assertEqual(contract.enrollment_appeal_stake[0], 100)
        self.assertEqual(contract.total_received, 1_100)
        self.assertEqual(contract.total_held, 1_100)

        contract.enrollment_status[0] = "ADJUDICATED"
        with self.assertRaisesRegex(UserError, "DIGEST_ALREADY_USED"):
            contract.open_appeal(0, URL_DISPUTE, DIGEST_OTHER)

    def test_upheld_student_appeal_awards_stake_to_organizer(self):
        contract, gl = load_production_harness()
        fee = 1_000
        contract.offering_count = 1
        contract.enrollment_count = 1
        contract.offering_organizer[0] = ORGANIZER
        contract.enrollment_student[0] = STUDENT_A
        contract.enrollment_offering[0] = 0
        contract.enrollment_fee[0] = fee
        contract.enrollment_status[0] = "APPEAL_RESOLVED"
        contract.enrollment_decision[0] = "DELIVERED"
        contract.enrollment_curriculum_fidelity[0] = "FULL"
        contract.enrollment_instructor_fidelity[0] = "MATCH"
        contract.enrollment_appeal_appellant[0] = STUDENT_A
        contract.enrollment_appeal_stake[0] = 100
        contract.enrollment_appeal_result[0] = "UPHELD"
        contract.total_received = 1_100
        contract.total_held = 1_100

        gl.message.sender_address = SenderAddress(STUDENT_A)
        self.assertEqual(contract.settle(0), "SETTLED")
        self.assertEqual(contract.enrollment_organizer_paid[0], 1_100)
        self.assertEqual(contract.enrollment_student_refunded[0], 0)
        self.assertEqual(contract.total_held, 0)

    def test_overturned_student_appeal_returns_stake_with_refund(self):
        contract, gl = load_production_harness()
        fee = 1_000
        contract.offering_count = 1
        contract.enrollment_count = 1
        contract.offering_organizer[0] = ORGANIZER
        contract.enrollment_student[0] = STUDENT_A
        contract.enrollment_offering[0] = 0
        contract.enrollment_fee[0] = fee
        contract.enrollment_status[0] = "APPEAL_RESOLVED"
        contract.enrollment_decision[0] = "NOT_DELIVERED"
        contract.enrollment_curriculum_fidelity[0] = "BREACH"
        contract.enrollment_instructor_fidelity[0] = "MATCH"
        contract.enrollment_appeal_appellant[0] = STUDENT_A
        contract.enrollment_appeal_stake[0] = 100
        contract.enrollment_appeal_result[0] = "OVERTURNED"
        contract.total_received = 1_100
        contract.total_held = 1_100

        gl.message.sender_address = SenderAddress(STUDENT_A)
        self.assertEqual(contract.settle(0), "SETTLED")
        self.assertEqual(contract.enrollment_organizer_paid[0], 0)
        self.assertEqual(contract.enrollment_student_refunded[0], 1_100)
        self.assertEqual(contract.total_held, 0)

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
