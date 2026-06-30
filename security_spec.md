# Security Specification & Threat Model (HaqSetu Firestore Security)

## 1. Data Invariants
1. **User Identity Isolation**: A citizen can only read/write their own `UserProfile` and `CitizenProfile`.
2. **Document Ownership**: Scanned documents can only be accessed or deleted by the user who uploaded them.
3. **Application Tracking**: A user can only view their own requests. Volunteers can read all requests to assist.
4. **Volunteer Case Assignment**: Only volunteers and admins can update case files. Citizens can only write updates to the chat history subcomponent of their own associated case (via their own action).
5. **Report Isolation**: Non-anonymous reports can only be read by the submitting user or volunteers. Anonymous reports are secure and only visible to authorized volunteers or authorities.
6. **Immutable Creation Timestamps**: All `createdAt` fields must match `request.time`.
7. **Sanitized IDs**: Document ID variables must match alpha-numeric and hyphen strings (`isValidId()`).

---

## 2. The "Dirty Dozen" Payloads (Threat Vectors)

Here are the 12 attack vectors designed to try to breach the security bounds of HaqSetu:

1. **Self-Elevated Privilege**: Attacker tries to write a UserProfile setting `role: "admin"`.
2. **Profile Hijacking**: Attacker tries to overwrite another citizen's `CitizenProfile` using another user's UID.
3. **Disability Status Spoofing**: Attacker modifies a verified disability profile field without matching ID proof.
4. **Shadow Update / Extra Fields**: Attacker updates a profile inserting a malicious `ghostField` for database poisoning.
5. **PII Exfiltration**: Attacker requests read access to other citizens' profiles using client queries.
6. **Fake Verification**: Attacker attempts to set a user document's `status` to `verified` on creation.
7. **Orphaned Request Creation**: Attacker submits an application request referencing a non-existent scheme or user ID.
8. **Malicious ID Injection**: Attacker uses a massive 1MB string with SQL/NoSQL injection payload as a Firestore Document ID.
9. **Status Fast-Tracking**: Attacker attempts to update their request status directly from `pending` to `approved`.
10. **Anonymous Report Decoy**: Attacker submits an anonymous report trying to set `isAnonymous: false` after creation or spoofing other's `userId`.
11. **Malicious Volunteer Notes**: Attacker tries to modify volunteer casework notes for another person.
12. **Future Timestamp Manipulation**: Attacker submits a request with a pre-dated `submittedAt` to bypass SLA rules.

---

## 3. Test Cases Plan
- Every request matching the "Dirty Dozen" payloads above must yield `PERMISSION_DENIED` at the Firestore security rules engine boundary.
- Verified citizens must have full CRUD on their own items.
- Volunteers must be validated using their assigned role field.
