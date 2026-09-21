import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const output = join(dirname(fileURLToPath(import.meta.url)), "dummy-electrical-ze15-rueil.pdf");

const pdf = await PDFDocument.create();
pdf.setTitle("Electrical Installation Certificate - ZE15 Rueil");
pdf.setAuthor("Demo Issuer Co");
pdf.setSubject("Dummy electrical certificate for platform testing");
pdf.setCreator("BLDCRT");

const page = pdf.addPage([595.28, 841.89]);
const regular = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
const ink = rgb(0.12, 0.18, 0.28);
const muted = rgb(0.35, 0.4, 0.45);
const paper = rgb(0.93, 0.95, 0.97);
const gold = rgb(0.95, 0.78, 0.22);
const green = rgb(0.16, 0.45, 0.28);
const white = rgb(1, 1, 1);

function draw(text, x, y, size, font = regular, color = ink) {
  page.drawText(text, { x, y, size, font, color });
}

page.drawRectangle({ x: 0, y: 742, width: 595.28, height: 100, color: ink });
page.drawRectangle({ x: 0, y: 734, width: 595.28, height: 8, color: gold });
draw("BLDCRT  |  DUMMY REPORT  |  NOT AN OFFICIAL DOCUMENT", 48, 802, 11, bold, white);
draw("Electrical Installation Certificate", 48, 770, 22, bold, white);
draw("Sample certificate for platform testing", 48, 748, 11, regular, white);

page.drawRectangle({
  x: 48,
  y: 548,
  width: 499,
  height: 168,
  color: paper,
  borderColor: rgb(0.75, 0.8, 0.86),
  borderWidth: 1.2,
});
draw("BUILDING", 64, 688, 10, bold, muted);
draw("ZE15 Rueil", 64, 668, 16, bold);
draw("CERTIFICATE NO.", 320, 688, 10, bold, muted);
draw("ELC-DUMMY-ZE15-2026", 320, 668, 13, regular);
draw("POSTAL ADDRESS", 64, 636, 10, bold, muted);
draw("34 test street", 64, 616, 13, regular);
draw("762536 City", 64, 598, 13, regular);
draw("COUNTRY", 320, 636, 10, bold, muted);
draw("FR", 320, 616, 13, regular);

draw("Inspection summary", 48, 510, 13, bold);
draw("Installation type: Low-voltage residential / mixed-use building", 48, 486, 11);
draw("Nominal voltage: 230/400 V  |  Frequency: 50 Hz", 48, 468, 11);
draw("Earthing system: TT  |  Main protective device: 40 A / 30 mA RCD", 48, 450, 11);
draw("Scope: Incoming supply, main board, circuits, and equipotential bonding", 48, 432, 11);

page.drawRectangle({ x: 48, y: 372, width: 176, height: 28, color: green });
draw("RESULT: SATISFACTORY", 58, 381, 11, bold, white);
draw("Issued: 20 September 2026", 240, 390, 11);
draw("Valid until: 20 September 2031", 240, 372, 11);

draw("Findings", 48, 330, 13, bold);
draw("1. Main switchgear labelled and accessible.", 48, 306, 11);
draw("2. RCD trip time within 40 ms at rated residual current.", 48, 288, 11);
draw("3. Insulation resistance above 1 megohm on tested circuits.", 48, 270, 11);
draw("4. Protective bonding present at water and gas services.", 48, 252, 11);
draw("5. No dangerous defects recorded. Dummy observations only.", 48, 234, 11);

draw("Issued by", 48, 196, 13, bold);
draw("Demo Issuer Co  |  Accreditation 001  |  Inspector: A. Sample", 48, 172, 11);
draw("This PDF is a placeholder for hashing and upload tests. It has no legal value.", 48, 154, 11, regular, muted);
draw("Building certificate platform  |  Electrical component  |  Dummy file", 48, 48, 9, regular, muted);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, await pdf.save());
console.log(output);
