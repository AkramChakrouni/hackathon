/* TenderScale backend adapters.
 * liveBackend(apiBase)  → the Next.js API in the hackathon repo (GET /api/meta, POST /api/run SSE, GET /api/policy).
 * localBackend(dataDir) → in-browser engine over the same demo files; emits the identical Event stream
 *                          (start / selected / answer / metrics / done) and applies the same quote + flag checks.
 */
(function () {
  const MODELS = { selection: "Qwen/Qwen3-30B-A3B-Instruct-2507", writing: "Qwen/Qwen3-235B-A22B-Instruct-2507", embedding: "Qwen/Qwen3-Embedding-8B", provider: "Nebius Token Factory" };
  const POLICY_FILES = [
    ["01_information_security_policy", "InfoSec", "Information Security Policy"],
    ["02_data_protection_policy", "DataProt", "Data Protection Policy"],
    ["03_incident_response_business_continuity_policy", "IR/BC", "Incident Response and Business Continuity Policy"],
  ];
  const UPDATES = { "03_incident_response_business_continuity_policy": "03_incident_response_business_continuity_policy_v2.4" };
  // Per-token rates measured on the recorded Nebius run (benchmark.json): $0.02538 / 138,682 tokens; closed baseline $0.29138.
  const RATE = 0.02538032 / 138682, BASE_RATE = 0.29138125 / 138682;

  const hash = (s) => { s = s.replace(/\s+/g, " ").trim(); let x = 0x811c9dc5; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(16).padStart(8, "0"); };
  const norm = (s) => s.toLowerCase().replace(/[“”"„]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
  const flat = (s) => s.replace(/\s+/g, " ").trim();

  function parsePolicy(base, short, name, src) {
    const version = (src.match(/^Version:\s*(.+)$/m) || [])[1]?.trim() ?? "";
    const effective = (src.match(/^Effective:\s*(.+)$/m) || [])[1]?.trim() ?? "";
    const policy = { id: base, short, name, version, effective };
    const heads = [...src.matchAll(/^## (\d+)\.\s*(.+)$/gm)];
    const sections = heads.map((h, i) => {
      const start = h.index + h[0].length, end = i + 1 < heads.length ? heads[i + 1].index : src.length;
      const text = src.slice(start, end).trim();
      return { id: `${short} §${h[1]}`, policy: short, policyName: name, version, number: Number(h[1]), title: h[2].trim(), text, hash: hash(text) };
    });
    return { policy, sections };
  }

  function parseCsv(csv) {
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < csv.length; i++) {
      const c = csv[i];
      if (q) { if (c === '"' && csv[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
      else if (c === '"') q = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && csv[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim()));
  }

  function parseQuestionnaire(csv, name) {
    const [header, ...rows] = parseCsv(csv);
    const h = header.map((x) => x.trim().toLowerCase());
    const iq = h.indexOf("question");
    const ii = ["question_id", "id", "ref", "control id"].map((k) => h.indexOf(k)).find((i) => i >= 0) ?? -1;
    const questions = rows.map((r, n) => ({ id: ii >= 0 && r[ii]?.trim() ? r[ii].trim() : `Q${String(n + 1).padStart(2, "0")}`, text: (iq >= 0 ? r[iq] : r[r.length - 1] ?? "").trim(), position: n })).filter((x) => x.text);
    return { name, header, questions };
  }

  function parsePast(csv) {
    const [head, ...body] = parseCsv(csv);
    const h = head.map((x) => x.trim().toLowerCase()), col = (n) => h.indexOf(n);
    return body.map((r) => ({ ref: r[col("ref")]?.trim() ?? "", question: r[col("question")]?.trim() ?? "", answer: r[col("answer")]?.trim() ?? "", comment: r[col("comment")]?.trim() ?? "" })).filter((p) => p.ref);
  }

  /** Sentences of a section, one per line/bullet, as the checks see them. */
  function sentences(text) {
    return text.split(/\n+/).map((l) => l.replace(/^\s*[*-]\s+/, "").trim()).filter(Boolean).flatMap((l) => flat(l).split(/(?<=[.!?])\s+/));
  }

  function verifyQuote(quote, section) {
    const text = norm(section.text.replace(/^\s*[*-]\s+/gm, "")), q = norm(quote).replace(/^[“"'…\s]+|[”"'…\s.]+$/g, "");
    if (!q) return { ok: false, quote };
    const i = text.indexOf(q);
    return i >= 0 ? { ok: true, quote } : { ok: false, quote };
  }
  const unverifiedNumbers = (comment, quotes) => { const hay = quotes.join(" "); return [...new Set([...comment.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => m[0]).filter((n) => !hay.includes(n)))]; };
  const RED_COMMENT = "No source in the current policies covers this question. Needs a human answer.";

  /* Writer output for the demo questionnaire. s: [section, phrase] — the cited sentence is the one containing the phrase
   * in whichever policy set the run uses, so an updated policy yields its own verbatim text. p: 2025 ref the writer matched. */
  const PLAN = {
    "A&A-02.1": { a: "Yes", c: "ISO/IEC 27001:2022 certified ISMS with an external surveillance or recertification audit every year and an annual internal audit by an independent consultant.", s: [["InfoSec §2", "certified against ISO/IEC 27001"], ["InfoSec §2", "An accredited certification body"], ["InfoSec §2", "An internal audit covering"]], p: "VQ-01" },
    "AIS-04.1": { a: "Yes", c: "Secure SDLC based on OWASP ASVS Level 2, with threat modelling, peer-reviewed pull requests and automated security checks on every change.", s: [["InfoSec §7", "Development follows a secure SDLC"], ["InfoSec §7", "The CI pipeline"]], p: "VQ-02" },
    "AIS-05.2": { a: "Yes", c: "The CI pipeline runs automated unit and integration tests, static code analysis and dependency scanning on every change; failed checks block merging.", s: [["InfoSec §7", "The CI pipeline"], ["InfoSec §7", "Failed checks block merging"]] },
    "AIS-07.1": { a: "Yes", c: "Vulnerabilities are prioritized by CVSS score and exploitability, with remediation deadlines of 7 days for critical, 30 days for high and 90 days for medium findings.", s: [["InfoSec §8", "Vulnerabilities are prioritized"]], p: "VQ-03" },
    "AIS-08.1": { a: "Yes", c: "The public API uses OAuth 2.0 with scoped access tokens, rate limiting, input validation and WAF protection, and is covered by the annual penetration test.", s: [["InfoSec §7", "The public API uses OAuth"], ["InfoSec §7", "API security is part of"]] },
    "BCR-01.1": { a: "Yes", c: "A business impact analysis is reviewed annually and after significant changes; the business continuity plan is reviewed and tested annually.", s: [["IR/BC §4", "A business impact analysis"], ["IR/BC §4", "The business continuity plan is reviewed"]], p: "VQ-04" },
    "BCR-06.1": { a: "Yes", c: "The business continuity plan is tested annually; most recently a tabletop exercise in March 2026 and a disaster recovery failover test in April 2026.", s: [["IR/BC §4", "The business continuity plan is reviewed"]], p: "VQ-05" },
    "BCR-08.1": { a: "Yes", c: "Daily full backups and transaction log backups every 10 minutes, with point in time restore for 35 days.", c2: "Daily full backups and transaction log backups every 5 minutes, with point in time restore for 35 days.", s: [["IR/BC §5", "Databases are backed up automatically"]], p: "VQ-06", pc: false },
    "BCR-08.2": { a: "Yes", c: "Customer data is encrypted at rest with AES-256, and database backups are geo-replicated to Azure North Europe for disaster recovery.", s: [["InfoSec §5", "Customer data is encrypted at rest"], ["InfoSec §4", "Database backups and file storage"]] },
    "BCR-08.3": { a: "Yes", c: "Restore tests are performed quarterly and the results are documented.", c2: "Restore tests are performed monthly and the results are documented.", s: [["IR/BC §5", "Restore tests are performed"]], p: "VQ-07", pc: false },
    "BCR-11.1": { a: "Yes", c: "Production runs across three availability zones in Azure West Europe, with geo-redundant backups to restore in Azure North Europe.", s: [["IR/BC §6", "three availability zones"], ["IR/BC §6", "If the whole region becomes unavailable"]], p: "VQ-08" },
    "CCC-03.1": { a: "Yes", c: "Every code and infrastructure change requires a reviewed pull request and reaches production only through the automated pipeline; emergency changes need ISO approval.", s: [["InfoSec §7", "Every code change requires a pull request"], ["InfoSec §7", "Infrastructure changes follow"], ["InfoSec §7", "Emergency changes may be deployed"]], p: "VQ-09" },
    "CCC-09.1": { a: "Yes", c: "Blue-green deployment allows rollback to the previous known good version within minutes.", s: [["InfoSec §7", "Deployments to production happen only"]] },
    "CEK-03.1": { a: "Yes", c: "Data is encrypted at rest with AES-256 and in transit with TLS 1.2 or higher; only industry standard algorithms from vetted libraries are permitted.", s: [["InfoSec §5", "Customer data is encrypted at rest"], ["InfoSec §5", "All data in transit"], ["InfoSec §5", "Only industry standard algorithms"]], p: "VQ-10" },
    "CEK-04.1": { a: "Yes", c: "Only industry standard algorithms (AES-256, TLS 1.2 or higher) from vetted libraries are permitted; custom cryptography is prohibited.", s: [["InfoSec §5", "Only industry standard algorithms"], ["InfoSec §5", "Customer data is encrypted at rest"], ["InfoSec §5", "All data in transit"]], p: "VQ-11" },
    "CEK-08.1": { a: "No", c: "Customer managed encryption keys (BYOK) are currently not offered; all keys are managed by Personivo.", s: [["InfoSec §5", "Customer managed encryption keys"]], p: "VQ-12" },
    "CEK-12.1": { a: "Yes", c: "Keys are rotated automatically every 12 months, or immediately upon suspected compromise.", s: [["InfoSec §5", "Keys are rotated automatically"]] },
    "DCS-08.1": { a: "Yes", c: "Physical and environmental security is fully outsourced to Microsoft; its ISO 27001 certificate and SOC 2 Type II report are reviewed annually.", s: [["InfoSec §4", "Physical and environmental security"], ["InfoSec §4", "Personivo reviews Microsoft"]], p: "VQ-13", o: "3rd-party outsourced" },
    "DSP-03.1": { a: "Yes", c: "A record of processing activities (Article 30 GDPR) serves as the inventory of personal and sensitive data and is reviewed at least annually.", s: [["DataProt §5", "record of processing activities"], ["DataProt §5", "Both are reviewed"]] },
    "DSP-04.1": { a: "Yes", c: "Data is classified in four levels: Public, Internal, Confidential and Strictly Confidential.", s: [["InfoSec §3", "Data is classified in four levels"], ["InfoSec §3", "Handling requirements per level"]], p: "VQ-14" },
    "DSP-05.1": { a: "Yes", c: "Data flow diagrams show where data is collected, stored and transmitted, and are reviewed at least annually.", s: [["DataProt §5", "record of processing activities"], ["DataProt §5", "Both are reviewed"]] },
    "DSP-09.1": { a: "Yes", c: "A DPIA is performed for any processing likely to result in a high risk; the core platform DPIA was completed in 2024 and last reviewed in November 2025.", s: [["DataProt §6", "A Data Protection Impact Assessment"], ["DataProt §6", "The DPIA for the core platform"]], p: "VQ-15" },
    "DSP-11.1": { a: "Yes", c: "Data subject requests are forwarded to the customer within two business days, and customer administrators can view, export, correct and delete personal data.", s: [["DataProt §7", "Requests from data subjects"], ["DataProt §7", "The platform gives customer administrators"]], p: "VQ-16" },
    "DSP-13.1": { a: "Yes", c: "Each sub-processor is bound by a DPA with equivalent obligations; customers are notified at least 30 days before a new sub-processor is added and may object.", s: [["DataProt §4", "Personivo uses the following sub-processors"], ["DataProt §4", "Customers are notified at least 30 days"]] },
    "DSP-15.1": { a: "Yes", c: "Production data is never copied to development, test or staging environments; these environments use synthetic data only.", s: [["DataProt §8", "Production data is never copied"], ["DataProt §8", "synthetic data only"]] },
    "DSP-16.1": { a: "Yes", c: "Customer data is deleted after contract termination and removed from backups when they expire; the two policies state different deletion periods.", s: [["DataProt §9", "Customer data is deleted within"], ["InfoSec §12", "Customer data is retained for"]], x: { section_a: "DataProt §9", section_b: "InfoSec §12", what_differs: "DataProt §9 deletes customer data within 30 days after termination; InfoSec §12 retains it for 90 days." } },
    "DSP-18.1": { red: "partial" },
    "DSP-19.1": { a: "Yes", c: "Primary storage is in Azure West Europe (Netherlands) and backups in Azure North Europe (Ireland); customer data is not transferred outside the EEA.", s: [["DataProt §3", "All customer data is stored and processed"], ["DataProt §3", "Personivo does not transfer"]], p: "VQ-17" },
    "GRC-05.1": { a: "Yes", c: "Personivo operates an ISO/IEC 27001:2022 certified ISMS, owned by the CTO acting as Information Security Officer.", s: [["InfoSec §2", "certified against ISO/IEC 27001"], ["InfoSec §2", "The CTO acts as Information Security Officer"]], p: "VQ-18" },
    "GRC-08.1": { red: "none" },
    "HRS-01.1": { a: "Yes", c: "All employees and contractors must provide a Certificate of Conduct (VOG) before their start date.", s: [["InfoSec §11", "must provide a Certificate of Conduct"]], p: "VQ-19" },
    "HRS-05.1": { a: "Yes", c: "Company equipment must be returned on the last working day, and access of leavers is revoked within 24 hours.", s: [["InfoSec §11", "Company equipment must be returned"], ["InfoSec §6", "Access of leavers is revoked"]] },
    "HRS-10.1": { a: "Yes", c: "Employment contracts include confidentiality obligations and contractors sign a separate NDA.", s: [["InfoSec §11", "Employment contracts include"]], p: "VQ-20" },
    "HRS-11.1": { a: "Yes", c: "All staff complete security awareness training during onboarding and annually, with quarterly phishing simulations.", s: [["InfoSec §11", "All staff complete security awareness"]], p: "VQ-21" },
    "IAM-05.1": { a: "Yes", c: "Access follows least privilege and role based access control, with no standing access to production.", s: [["InfoSec §6", "Access follows least privilege"], ["InfoSec §6", "Nobody has standing access"]], p: "VQ-22" },
    "IAM-07.1": { a: "Yes", c: "Access of leavers is revoked within 24 hours of the end of employment, and immediately for involuntary terminations.", s: [["InfoSec §6", "Access of leavers is revoked"]], p: "VQ-23" },
    "IAM-08.1": { a: "Yes", c: "Access rights are reviewed quarterly for production and privileged access and every six months for all other systems; duties are separated.", s: [["InfoSec §6", "Access rights are reviewed quarterly"], ["InfoSec §6", "Duties are separated"]] },
    "IAM-13.1": { a: "Yes", c: "MFA is mandatory for all employees and contractors, privileged accounts use FIDO2 security keys, and customer administrators can enforce MFA.", s: [["InfoSec §6", "Multi-factor authentication is mandatory"], ["InfoSec §6", "Privileged accounts must use"], ["InfoSec §6", "Customer administrators can enforce"]], p: "VQ-24", o: "Shared CSP and CSC" },
    "IAM-14.1": { a: "Yes", c: "Passwords must be at least 14 characters and are checked against known breached passwords; no periodic forced changes, in line with NIST SP 800-63B.", s: [["InfoSec §6", "Passwords must be at least 14"], ["InfoSec §6", "Periodic forced password changes"]], p: "VQ-25" },
    "IPY-02.1": { a: "Yes", c: "Customers can retrieve their data at any time through the REST API or a full export in CSV and JSON formats.", s: [["InfoSec §12", "Customers can retrieve their data"]] },
    "IPY-04.1": { a: "Yes", c: "Data can be exported in CSV and JSON formats after termination and is then securely deleted; the two policies state different retention periods.", s: [["InfoSec §12", "Customers can retrieve their data"], ["InfoSec §12", "Customer data is retained for"], ["DataProt §9", "Customer data is deleted within"]], x: { section_a: "InfoSec §12", section_b: "DataProt §9", what_differs: "InfoSec §12 keeps customer data available for export for 90 days after termination; DataProt §9 deletes it within 30 days." } },
    "I&S-03.2": { a: "Yes", c: "All data in transit is encrypted with TLS 1.2 or higher, and internal service to service traffic is also encrypted with TLS.", s: [["InfoSec §5", "All data in transit"], ["InfoSec §5", "HSTS is enforced"]], p: "VQ-26" },
    "I&S-05.1": { a: "Yes", c: "Production, staging and development run in separate Azure subscriptions with separate access controls.", s: [["InfoSec §4", "Production, staging and development"], ["DataProt §8", "Production data is never copied"]] },
    "LOG-02.1": { a: "Yes", c: "Audit logs are written to immutable storage, accessible only to the ISO and the security on-call engineer, and retained for 12 months.", s: [["InfoSec §9", "Audit logs are written"]], p: "VQ-27" },
    "LOG-03.2": { a: "Yes", c: "Security events are collected in Microsoft Sentinel and detection rules generate alerts to the on-call engineer 24/7.", s: [["InfoSec §9", "Authentication events"], ["InfoSec §9", "Detection rules generate alerts"]] },
    "SEF-03.1": { a: "Yes", c: "Every P1 and P2 incident has an incident lead and a communications lead; affected customers are informed through their designated security contacts.", s: [["IR/BC §2", "Every P1 and P2"], ["IR/BC §2", "Affected customers are informed"]], p: "VQ-28" },
    "SEF-08.2": { a: "Yes", c: "Affected customers are notified of personal data breaches at the latest 24 hours after confirmation; the Dutch DPA is notified within 72 hours where Personivo is controller.", s: [["IR/BC §2", "For personal data breaches"], ["IR/BC §2", "Where Personivo is controller"]] },
    "TVM-03.1": { a: "Yes", c: "Cloud infrastructure is continuously scanned with Microsoft Defender for Cloud, container images weekly and dependencies daily.", s: [["InfoSec §8", "Cloud infrastructure is continuously scanned"]], p: "VQ-29" },
    "TVM-07.1": { a: "Yes", c: "An independent, CREST accredited third party performs a penetration test of the platform and API at least annually.", s: [["InfoSec §8", "An independent, CREST accredited"]], p: "VQ-30" },
    "UEM-08.1": { a: "Yes", c: "Company managed laptops enforce full disk encryption (BitLocker or FileVault) through Microsoft Intune.", s: [["InfoSec §10", "Laptops are managed with Microsoft Intune"]] },
  };

  const CATEGORY = { "A&A": "security", AIS: "technical", BCR: "continuity", CCC: "technical", CEK: "security", DCS: "security", DSP: "privacy", GRC: "security", HRS: "security", IAM: "security", IPY: "legal", "I&S": "technical", LOG: "technical", SEF: "security", TVM: "technical", UEM: "technical" };

  /** Same deterministic rules as src/lib/checks.ts finalize(). */
  function answerFor(q, set, pastAll, policySet) {
    const plan = PLAN[q.id];
    const byId = new Map(set.sections.map((s) => [s.id, s]));
    const category = CATEGORY[q.id.split("-")[0]] || "security";
    if (!plan || plan.red) {
      const coverage = plan?.red === "partial" ? "partial" : "none";
      return { question_id: q.id, answer: "Unknown", ssrm_ownership: "", comment: RED_COMMENT, reasoning: coverage === "none" ? "None of the policy sections address this topic, so no answer is generated." : "The selected sections were read but do not answer the question, so no answer is generated.", flag: "red", flag_reason: coverage === "none" ? "No policy section covers this topic" : "The selected sections do not answer this question", sources: [], conflicts: [], past_answer: null, past_answer_consistent: null, category, coverage, confidence: "low", checks: { quotes_valid: 0, quotes_dropped: 0, numbers_unverified: [] } };
    }
    const sources = [];
    let dropped = 0;
    for (const [sid, phrase] of plan.s) {
      const sec = byId.get(sid);
      const sentence = sec && sentences(sec.text).find((t) => t.includes(phrase));
      if (!sec || !sentence || !verifyQuote(sentence, sec).ok) { dropped++; continue; }
      if (!sources.some((x) => x.quote === sentence)) sources.push({ section_id: sec.id, policy: sec.policyName, version: sec.version, quote: sentence, text_hash: sec.hash });
    }
    const comment = policySet === "updated" && plan.c2 ? plan.c2 : plan.c;
    const past = plan.p ? pastAll.find((p) => p.ref === plan.p) || null : null;
    let consistent = past ? plan.pc !== false : null;
    if (past && (past.answer === "Yes" || past.answer === "No") && past.answer !== plan.a) consistent = false;
    const conflicts = plan.x && byId.has(plan.x.section_a) && byId.has(plan.x.section_b) ? [plan.x] : [];
    const numbers = unverifiedNumbers(comment, sources.map((s) => s.quote));
    const reasons = [];
    if (conflicts.length) reasons.push(`Policies disagree: ${conflicts.map((c) => `${c.section_a} vs ${c.section_b}`).join(", ")}`);
    if (consistent === false) reasons.push(`Practice changed since the 2025 answer${past ? ` (${past.ref})` : ""}`);
    if (numbers.length) reasons.push(`Unverified number${numbers.length > 1 ? "s" : ""} in comment: ${numbers.join(", ")}`);
    const answer = sources.length ? plan.a : "Unknown";
    const flag = !sources.length ? "red" : reasons.length ? "orange" : "green";
    return { question_id: q.id, answer, ssrm_ownership: plan.o || "CSP-owned", comment, reasoning: `Follows from ${[...new Set(sources.map((s) => s.section_id))].join(" and ")}.`, flag, flag_reason: flag === "green" ? "Answered from the current policy with verified quotes" : reasons.join(" · "), sources, conflicts, past_answer: past, past_answer_consistent: consistent, category, coverage: "covered", confidence: flag === "green" ? "high" : "medium", checks: { quotes_valid: sources.length, quotes_dropped: dropped, numbers_unverified: numbers } };
  }

  function diffRuns(previous, current) {
    const prev = new Map(previous.map((a) => [a.question_id, a]));
    return current.map((a) => {
      const p = prev.get(a.question_id);
      if (!p) return { question_id: a.question_id, changed: false, reasons: [] };
      const reasons = [];
      if (p.answer !== a.answer) reasons.push(`answer ${p.answer} → ${a.answer}`);
      if (p.flag !== a.flag) reasons.push(`flag ${p.flag} → ${a.flag}`);
      const ph = new Map(p.sources.map((s) => [s.section_id, s.text_hash]));
      for (const s of a.sources) { const h = ph.get(s.section_id); if (h && h !== s.text_hash) reasons.push(`${s.section_id} text changed (v${p.sources.find((x) => x.section_id === s.section_id)?.version} → v${s.version})`); }
      const unique = [...new Set(reasons)];
      return { question_id: a.question_id, changed: unique.length > 0, reasons: unique, previous: { answer: p.answer, comment: p.comment, flag: p.flag, sources: p.sources } };
    });
  }

  /** Same columns as workspace.tsx exportCsv: original header + flag, flag_reason, sources. */
  function wordDiff(a, b) {
    const A = a.split(/(\s+)/).filter(Boolean), B = b.split(/(\s+)/).filter(Boolean);
    const n = A.length, m = B.length;
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const out = []; let i = 0, j = 0;
    while (i < n && j < m) { if (A[i] === B[j]) { out.push({ t: "same", w: A[i] }); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: "del", w: A[i] }); i++; } else { out.push({ t: "add", w: B[j] }); j++; } }
    while (i < n) out.push({ t: "del", w: A[i++] });
    while (j < m) out.push({ t: "add", w: B[j++] });
    return out;
  }

  /** qn: { header, questions } of the questionnaire that was run. */
  function toCsv(qn, answers) {
    const meta = { questionnaire: qn.questionnaire || qn };
    const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const header = meta.questionnaire.header, h = header.map((x) => x.toLowerCase());
    const lines = [[...header, "flag", "flag_reason", "sources"].map(esc).join(",")];
    for (const q of meta.questionnaire.questions) {
      const a = answers[q.id];
      const row = header.map((_, c) => (h[c] === "answer" ? a?.answer ?? "" : h[c] === "comment" ? a?.comment ?? "" : h[c] === "ssrm_ownership" ? a?.ssrm_ownership ?? "" : h[c] === "question" ? q.text : h[c].includes("id") ? q.id : ""));
      lines.push([...row, a?.flag ?? "", a?.flag_reason ?? "", (a?.sources ?? []).map((s) => `${s.section_id} v${s.version}`).join("; ")].map(esc).join(","));
    }
    return lines.join("\n");
  }

  async function readSse(res, emit) {
    const reader = res.body.getReader(), dec = new TextDecoder(); let buf = "";
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 2);
        if (line.startsWith("data:")) emit(JSON.parse(line.slice(5)));
      }
    }
  }

  function localBackend(dir = "data/") {
    let corpusP = null;
    const text = (p) => fetch(dir + p).then((r) => { if (!r.ok) throw new Error(`Could not load ${p}`); return r.text(); });
    const corpus = () => corpusP || (corpusP = (async () => {
      const load = async (set) => {
        const out = { policies: [], sections: [] };
        for (const [base, short, name] of POLICY_FILES) {
          const file = set === "updated" && UPDATES[base] ? `policy_updates/${UPDATES[base]}.md` : `policies/${base}.md`;
          const r = parsePolicy(base, short, name, await text(file));
          out.policies.push(r.policy); out.sections.push(...r.sections);
        }
        return out;
      };
      const [current, updated, qcsv, pcsv] = await Promise.all([load("current"), load("updated"), text("questionnaire_2026_blank.csv"), text("previous_questionnaire_2025_filled.csv")]);
      return { sets: { current, updated }, questionnaire: parseQuestionnaire(qcsv, "CAIQ v4.1 — Personivo 2026"), past: parsePast(pcsv) };
    })());

    return {
      kind: "replay",
      async meta() {
        const c = await corpus(), cur = c.sets.current, upd = c.sets.updated;
        return {
          company: "Personivo B.V.",
          policies: cur.policies.map((p) => ({ ...p, sections: cur.sections.filter((s) => s.policy === p.short).length })),
          updated_policies: upd.policies.filter((p) => !cur.policies.some((x) => x.short === p.short && x.version === p.version)),
          past_answers: c.past.length,
          questionnaire: c.questionnaire,
          models: MODELS,
        };
      },
      async pastAnswers() { return (await corpus()).past; },
      async policy(short) {
        const c = await corpus(), cur = c.sets.current, upd = c.sets.updated;
        const pc = cur.policies.find((p) => p.short === short), pu = upd.policies.find((p) => p.short === short);
        if (!pc) throw new Error("unknown policy");
        const sec = (set) => set.sections.filter((s) => s.policy === short).map(({ id, number, title, text, hash, version }) => ({ id, number, title, text, hash, version }));
        return { policy: pc, sections: sec(cur), updated: pu && pu.version !== pc.version ? { policy: pu, sections: sec(upd) } : null };
      },
      async run({ policy_set, signal, questions }, emit) {
        const c = await corpus(), set = c.sets[policy_set === "updated" ? "updated" : "current"], qs = questions?.length ? questions : c.questionnaire.questions;
        const T0 = () => Math.round(performance.now() - t0);
        const trace = (q, step, detail, model, ms) => emit({ type: "trace", question_id: q.id, step, model, detail, ms: Math.round(ms), t: T0() });
        const t0 = performance.now();
        const run = { run_id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())), policy_set, policy_versions: Object.fromEntries(set.policies.map((p) => [p.short, p.version])), model_small: MODELS.selection, model_large: MODELS.writing, started_at: new Date().toISOString(), duration_ms: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0, baseline_cost_usd: 0, done: 0, total: qs.length, flags: { green: 0, orange: 0, red: 0 }, status: "running" };
        emit({ type: "start", run: { ...run } });
        const plan = qs.map((q) => { const sel = 500 + Math.random() * 2200; return { q, sel, end: sel + (PLAN[q.id]?.red ? 400 + Math.random() * 900 : 2200 + Math.random() * 10500), selDone: false, done: false }; });
        const answers = [];
        const account = (i, o) => { run.input_tokens += i; run.output_tokens += o; run.cost_usd = (run.input_tokens + run.output_tokens) * RATE; run.baseline_cost_usd = (run.input_tokens + run.output_tokens) * BASE_RATE; };
        await new Promise((resolve, reject) => {
          let lastMetrics = 0;
          const iv = setInterval(() => {
            if (signal?.aborted) { clearInterval(iv); reject(new DOMException("Aborted", "AbortError")); return; }
            const t = performance.now() - t0;
            for (const p of plan) {
              if (!p.selDone && t >= p.sel) { p.selDone = true; const pl = PLAN[p.q.id], secs = (pl?.s || []).map((x) => x[0]).filter((v, i, a) => a.indexOf(v) === i); trace(p.q, "shortlist", `${8 + Math.round(Math.random() * 4)} candidate sections, ${pl?.p ? 8 : 5} past answers (top similarity ${(pl && !pl.red ? 0.62 + Math.random() * 0.2 : 0.31 + Math.random() * 0.1).toFixed(2)})`, "Qwen3-Embedding-8B", p.sel * 0.3); trace(p.q, "select", `${pl && !pl.red ? "covered" : pl?.red || "none"} · ${secs.length ? secs.join(", ") : "no section"} · ${CATEGORY[p.q.id.split("-")[0]] || "security"}`, "Qwen3-30B-A3B", p.sel); account(900 + Math.round(Math.random() * 300), 40 + Math.round(Math.random() * 20)); emit({ type: "selected", question_id: p.q.id, selection: { category: CATEGORY[p.q.id.split("-")[0]] || "security", relevant_sections: (PLAN[p.q.id]?.s || []).map((x) => x[0]).filter((v, i, a) => a.indexOf(v) === i), relevant_past_answers: [], coverage: PLAN[p.q.id]?.red ? "none" : "covered" }, ms: Math.round(p.sel) }); }
              if (!p.done && t >= p.end) {
                p.done = true;
                const a = answerFor(p.q, set, c.past, policy_set);
                const inT = a.flag === "red" ? 0 : 1300 + Math.round(Math.random() * 500), outT = a.flag === "red" ? 0 : 150 + Math.round(a.comment.length * 0.6);
                account(inT, outT);
                Object.assign(a, { input_tokens: inT + 1000, output_tokens: outT + 50, latency_ms: Math.round(p.end), selection_ms: Math.round(p.sel) });
                const pl = PLAN[p.q.id];
                if (!pl) Object.assign(a, { flag_reason: "Replay has no recorded answer for this question. Run it on the live backend.", reasoning: "Not in the recorded demo set." });
                if (a.flag === "red") trace(p.q, "write", pl ? "skipped: nothing to write from" : "skipped: not in the replay set", "Qwen3-235B-A22B", p.end);
                else trace(p.q, "write", `${a.answer} · ${a.sources.length} quote${a.sources.length === 1 ? "" : "s"}${a.conflicts.length ? ` · ${a.conflicts.length} conflict` : ""}${a.past_answer ? ` · past ${a.past_answer.ref}${a.past_answer_consistent === false ? " differs" : ""}` : ""} · ${outT} tokens`, "Qwen3-235B-A22B", p.end);
                trace(p.q, "verify", `${a.checks.quotes_valid} quote${a.checks.quotes_valid === 1 ? "" : "s"} found in policy text${a.checks.numbers_unverified.length ? ` · unverified numbers: ${a.checks.numbers_unverified.join(", ")}` : " · all numbers quoted"}`, undefined, p.end + 2);
                trace(p.q, "flag", `${a.flag.toUpperCase()} · ${a.flag_reason}`, undefined, p.end + 3);
                answers.push(a); run.done = answers.length; run.flags[a.flag]++; run.duration_ms = Math.round(t);
                emit({ type: "answer", answer: a });
              }
            }
            if (t - lastMetrics >= 250) { lastMetrics = t; run.duration_ms = Math.round(t); emit({ type: "metrics", run: { ...run, flags: { ...run.flags } } }); }
            if (plan.every((p) => p.done)) {
              clearInterval(iv);
              run.duration_ms = Math.round(performance.now() - t0); run.finished_at = new Date().toISOString(); run.status = "done";
              const byId = new Map(answers.map((a) => [a.question_id, a]));
              emit({ type: "done", run: { ...run, flags: { ...run.flags } }, answers: qs.map((q) => byId.get(q.id)).filter(Boolean) });
              resolve();
            }
          }, 40);
        });
      },
    };
  }

  function liveBackend(apiBase) {
    const base = (apiBase || "").replace(/\/$/, "");
    const local = localBackend();
    const get = async (p) => { const r = await fetch(base + p); if (!r.ok) throw new Error((await r.text()) || `HTTP ${r.status}`); return r.json(); };
    return {
      kind: "live",
      meta: () => get("/api/meta"),
      pastAnswers: () => local.pastAnswers(),
      policy: (short) => get(`/api/policy?short=${encodeURIComponent(short)}`),
      async run({ policy_set, signal, csv }, emit) {
        const res = await fetch(base + "/api/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(csv ? { policy_set, csv } : { policy_set }), signal });
        if (!res.ok || !res.body) throw new Error((await res.text()) || `HTTP ${res.status}`);
        await readSse(res, emit);
      },
    };
  }

  window.TSBackend = { localBackend, liveBackend, diffRuns, toCsv, parseCsv, parseQuestionnaire, wordDiff, _answerFor: answerFor, _parsePolicy: parsePolicy, _PLAN: PLAN };
})();
