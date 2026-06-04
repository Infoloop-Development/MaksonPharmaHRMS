const fs = require('fs');
const { Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, BorderStyle, WidthType, ShadingType, HeadingLevel, LevelFormat, Header, Footer, PageNumber, ImageRun } = require('docx');

// INFOLOOP BRAND COLORS
const COLORS = {
  primary: '1D5DBF',
  primaryDark: '1D5DBF',
  navy: '030B18',
  accent: '7AC142',
  accentDark: '5A9931',
  text: '030B18',
  text2: '4e5d78',
  text3: '8492a6',
  border: 'CCCCCC',
  borderLight: 'E2E6ED',
  lightBg: 'F8FAFC',
  blueBg: 'EFF3FB',
  greenBg: 'A8D362',
};

const PAGE = { width: 12240, height: 15840, margin: { top: 1620, right: 1080, bottom: 1080, left: 1080 } };
const CONTENT_WIDTH = 12240 - 2160;

const border = { style: BorderStyle.SINGLE, size: 4, color: COLORS.border };
const cellBorders = { top: border, bottom: border, left: border, right: border };

const styles = {
  default: { document: { run: { font: 'Calibri', size: 20, color: COLORS.text } } },
  paragraphStyles: [
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 32, bold: true, color: COLORS.primaryDark, font: 'Calibri' },
      paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
    { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 26, bold: true, color: COLORS.primaryDark, font: 'Calibri' },
      paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 22, bold: true, color: COLORS.text, font: 'Calibri' },
      paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 } },
  ]
};

const numbering = {
  config: [
    { reference: 'b1', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    { reference: 'n1', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
  ]
};

const p = (text, opts = {}) => new Paragraph({
  spacing: { after: opts.after ?? 120, before: opts.before ?? 0, line: 300 },
  alignment: opts.align ?? AlignmentType.LEFT,
  children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size, color: opts.color, break: opts.break })]
});

const pRich = (runs, opts = {}) => new Paragraph({
  spacing: { after: opts.after ?? 120, before: opts.before ?? 0, line: 300 },
  alignment: opts.align ?? AlignmentType.LEFT,
  children: runs.map(r => typeof r === 'string' ? new TextRun({ text: r }) : new TextRun(r))
});

const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
const h3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(text)] });
const bullet = (text) => new Paragraph({ numbering: { reference: 'b1', level: 0 }, spacing: { after: 80, line: 300 }, children: [new TextRun(text)] });
const num = (text) => new Paragraph({ numbering: { reference: 'n1', level: 0 }, spacing: { after: 80, line: 300 }, children: [new TextRun(text)] });
const spacer = (after = 240) => new Paragraph({ spacing: { after }, children: [new TextRun('')] });

const cell = (content, opts = {}) => new TableCell({
  borders: cellBorders,
  width: { size: opts.width || 4680, type: WidthType.DXA },
  shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
  margins: { top: 120, bottom: 120, left: 160, right: 160 },
  children: Array.isArray(content) ? content : [new Paragraph({
    spacing: { after: 0, line: 280 },
    alignment: opts.align ?? AlignmentType.LEFT,
    children: [new TextRun({ text: String(content), bold: opts.bold, color: opts.color, size: opts.size })]
  })]
});

const kvTable = (rows, leftWidth = 3000) => {
  const rightWidth = CONTENT_WIDTH - leftWidth;
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [leftWidth, rightWidth],
    rows: rows.map(([k, v]) => new TableRow({
      children: [
        cell(k, { width: leftWidth, fill: COLORS.lightBg, bold: true, color: COLORS.primaryDark }),
        cell(v, { width: rightWidth })
      ]
    }))
  });
};

const dataTable = (headers, rows, widths) => {
  const colWidths = widths || headers.map(() => Math.floor(CONTENT_WIDTH / headers.length));
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => cell(h, { width: colWidths[i], fill: COLORS.primaryDark, color: 'FFFFFF', bold: true }))
      }),
      ...rows.map((r, ri) => new TableRow({
        children: r.map((c, i) => cell(c, { width: colWidths[i], fill: ri % 2 === 1 ? COLORS.lightBg : undefined }))
      }))
    ]
  });
};

const signatureBlock = (leftLabel, leftName, leftRole, rightLabel, rightName, rightRole) => {
  const halfWidth = Math.floor(CONTENT_WIDTH/2);
  const sigBoxBorders = {
    top: { style: BorderStyle.SINGLE, size: 8, color: COLORS.borderLight },
    left: { style: BorderStyle.SINGLE, size: 8, color: COLORS.borderLight },
    bottom: { style: BorderStyle.SINGLE, size: 8, color: COLORS.borderLight },
    right: { style: BorderStyle.SINGLE, size: 8, color: COLORS.borderLight },
  };
  // Build a 1x1 sub-table for signature box (clean blank space)
  const sigBox = (innerWidth) => new Table({
    width: { size: innerWidth, type: WidthType.DXA },
    columnWidths: [innerWidth],
    rows: [new TableRow({
      height: { value: 1100, rule: 'atLeast' },
      children: [new TableCell({
        borders: sigBoxBorders,
        width: { size: innerWidth, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: '' })] })]
      })]
    })]
  });
  const buildSig = (label, name, role, innerWidth) => [
    new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: label, bold: true, color: COLORS.primaryDark, size: 18 })] }),
    new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: 'Signature:', size: 18, color: COLORS.text2, bold: true })] }),
    sigBox(innerWidth),
    new Paragraph({ spacing: { after: 40, before: 120 }, children: [
      new TextRun({ text: 'Name: ', size: 18, color: COLORS.text2, bold: true }),
      new TextRun({ text: name, size: 20, color: COLORS.text, bold: true })
    ]}),
    new Paragraph({ spacing: { after: 40 }, children: [
      new TextRun({ text: 'Designation: ', size: 18, color: COLORS.text2, bold: true }),
      new TextRun({ text: role, size: 18, color: COLORS.text })
    ]}),
    new Paragraph({ spacing: { after: 40 }, children: [
      new TextRun({ text: 'Date: ', size: 18, color: COLORS.text2, bold: true }),
      new TextRun({ text: '_____________________', size: 18, color: COLORS.text3 })
    ]}),
    new Paragraph({ spacing: { after: 40 }, children: [
      new TextRun({ text: 'Place: ', size: 18, color: COLORS.text2, bold: true }),
      new TextRun({ text: '_____________________', size: 18, color: COLORS.text3 })
    ]}),
  ];
  // Inner width = half - cell padding - some buffer
  const innerW = halfWidth - 600;
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [halfWidth, halfWidth],
    rows: [
      new TableRow({
        children: [
          cell(buildSig(leftLabel, leftName, leftRole, innerW), { width: halfWidth }),
          cell(buildSig(rightLabel, rightName, rightRole, innerW), { width: halfWidth }),
        ]
      })
    ]
  });
};

const logoBuffer = fs.readFileSync(require('path').join(__dirname, 'assets', 'logo_full.png'));

const buildHeader = (title) => {
  return new Header({
    children: [
      new Paragraph({
        spacing: { after: 60 },
        alignment: AlignmentType.LEFT,
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: { width: 130, height: 65 },
            type: 'png',
          })
        ]
      }),
      new Paragraph({
        spacing: { after: 0 },
        alignment: AlignmentType.RIGHT,
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: COLORS.primary, space: 4 } },
        children: [
          new TextRun({ text: title, size: 18, color: COLORS.text2, italics: true }),
        ]
      })
    ]
  });
};

const buildFooter = () => new Footer({
  children: [new Paragraph({
    spacing: { before: 60 },
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.borderLight, space: 4 } },
    children: [
      new TextRun({ text: 'Confidential  |  Infoloop Technologies LLP  |  Suite 1101, Rajhans Skylar, Udhna Magdalla Rd, Surat 395007  |  GSTIN: 24AAKFI1283K1Z8  |  Page ', size: 14, color: COLORS.text3 }),
      new TextRun({ children: [PageNumber.CURRENT], size: 14, color: COLORS.text3 }),
      new TextRun({ text: ' of ', size: 14, color: COLORS.text3 }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: COLORS.text3 }),
    ]
  })]
});

const titleBlock = (title, subtitle) => [
  new Paragraph({
    spacing: { before: 360, after: 80 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: title, bold: true, size: 44, color: COLORS.primaryDark })]
  }),
  new Paragraph({
    spacing: { after: 120 },
    alignment: AlignmentType.CENTER,
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.accent, space: 4 } },
    children: [new TextRun({ text: '', size: 4 })]
  }),
  subtitle ? new Paragraph({
    spacing: { after: 360 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: subtitle, size: 22, color: COLORS.text2, italics: true })]
  }) : null,
].filter(Boolean);

const esignNote = () => new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: [CONTENT_WIDTH],
  rows: [new TableRow({
    children: [new TableCell({
      borders: {
        top: { style: BorderStyle.SINGLE, size: 16, color: COLORS.accentDark },
        left: { style: BorderStyle.SINGLE, size: 24, color: COLORS.accentDark },
        bottom: { style: BorderStyle.SINGLE, size: 16, color: COLORS.accentDark },
        right: { style: BorderStyle.SINGLE, size: 4, color: COLORS.accentDark },
      },
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
      margins: { top: 180, bottom: 180, left: 240, right: 200 },
      children: [new Paragraph({
        spacing: { after: 0, line: 300 },
        children: [
          new TextRun({ text: 'E-SIGNATURE INSTRUCTIONS:  ', bold: true, color: COLORS.accentDark, size: 20 }),
          new TextRun({ text: 'This document may be signed electronically. To e-sign, click inside the signature box below and insert your signature image (Insert → Pictures), or use any e-signing platform such as DocuSign, Adobe Sign, Zoho Sign, or Drop Sign. A scanned wet signature pasted into the signature box is equally valid. Both Parties agree that electronic signatures shall have the same legal effect as physical signatures under the Information Technology Act, 2000.', size: 18, color: COLORS.text }),
        ]
      })]
    })]
  })]
});

module.exports = { COLORS, PAGE, CONTENT_WIDTH, styles, numbering, p, pRich, h1, h2, h3, bullet, num, spacer, cell, kvTable, dataTable, signatureBlock, esignNote, buildHeader, buildFooter, titleBlock };
