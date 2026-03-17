# Aadhaar Handling Compliance Note

- This project does not integrate with UIDAI production APIs.
- Accessing real UIDAI verification services requires licensed entities, strict audit controls, and legal agreements.
- For startup prototyping, this backend stores only:
- Last 4 digits of Aadhaar (`aadhaar_last4`)
- SHA-256 hash of full Aadhaar, encrypted with AES before persistence (`aadhaar_hash_encrypted`)
- Raw Aadhaar is never stored in database logs, entities, or API responses.

This design reduces privacy risk and supports data minimization principles.
