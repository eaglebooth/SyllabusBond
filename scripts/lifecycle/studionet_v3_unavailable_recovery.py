"""Prove disputed unavailable evidence and bounded recovery on Studionet v0.3."""

import hashlib
import json
import os
import time
from genlayer_py import create_account, create_client
from genlayer_py.chains import studionet

ADDRESS = os.environ["SYLLABUSBOND_CONTRACT_ADDRESS"]
FEE = 10**15


def pair(seed):
    return "https://ipfs.io/ipfs/Qm" + seed * 44, "sha256:" + hashlib.sha256(("missing:" + seed).encode()).hexdigest()


def main():
    organizer = create_account(os.environ["SYLLABUSBOND_ORGANIZER_SIGNER"])
    student = create_account(os.environ["SYLLABUSBOND_STUDENT_SIGNER"])
    client = create_client(chain=studionet, account=organizer, endpoint="https://studio.genlayer.com/api")
    txs = {}

    def read(name, args=None):
        value = client.read_contract(address=ADDRESS, function_name=name, args=args or [], account=organizer)
        return json.loads(value) if isinstance(value, str) else value

    def submit(account, name, args, value=0):
        tx = str(client.write_contract(address=ADDRESS, function_name=name, args=args, value=value, account=account))
        txs[name] = tx
        print(json.dumps({"event": "TX", "method": name, "tx": tx}), flush=True)

    def wait(label, predicate, timeout=900):
        deadline = time.time() + timeout
        while time.time() < deadline:
            state = predicate()
            if state.get("ready"):
                print(json.dumps({"event": label, "state": state}, default=str), flush=True)
                return state
            time.sleep(5)
        raise TimeoutError(label)

    counts = read("get_counts")
    offering_id, enrollment_id = int(counts["offering_count"]), int(counts["enrollment_count"])
    terms, evidence, dispute = pair("t"), pair("e"), pair("d")
    curriculum = "sha256:" + hashlib.sha256(f"recovery:{offering_id}".encode()).hexdigest()
    submit(organizer, "create_offering", ["Unavailable Recovery Matrix", f"SB-REC-{offering_id}", FEE, 4, terms[0], terms[1]])
    wait("CREATED", lambda: {"ready": int(read("get_counts")["offering_count"]) > offering_id})
    submit(organizer, "configure_modules", [offering_id, 2])
    wait("MODULES", lambda: {"ready": int(read("get_offering", [offering_id])["module_count"]) == 2})
    submit(organizer, "lock_offering_curriculum", [offering_id, curriculum, "Recovery Test Instructor"])
    wait("OPEN", lambda: {"ready": read("get_offering", [offering_id])["status"] == "OPEN"})
    submit(student, "enroll", [offering_id], FEE)
    wait("ENROLLED", lambda: {"ready": int(read("get_counts")["enrollment_count"]) > enrollment_id})
    submit(organizer, "submit_module_checkpoint", [enrollment_id, 0, evidence[0], evidence[1]])
    wait("REVIEW", lambda: {"ready": read("get_module_checkpoint", [enrollment_id, 0])["status"] == "REVIEW"})
    submit(student, "dispute_module_checkpoint", [enrollment_id, 0, dispute[0], dispute[1]])
    wait("DISPUTED", lambda: {"ready": read("get_module_checkpoint", [enrollment_id, 0])["status"] == "DISPUTED"})
    submit(organizer, "adjudicate_module_checkpoint", [enrollment_id, 0])
    unavailable = wait("UNAVAILABLE", lambda: {"ready": read("get_enrollment", [enrollment_id])["status"] == "MODULE_RECOVERY_WAIT", "checkpoint": read("get_module_checkpoint", [enrollment_id, 0]), "enrollment": read("get_enrollment", [enrollment_id])})
    deadline = int(unavailable["enrollment"]["module_recovery_deadline"])
    while int(time.time()) <= deadline:
        print(json.dumps({"event": "WAIT_RECOVERY", "seconds": deadline - int(time.time()) + 1}), flush=True)
        time.sleep(min(15, deadline - int(time.time()) + 1))
    submit(student, "claim_recovery", [enrollment_id])
    final = wait("RECOVERED", lambda: {"ready": read("get_enrollment", [enrollment_id])["status"] == "RECOVERED", "enrollment": read("get_enrollment", [enrollment_id]), "totals": read("get_totals")})
    totals = final["totals"]
    conservation = int(totals["total_received"]) == int(totals["total_held"]) + int(totals["total_paid_to_organizers"]) + int(totals["total_refunded_to_students"])
    print(json.dumps({"event": "UNAVAILABLE_RECOVERY_FINAL", "offering_id": offering_id, "enrollment_id": enrollment_id, "conservation": conservation, "final": final, "transactions": txs}, default=str), flush=True)
    if not conservation:
        raise RuntimeError("Conservation failed")


if __name__ == "__main__":
    main()
