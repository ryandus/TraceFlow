# 🔍 TraceFlow

*An Evidence Custody & Hash Manifest Engine*



*Engineered by R. Hanks*

**[Launch Live TraceFlow Application →](https://github.com/ryandus/TraceFlow)**

---

> **TraceFlow** is a client-side digital forensics utility designed for incident response handlers (DFIR), forensic examiners, and investigators. It computes cryptographically validated dual-hash manifests (SHA-256 / MD5) and generates tamper-evident chain-of-custody ledgers in strict alignment with ISO/IEC 27037 standards.

## ✨ Key Features

* **🚀 Dual-Algorithm Simultaneous Hashing:** Computes SHA-256 and MD5 digests concurrently using stream-chunked buffers to prevent UI freezing on multi-gigabyte forensic images (`.E01`, `.001`, `.dd`, `.vmdk`, triage archives).
* **🔒 Zero Server Uploads:** All hashing and file analysis occur strictly in browser memory via the Web Crypto API (SubtleCrypto) and Streams API. Evidentiary data never traverses a network.
* **📋 ISO/IEC 27037 Case Metadata:** Captures examiner credentials, write-blocker enforcement status, acquisition source types, and timestamped intake notes.
* **🔗 Append-Only Chain-of-Custody Ledger:** Track custody handoffs, evidence tape seal numbers, packaging conditions, and digital signatures compliant with FRE 901.
* **💾 Local State Persistence:** Stores active manifests and custody sessions in client-side IndexedDB with auto-save redundancy.

## 📑 Forensic Export Formats

* 📄 **Forensic Legal PDF** (with print-optimized layout)
* 🤖 **Cryptographic Verification JSON** (machine-readable ISO 8601 schema)
* 📊 **eDiscovery CSV** (compatible with Relativity, Nuix, or court exhibit indices)

## 🛠️ Tech Stack

* **Frontend:** TypeScript, React, Tailwind CSS
* **Cryptography:** Web Crypto API (SubtleCrypto), crypto-js (streamed MD5)
* **Persistence:** Client-side IndexedDB
* **Build & CI/CD:** Vite, Bun, GitHub Actions, GitHub Pages

```

```
