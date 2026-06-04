const fs = require('fs');
const { Document, Packer } = require('docx');
const S = require('./_shared.js');

const doc = new Document({
  styles: S.styles, numbering: S.numbering,
  sections: [{
    properties: { page: S.PAGE },
    headers: { default: S.buildHeader('Master Services Agreement') },
    footers: { default: S.buildFooter() },
    children: [
      ...S.titleBlock('MASTER SERVICES AGREEMENT', 'Between Infoloop Technologies LLP and Makson Pharmaceuticals (India) Pvt. Ltd.'),

      S.kvTable([
        ['Agreement Date', '29 April 2026'],
        ['Effective Date', '29 April 2026'],
        ['Reference No.', 'ITL/MSA/MAKSON/2026-04-001'],
        ['Project Name', 'Makson Attendance Management System (MAMS)'],
        ['Document Version', 'v2 (revised post-review by Client)'],
      ]),
      S.spacer(280),

      S.h2('1. PARTIES'),
      S.pRich([
        { text: 'This Master Services Agreement (', bold: false },
        { text: '“Agreement”', bold: true },
        { text: ') is entered into on this 29th day of April, 2026 by and between:' },
      ]),
      S.spacer(120),
      S.pRich([
        { text: 'INFOLOOP TECHNOLOGIES LLP', bold: true, color: S.COLORS.primary },
        { text: ', a Limited Liability Partnership incorporated under the Limited Liability Partnership Act, 2008, having its office at Suite 1101, Rajhans Skylar, Udhna Magdalla Road, Surat, Gujarat 395007, India (GSTIN: 24AAKFI1283K1Z8; PAN: AAKFI1283K), represented herein by its Designated Partner Mr. Nimit Kaneria (hereinafter referred to as ' },
        { text: '“Service Provider”', bold: true },
        { text: ' or ' },
        { text: '“Infoloop”', bold: true },
        { text: ', which expression shall, unless repugnant to the context, mean and include its successors and permitted assigns) of the ' },
        { text: 'FIRST PART', bold: true },
        { text: ';' },
      ]),
      S.spacer(120),
      S.p('AND', { align: 'center', bold: true }),
      S.spacer(120),
      S.pRich([
        { text: 'MAKSON PHARMACEUTICALS (INDIA) PRIVATE LIMITED', bold: true, color: S.COLORS.primary },
        { text: ', a Private Limited Company incorporated under the Companies Act, having its registered office at 195, Rajkot Highway, Surendranagar, Wadhwancity, Gujarat 363020, India (CIN: U24231GJ1986PTC008718; GSTIN: 24AABCM2806L1ZM), represented herein by Mrs. Komal Makasana, CFO & Partner (hereinafter referred to as ' },
        { text: '“Client”', bold: true },
        { text: ' or ' },
        { text: '“Makson”', bold: true },
        { text: ', which expression shall, unless repugnant to the context, mean and include its successors and permitted assigns) of the ' },
        { text: 'SECOND PART', bold: true },
        { text: '.' },
      ]),
      S.spacer(120),
      S.p('Service Provider and Client shall hereinafter be individually referred to as a "Party" and collectively as the "Parties".'),

      S.h2('2. RECITALS'),
      S.pRich([{ text: 'WHEREAS', bold: true }, { text: ' the Client desires to procure software development and related professional services for the design, development, deployment, and maintenance of the Makson Attendance Management System (MAMS); and' }]),
      S.spacer(80),
      S.pRich([{ text: 'WHEREAS', bold: true }, { text: ' the Service Provider has the necessary expertise, infrastructure, and personnel to provide such services; and' }]),
      S.spacer(80),
      S.pRich([{ text: 'WHEREAS', bold: true }, { text: ' the Parties wish to record the terms and conditions governing their engagement under this Agreement;' }]),
      S.spacer(80),
      S.pRich([{ text: 'NOW THEREFORE', bold: true }, { text: ', in consideration of the mutual covenants and promises contained herein, the Parties agree as follows:' }]),

      S.h2('3. SCOPE OF SERVICES'),
      S.p('3.1 The Service Provider shall provide the services as described in the Statement of Work (SoW) attached as Annexure A and forming an integral part of this Agreement.'),
      S.p('3.2 Any change in the scope of services shall be agreed upon in writing through a duly signed Change Request between the Parties.'),
      S.p('3.3 The Service Provider shall perform the services with reasonable skill, care, and diligence in accordance with industry-accepted standards and practices.'),

      S.h2('4. TERM AND COMMENCEMENT'),
      S.p('4.1 This Agreement shall commence on the Effective Date i.e. 29 April 2026 and shall remain in force until completion of all deliverables under the Statement of Work, unless terminated earlier in accordance with the provisions of this Agreement.'),
      S.p('4.2 The estimated project duration is eight (8) to ten (10) weeks from the Effective Date, subject to timely receipt of inputs and approvals from the Client.'),

      S.h2('5. CONSIDERATION AND PAYMENT TERMS'),
      S.p('5.1 The total consideration payable by the Client to the Service Provider for the services under this Agreement shall be INR 7,50,000/- (Indian Rupees Seven Lakh Fifty Thousand Only), exclusive of applicable Goods and Services Tax (GST) at the prevailing rate.'),
      S.p('5.2 The payment shall be released against five (5) verifiable milestones as detailed in Clause 5 of the Statement of Work (Annexure A). For ease of reference, the milestone schedule is:'),
      S.spacer(80),
      S.dataTable(
        ['#', 'Milestone', 'Amount (INR)', '%'],
        [
          ['M1', 'Kickoff: signed MSA + SoW + NDA + DPA', '3,75,000', '50%'],
          ['M2', 'Device Connection Verified (eSSL live in dev) — written acceptance', '1,12,500', '15%'],
          ['M3', 'Build Complete & Internal QA Passed — written acceptance', '1,12,500', '15%'],
          ['M4', 'UAT Passed & Errors Fixed — written acceptance', '75,000', '10%'],
          ['M5', 'Final Handover, Source Code & Credentials Transferred — written sign-off', '75,000', '10%'],
        ],
        [600, 7700, 1700, 1080]
      ),
      S.spacer(120),
      S.p('5.3 Each milestone after M1 requires explicit written acceptance from an authorised Client representative. There shall be no automatic, deemed, or time-elapsed acceptance. The detailed acceptance procedure and escalation path are set out in Clause 6 of the Statement of Work.'),
      S.p('5.4 GST at the applicable rate (currently 18%) shall be charged additionally on each Tax Invoice raised after the corresponding milestone is accepted in writing.'),
      S.p('5.5 All payments shall be made within seven (7) business days of invoice receipt via NEFT / RTGS to the Service Provider’s designated bank account specified on the invoice.'),
      S.p('5.6 Late payment beyond fifteen (15) days from invoice date shall attract simple interest at the rate of 1.5% per month or part thereof.'),
      S.p('5.7 No additional fees shall be billed, and no out-of-scope work shall be performed, except through a written Change Request signed by authorised representatives of both Parties as per Clause 7 of the Statement of Work.'),

      S.h2('6. CLIENT OBLIGATIONS'),
      S.p('The Client shall:'),
      S.bullet('Provide timely access to all required information, data, systems, premises, and personnel necessary for the Service Provider to perform the services.'),
      S.bullet('Designate a single point of contact (Project Manager) authorised to provide approvals, sign-offs, and decisions on behalf of the Client.'),
      S.bullet('Review and provide written acceptance or specific defect feedback on deliverables in accordance with the acceptance and escalation procedure set out in Clause 6 of the Statement of Work.'),
      S.bullet('Ensure that biometric devices, network infrastructure, and internet connectivity required for the system are operational and accessible.'),
      S.bullet('Provide and maintain an on-premise server (Linux OS, minimum 8 GB RAM, 250 GB SSD, static IP) to host the MAMS application; remain responsible for server maintenance, OS patches, backups, and physical security after handover.'),
      S.bullet('Replace any incompatible legacy biometric devices identified by the Service Provider during the discovery phase, at the Client\u2019s own cost. The device-compatibility validation process and outcomes are detailed in Clause 12 of the Statement of Work.'),
      S.bullet('Where bulk import of employee or master data via CSV is used, ensure correctness and integrity of source data; data discrepancy resolution remains the Client\u2019s obligation.'),
      S.bullet('Make payments in accordance with Clause 5.'),

      S.h2('7. INTELLECTUAL PROPERTY AND DATA OWNERSHIP'),
      S.p('7.1 Upon receipt of full and final payment under Clause 5, the Service Provider shall transfer all intellectual property rights, title, and interest in the bespoke software developed under this Agreement to the Client, including the source code, documentation, and database schema. Full source code, database administrative credentials, application administrative credentials, environment configuration files, deployment scripts, and runbooks shall be handed over upon Final Acceptance (Milestone M5) as detailed in Clause 10 of the Statement of Work.'),
      S.p('7.2 The Service Provider retains ownership of all pre-existing tools, libraries, frameworks, and methodologies used in the development. The Client is granted a perpetual, non-exclusive, royalty-free licence to use such pre-existing materials solely as embedded within the delivered software.'),
      S.p('7.3 Open-source components used in the MERN stack (MongoDB, Express.js, React, Node.js, and related npm packages) shall be governed by their respective open-source licences. The Service Provider shall provide a list of such components upon delivery.'),
      S.p('7.4 Data Ownership: All data captured, stored, generated, or processed by MAMS — including employee personal data, biometric records, attendance logs, adjustment history, audit trails, and any derived analytics — is and shall remain the exclusive property of the Client.'),
      S.p('7.5 Use Restrictions on Client Data: The Service Provider shall not use, copy, extract, anonymise, aggregate, retain, or transmit any Client data for any purpose other than performing the services under this Agreement. The Service Provider shall not use any Client data, screenshots derived from Client data, or any artefacts containing Client data for product demonstrations, marketing materials, case studies, sales pitches, training datasets, or any external presentation, except with the prior, specific, written consent of the Client.'),
      S.p('7.6 Engagement Reference: Generic, anonymised references to the engagement (e.g., describing the engagement as “an attendance management system for a pharmaceutical manufacturer”) without disclosure of the Client’s name, brand, employee data, or screenshots, may be made by the Service Provider only with the prior written approval of the Client.'),

      S.h2('8. CONFIDENTIALITY'),
      S.p('8.1 Each Party acknowledges that it may receive Confidential Information from the other Party, including but not limited to employee personal data, business processes, financial information, source code, and technical specifications.'),
      S.p('8.2 Each Party undertakes to: (a) maintain the confidentiality of such information; (b) use it solely for the purposes of this Agreement; (c) not disclose it to any third party without prior written consent of the disclosing Party; and (d) protect it with at least the same degree of care as it uses to protect its own confidential information, but in no event less than reasonable care.'),
      S.p('8.3 The confidentiality obligations shall survive for a period of three (3) years after termination of this Agreement.'),
      S.p('8.4 A separate Mutual Non-Disclosure Agreement (NDA) executed between the Parties shall form part of this Agreement and the more restrictive provisions shall prevail in case of conflict.'),

      S.h2('9. DATA PROTECTION'),
      S.p('9.1 The Service Provider shall handle all employee personal data, biometric information, and other personally identifiable information (PII) in accordance with the Information Technology Act, 2000, the Digital Personal Data Protection Act, 2023 (DPDP Act), and any applicable rules and regulations.'),
      S.p('9.2 The Service Provider shall act as a Data Processor and the Client shall remain the Data Fiduciary in respect of all personal data processed under this Agreement.'),
      S.p('9.3 A separate Data Processing Agreement (DPA) shall be executed between the Parties detailing specific data protection obligations.'),
      S.p('9.4 Upon termination or expiry, the Service Provider shall return or securely destroy all personal data in its possession within thirty (30) days, except where retention is required by law.'),

      S.h2('10. WARRANTIES AND SUPPORT'),
      S.p('10.1 The Service Provider warrants that the software shall substantially conform to the specifications set out in the SoW for a period of three (3) months from the date of Final Acceptance.'),
      S.p('10.2 During the warranty period, the Service Provider shall rectify, free of charge, any defects, bugs, or non-conformities reported by the Client, in accordance with the severity-based response and resolution targets set out in Clause 8 of the Statement of Work, provided such defects are not caused by Client misuse, unauthorised modification, third-party software, hardware failure, or force majeure events.'),
      S.p('10.3 Standard support hours are Monday to Friday, 9:00 AM to 7:00 PM India Standard Time, excluding declared public holidays. P1 (Critical) issues during the warranty period are addressed on a 24x7 response basis. Detailed SLAs and channels are set out in Clause 8 of the Statement of Work.'),
      S.p('10.4 Post warranty, the Parties may enter into a separate Annual Maintenance Contract (AMC) for ongoing support, upgrades, and enhancements at terms to be mutually agreed in writing. If no AMC is entered into, the Service Provider shall remain available on a paid time-and-materials basis at hourly rates separately agreed in writing, for a minimum period of twelve (12) months from Final Acceptance.'),
      S.p('10.5 Knowledge-transfer support: for ninety (90) days following Final Acceptance, the Service Provider shall respond to clarification queries from the Client’s nominated administrator (architecture, deployment, runtime configuration) at no additional charge, capped at ten (10) hours of consultative time.'),
      S.p('10.6 The warranty does not cover: (a) cosmetic changes; (b) feature requests outside the original scope; (c) issues arising from changes in third-party APIs, biometric device firmware, or operating system upgrades; (d) data migration of historical records; (e) network or hardware failures; (f) defects caused by Client modifications to the source code or configuration after handover.'),

      S.h2('11. LIMITATION OF LIABILITY'),
      S.p('11.1 The aggregate liability of the Service Provider arising out of or in connection with this Agreement, whether in contract, tort, or otherwise, shall not exceed the total fees paid by the Client to the Service Provider under this Agreement, i.e. INR 7,50,000/-.'),
      S.p('11.2 Neither Party shall be liable to the other for any indirect, incidental, consequential, special, or punitive damages, including but not limited to loss of profits, loss of business, loss of data, or loss of goodwill.'),
      S.p('11.3 The limitations in this Clause 11 shall not apply to: (a) breaches of confidentiality; (b) gross negligence or wilful misconduct; (c) infringement of third-party intellectual property rights; (d) liability that cannot be excluded under applicable law.'),

      S.h2('12. INDEMNITY'),
      S.p('12.1 Each Party shall indemnify the other against any losses, damages, claims, or expenses arising from: (a) breach of confidentiality obligations; (b) infringement of third-party intellectual property rights attributable to that Party; (c) gross negligence or wilful misconduct.'),
      S.p('12.2 The indemnifying Party\u2019s liability under this clause shall be subject to the limitation in Clause 11.1, except in cases of fraud or wilful misconduct.'),

      S.h2('13. TERMINATION'),
      S.p('13.1 Either Party may terminate this Agreement by giving thirty (30) days prior written notice to the other Party.'),
      S.p('13.2 Either Party may terminate this Agreement immediately by written notice if: (a) the other Party commits a material breach and fails to cure such breach within fifteen (15) days of written notice; (b) the other Party becomes insolvent, enters into liquidation, or makes an assignment for the benefit of creditors.'),
      S.p('13.3 Upon termination: (a) the Client shall pay for all services rendered up to the date of termination; (b) the Service Provider shall hand over all completed deliverables and work-in-progress; (c) confidentiality obligations shall continue to apply.'),
      S.p('13.4 Token / advance payments are non-refundable, save in cases of termination by the Client for material breach by the Service Provider as per Clause 13.2(a).'),

      S.h2('14. FORCE MAJEURE'),
      S.p('Neither Party shall be liable for failure or delay in performance due to causes beyond its reasonable control, including but not limited to acts of God, war, terrorism, pandemics, government actions, internet/power failures of extended duration, natural disasters, or strikes. The affected Party shall notify the other within seven (7) days of becoming aware of such event.'),

      S.h2('15. GOVERNING LAW AND DISPUTE RESOLUTION'),
      S.p('15.1 This Agreement shall be governed by and construed in accordance with the laws of India.'),
      S.p('15.2 Any dispute, controversy, or claim arising out of or relating to this Agreement shall first be attempted to be resolved through good faith negotiations between authorised representatives of the Parties within thirty (30) days.'),
      S.p('15.3 If the dispute cannot be resolved through negotiation, it shall be referred to arbitration under the Arbitration and Conciliation Act, 1996 by a sole arbitrator mutually appointed by the Parties. The seat and venue of arbitration shall be Surat, Gujarat, and the language shall be English.'),
      S.p('15.4 Subject to Clause 15.3, the courts at Surat, Gujarat shall have exclusive jurisdiction.'),

      S.h2('16. GENERAL PROVISIONS'),
      S.p('16.1 Entire Agreement: This Agreement, together with its Annexures (SoW, NDA, DPA, Invoice), constitutes the entire understanding between the Parties and supersedes all prior agreements, communications, and understandings.'),
      S.p('16.2 Amendments: Any amendment shall be in writing and signed by authorised representatives of both Parties.'),
      S.p('16.3 Notices: All notices shall be in writing, sent by email with read receipt to the designated email IDs, with a copy by registered post to the registered office addresses.'),
      S.p('16.4 Assignment: Neither Party may assign its rights or obligations without prior written consent of the other Party.'),
      S.p('16.5 Severability: If any provision is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.'),
      S.p('16.6 Independent Contractor: The Service Provider is engaged as an independent contractor and nothing in this Agreement shall create an employer-employee, partnership, or joint venture relationship.'),
      S.p('16.7 Counterparts: This Agreement may be executed in counterparts (including electronic / scanned copies), each of which shall be deemed an original.'),

      S.spacer(280),
      S.h2('17. ANNEXURES'),
      S.p('The following documents form an integral part of this Agreement:'),
      S.bullet('Annexure A — Statement of Work (SoW) for MAMS'),
      S.bullet('Annexure B — Mutual Non-Disclosure Agreement (NDA)'),
      S.bullet('Annexure C — Data Processing Agreement (DPA)'),
      S.bullet('Annexure D — Token Invoice (50% Advance)'),

      S.spacer(360),
      S.p('IN WITNESS WHEREOF, the Parties hereto have caused this Agreement to be executed by their duly authorised representatives on the date first written above.', { bold: true }),
      S.spacer(360),
      S.esignNote(),
      S.signatureBlock(
        'For INFOLOOP TECHNOLOGIES LLP', 'Mr. Nimit Kaneria', 'Designated Partner & CEO',
        'For MAKSON PHARMACEUTICALS (INDIA) PRIVATE LIMITED', 'Mrs. Komal Makasana', 'CFO & Partner'
      ),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(require('path').join(__dirname, '..', 'final-docs', 'v2', '01_Master_Services_Agreement.docx'), buf);
  console.log('MSA created');
});
