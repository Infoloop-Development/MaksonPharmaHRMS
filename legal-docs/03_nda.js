const fs = require('fs');
const { Document, Packer } = require('docx');
const S = require('./_shared.js');

const doc = new Document({
  styles: S.styles, numbering: S.numbering,
  sections: [{
    properties: { page: S.PAGE },
    headers: { default: S.buildHeader('Mutual Non-Disclosure Agreement') },
    footers: { default: S.buildFooter() },
    children: [
      ...S.titleBlock('MUTUAL NON-DISCLOSURE AGREEMENT', 'Annexure B to Master Services Agreement'),

      S.kvTable([
        ['NDA Reference', 'ITL/NDA/MAKSON/2026-04-001'],
        ['Effective Date', '29 April 2026'],
        ['Term', 'Three (3) years from Effective Date'],
        ['Document Version', 'v2 (revised post-review by Client)'],
      ]),
      S.spacer(280),

      S.h2('1. PARTIES'),
      S.pRich([
        { text: 'This Mutual Non-Disclosure Agreement (', bold: false },
        { text: '“NDA”', bold: true },
        { text: ') is entered into on 29 April 2026 between ' },
        { text: 'INFOLOOP TECHNOLOGIES LLP', bold: true, color: S.COLORS.primary },
        { text: ', having its office at Suite 1101, Rajhans Skylar, Udhna Magdalla Road, Surat 395007, Gujarat, India (GSTIN: 24AAKFI1283K1Z8) (' },
        { text: '“Infoloop”', bold: true },
        { text: ') AND ' },
        { text: 'MAKSON PHARMACEUTICALS (INDIA) PRIVATE LIMITED', bold: true, color: S.COLORS.primary },
        { text: ', a Private Limited Company having its registered office at 195, Rajkot Highway, Surendranagar, Wadhwancity, Gujarat 363020, India (CIN: U24231GJ1986PTC008718; GSTIN: 24AABCM2806L1ZM) (' },
        { text: '“Makson”', bold: true },
        { text: ').' },
      ]),
      S.spacer(120),
      S.p('Each Party may act as the Disclosing Party or the Receiving Party at different times during the Term of this NDA.'),

      S.h2('2. PURPOSE'),
      S.p('The Parties wish to explore and execute a business relationship in connection with the design, development, deployment, and support of the Makson Attendance Management System (MAMS) (the "Purpose"). In the course of this engagement, each Party may disclose to the other certain Confidential Information.'),

      S.h2('3. DEFINITION OF CONFIDENTIAL INFORMATION'),
      S.p('"Confidential Information" means any non-public, proprietary, or sensitive information disclosed by one Party to the other, in any form (oral, written, electronic, visual), including but not limited to:'),
      S.bullet('Business plans, strategies, financial information, pricing, and customer lists.'),
      S.bullet('Employee personal data including names, identifiers, biometric data, salary, bank account details, PAN, Aadhaar, PF and ESI numbers, and any other government-issued identifiers shared in the course of the engagement.'),
      S.bullet('Source code, algorithms, technical specifications, system architecture, database schemas.'),
      S.bullet('Operational processes, manufacturing methods, supplier and vendor information.'),
      S.bullet('Compliance and statutory data including labour records, factory licences, PF/ESI registrations.'),
      S.bullet('Any information marked as confidential or that a reasonable person would understand to be confidential given the nature of the information and the circumstances of disclosure.'),

      S.h2('4. EXCLUSIONS'),
      S.p('Confidential Information shall not include information that:'),
      S.bullet('Is or becomes publicly known through no fault of the Receiving Party.'),
      S.bullet('Was rightfully known to the Receiving Party prior to disclosure, without obligation of confidentiality.'),
      S.bullet('Is rightfully obtained from a third party without restriction.'),
      S.bullet('Is independently developed by the Receiving Party without use of or reference to the Confidential Information.'),
      S.bullet('Is required to be disclosed by law, court order, or governmental authority, provided the Receiving Party gives prompt notice to the Disclosing Party (where legally permissible) so that the Disclosing Party may seek a protective order.'),

      S.h2('5. OBLIGATIONS OF RECEIVING PARTY'),
      S.p('The Receiving Party shall:'),
      S.bullet('Use the Confidential Information solely for the Purpose and not for any other reason whatsoever.'),
      S.bullet('Not use any Confidential Information of the Disclosing Party — including data, screenshots, or any derived artefacts — for product demonstrations, marketing materials, case studies, sales pitches, training datasets, or any external presentation, except with the prior, specific, written consent of the Disclosing Party.'),
      S.bullet('Hold the Confidential Information in strict confidence and protect it with at least the same degree of care as it uses to protect its own confidential information of like nature, but in no event less than reasonable care.'),
      S.bullet('Not disclose Confidential Information to any third party without prior written consent of the Disclosing Party.'),
      S.bullet('Limit access to Confidential Information to those of its employees, agents, contractors, or representatives who have a need to know for the Purpose, and who are bound by confidentiality obligations no less restrictive than those contained herein.'),
      S.bullet('Not copy, reproduce, modify, reverse-engineer, decompile, or disassemble any Confidential Information except as necessary for the Purpose.'),
      S.bullet('Promptly notify the Disclosing Party of any unauthorised use or disclosure and reasonably cooperate to mitigate the consequences.'),

      S.h2('6. RETURN OR DESTRUCTION'),
      S.p('Upon written request by the Disclosing Party, or upon termination of the engagement, the Receiving Party shall, within thirty (30) days, return or securely destroy all Confidential Information in its possession or control, and certify such destruction in writing. The Receiving Party may retain one copy in its legal/compliance archives for the sole purpose of demonstrating compliance with this NDA, subject to continued confidentiality obligations.'),

      S.h2('7. NO LICENCE'),
      S.p('Nothing in this NDA shall be construed as granting any licence, ownership, or other rights in the Confidential Information beyond what is expressly set out herein. All Confidential Information remains the property of the Disclosing Party.'),

      S.h2('8. NO WARRANTY'),
      S.p('All Confidential Information is provided "as is" without warranty of any kind. Neither Party shall be liable for any errors or omissions in the Confidential Information.'),

      S.h2('9. TERM AND SURVIVAL'),
      S.p('9.1 This NDA shall remain in effect for a period of three (3) years from the Effective Date.'),
      S.p('9.2 Notwithstanding the above, the obligations of confidentiality with respect to information that constitutes a trade secret under applicable law shall continue in perpetuity for as long as such information remains a trade secret.'),
      S.p('9.3 Confidentiality obligations shall survive the termination or expiry of this NDA and any related engagement between the Parties.'),

      S.h2('10. REMEDIES'),
      S.p('10.1 The Parties acknowledge that breach of this NDA may cause irreparable harm for which monetary damages may be inadequate. Accordingly, the non-breaching Party shall be entitled to seek injunctive relief and other equitable remedies, in addition to any other remedies available in law or equity.'),
      S.p('10.2 The remedies in this Clause are cumulative and not exclusive.'),

      S.h2('11. GENERAL PROVISIONS'),
      S.p('11.1 Governing Law: This NDA shall be governed by the laws of India.'),
      S.p('11.2 Jurisdiction: The courts at Surat, Gujarat shall have exclusive jurisdiction over any dispute arising out of or in connection with this NDA.'),
      S.p('11.3 Entire Agreement: This NDA constitutes the entire understanding between the Parties on the subject matter and supersedes all prior agreements on confidentiality.'),
      S.p('11.4 Amendments: Any modification shall be in writing and signed by authorised representatives of both Parties.'),
      S.p('11.5 Severability: If any provision is held invalid, the remaining provisions shall continue in full force and effect.'),
      S.p('11.6 No Waiver: Failure to enforce any provision shall not constitute a waiver of that provision or any other.'),
      S.p('11.7 Counterparts: This NDA may be executed in counterparts (including scanned copies via email), each of which shall be deemed an original.'),

      S.spacer(360),
      S.p('IN WITNESS WHEREOF, the Parties have caused this Mutual Non-Disclosure Agreement to be executed by their duly authorised representatives on the date first written above.', { bold: true }),
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
  fs.writeFileSync(require('path').join(__dirname, '..', 'final-docs', 'v2', '03_Mutual_NDA.docx'), buf);
  console.log('NDA created');
});
