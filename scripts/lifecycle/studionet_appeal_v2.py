"""Two-wallet Studionet lifecycle for SyllabusBond stake-backed appeals v2.

Signer material is read only from process environment and is never persisted.
"""

import json
import hashlib
import os
import time

from genlayer_py import create_account, create_client
from genlayer_py.chains import studionet


ADDRESS = os.environ.get("SYLLABUSBOND_CONTRACT_ADDRESS", "0x378D5cFCdDbb0614ECF7d548888B675A0Ba0019B")
RPC_URL = "https://studio.genlayer.com/api"
FEE = 10**16
APPEAL_STAKE = 10**15
# Public immutable fixtures: a blockchain-engineering program specification,
# the v1 course-delivery record, and an independent smart-contract audit packet.
TERMS_URL = "https://arweave.net/z4LUVfc8kUCigvV_Gc-iXekWdwbOxu4NOclEwuz2-YE"
TERMS_DIGEST = "sha256:3efe38f84999785a6e377d03165658674ff14165ab109b7a84f9dbc464c6477f"
DELIVERY_URL = "https://arweave.net/fSukBpWLRDRMEesNSdrhE51cHEtEwnrRH3sUDKrMZWk"
DELIVERY_DIGEST = "sha256:560d0d6436a6f85d9bf91eb8b204cb8db29707a5d464a9b1b981b40578d1aca3"
APPEAL_URL = "https://arweave.net/EOrW1khtJaqKy4MDn6HKgxrpxWGNh39nFwLkmuDzqRE"
APPEAL_DIGEST = "sha256:4b93626dae47456bd01f60412589732fa1ffd8327c223975b96613593c047435"


def parse(value):
    return json.loads(value) if isinstance(value, str) else value


def main():
    organizer_signer = os.environ.get("SYLLABUSBOND_ORGANIZER_SIGNER", "")
    student_signer = os.environ.get("SYLLABUSBOND_STUDENT_SIGNER", "")
    if not organizer_signer or not student_signer:
        raise RuntimeError("Set both ephemeral SyllabusBond test signer environment variables.")

    organizer = create_account(organizer_signer)
    student = create_account(student_signer)
    chain = create_client(chain=studionet, account=organizer, endpoint=RPC_URL)

    def read(name, args=None):
        last_error = None
        for attempt in range(5):
            try:
                return parse(chain.read_contract(address=ADDRESS, function_name=name, args=args or [], account=organizer))
            except Exception as error:
                last_error = error
                if attempt < 4:
                    time.sleep(2 ** attempt)
        raise last_error

    def submit(account, method, args, value=0):
        tx = str(chain.write_contract(address=ADDRESS, function_name=method, account=account, args=args, value=value))
        print(json.dumps({"event": "TX_SUBMITTED", "method": method, "tx": tx}, sort_keys=True), flush=True)
        return tx

    def wait(label, predicate, timeout=720):
        deadline, last = time.time() + timeout, ""
        while time.time() < deadline:
            state = predicate()
            encoded = json.dumps(state, sort_keys=True, default=str)
            if encoded != last:
                print(json.dumps({"event": label, "state": state}, sort_keys=True, default=str), flush=True)
                last = encoded
            if state.get("ready"):
                return state
            time.sleep(5)
        raise TimeoutError(label)

    initial = read("get_totals")
    counts = read("get_counts")
    resume_offering = os.environ.get("SYLLABUSBOND_RESUME_OFFERING_ID", "")
    offering_id = int(resume_offering) if resume_offering else int(counts["offering_count"])
    enrollment_id = int(counts["enrollment_count"])
    curriculum_digest = "sha256:" + hashlib.sha256(
        f"syllabusbond:v2:appeal-runtime:{offering_id}".encode("utf-8")
    ).hexdigest()
    transactions = {}

    if not resume_offering:
        transactions["create_offering"] = submit(organizer, "create_offering", [
            "Product recall compliance training", f"SB-APPEAL-{offering_id}", FEE, 8, TERMS_URL, TERMS_DIGEST,
        ])
        wait("OFFERING_CREATED", lambda: {"ready": int(read("get_counts")["offering_count"]) > offering_id})
    offering = read("get_offering", [offering_id])
    if offering["status"] == "AWAITING_CURRICULUM_LOCK":
        transactions["lock_curriculum"] = submit(organizer, "lock_offering_curriculum", [offering_id, curriculum_digest, "Test Instructor"])
    wait("OFFERING_OPEN", lambda: {"ready": read("get_offering", [offering_id])["status"] == "OPEN", "offering": read("get_offering", [offering_id])})
    transactions["enroll"] = submit(student, "enroll", [offering_id], FEE)
    wait("ENROLLED", lambda: {"ready": int(read("get_counts")["enrollment_count"]) > enrollment_id, "totals": read("get_totals")})
    transactions["delivery"] = submit(organizer, "submit_delivery_evidence", [enrollment_id, DELIVERY_URL, DELIVERY_DIGEST])
    challenge = wait("CHALLENGE_WINDOW", lambda: {"ready": read("get_enrollment", [enrollment_id])["status"] == "CHALLENGE_WINDOW", "enrollment": read("get_enrollment", [enrollment_id]), "offering": read("get_offering", [offering_id])})

    challenge_deadline = int(challenge["offering"]["challenge_deadline"])
    while int(time.time()) <= challenge_deadline:
        remaining = challenge_deadline - int(time.time()) + 1
        print(json.dumps({"event": "WAIT_CHALLENGE_DEADLINE", "seconds": remaining}), flush=True)
        time.sleep(min(30, remaining))

    transactions["ready"] = submit(student, "confirm_ready_for_review", [enrollment_id])
    wait("READY_FOR_REVIEW", lambda: {"ready": read("get_enrollment", [enrollment_id])["status"] == "READY_FOR_REVIEW"})
    transactions["adjudicate"] = submit(organizer, "adjudicate", [enrollment_id])
    initial_verdict = wait(
        "INITIAL_VERDICT",
        lambda: {
            "ready": read("get_enrollment", [enrollment_id])["status"] in ("ADJUDICATED", "RECOVERY_WAIT"),
            "enrollment": read("get_enrollment", [enrollment_id]),
        },
        timeout=900,
    )
    if initial_verdict["enrollment"]["status"] != "ADJUDICATED":
        raise RuntimeError("Initial adjudication failed closed; claim recovery after its deadline.")

    transactions["open_appeal"] = submit(student, "open_appeal", [enrollment_id, APPEAL_URL, APPEAL_DIGEST], APPEAL_STAKE)
    wait("APPEAL_OPEN", lambda: {"ready": read("get_enrollment", [enrollment_id])["status"] == "APPEAL_PENDING", "enrollment": read("get_enrollment", [enrollment_id]), "evidence": read("get_enrollment_evidence", [enrollment_id]), "totals": read("get_totals")})
    transactions["adjudicate_appeal"] = submit(organizer, "adjudicate_appeal", [enrollment_id])
    appeal = wait("APPEAL_RESOLVED", lambda: {"ready": read("get_enrollment", [enrollment_id])["status"] in ("APPEAL_RESOLVED", "RECOVERY_WAIT"), "enrollment": read("get_enrollment", [enrollment_id]), "totals": read("get_totals")}, timeout=900)
    if appeal["enrollment"]["status"] != "APPEAL_RESOLVED":
        raise RuntimeError("Appeal failed closed; use recovery evidence path instead of claiming appeal success.")

    transactions["settle"] = submit(student, "settle", [enrollment_id])
    final = wait("SETTLED", lambda: {"ready": read("get_enrollment", [enrollment_id])["status"] == "SETTLED", "enrollment": read("get_enrollment", [enrollment_id]), "totals": read("get_totals"), "contract_balance": int(chain.get_balance(ADDRESS))})
    totals = final["totals"]
    if int(totals["total_received"]) != int(totals["total_held"]) + int(totals["total_paid_to_organizers"]) + int(totals["total_refunded_to_students"]):
        raise RuntimeError("Global conservation invariant failed")
    print(json.dumps({"event": "APPEAL_V2_FINAL", "address": ADDRESS, "offering_id": offering_id, "enrollment_id": enrollment_id, "initial": initial, "initial_verdict": initial_verdict, "appeal": appeal, "final": final, "transactions": transactions}, sort_keys=True, default=str), flush=True)


if __name__ == "__main__":
    main()
