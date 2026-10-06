# 🔍 TraceFlow

*An Evidence Custody & Hash Manifest Engine*

*Engineered by Ryan C. Hanks*

> Part of the **[CustodyFlow](https://github.com/ryandus/custodyflow)** suite: defensible DFIR and eDiscovery workflow tools.

**[Launch Live TraceFlow Application →](https://ryandus.github.io/TraceFlow/)**

---

> **TraceFlow** is a client-side digital forensics utility designed for incident response handlers (DFIR), forensic examiners, and investigators. It computes SHA-256 hash manifests (with MD5 alongside, solely for matching legacy acquisition records) with optional verification against a reference hash, and generates tamper-evident chain-of-custody ledgers designed around ISO/IEC 27037 guidance.

## ✨ Key Features

* **🚀 SHA-256 Primary, MD5 for Legacy Matching:** Computes SHA-256 (the authoritative digest) and MD5 (only for cross-checking against legacy hash records) concurrently using stream-chunked buffers to prevent UI freezing on multi-gigabyte forensic images (`.E01`, `.001`, `.dd`, `.vmdk`, triage archives).
* **🔒 Zero Server Uploads:** All hashing and file analysis occur strictly in browser memory via streamed JavaScript hashing (js-sha256, spark-md5) and the Streams API. Evidentiary data never traverses a network.
* **📋 ISO/IEC 27037 Case Metadata:** Captures examiner credentials, write-blocker enforcement status, acquisition source types, and timestamped intake notes.
* **🔗 Append-Only Chain-of-Custody Ledger:** Track custody handoffs, evidence tape seal numbers, packaging conditions, and digital signatures to support FRE 901 authentication.
* **💾 Local State Persistence:** Stores active manifests and custody sessions in client-side IndexedDB with auto-save redundancy.

## 📑 Forensic Export Formats

* 📄 **Forensic Legal PDF** (with print-optimized layout)
* 🤖 **Cryptographic Verification JSON** (machine-readable ISO 8601 schema)
* 📊 **eDiscovery CSV** (compatible with Relativity, Nuix, or court exhibit indices)

## 🛠️ Tech Stack

* **Frontend:** TypeScript, React, Tailwind CSS
* **Cryptography:** js-sha256 (streamed SHA-256, primary), spark-md5 (streamed MD5, legacy cross-reference only)
* **Persistence:** Client-side IndexedDB
* **Build & CI/CD:** Vite, Bun, GitHub Actions, GitHub Pages

## 📄 License

This project is open-source and licensed under the MIT License.
