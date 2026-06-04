// Shared module for MAMS internal technical documentation.
// Mirrors legal-docs/_shared.js layout, but uses Google Sans font and a
// "Technical Documentation" footer. Brand colors and helpers are identical
// so the document family looks coherent.

const fs = require('fs');
const path = require('path');
const { Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, BorderStyle, WidthType, ShadingType, HeadingLevel, LevelFormat, Header, Footer, PageNumber, ImageRun } = require('docx');

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
  codeBg: 'F1F5F9',
};

const FONT = 'Google Sans';
const FONT_MONO = 'Roboto Mono';

const PAGE = { width: 12240, height: 15840, margin: { top: 1620, right: 1080, bottom: 1080, left: 1080 } };
const CONTENT_WIDTH = 12240 - 2160;

const border = { style: BorderStyle.SINGLE, size: 4, color: COLORS.border };
const cellBorders = { top: border, bottom: border, left: border, right: border };

const styles = {
  default: { document: { run: { font: FONT, size: 20, color: COLORS.text } } },
  paragraphStyles: [
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 32, bold: true, color: COLORS.primaryDark, font: FONT },
      paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
    { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 26, bold: true, color: COLORS.primaryDark, font: FONT },
      paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 22, bold: true, color: COLORS.text, font: FONT },
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
  children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size, color: opts.color, break: opts.break, font: opts.mono ? FONT_MONO : FONT })]
});

const pRich = (runs, opts = {}) => new Paragraph({
  spacing: { after: opts.after ?? 120, before: opts.before ?? 0, line: 300 },
  alignment: opts.align ?? AlignmentType.LEFT,
  children: runs.map(r => typeof r === 'string' ? new TextRun({ text: r, font: FONT }) : new TextRun({ ...r, font: r.mono ? FONT_MONO : (r.font || FONT) }))
});

const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, font: FONT })] });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: FONT })] });
const h3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text, font: FONT })] });
const bullet = (text) => new Paragraph({ numbering: { reference: 'b1', level: 0 }, spacing: { after: 80, line: 300 }, children: [new TextRun({ text, font: FONT })] });
const num = (text) => new Paragraph({ numbering: { reference: 'n1', level: 0 }, spacing: { after: 80, line: 300 }, children: [new TextRun({ text, font: FONT })] });
const spacer = (after = 240) => new Paragraph({ spacing: { after }, children: [new TextRun({ text: '', font: FONT })] });

// Code block: monospace, light background, single-cell table for the box effect.
const codeBlock = (code) => {
  const lines = code.split('\n');
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: [new TableRow({
      children: [new TableCell({
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.borderLight },
          left: { style: BorderStyle.SINGLE, size: 16, color: COLORS.primary },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.borderLight },
          right: { style: BorderStyle.SINGLE, size: 4, color: COLORS.borderLight },
        },
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        shading: { fill: COLORS.codeBg, type: ShadingType.CLEAR },
        margins: { top: 140, bottom: 140, left: 200, right: 160 },
        children: lines.map(line => new Paragraph({
          spacing: { after: 0, line: 260 },
          children: [new TextRun({ text: line || ' ', font: FONT_MONO, size: 18, color: COLORS.text })]
        }))
      })]
    })]
  });
};

const cell = (content, opts = {}) => new TableCell({
  borders: cellBorders,
  width: { size: opts.width || 4680, type: WidthType.DXA },
  shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
  margins: { top: 120, bottom: 120, left: 160, right: 160 },
  children: Array.isArray(content) ? content : [new Paragraph({
    spacing: { after: 0, line: 280 },
    alignment: opts.align ?? AlignmentType.LEFT,
    children: [new TextRun({ text: String(content), bold: opts.bold, color: opts.color, size: opts.size, font: opts.mono ? FONT_MONO : FONT })]
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

// Callout box for notes / mockup links / warnings.
const callout = (label, body, color = COLORS.primary) => new Table({
  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
  columnWidths: [CONTENT_WIDTH],
  rows: [new TableRow({
    children: [new TableCell({
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: color },
        left: { style: BorderStyle.SINGLE, size: 24, color: color },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: color },
        right: { style: BorderStyle.SINGLE, size: 4, color: color },
      },
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      shading: { fill: COLORS.blueBg, type: ShadingType.CLEAR },
      margins: { top: 160, bottom: 160, left: 200, right: 200 },
      children: [
        new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: label, bold: true, color: color, size: 20, font: FONT })] }),
        new Paragraph({ spacing: { after: 0, line: 300 }, children: [new TextRun({ text: body, size: 20, color: COLORS.text, font: FONT })] })
      ]
    })]
  })]
});

const logoBuffer = fs.readFileSync(path.join(__dirname, 'assets', 'logo_full.png'));

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
          new TextRun({ text: title, size: 18, color: COLORS.text2, italics: true, font: FONT }),
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
      new TextRun({ text: 'MAMS Internal Technical Documentation  |  Infoloop Technologies LLP  |  Confidential  |  Page ', size: 14, color: COLORS.text3, font: FONT }),
      new TextRun({ children: [PageNumber.CURRENT], size: 14, color: COLORS.text3, font: FONT }),
      new TextRun({ text: ' of ', size: 14, color: COLORS.text3, font: FONT }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: COLORS.text3, font: FONT }),
    ]
  })]
});

const titleBlock = (title, subtitle) => [
  new Paragraph({
    spacing: { before: 360, after: 80 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: title, bold: true, size: 44, color: COLORS.primaryDark, font: FONT })]
  }),
  new Paragraph({
    spacing: { after: 120 },
    alignment: AlignmentType.CENTER,
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.accent, space: 4 } },
    children: [new TextRun({ text: '', size: 4, font: FONT })]
  }),
  subtitle ? new Paragraph({
    spacing: { after: 360 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: subtitle, size: 22, color: COLORS.text2, italics: true, font: FONT })]
  }) : null,
].filter(Boolean);

const mockupCallout = () => callout(
  'APPROVED MOCKUP REFERENCE',
  'The interactive UX prototype lives at https://makson-payroll-mockup.netlify.app — this is the visual and behavioural source of truth for Phase 1 build. Implementation should match the mockup unless this document explicitly says otherwise. Any deviation must be approved by the project lead.',
  COLORS.accentDark
);

module.exports = { COLORS, FONT, FONT_MONO, PAGE, CONTENT_WIDTH, styles, numbering, p, pRich, h1, h2, h3, bullet, num, spacer, codeBlock, cell, kvTable, dataTable, callout, mockupCallout, buildHeader, buildFooter, titleBlock };
