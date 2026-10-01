"""Extended funded verification matrix for SyllabusBond v0.3.

Signers are environment-only. The script resumes enrollment #0, creates timeout
and unavailable cases, and prints Explorer-ready transaction hashes.
"""

import hashlib
import json
import os
import time
from concurrent.futures import ThreadPoolExecutor

from genlayer_py import create_account, create_client
from genlayer_py.chains import studionet

ADDRESS = os.environ["SYLLABUSBOND_CONTRACT_ADDRESS"]
RPC = "https://studio.genlayer.com/api"
FEE = 10**15

CC_TERMS = ("https://gateway.pinata.cloud/ipfs/QmQBQDCyfCNC63GBDCSP7WfTNBkTSWSRpUg4Hr7aZjAdKH", "sha256:03d4c0e4185b0a7da060a9f1efc0e29cf6e6d3cc9ae3030de56de7c754873cff")
CC_PROVIDER = ("https://gateway.pinata.cloud/ipfs/QmWzpoMsDRrAWfWaLoY21QmwsStcYY8Z66k8yvG8rGsfgP", "sha256:c9dee431e40daf70e2ac0ebe94d3585356ee6677990f3a2687ae09cbfae20719")
CC_CLIENT = ("https://gateway.pinata.cloud/ipfs/QmeGVuNHeq9Vs21QSRFzNW3TxR19eXijfbropBteGdP1To", "sha256:1eb2a75bdc6bce174d6f06df3f05117fad0ee35222d5106e32e9b664d60a0ba2")
MILESTONE = ("https://arweave.net/zIv4NB-88VM7TUYfSNlqFcrWD3PbsfgpnSDSyQ_w8lY", "sha256:ee6dd50ebf5ac1879433f5f730fc006cdff1f822fd99b8f05221c9f8acb826e9")
APPEAL = ("https://arweave.net/EOrW1khtJaqKy4MDn6HKgxrpxWGNh39nFwLkmuDzqRE", "sha256:4b93626dae47456bd01f60412589732fa1ffd8327c223975b96613593c047435")


def fake_pair(seed):
    return ("https://ipfs.io/ipfs/Qm" + seed * 44, "sha256:" + hashlib.sha256(("unavailable:" + seed).encode()).hexdigest())


def main():
    organizer = create_account(os.environ["SYLLABUSBOND_ORGANIZER_SIGNER"])
    student = create_account(os.environ["SYLLABUSBOND_STUDENT_SIGNER"])
    client = create_client(chain=studionet, account=organizer, endpoint=RPC)
    txs = {}

    def read(name, args=None):
        value = client.read_contract(address=ADDRESS, function_name=name, args=args or [], account=organizer)
        return json.loads(value) if isinstance(value, str) else value

    def submit(account, name, args, value=0):
        tx = str(client.write_contract(address=ADDRESS, function_name=name, args=args, value=value, account=account))
        txs.setdefault(name, []).append(tx)
        print(json.dumps({"event": "TX", "method": name, "tx": tx}), flush=True)
        return tx

    def wait(label, predicate, timeout=900):
        deadline = time.time() + timeout
        while time.time() < deadline:
            state = predicate()
            if state.get("ready"):
                print(json.dumps({"event": label, "state": state}, default=str), flush=True)
                return state
            time.sleep(5)
        raise TimeoutError(label)

    def wait_until(timestamp, label):
        while int(time.time()) <= timestamp:
            print(json.dumps({"event": label, "seconds": timestamp - int(time.time()) + 1}), flush=True)
            time.sleep(min(15, timestamp - int(time.time()) + 1))

    # A. Finish the existing 3-module enrollment #0.
    for index, pair in ((1, CC_PROVIDER), (2, CC_CLIENT)):
        submit(organizer, "submit_module_checkpoint", [0, index, pair[0], pair[1]])
        wait(f"MODULE_{index + 1}_REVIEW", lambda index=index: {"ready": read("get_module_checkpoint", [0, index])["status"] == "REVIEW"})
        submit(student, "accept_module_checkpoint", [0, index])
        wait(f"MODULE_{index + 1}_ACCEPTED", lambda index=index: {"ready": int(read("get_module_progress", [0])["next_module"]) == index + 1, "progress": read("get_module_progress", [0])})
    settled = read("get_enrollment", [0])
    if settled["status"] != "SETTLED" or int(settled["remaining_amount"]) != 0:
        raise RuntimeError("Three-module settlement failed")

    # B. Partial payout followed by a real 30-second timeout jury.
    counts = read("get_counts")
    timeout_offering, timeout_enrollment = int(counts["offering_count"]), int(counts["enrollment_count"])
    curriculum = "sha256:" + hashlib.sha256(f"timeout:{timeout_offering}".encode()).hexdigest()
    submit(organizer, "create_offering", ["Timeout Jury Matrix", f"SB-TIMEOUT-{timeout_offering}", FEE, 4, CC_TERMS[0], CC_TERMS[1]])
    wait("TIMEOUT_CREATED", lambda: {"ready": int(read("get_counts")["offering_count"]) > timeout_offering})
    submit(organizer, "configure_modules", [timeout_offering, 2])
    wait("TIMEOUT_MODULES", lambda: {"ready": int(read("get_offering", [timeout_offering])["module_count"]) == 2})
    submit(organizer, "lock_offering_curriculum", [timeout_offering, curriculum, "Timeout Test Instructor"])
    wait("TIMEOUT_OPEN", lambda: {"ready": read("get_offering", [timeout_offering])["status"] == "OPEN"})
    submit(student, "enroll", [timeout_offering], FEE)
    wait("TIMEOUT_ENROLLED", lambda: {"ready": int(read("get_counts")["enrollment_count"]) > timeout_enrollment})
    first = fake_pair("x")
    submit(organizer, "submit_module_checkpoint", [timeout_enrollment, 0, first[0], first[1]])
    wait("TIMEOUT_FIRST_REVIEW", lambda: {"ready": read("get_module_checkpoint", [timeout_enrollment, 0])["status"] == "REVIEW"})
    submit(student, "accept_module_checkpoint", [timeout_enrollment, 0])
    wait("TIMEOUT_PARTIAL_RELEASE", lambda: {"ready": int(read("get_module_progress", [timeout_enrollment])["next_module"]) == 1})
    submit(organizer, "submit_module_checkpoint", [timeout_enrollment, 1, MILESTONE[0], MILESTONE[1]])
    checkpoint = wait("TIMEOUT_SECOND_REVIEW", lambda: {"ready": read("get_module_checkpoint", [timeout_enrollment, 1])["status"] == "REVIEW", "checkpoint": read("get_module_checkpoint", [timeout_enrollment, 1])})
    wait_until(int(checkpoint["checkpoint"]["review_deadline"]), "WAIT_REAL_REVIEW_TIMEOUT")
    submit(organizer, "adjudicate_module_checkpoint", [timeout_enrollment, 1])
    timeout_result = wait("TIMEOUT_JURY_RESULT", lambda: {"ready": read("get_module_checkpoint", [timeout_enrollment, 1])["status"] in ("ACCEPTED", "REJECTED", "UNAVAILABLE"), "checkpoint": read("get_module_checkpoint", [timeout_enrollment, 1]), "enrollment": read("get_enrollment", [timeout_enrollment])})

    # C. If the real jury rejected the module, exercise a post-partial appeal.
    appeal_result = {"attempted": False, "reason": "Timeout jury did not reject the checkpoint."}
    if timeout_result["checkpoint"]["status"] == "REJECTED":
        remaining = int(timeout_result["enrollment"]["remaining_amount"])
        stake = (remaining + 9) // 10
        submit(organizer, "open_appeal", [timeout_enrollment, APPEAL[0], APPEAL[1]], stake)
        wait("MODULE_APPEAL_OPEN", lambda: {"ready": read("get_enrollment", [timeout_enrollment])["status"] == "APPEAL_PENDING"})
        submit(student, "adjudicate_appeal", [timeout_enrollment])
        appeal_result = wait("MODULE_APPEAL_RESULT", lambda: {"ready": read("get_enrollment", [timeout_enrollment])["status"] in ("APPEAL_RESOLVED", "RECOVERY_WAIT"), "enrollment": read("get_enrollment", [timeout_enrollment])})
        appeal_result["attempted"] = True

    # D. Dispute -> unavailable -> real bounded recovery.
    counts = read("get_counts")
    recovery_offering, recovery_enrollment = int(counts["offering_count"]), int(counts["enrollment_count"])
    terms, evidence, dispute = fake_pair("t"), fake_pair("e"), fake_pair("d")
    curriculum = "sha256:" + hashlib.sha256(f"recovery:{recovery_offering}".encode()).hexdigest()
    submit(organizer, "create_offering", ["Unavailable Recovery Matrix", f"SB-REC-{recovery_offering}", FEE, 4, terms[0], terms[1]])
    wait("RECOVERY_CREATED", lambda: {"ready": int(read("get_counts")["offering_count"]) > recovery_offering})
    submit(organizer, "configure_modules", [recovery_offering, 2])
    wait("RECOVERY_MODULES", lambda: {"ready": int(read("get_offering", [recovery_offering])["module_count"]) == 2})
    submit(organizer, "lock_offering_curriculum", [recovery_offering, curriculum, "Recovery Test Instructor"])
    wait("RECOVERY_OPEN", lambda: {"ready": read("get_offering", [recovery_offering])["status"] == "OPEN"})
    submit(student, "enroll", [recovery_offering], FEE)
    wait("RECOVERY_ENROLLED", lambda: {"ready": int(read("get_counts")["enrollment_count"]) > recovery_enrollment})
    submit(organizer, "submit_module_checkpoint", [recovery_enrollment, 0, evidence[0], evidence[1]])
    wait("RECOVERY_REVIEW", lambda: {"ready": read("get_module_checkpoint", [recovery_enrollment, 0])["status"] == "REVIEW"})
    submit(student, "dispute_module_checkpoint", [recovery_enrollment, 0, dispute[0], dispute[1]])
    wait("RECOVERY_DISPUTED", lambda: {"ready": read("get_module_checkpoint", [recovery_enrollment, 0])["status"] == "DISPUTED"})
    submit(organizer, "adjudicate_module_checkpoint", [recovery_enrollment, 0])
    unavailable = wait("UNAVAILABLE_RESULT", lambda: {"ready": read("get_enrollment", [recovery_enrollment])["status"] == "MODULE_RECOVERY_WAIT", "checkpoint": read("get_module_checkpoint", [recovery_enrollment, 0]), "enrollment": read("get_enrollment", [recovery_enrollment])})
    wait_until(int(unavailable["enrollment"]["module_recovery_deadline"]), "WAIT_REAL_RECOVERY_DEADLINE")
    submit(student, "claim_recovery", [recovery_enrollment])
    recovered = wait("RECOVERED", lambda: {"ready": read("get_enrollment", [recovery_enrollment])["status"] == "RECOVERED", "enrollment": read("get_enrollment", [recovery_enrollment]), "totals": read("get_totals")})

    # E. Concurrent read stress without mutating or spending funds.
    def rpc_probe(_):
        probe = create_client(chain=studionet, account=organizer, endpoint=RPC)
        return parse_read(probe.read_contract(address=ADDRESS, function_name="get_totals", args=[], account=organizer))

    with ThreadPoolExecutor(max_workers=10) as pool:
        stress = list(pool.map(rpc_probe, range(100)))
    stress_ok = len(stress) == 100 and all("total_received" in item for item in stress)

    totals = read("get_totals")
    conservation = int(totals["total_received"]) == int(totals["total_held"]) + int(totals["total_paid_to_organizers"]) + int(totals["total_refunded_to_students"])
    result = {"event": "V3_EXTENDED_MATRIX_FINAL", "address": ADDRESS, "settled_enrollment": settled, "timeout": timeout_result, "appeal": appeal_result, "unavailable": unavailable, "recovered": recovered, "rpc_reads": 100, "rpc_stress_ok": stress_ok, "global_conservation": conservation, "totals": totals, "transactions": txs}
    print(json.dumps(result, default=str), flush=True)
    if not stress_ok or not conservation:
        raise RuntimeError("Final verification invariant failed")


def parse_read(value):
    return json.loads(value) if isinstance(value, str) else value


if __name__ == "__main__":
    main()
