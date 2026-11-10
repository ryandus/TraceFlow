"""Regenerate the synthetic demo manifests in gui/demo/. Deterministic: fixed content and timestamps.

Mirrors the shape of generateManifestJSON() (src/services/exporter.ts). No real case data.
"""
import copy
import hashlib
import json
from pathlib import Path

OUT = Path(__file__).parent / "demo"

# (relative path, repeats of the path line used as synthetic content, last modified, expected hash kind, MD5)
# MD5 values are precomputed literals of the same synthetic content: the manifest schema carries a legacy
# MD5 field, but the repo rule is no MD5 code outside TraceFlow's own legacy cross-check.
FILES = [
    ("images/WS-04_disk0.E01", 200000, "2026-03-02T11:42:10.000Z", "sha256", "425d7bb5fe5afd0ea96ec4b49409b902"),
    ("memory/WS-04_memdump.raw", 150000, "2026-03-02T09:31:55.000Z", "sha256", "fdabb2f9165ea4a81bdfe9eaa02b9ea1"),
    ("triage/Windows/System32/winevt/Logs/Security.evtx", 40000, "2026-03-01T23:58:41.000Z", "sha256", "d44ed1243d740115d65a08be97a64b52"),
    ("triage/$MFT", 60000, "2026-03-01T23:59:02.000Z", "md5", "fa0be1094c0cd66af381f2a1eaa3cc56"),
    ("triage/Users/demo.user/NTUSER.DAT", 20000, "2026-02-27T22:14:09.000Z", "bad", "2935138985667d18a88ad3ccd4f547f0"),
    ("triage/Users/demo.user/AppData/Local/Browser/History", 5000, "2026-02-27T21:47:30.000Z", None, "d50d22f0090b74259691162e5b94850c"),
    ("triage/Windows/Prefetch/SYNTHETIC.EXE-1A2B3C4D.pf", 300, "2026-02-26T03:12:44.000Z", None, "d41b27ec428b37ada8a1419a3b48f8d0"),
    ("notes/acquisition_log.txt", 50, "2026-03-02T11:50:00.000Z", "sha256", "f4fb46b59166ed82b1acd00ecc68044a"),
]

# (timestamp, released by, role, received by, role, purpose, location, packaging, initials)
CUSTODY = [
    ("2026-03-02T12:30:00.000Z", "Demo Examiner A", "Lead Examiner", "Demo Custodian B", "Evidence Custodian",
     "Intake to evidence locker", "Synthetic Lab, Room 1", "Sealed bag, tape SYN-0001 intact", "DA"),
    ("2026-03-05T08:05:00.000Z", "Demo Custodian B", "Evidence Custodian", "Demo Analyst C", "Forensic Analyst",
     "Release for analysis", "Synthetic Lab, Room 1", "Seal SYN-0001 intact on release", "DB"),
    ("2026-03-12T16:20:00.000Z", "Demo Analyst C", "Forensic Analyst", "Demo Custodian B", "Evidence Custodian",
     "Return after analysis", "Synthetic Lab, Room 1", "Resealed, tape SYN-0002", "DC"),
    ("2026-03-19T10:00:00.000Z", "Demo Custodian B", "Evidence Custodian", "Demo Reviewer D", "Review Counsel",
     "Transfer for legal review", "Synthetic Lab, Front Desk", "Seal SYN-0002 intact on release", "DB"),
]

META = {
    "caseNumber": "DEMO-2026-0001",
    "evidenceItemNumber": "ITEM-01",
    "examinerName": "Demo Examiner A",
    "examinerBadgeId": "SYN-001",
    "agencyOrganization": "Synthetic Forensics Unit (demo data)",
    "mediaType": "SATA SSD / HDD",
    "sourceSerialNumber": "SYNTHETIC-SN-0000",
    "sourceAcquisitionMethod": "Forensic Container (E01 / AFF4 / VHDX)",
    "collectionDateTime": "2026-03-02T09:15",
    "collectionTimeZone": "UTC",
    "locationFound": "Synthetic workstation WS-04 (demo data)",
    "writeBlockerUsed": "Hardware Write Blocker (Tableau / WiebeTech)",
    "notes": "Synthetic demo data. Not a real case.",
}


def fmt_bytes(n):  # same output as formatBytes() in src/services/hasher.ts
    i = 0
    while n >= 1024:
        n /= 1024
        i += 1
    return f"{n:.2f}".rstrip("0").rstrip(".") + " " + ["Bytes", "KB", "MB", "GB"][i]


files = []
for seq, (rel, repeats, modified, kind, md5) in enumerate(FILES, 1):
    content = (rel + "\n").encode() * repeats
    sha = hashlib.sha256(content).hexdigest()
    expected = {"sha256": sha, "md5": md5, "bad": "0" * 64, None: None}[kind]
    files.append({
        "sequence": seq,
        "fileName": rel.rsplit("/", 1)[-1],
        "relativePath": rel,
        "fileSizeBytes": len(content),
        "fileSizeFormatted": fmt_bytes(len(content)),
        "mimeType": "application/octet-stream",
        "lastModifiedTimestamp": modified,
        "cryptographicHashes": {"sha256": sha, "md5": md5},
        "verification": {
            "expectedHashProvided": expected,
            "verificationStatus": {"sha256": "match", "md5": "match", "bad": "mismatch", None: "unverified"}[kind],
            "matchedAlgorithm": {"sha256": "SHA-256", "md5": "MD5"}.get(kind),
        },
    })

custody = [
    {
        "sequenceNumber": seq,
        "timestamp": ts,
        "releasedBy": {"name": rel_by, "role": rel_role, "agency": META["agencyOrganization"]},
        "receivedBy": {"name": rec_by, "role": rec_role, "agency": META["agencyOrganization"]},
        "transferPurpose": purpose,
        "transferLocation": location,
        "packagingAndCondition": packaging,
        "signeeInitials": initials,
        "hasDigitalSignature": False,
    }
    for seq, (ts, rel_by, rel_role, rec_by, rec_role, purpose, location, packaging, initials) in enumerate(CUSTODY, 1)
]

# Same field order and compact separators as manifestFingerprint() in src/services/qrAudit.ts.
canonical = json.dumps({
    "caseNumber": META["caseNumber"],
    "evidenceItemNumber": META["evidenceItemNumber"],
    "leadExaminer": META["examinerName"],
    "badgeId": META["examinerBadgeId"],
    "agency": META["agencyOrganization"],
    "acquisitionMethod": META["sourceAcquisitionMethod"],
    "writeBlocker": META["writeBlockerUsed"],
    "collectionTimestamp": META["collectionDateTime"],
    "filesCount": len(files),
    "files": [{"name": f["fileName"], "sizeBytes": f["fileSizeBytes"], "sha256": f["cryptographicHashes"]["sha256"],
               "md5": f["cryptographicHashes"]["md5"], "status": f["verification"]["verificationStatus"]} for f in files],
    "custodyLedgerEntries": [{"seq": c["sequenceNumber"], "timestamp": c["timestamp"], "releasedBy": c["releasedBy"]["name"],
                              "receivedBy": c["receivedBy"]["name"], "purpose": c["transferPurpose"],
                              "initials": c["signeeInitials"]} for c in custody],
}, separators=(",", ":"), ensure_ascii=False)

total = sum(f["fileSizeBytes"] for f in files)
statuses = [f["verification"]["verificationStatus"] for f in files]
manifest = {
    "complianceStandard": "ISO/IEC 27037:2012 - Digital Evidence Handling & Custody",
    "generator": "Forensic Hash & Chain-of-Custody Manifest Generator v1.0",
    "exportTimestamp": "2026-03-20T16:45:00.000Z",
    "session": {
        "sessionId": "demo-session-0001",
        "version": "1.0-ISO27037",
        "createdTimestamp": "2026-03-02T09:20:00.000Z",
        "lastSavedTimestamp": "2026-03-20T16:44:30.000Z",
    },
    "caseMetadata": META,
    "evidenceIntegrityManifest": {
        "totalFilesCount": len(files),
        "totalSizeBytes": total,
        "totalSizeFormatted": fmt_bytes(total),
        "verificationSummary": {
            "verifiedCount": statuses.count("match"),
            "mismatchCount": statuses.count("mismatch"),
            "unverifiedCount": statuses.count("unverified"),
        },
        "files": files,
    },
    "chainOfCustodyLedger": custody,
    "manifestFingerprint": {
        "algorithm": "SHA-256",
        "value": hashlib.sha256(canonical.encode()).hexdigest(),
        "canonicalPayload": canonical,
    },
}

# Tampered copy: one file hash edited after export, fingerprint left as-is. The viewer must reject it.
tampered = copy.deepcopy(manifest)
tampered["evidenceIntegrityManifest"]["files"][0]["cryptographicHashes"]["sha256"] = "f" * 64

OUT.mkdir(exist_ok=True)
for name, doc in [("demo_manifest.json", manifest), ("demo_tampered.json", tampered)]:
    (OUT / name).write_bytes((json.dumps(doc, indent=2, ensure_ascii=False) + "\n").encode())
