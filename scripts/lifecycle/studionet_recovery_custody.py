"""Two-wallet Studionet custody/recovery verification for SyllabusBond.

Keys are read only from process environment and are never written to disk.
This script sends real testnet transactions.
"""

import json
import os
import time

from genlayer_py import create_account, create_client
from genlayer_py.chains import studionet


ADDRESS = "0xFdc5DBC2F068530e4C9f71A3307cA3d1110CD408"
RPC_URL = "https://studio.genlayer.com/api"
FEE = 10**18
UNAVAILABLE_CID = "Qm" + ("a" * 44)
TERMS_DIGEST = "sha256:" + ("1" * 64)
CURRICULUM_DIGEST = "sha256:" + ("2" * 64)
DELIVERY_DIGEST = "sha256:" + ("3" * 64)


def parse(value):
    return json.loads(value) if isinstance(value, str) else value


def main():
    organizer_key = os.environ.get("SYLLABUSBOND_ORGANIZER_PRIVATE_KEY", "")
    student_key = os.environ.get("SYLLABUSBOND_STUDENT_PRIVATE_KEY", "")
    if not organizer_key or not student_key:
        raise RuntimeError("Set SYLLABUSBOND_ORGANIZER_PRIVATE_KEY and SYLLABUSBOND_STUDENT_PRIVATE_KEY.")

    organizer = create_account(organizer_key)
    student = create_account(student_key)
    if organizer.address.lower() == student.address.lower():
        raise RuntimeError("Organizer and student must be different wallets.")
    client = create_client(chain=studionet, account=organizer, endpoint=RPC_URL)

    def read(name, args=None):
        return parse(client.read_contract(address=ADDRESS, function_name=name, args=args or [], account=organizer))

    def wait_for(label, predicate, timeout=420):
        deadline = time.time() + timeout
        last = None
        while time.time() < deadline:
            value = predicate()
            encoded = json.dumps(value, sort_keys=True, default=str)
            if encoded != last:
                print(json.dumps({"event": label, "state": value}, sort_keys=True, default=str), flush=True)
                last = encoded
            if value.get("ready"):
                return value
            time.sleep(5)
        raise TimeoutError(label + " did not reach expected state")

    def submit(account, method, args, value=0):
        tx = client.write_contract(address=ADDRESS, function_name=method, account=account, args=args, value=value)
        tx_hash = str(tx)
        print(json.dumps({"event": "TX_SUBMITTED", "method": method, "tx": tx_hash}, sort_keys=True), flush=True)
        return tx_hash

    initial_counts = read("get_counts")
    offering_id = int(initial_counts["offering_count"])
    enrollment_id = int(initial_counts["enrollment_count"])
    before_balance = int(client.get_balance(ADDRESS))
    student_before = int(client.get_balance(student.address))
    organizer_before = int(client.get_balance(organizer.address))
    print(json.dumps({"event": "START", "offering_id": offering_id, "enrollment_id": enrollment_id, "contract_balance_before": before_balance, "student": student.address, "organizer": organizer.address}, sort_keys=True), flush=True)

    transactions = {}
    transactions["create_offering"] = submit(organizer, "create_offering", ["Studionet custody recovery test", "SB-RECOVERY-" + str(offering_id), FEE, 1, "https://ipfs.io/ipfs/" + UNAVAILABLE_CID, TERMS_DIGEST])
    wait_for("OFFERING_CREATED", lambda: {"ready": int(read("get_counts")["offering_count"]) > offering_id})

    transactions["lock_curriculum"] = submit(organizer, "lock_offering_curriculum", [offering_id, CURRICULUM_DIGEST, "Test Instructor"])
    wait_for("OFFERING_OPEN", lambda: {"ready": read("get_offering", [offering_id])["status"] == "OPEN"})

    transactions["enroll"] = submit(student, "enroll", [offering_id], FEE)
    custody = wait_for("CUSTODY_CONFIRMED", lambda: {
        "ready": int(read("get_counts")["enrollment_count"]) > enrollment_id and int(read("get_totals")["total_held"]) >= FEE and int(client.get_balance(ADDRESS)) >= before_balance + FEE,
        "totals": read("get_totals"),
        "contract_balance": int(client.get_balance(ADDRESS)),
    })

    transactions["submit_delivery"] = submit(organizer, "submit_delivery_evidence", [enrollment_id, "https://ipfs.io/ipfs/" + UNAVAILABLE_CID, DELIVERY_DIGEST])
    wait_for("CHALLENGE_WINDOW", lambda: {"ready": read("get_enrollment", [enrollment_id])["status"] == "CHALLENGE_WINDOW"})

    transactions["ready_for_review"] = submit(student, "confirm_ready_for_review", [enrollment_id])
    wait_for("READY_FOR_REVIEW", lambda: {"ready": read("get_enrollment", [enrollment_id])["status"] == "READY_FOR_REVIEW"})

    transactions["adjudicate"] = submit(organizer, "adjudicate", [enrollment_id])
    wait_for("RECOVERY_WAIT", lambda: {"ready": read("get_enrollment", [enrollment_id])["status"] == "RECOVERY_WAIT", "enrollment": read("get_enrollment", [enrollment_id])}, timeout=600)

    transactions["claim_recovery"] = submit(student, "claim_recovery", [enrollment_id])
    final = wait_for("RECOVERY_SETTLED", lambda: {
        "ready": read("get_enrollment", [enrollment_id])["status"] == "RECOVERED" and int(read("get_totals")["total_held"]) == 0 and int(client.get_balance(ADDRESS)) == before_balance,
        "enrollment": read("get_enrollment", [enrollment_id]),
        "totals": read("get_totals"),
        "contract_balance": int(client.get_balance(ADDRESS)),
    }, timeout=600)

    recovery_tx = client.get_transaction(transactions["claim_recovery"])
    print(json.dumps({
        "event": "FINAL_RESULT",
        "address": ADDRESS,
        "custody": custody,
        "final": final,
        "transactions": transactions,
        "recovery_tx_status": recovery_tx.get("status_name"),
        "recovery_tx_result": recovery_tx.get("result_name"),
        "triggered_transactions": recovery_tx.get("triggered_transactions"),
        "organizer_balance_before": organizer_before,
        "organizer_balance_after": int(client.get_balance(organizer.address)),
        "student_balance_before": student_before,
        "student_balance_after": int(client.get_balance(student.address)),
    }, sort_keys=True, default=str), flush=True)


if __name__ == "__main__":
    main()
