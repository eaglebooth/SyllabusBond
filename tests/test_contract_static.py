import ast
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "SyllabusBond.py"
SOURCE = CONTRACT.read_text(encoding="utf-8")
TREE = ast.parse(SOURCE)


def load_contract_verdict_methods():
    contract = next(
        node for node in TREE.body
        if isinstance(node, ast.ClassDef) and node.name == "SyllabusBond"
    )
    methods = [
        node for node in contract.body
        if isinstance(node, ast.FunctionDef)
        and node.name in ("_parse_verdict", "_consistent_verdict")
    ]
    test_class = ast.ClassDef(
        name="VerdictHarness",
        bases=[],
        keywords=[],
        body=methods,
        decorator_list=[],
    )
    module = ast.fix_missing_locations(ast.Module(body=[test_class], type_ignores=[]))
    namespace = {"json": json, "typing": __import__("typing")}
    exec(compile(module, str(CONTRACT), "exec"), namespace)
    return namespace["VerdictHarness"]()


class ContractStaticTests(unittest.TestCase):
    def test_runner_header_and_syntax(self):
        self.assertEqual(
            SOURCE.splitlines()[:3],
            [
                "# v0.2.16",
                '# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }',
                "from genlayer import *",
            ],
        )

    def test_storage_types(self):
        contract = next(
            node for node in TREE.body
            if isinstance(node, ast.ClassDef) and node.name == "SyllabusBond"
        )
        for stmt in contract.body:
            if isinstance(stmt, ast.AnnAssign):
                # Annotations must be u256 or TreeMap
                ann_str = ast.unparse(stmt.annotation)
                self.assertTrue(
                    ann_str == "u256" or ann_str.startswith("TreeMap["),
                    f"Unexpected storage type annotation: {ann_str}"
                )

    def test_semantic_consensus_and_value_flow(self):
        self.assertIn("gl.eq_principle.prompt_comparative", SOURCE)
        self.assertNotIn("gl.eq_principle.strict_eq", SOURCE)
        self.assertIn("@gl.public.write.payable", SOURCE)
        self.assertIn("emit_transfer(value=organizer_payout)", SOURCE)
        self.assertIn("emit_transfer(value=student_refund)", SOURCE)
        self.assertIn("emit_transfer(value=fee)", SOURCE)
        self.assertIn("hashlib.sha256", SOURCE)
        self.assertIn("gl.nondet.web.get", SOURCE)

    def test_economic_and_permission_guards(self):
        for marker in [
            'raise gl.vm.UserError("ORGANIZER_ONLY")',
            'raise gl.vm.UserError("STUDENT_ONLY")',
            'raise gl.vm.UserError("PARTY_ONLY")',
            'raise gl.vm.UserError("EXACT_FEE_REQUIRED")',
            'raise gl.vm.UserError("ALREADY_ENROLLED")',
            'raise gl.vm.UserError("DIGEST_ALREADY_USED")',
            'raise gl.vm.UserError("INCONSISTENT_VERDICT")',
            'raise gl.vm.UserError("CONSERVATION_INVARIANT_BROKEN")',
            'raise gl.vm.UserError("NOT_READY_FOR_SETTLEMENT")',
            "gl.message.sender_address.as_hex.lower()",
            "https://arweave.net/",
            "https://ipfs.io/ipfs/",
        ]:
            self.assertIn(marker, SOURCE)

    def test_no_unbounded_history_scans(self):
        for marker in [
            "range(self.offering_count",
            "range(self.enrollment_count",
            "while True",
            "mockContract",
            "testnetAsimov",
        ]:
            self.assertNotIn(marker, SOURCE)

    def test_public_methods_flat_signatures(self):
        for node in ast.walk(TREE):
            if isinstance(node, ast.FunctionDef) and any(
                isinstance(item, ast.Attribute) and item.attr in ("write", "view", "payable")
                for item in node.decorator_list
            ):
                self.assertLessEqual(len(node.args.args) - 1, 6, f"Method {node.name} has >6 parameters")

    def test_verdict_parser_consistency(self):
        harness = load_contract_verdict_methods()
        valid_tuples = [
            ("DELIVERED", "FULL", "MATCH"),
            ("MATERIALLY_REDUCED", "PARTIAL", "MATCH"),
            ("MATERIALLY_REDUCED", "PARTIAL", "SUBSTITUTED"),
            ("MATERIALLY_REDUCED", "FULL", "SUBSTITUTED"),
            ("NOT_DELIVERED", "BREACH", "MATCH"),
            ("NOT_DELIVERED", "BREACH", "SUBSTITUTED"),
            ("EVIDENCE_UNAVAILABLE", "UNVERIFIED", "UNVERIFIED"),
        ]
        invalid_tuples = [
            ("DELIVERED", "BREACH", "MATCH"),
            ("DELIVERED", "PARTIAL", "MATCH"),
            ("MATERIALLY_REDUCED", "BREACH", "MATCH"),
            ("NOT_DELIVERED", "FULL", "MATCH"),
            ("NOT_DELIVERED", "PARTIAL", "MATCH"),
            ("EVIDENCE_UNAVAILABLE", "FULL", "MATCH"),
        ]
        for dec, curr, inst in valid_tuples:
            res = harness._parse_verdict({
                "decision": dec,
                "curriculum_fidelity": curr,
                "instructor_fidelity": inst,
                "reason": "Test reason",
            })
            self.assertIsNotNone(res, f"Expected valid for ({dec}, {curr}, {inst})")

        for dec, curr, inst in invalid_tuples:
            res = harness._parse_verdict({
                "decision": dec,
                "curriculum_fidelity": curr,
                "instructor_fidelity": inst,
                "reason": "Test reason",
            })
            self.assertIsNone(res, f"Expected invalid for ({dec}, {curr}, {inst})")


if __name__ == "__main__":
    unittest.main()
