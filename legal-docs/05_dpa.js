const fs = require('fs');
const { Document, Packer } = require('docx');
const S = require('./_shared.js');

const doc = new Document({
  styles: S.styles, numbering: S.numbering,
  sections: [{
    properties: { page: S.PAGE },
    headers: { default: S.buildHeader('Data Processing Agreement') },
    footers: { default: S.buildFooter() },
    children: [
      ...S.titleBlock('DATA PROCESSING AGREEMENT', 'Annexure C to Master Services Agreement dated 29 April 2026'),

      S.kvTable([
        ['DPA Reference', 'ITL/DPA/MAKSON/2026-04-001'],
        ['Effective Date', '29 April 2026'],
        ['Applicable Laws', 'IT Act 2000; DPDP Act 2023; SPDI Rules 2011'],
        ['Document Version', 'v2 (revised post-review by Client)'],
      ]),
      S.spacer(280),

      S.h2('1. PARTIES AND ROLES'),
      S.pRich([
        { text: 'This Data Processing Agreement (', bold: false },
        { text: '“DPA”', bold: true },
        { text: ') is entered into between ' },
        { text: 'MAKSON PHARMACEUTICALS (INDIA) PRIVATE LIMITED', bold: true, color: S.COLORS.primary },
        { text: ', having its registered office at 195, Rajkot Highway, Surendranagar, Wadhwancity, Gujarat 363020, India (CIN: U24231GJ1986PTC008718)' },
        { text: ' (the ' },
        { text: '“Data Fiduciary”', bold: true },
        { text: ' / ' },
        { text: '“Data Controller”', bold: true },
        { text: ') AND ' },
        { text: 'INFOLOOP TECHNOLOGIES LLP', bold: true, color: S.COLORS.primary },
        { text: ' (the ' },
        { text: '“Data Processor”', bold: true },
        { text: ').' },
      ]),
      S.spacer(120),
      S.p('Makson, as the employer of the data subjects, is the Data Fiduciary determining the purposes and means of processing personal data. Infoloop, as the technology service provider, processes personal data on behalf of and under the instructions of Makson.'),

      S.h2('2. SCOPE AND PURPOSE OF PROCESSING'),
      S.h3('2.1 Categories of Data Subjects'),
      S.bullet('Employees of Makson Pharmaceuticals (India) Private Limited.'),
      S.bullet('Authorised users of the MAMS application (HR personnel, compliance auditors, IT administrators).'),

      S.h3('2.2 Categories of Personal Data Processed'),
      S.bullet('Identification data: name, employee code, biometric ID, date of joining, gender.'),
      S.bullet('Government-issued identifiers: PAN, Aadhaar (both masked by default; unmasking is restricted to authorised roles with appropriate permission and is audit-logged).'),
      S.bullet('Statutory identifiers: PF number, ESI number (masked by default; unmasking is restricted to authorised roles and is audit-logged).'),
      S.bullet('Financial data: bank account number, IFSC, account holder name (masked by default; unmasking is restricted to authorised roles and is audit-logged; payroll-related fields stored, not processed in Phase 1).'),
      S.bullet('Biometric data: fingerprint and/or face template references (stored on biometric device, not on MAMS server).'),
      S.bullet('Attendance data: timestamps of entry and exit, hours worked, location.'),
      S.bullet('Authentication data: credentials of MAMS users.'),
      S.p('Aadhaar format / checksum validation against UIDAI specifications is deferred to Phase 2; the field is captured in Phase 1 with masking and role-gated access. Any processing of Aadhaar shall comply with the Aadhaar (Targeted Delivery of Financial and Other Subsidies, Benefits and Services) Act, 2016 and applicable UIDAI regulations.', { italics: true }),

      S.h3('2.3 Purposes of Processing'),
      S.bullet('Operation of the MAMS attendance management system.'),
      S.bullet('Generation of compliance reports for labour-law inspections.'),
      S.bullet('Audit trail and adjustment workflow management.'),
      S.bullet('Technical support, troubleshooting, and bug-fixing during the engagement period.'),
      S.bullet('Backups and disaster recovery.'),

      S.h3('2.4 Duration of Processing'),
      S.p('Processing shall continue for the duration of the engagement under the MSA and thereafter for any post-deployment support period, unless terminated earlier as per the MSA.'),

      S.h2('3. DATA PROCESSOR OBLIGATIONS'),
      S.p('The Data Processor shall:'),
      S.bullet('Process personal data only in accordance with documented instructions from the Data Fiduciary.'),
      S.bullet('Implement reasonable security practices and procedures as required under the SPDI Rules 2011 and DPDP Act 2023, including encryption in transit (TLS 1.2+) and at rest, role-based access control, secure authentication, and audit logging.'),
      S.bullet('Apply data-minimisation by access: sensitive identifiers (Aadhaar, PAN, bank account number, PF number, ESI number) shall be masked by default in all UI views; unmasking shall be restricted to authorised roles with appropriate permission, shall require explicit user action, and shall be recorded in an immutable audit log capturing user, timestamp, IP address, and field accessed.'),
      S.bullet('Preserve immutability of original biometric punch records: raw timestamps received from biometric devices shall not be deleted, edited, or overwritten by any user, role, or process. Corrections and compliance-shift mappings shall be stored as separate, additional records that reference the original punch.'),
      S.bullet('Ensure that personnel having access to personal data are bound by confidentiality obligations.'),
      S.bullet('Not transfer personal data outside India without prior written consent of the Data Fiduciary.'),
      S.bullet('Not engage any sub-processor without prior written consent of the Data Fiduciary; the Data Processor remains liable for the acts and omissions of any approved sub-processor. Since the system is deployed on the Client\u2019s on-premise server, no third-party sub-processors handle personal data in the production environment.'),
      S.bullet('Not use, copy, extract, anonymise, aggregate, retain, or transmit any personal data of the Data Fiduciary for any purpose other than performing the services under the MSA. Use of any Client data, screenshots, or derived artefacts for product demonstrations, marketing materials, case studies, sales pitches, training datasets, or any external presentation is prohibited except with the prior, specific, written consent of the Data Fiduciary, as further detailed in MSA Clauses 7.4-7.6.'),
      S.bullet('Assist the Data Fiduciary in responding to requests from data subjects (access, correction, erasure, portability) within the timelines required by law.'),
      S.bullet('Notify the Data Fiduciary of any personal data breach without undue delay and in any case within seventy-two (72) hours of becoming aware.'),
      S.bullet('Cooperate with the Data Fiduciary in conducting data protection impact assessments where required.'),
      S.bullet('Maintain records of processing activities as required under applicable law.'),

      S.h2('4. DATA FIDUCIARY OBLIGATIONS'),
      S.p('The Data Fiduciary shall:'),
      S.bullet('Ensure that it has obtained all necessary consents and notices from data subjects (employees) for the processing of their personal data through MAMS.'),
      S.bullet('Provide accurate and lawful instructions to the Data Processor.'),
      S.bullet('Comply with its obligations as a Data Fiduciary under applicable Indian data protection laws.'),
      S.bullet('Promptly inform the Data Processor of any changes in instructions or scope of processing.'),

      S.h2('5. SECURITY MEASURES'),
      S.p('The Data Processor implements the following technical and organisational security measures:'),
      S.bullet('Encryption: TLS 1.2 or above for data in transit; database-level encryption at rest.'),
      S.bullet('Access control: Role-based access; multi-factor authentication for administrative access; principle of least privilege.'),
      S.bullet('Authentication: Strong password policy; session timeouts; secure credential storage (bcrypt or equivalent).'),
      S.bullet('Field-level data minimisation: Sensitive identifiers (Aadhaar, PAN, bank account number, PF number, ESI number) are masked by default; unmasking is gated by explicit user action and role permission; every unmask event is recorded in an immutable audit log capturing user, timestamp, IP address, and field accessed.'),
      S.bullet('Immutable records: Original biometric punch records and adjustment audit entries cannot be deleted, edited, or overwritten by any user, role, or process. Corrections are stored as additional records referencing the original.'),
      S.bullet('Audit logging: All access to personal data, all adjustment actions, all unmasking actions, and all configuration changes are logged with user, timestamp, and IP address.'),
      S.bullet('Backups: Automated daily backups with point-in-time recovery capability for thirty (30) days.'),
      S.bullet('Network security: Firewall protection; DDoS mitigation; HTTPS-only access.'),
      S.bullet('Personnel security: Confidentiality agreements with all personnel; need-to-know access principle.'),
      S.bullet('Vulnerability management: Regular dependency updates; security patches applied promptly.'),

      S.h2('6. DATA SUBJECT RIGHTS'),
      S.p('The Data Processor shall, on instruction from the Data Fiduciary, assist with fulfilling data subject rights including:'),
      S.bullet('Right to access personal data.'),
      S.bullet('Right to correction of inaccurate data.'),
      S.bullet('Right to erasure (subject to legal retention requirements).'),
      S.bullet('Right to data portability where technically feasible.'),
      S.bullet('Right to grievance redressal — Data Fiduciary shall be the primary contact; Data Processor shall provide technical support.'),

      S.h2('7. BREACH NOTIFICATION'),
      S.p('In the event of a personal data breach involving data processed under this DPA, the Data Processor shall:'),
      S.bullet('Notify the Data Fiduciary in writing without undue delay and within seventy-two (72) hours of becoming aware.'),
      S.bullet('Provide a description of the nature of the breach, categories and approximate number of data subjects affected, likely consequences, and measures taken or proposed to address the breach.'),
      S.bullet('Cooperate with the Data Fiduciary in any subsequent investigation, regulatory notification, or communication to data subjects.'),

      S.h2('8. AUDIT AND INSPECTION'),
      S.p('The Data Fiduciary may, on giving fifteen (15) days prior written notice and not more than once per calendar year (except in case of suspected breach), audit or appoint an independent auditor to verify the Data Processor\u2019s compliance with this DPA. The audit shall be conducted during business hours, shall not unreasonably interfere with the Data Processor\u2019s operations, and shall be subject to confidentiality obligations.'),

      S.h2('9. RETURN OR DELETION OF DATA'),
      S.p('Upon termination or expiry of the MSA, the Data Processor shall, at the option of the Data Fiduciary:'),
      S.bullet('Return all personal data in its possession to the Data Fiduciary in a structured, commonly used machine-readable format (e.g., SQL dump, CSV); or'),
      S.bullet('Securely delete all personal data and certify deletion in writing within thirty (30) days, except where retention is required by applicable law.'),

      S.h2('10. LIABILITY AND INDEMNITY'),
      S.p('Each Party shall be liable for breach of this DPA to the extent attributable to its own acts or omissions. The liability under this DPA shall be subject to the limitations set out in Clause 11 of the Master Services Agreement, except for breaches involving wilful misconduct or gross negligence in handling personal data.'),

      S.h2('11. SUB-PROCESSORS'),
      S.p('Since the MAMS application is deployed entirely on the Client\u2019s on-premise server, no third-party sub-processors handle personal data in the production environment. All employee personal data, biometric records, attendance logs, and adjustment history reside exclusively within the Client\u2019s infrastructure.'),
      S.p('During the development and support phase, the Service Provider may use industry-standard tools (such as Git for version control, Jira/Notion for project tracking) for internal collaboration. Such tools shall not store any production personal data of the Client.'),
      S.p('Any future engagement of sub-processors that would process personal data shall be notified to the Data Fiduciary at least thirty (30) days in advance, providing the Data Fiduciary an opportunity to object.'),

      S.h2('12. GOVERNING LAW AND JURISDICTION'),
      S.p('This DPA shall be governed by the laws of India. The courts at Surat, Gujarat shall have exclusive jurisdiction.'),

      S.h2('13. PRECEDENCE'),
      S.p('In case of conflict between this DPA and the MSA in matters relating to personal data protection, the terms of this DPA shall prevail.'),

      S.spacer(360),
      S.p('IN WITNESS WHEREOF, the Parties have executed this Data Processing Agreement on the date first written above.', { bold: true }),
      S.spacer(360),
      S.esignNote(),
      S.signatureBlock(
        'For INFOLOOP TECHNOLOGIES LLP (Data Processor)', 'Mr. Nimit Kaneria', 'Designated Partner & CEO',
        'For MAKSON PHARMACEUTICALS (INDIA) PRIVATE LIMITED (Data Fiduciary)', 'Mrs. Komal Makasana', 'CFO & Partner'
      ),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(require('path').join(__dirname, '..', 'final-docs', 'v2', '05_Data_Processing_Agreement.docx'), buf);
  console.log('DPA created');
});
