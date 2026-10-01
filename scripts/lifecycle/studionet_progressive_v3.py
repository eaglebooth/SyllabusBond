"""Funded two-wallet Studionet proof for SyllabusBond v0.3.

Signer material is read only from process environment and is never persisted.
"""

import hashlib
import json
import os
import time

from genlayer_py import create_account, create_client
from genlayer_py.chains import studionet


ADDRESS = os.environ["SYLLABUSBOND_CONTRACT_ADDRESS"]
RPC_URL = "https://studio.genlayer.com/api"
FEE = 10**15
TERMS_URL = "https://gateway.pinata.cloud/ipfs/QmPU5Mbk6w7sudTQroAkajS7MXsWegxjkmfMMfViNvXn9c"
TERMS_DIGEST = "sha256:d45b9fc4bb0dff34fcf638d6b21ddaf34ace8352405d07c5bebf2baa5bb235df"
MODULE_URL = "https://gateway.pinata.cloud/ipfs/QmNeniPAmyVTjSpXRRqCK94Dr77DVRjS6uvbdcwNTxF4nK"
MODULE_DIGEST = "sha256:20faf20bf16f2c66f2a8e670f0d832e88709cd08af06b8a4fa80abf88667d772"


def parse(value):
    return json.loads(value) if isinstance(value, str) else value


def main():
    organizer = create_account(os.environ["SYLLABUSBOND_ORGANIZER_SIGNER"])
    student = create_account(os.environ["SYLLABUSBOND_STUDENT_SIGNER"])
    client = create_client(chain=studionet, account=organizer, endpoint=RPC_URL)

    def read(name, args=None):
        return parse(client.read_contract(address=ADDRESS, function_name=name, args=args or [], account=organizer))

    def submit(account, name, args, value=0):
        tx = str(client.write_contract(address=ADDRESS, function_name=name, args=args, value=value, account=account))
        print(json.dumps({"event": "TX", "method": name, "tx": tx}), flush=True)
        return tx

    def wait(label, predicate, timeout=600):
        deadline = time.time() + timeout
        while time.time() < deadline:
            state = predicate()
            if state.get("ready"):
                print(json.dumps({"event": label, "state": state}, default=str), flush=True)
                return state
            time.sleep(5)
        raise TimeoutError(label)

    initial_counts = read("get_counts")
    initial_totals = read("get_totals")
    offering_id = int(initial_counts["offering_count"])
    enrollment_id = int(initial_counts["enrollment_count"])
    curriculum_digest = "sha256:" + hashlib.sha256(f"syllabusbond:v3:{offering_id}".encode()).hexdigest()
    transactions = {}

    transactions["create"] = submit(organizer, "create_offering", ["Progressive Escrow Proof", f"SB-V3-{offering_id}", FEE, 6, TERMS_URL, TERMS_DIGEST])
    wait("CREATED", lambda: {"ready": int(read("get_counts")["offering_count"]) > offering_id})
    transactions["modules"] = submit(organizer, "configure_modules", [offering_id, 3])
    wait("MODULES_CONFIGURED", lambda: {"ready": int(read("get_offering", [offering_id])["module_count"]) == 3})
    transactions["lock"] = submit(organizer, "lock_offering_curriculum", [offering_id, curriculum_digest, "SyllabusBond Test Instructor"])
    wait("OPEN", lambda: {"ready": read("get_offering", [offering_id])["status"] == "OPEN"})
    transactions["enroll"] = submit(student, "enroll", [offering_id], FEE)
    wait("ENROLLED", lambda: {"ready": int(read("get_counts")["enrollment_count"]) > enrollment_id})
    transactions["checkpoint"] = submit(organizer, "submit_module_checkpoint", [enrollment_id, 0, MODULE_URL, MODULE_DIGEST])
    wait("REVIEW", lambda: {"ready": read("get_module_checkpoint", [enrollment_id, 0])["status"] == "REVIEW"})
    transactions["accept"] = submit(student, "accept_module_checkpoint", [enrollment_id, 0])
    final = wait("PARTIAL_RELEASE", lambda: {"ready": int(read("get_module_progress", [enrollment_id])["next_module"]) == 1, "progress": read("get_module_progress", [enrollment_id]), "enrollment": read("get_enrollment", [enrollment_id]), "totals": read("get_totals")})

    totals = final["totals"]
    if int(totals["total_received"]) != int(totals["total_held"]) + int(totals["total_paid_to_organizers"]) + int(totals["total_refunded_to_students"]):
        raise RuntimeError("Global conservation invariant failed")
    progress = final["progress"]
    if int(progress["released_amount"]) + int(progress["remaining_amount"]) != FEE:
        raise RuntimeError("Enrollment conservation invariant failed")
    print(json.dumps({"event": "PROGRESSIVE_V3_FINAL", "address": ADDRESS, "offering_id": offering_id, "enrollment_id": enrollment_id, "initial_counts": initial_counts, "initial_totals": initial_totals, "final": final, "transactions": transactions}, default=str), flush=True)


if __name__ == "__main__":
    main()
