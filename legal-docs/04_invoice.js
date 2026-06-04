const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = require('docx');
const S = require('./_shared.js');

const doc = new Document({
  styles: S.styles, numbering: S.numbering,
  sections: [{
    properties: { page: S.PAGE },
    headers: { default: S.buildHeader('Proforma Invoice') },
    footers: { default: S.buildFooter() },
    children: [
      // Header band
      new Paragraph({
        spacing: { after: 80 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'PROFORMA INVOICE', bold: true, size: 44, color: S.COLORS.primary })]
      }),
      new Paragraph({
        spacing: { after: 360 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '(50% Token Payment for Project Kickoff \u2014 Advance Payment Request)', size: 22, color: S.COLORS.text2, italics: true })]
      }),

      // Invoice meta + bill to/from
      new (require('docx').Table)({
        width: { size: S.CONTENT_WIDTH, type: require('docx').WidthType.DXA },
        columnWidths: [Math.floor(S.CONTENT_WIDTH/2), Math.floor(S.CONTENT_WIDTH/2)],
        rows: [
          new (require('docx').TableRow)({
            children: [
              S.cell([
                new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'FROM (Service Provider)', bold: true, color: S.COLORS.primary, size: 20 })] }),
                new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'INFOLOOP TECHNOLOGIES LLP', bold: true, size: 22 })] }),
                new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: 'Suite 1101, Rajhans Skylar', size: 20 })] }),
                new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: 'Udhna Magdalla Road', size: 20 })] }),
                new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: 'Surat, Gujarat 395007', size: 20 })] }),
                new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'India', size: 20 })] }),
                new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: 'Email: Sales@infoloop.co', size: 20 })] }),
                new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: 'Phone: +91 97261 81000', size: 20 })] }),
                new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: 'GSTIN: 24AAKFI1283K1Z8', size: 18, color: S.COLORS.text2 })] }),
                new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: 'PAN: AAKFI1283K', size: 18, color: S.COLORS.text2 })] }),
              ], { width: Math.floor(S.CONTENT_WIDTH/2), fill: S.COLORS.lightBg }),
              S.cell([
                new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'BILL TO (Client)', bold: true, color: S.COLORS.primary, size: 20 })] }),
                new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'MAKSON PHARMACEUTICALS (INDIA) PRIVATE LIMITED', bold: true, size: 22 })] }),
                new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: '195, Rajkot Highway', size: 20 })] }),
                new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: 'Surendranagar, Wadhwancity', size: 20 })] }),
                new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: 'Gujarat 363020', size: 20 })] }),
                new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'India', size: 20 })] }),
                new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: 'Attn: Mrs. Komal Makasana', size: 20 })] }),
                new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: 'CIN: U24231GJ1986PTC008718', size: 18, color: S.COLORS.text2 })] }),
                new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: 'GSTIN: 24AABCM2806L1ZM', size: 18, color: S.COLORS.text2 })] }),
              ], { width: Math.floor(S.CONTENT_WIDTH/2), fill: S.COLORS.lightBg }),
            ]
          })
        ]
      }),
      S.spacer(280),

      S.kvTable([
        ['Proforma Invoice No.', 'ITL/PI/MAKSON/2026-04-001'],
        ['Issue Date', '20 April 2026'],
        ['Due Date', '27 April 2026 (within 7 business days)'],
        ['Project Reference', 'MAMS — Makson Attendance Management System'],
        ['MSA Reference', 'ITL/MSA/MAKSON/2026-04-001'],
        ['Place of Supply', 'Gujarat (State Code 24)'],
      ]),
      S.spacer(280),

      S.h2('LINE ITEMS'),
      S.dataTable(
        ['Sr.', 'Description', 'HSN/SAC', 'Amount (INR)'],
        [
          ['1', 'Token / Kickoff Payment — 50% advance for design, development & deployment of MAMS as per MSA & SoW dated 20 April 2026', '998314', '3,75,000.00'],
        ],
        [800, 7800, 1480, 2000]
      ),
      S.spacer(120),

      S.h2('TAX CALCULATION'),
      S.dataTable(
        ['Particulars', 'Rate', 'Amount (INR)'],
        [
          ['Taxable Value (Subtotal)', '—', '3,75,000.00'],
          ['CGST (intra-state, Gujarat to Gujarat)', '9%', '33,750.00'],
          ['SGST (intra-state, Gujarat to Gujarat)', '9%', '33,750.00'],
          ['IGST', '0%', '0.00'],
          ['', '', ''],
        ],
        [6500, 1900, 3680]
      ),
      S.spacer(120),

      // Total band
      new (require('docx').Table)({
        width: { size: S.CONTENT_WIDTH, type: require('docx').WidthType.DXA },
        columnWidths: [6500, 5580],
        rows: [
          new (require('docx').TableRow)({
            children: [
              S.cell('TOTAL AMOUNT PAYABLE', { width: 6500, fill: S.COLORS.primary, color: 'FFFFFF', bold: true }),
              S.cell('INR 4,42,500.00', { width: 5580, fill: S.COLORS.primary, color: 'FFFFFF', bold: true, align: AlignmentType.RIGHT }),
            ]
          })
        ]
      }),
      S.spacer(160),
      S.p('Amount in words: Indian Rupees Four Lakh Forty-Two Thousand Five Hundred Only.', { bold: true, italics: true }),
      S.spacer(280),

      S.h2('PAYMENT INSTRUCTIONS'),
      S.kvTable([
        ['Account Name', 'Infoloop Technologies LLP'],
        ['Account Type', 'Current Account'],
        ['Account Number', '50200084224282'],
        ['IFSC Code', 'HDFC0000067'],
        ['Bank Branch', 'HDFC Bank — Parle Point, Surat, Gujarat'],
        ['MMID', '9240884'],
        ['UPI / VPA', '9726181000@hdfcbank'],
      ]),
      S.spacer(280),

      S.h2('TERMS & CONDITIONS'),
      S.bullet('Payment is due within seven (7) business days from the proforma issue date.'),
      S.bullet('This is a Proforma Invoice issued for advance payment purposes; a Tax Invoice (with GST claimable for input credit) shall be issued upon receipt of the token payment.'),
      S.bullet('Project work shall commence upon receipt of this token payment and signed MSA + SoW + NDA + DPA.'),
      S.bullet('Late payment beyond fifteen (15) days from issue date shall attract simple interest at 1.5% per month, applicable from the Tax Invoice date.'),
      S.bullet('Token payment is non-refundable, except in cases of termination by Client for material breach by Service Provider as per MSA Clause 13.2(a).'),
      S.bullet('GST shall be charged as per the prevailing rate (18%) under SAC code 998314 (IT design and development services) on the corresponding Tax Invoice.'),
      S.bullet('Subject to Surat jurisdiction.'),

      S.spacer(360),
      S.p('This is a Proforma Invoice and is NOT a Tax Invoice under the Goods and Services Tax (GST) Act, 2017. It is issued solely for the purpose of requesting advance payment. A valid Tax Invoice shall be issued by Infoloop Technologies LLP upon receipt of the payment, against which the Client may claim input tax credit (ITC) as per applicable GST law.', { italics: true, size: 18, color: S.COLORS.text2 }),
      S.spacer(160),
      S.p('Electronically generated by Infoloop Technologies LLP. This is a computer-generated proforma invoice and does not require a physical signature, but has been signed below for authentication.', { italics: true, size: 18, color: S.COLORS.text3 }),
      S.spacer(280),

      // Single signature for invoice with e-sign space
      new (require('docx').Table)({
        width: { size: S.CONTENT_WIDTH, type: require('docx').WidthType.DXA },
        columnWidths: [Math.floor(S.CONTENT_WIDTH/2), Math.floor(S.CONTENT_WIDTH/2)],
        rows: [
          new (require('docx').TableRow)({
            children: [
              S.cell([new Paragraph({ children: [new TextRun({ text: '' })] })], { width: Math.floor(S.CONTENT_WIDTH/2) }),
              S.cell([
                new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'For INFOLOOP TECHNOLOGIES LLP', bold: true, color: S.COLORS.primaryDark, size: 18 })] }),
                new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: 'Signature:', size: 18, color: S.COLORS.text2, bold: true })] }),
                new (require('docx').Table)({
                  width: { size: 4500, type: require('docx').WidthType.DXA },
                  columnWidths: [4500],
                  rows: [new (require('docx').TableRow)({
                    height: { value: 1100, rule: 'atLeast' },
                    children: [new (require('docx').TableCell)({
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 8, color: S.COLORS.borderLight },
                        left: { style: BorderStyle.SINGLE, size: 8, color: S.COLORS.borderLight },
                        bottom: { style: BorderStyle.SINGLE, size: 8, color: S.COLORS.borderLight },
                        right: { style: BorderStyle.SINGLE, size: 8, color: S.COLORS.borderLight },
                      },
                      width: { size: 4500, type: require('docx').WidthType.DXA },
                      margins: { top: 80, bottom: 80, left: 100, right: 100 },
                      children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: '' })] })]
                    })]
                  })]
                }),
                new Paragraph({ spacing: { after: 40, before: 120 }, children: [
                  new TextRun({ text: 'Name: ', size: 18, color: S.COLORS.text2, bold: true }),
                  new TextRun({ text: 'Mr. Nimit Kaneria', size: 20, color: S.COLORS.text, bold: true })
                ]}),
                new Paragraph({ spacing: { after: 40 }, children: [
                  new TextRun({ text: 'Designation: ', size: 18, color: S.COLORS.text2, bold: true }),
                  new TextRun({ text: 'Designated Partner & CEO (Authorised Signatory)', size: 18, color: S.COLORS.text })
                ]}),
                new Paragraph({ spacing: { after: 40 }, children: [
                  new TextRun({ text: 'Date: ', size: 18, color: S.COLORS.text2, bold: true }),
                  new TextRun({ text: '_____________________', size: 18, color: S.COLORS.text3 })
                ]}),
              ], { width: Math.floor(S.CONTENT_WIDTH/2) }),
            ]
          })
        ]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/home/claude/docs/04_Token_Invoice.docx', buf);
  console.log('Invoice created');
});
