"""TraceFlow Timeline: read-only Streamlit viewer for an exported TraceFlow manifest JSON."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import streamlit as st

VERSION = "0.1.0"
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
AUDIT = HERE / "audit" / "audit.jsonl"
DEMOS = {
    "Demo: valid manifest": HERE / "demo" / "demo_manifest.json",
    "Demo: tampered manifest": HERE / "demo" / "demo_tampered.json",
}


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def verify(m):
    """Raise ValueError unless the fingerprint and the manifest body both match the canonical payload."""
    fp = m["manifestFingerprint"]
    if hashlib.sha256(fp["canonicalPayload"].encode()).hexdigest() != fp["value"].lower():
        raise ValueError("manifest fingerprint does not match the SHA-256 of its canonical payload")
    meta, body = m["caseMetadata"], m["evidenceIntegrityManifest"]
    # Mirrors manifestFingerprint() in src/services/qrAudit.ts.
    rebuilt = {
        "caseNumber": meta.get("caseNumber") or "UNTITLED",
        "evidenceItemNumber": meta.get("evidenceItemNumber") or "ITEM-01",
        "leadExaminer": meta.get("examinerName"),
        "badgeId": meta.get("examinerBadgeId"),
        "agency": meta.get("agencyOrganization"),
        "acquisitionMethod": meta.get("sourceAcquisitionMethod"),
        "writeBlocker": meta.get("writeBlockerUsed"),
        "collectionTimestamp": meta.get("collectionDateTime"),
        "filesCount": len(body["files"]),
        "files": [
            {
                "name": f["fileName"],
                "sizeBytes": f["fileSizeBytes"],
                "sha256": f["cryptographicHashes"]["sha256"],
                "md5": f["cryptographicHashes"]["md5"],
                "status": f["verification"]["verificationStatus"],
            }
            for f in body["files"]
        ],
        "custodyLedgerEntries": [
            {
                "seq": c["sequenceNumber"],
                "timestamp": c["timestamp"],
                "releasedBy": c["releasedBy"]["name"],
                "receivedBy": c["receivedBy"]["name"],
                "purpose": c["transferPurpose"],
                "initials": c["signeeInitials"],
            }
            for c in m["chainOfCustodyLedger"]
        ],
    }
    payload = json.loads(fp["canonicalPayload"])
    diff = sorted(k for k in rebuilt.keys() | payload.keys() if rebuilt.get(k) != payload.get(k))
    if diff:
        raise ValueError(f"manifest body does not match its fingerprinted payload (fields: {', '.join(diff)})")


def build_events(m):
    meta, body = m["caseMetadata"], m["evidenceIntegrityManifest"]
    # (timestamp as recorded, type, summary, status, timestamp covered by fingerprint, source record)
    raw = [(meta["collectionDateTime"], "Collection", meta.get("locationFound") or "Evidence collected", "", True, meta)]
    unknown = 0
    for f in body["files"]:
        if f["lastModifiedTimestamp"] == "Unknown":
            unknown += 1
            continue
        raw.append((f["lastModifiedTimestamp"], "File modified", f["relativePath"], f["verification"]["verificationStatus"], False, f))
    for c in m["chainOfCustodyLedger"]:
        raw.append((c["timestamp"], "Custody transfer", f'{c["releasedBy"]["name"]} → {c["receivedBy"]["name"]}', "", True, c))
    raw.append((m["exportTimestamp"], "Manifest export", m["generator"], "", False, m["session"]))

    events = []
    for recorded, kind, summary, status, covered, record in raw:
        dt = datetime.fromisoformat(recorded)
        naive = dt.tzinfo is None
        ts = dt.replace(tzinfo=timezone.utc) if naive else dt.astimezone(timezone.utc)
        events.append({"ts": ts, "recorded": recorded, "naive": naive, "type": kind, "summary": summary,
                       "status": status, "covered": covered, "record": record})
    events.sort(key=lambda e: (e["ts"], e["type"], e["summary"]))
    return events, unknown


def shown_path(path):
    """Repo-relative path, or the bare file name for a file outside the repo. Never an absolute path."""
    p = Path(path).resolve()
    return p.relative_to(ROOT).as_posix() if p.is_relative_to(ROOT) else p.name


def audit(operator, path, before, after, expected, outcome):
    rec = {"tool": "traceflow-gui", "tool_version": VERSION, "streamlit": st.__version__, "operator": operator,
           "action": "load_manifest", "input": shown_path(path), "mode": "rb (read-only)",
           "sha256_before": before, "sha256_after": after, "expected_fingerprint": expected or None,
           "outcome": outcome}
    # Streamlit reruns the script on every interaction; log each distinct load once per session.
    if st.session_state.get("last_audit") == rec:
        return
    st.session_state["last_audit"] = rec
    AUDIT.parent.mkdir(exist_ok=True)
    with open(AUDIT, "a", encoding="utf-8") as f:
        f.write(json.dumps({"timestamp_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"), **rec}) + "\n")


def show_audit():
    with open(AUDIT, encoding="utf-8") as f:
        st.dataframe([json.loads(line) for line in f], hide_index=True)
    st.caption(f"{shown_path(AUDIT)} · Append-only by this app, not tamper-proof")


st.set_page_config(page_title="TraceFlow Timeline", layout="wide")
st.title("TraceFlow Timeline")
st.caption(f"Read-only viewer for exported TraceFlow manifests · v{VERSION} · local only, no network calls")

operator = st.sidebar.text_input("Operator (self-reported)").strip()
choice = st.sidebar.selectbox("Manifest", [*DEMOS, "Local path"])
local = st.sidebar.text_input("Manifest JSON path").strip() if choice == "Local path" else ""
expected = st.sidebar.text_input("Expected fingerprint (from QR or report)").strip().lower()
if not operator or (choice == "Local path" and not local):
    st.info("Enter the operator name and choose a manifest. Every load is recorded in the audit log.")
    st.stop()
path = DEMOS.get(choice) or Path(local)

before = after = error = None
try:
    with open(path, "rb") as f:
        data = f.read()
    before = hashlib.sha256(data).hexdigest()
    try:
        manifest = json.loads(data)
        verify(manifest)
        fp = manifest["manifestFingerprint"]["value"].lower()
        if expected and expected != fp:
            raise ValueError(f"expected fingerprint MISMATCH: manifest has {fp}, operator supplied {expected}")
        events, unknown = build_events(manifest)
    finally:
        after = sha256_file(path)
    if after != before:
        raise ValueError("source file changed on disk while it was being read")
except OSError as e:
    error = f"{type(e).__name__}: {e.strerror}"  # strerror only: str(e) would include the absolute path
except (ValueError, KeyError, TypeError, AttributeError, IndexError) as e:
    error = f"{type(e).__name__}: {e}"
audit(operator, path, before, after, expected,
      error or ("verified; expected fingerprint MATCH" if expected else "verified"))

if error:
    st.error("**Manifest rejected. Nothing is displayed.**")
    st.code(error, language=None, wrap_lines=True)  # error text can quote manifest content: literal only
    st.code(f"Source          {shown_path(path)}  (opened rb, read-only)\n"
            f"SHA-256 before  {before}\nSHA-256 after   {after}", language=None)
    with st.expander("Audit log", expanded=True):
        show_audit()
    st.stop()

st.success("Internally consistent: source unchanged during read, fingerprint recomputed, body matches the "
           "fingerprinted payload. This does not prove authenticity.")
st.code(f"Source          {shown_path(path)}  (opened rb, read-only)\n"
        f"SHA-256 before  {before}\n"
        f"SHA-256 after   {after}  MATCH\n"
        f"Fingerprint     {fp}  RECOMPUTED\n"
        f"Expected        {expected + '  MATCH' if expected else 'not supplied'}", language=None)

# Manifest-derived strings are untrusted. Render them only as literal text (st.text, st.code, st.dataframe),
# never through st.markdown / st.write / st.caption / alert bodies, so embedded markdown cannot render or fetch.
meta = manifest["caseMetadata"]
st.text(f'Case {meta.get("caseNumber") or "UNTITLED"} · Evidence item '
        f'{meta.get("evidenceItemNumber") or "ITEM-01"} · Examiner {meta.get("examinerName") or "not recorded"}')
# Counted from the fingerprint-verified file list, not the manifest's own unfingerprinted summary block.
file_statuses = [f["verification"]["verificationStatus"] for f in manifest["evidenceIntegrityManifest"]["files"]]
mismatches = file_statuses.count("mismatch")
for col, (label, value) in zip(st.columns(4), [
    ("Files", len(file_statuses)),
    ("Verified", file_statuses.count("match")),
    ("Mismatches", mismatches),
    ("Custody transfers", len(manifest["chainOfCustodyLedger"])),
]):
    col.metric(label, value)
if mismatches:
    st.warning(f'{mismatches} file(s) are recorded in this manifest as a hash MISMATCH against their expected hash.')
if unknown:
    st.warning(f"{unknown} file(s) have no recorded last-modified time and are not on the timeline.")

st.sidebar.divider()
types = st.sidebar.multiselect("Event type", sorted({e["type"] for e in events}))
statuses = st.sidebar.multiselect("File verification status", ["match", "mismatch", "unverified"])
first, last = events[0]["ts"].date(), events[-1]["ts"].date()
dates = st.sidebar.date_input("Date range (UTC)", (first, last), min_value=first, max_value=last)
query = st.sidebar.text_input("Search").lower()

shown = [
    e for e in events
    if (not types or e["type"] in types)
    and (not statuses or e["status"] in statuses)
    and (len(dates) < 2 or dates[0] <= e["ts"].date() <= dates[1])
    and query in json.dumps([e["summary"], e["record"]]).lower()
]

timeline_tab, audit_tab = st.tabs([f"Timeline ({len(shown)} of {len(events)} events)", "Audit log"])
with timeline_tab:
    if not shown:
        st.info("No events match the current filters.")
    else:
        st.scatter_chart([{"Time (UTC)": e["ts"], "Type": e["type"]} for e in shown],
                         x="Time (UTC)", y="Type", height=200)
        left, right = st.columns([3, 2])
        picked = left.dataframe(
            [{"Time (UTC)": e["ts"].strftime("%Y-%m-%d %H:%M:%S"), "Type": e["type"], "Summary": e["summary"],
              "Status": e["status"], "Time fingerprinted": e["covered"]} for e in shown],
            hide_index=True, on_select="rerun", selection_mode="single-row",
        ).selection.rows
        with right:
            if not picked:
                st.info("Select a row to see the event detail.")
            else:
                e = shown[picked[0]]
                st.subheader(e["type"])
                st.text(e["summary"])
                st.text(f'Timestamp as recorded: {e["recorded"]}'
                        + (" (no UTC offset recorded; ordered as if UTC)" if e["naive"] else ""))
                st.caption("This timestamp is covered by the manifest fingerprint." if e["covered"]
                           else "This timestamp is NOT covered by the manifest fingerprint.")
                if e["type"] == "File modified":
                    hashes = e["record"]["cryptographicHashes"]
                    st.code(f'SHA-256\n{hashes["sha256"]}\nMD5 (legacy cross-reference only)\n{hashes["md5"]}',
                            language=None, wrap_lines=True)
                st.code(json.dumps(e["record"], indent=2, ensure_ascii=False), language="json", wrap_lines=True)
with audit_tab:
    show_audit()
