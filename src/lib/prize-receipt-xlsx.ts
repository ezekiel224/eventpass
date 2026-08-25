import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { prizeReceiptTemplateBase64 } from "@/lib/prize-receipt-template";

type ReceiptEvent = {
  name: string;
  prizeReceiptSubmitter: string | null;
  prizeReceiptExtension: string | null;
  prizeFundingSource: string | null;
};

type SignedPrize = {
  name: string;
  description: string | null;
  value: string | null;
  winnerName: string | null;
  acceptanceSignerName: string | null;
  acceptanceSapId: string | null;
  signatureDataUrl: string | null;
  acceptedAt: Date | null;
};

function xml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function cellPattern(reference: string) {
  return new RegExp(`(?:<c\\s+r="${reference}"[^>]*\\/>|<c\\s+r="${reference}"[^>]*>[\\s\\S]*?<\\/c>)`);
}

function replaceCell(sheet: string, reference: string, content: string, type?: string) {
  const pattern = cellPattern(reference);
  const existing = sheet.match(pattern)?.[0];
  if (!existing) throw new Error(`The approved prize receipt template is missing cell ${reference}.`);
  const style = existing.match(/\ss="([^"]+)"/)?.[1];
  return sheet.replace(pattern, `<c r="${reference}"${style ? ` s="${style}"` : ""}${type ? ` t="${type}"` : ""}>${content}</c>`);
}

function textCell(sheet: string, reference: string, value: string) {
  return replaceCell(sheet, reference, `<is><t xml:space="preserve">${xml(value)}</t></is>`, "inlineStr");
}

function numericCell(sheet: string, reference: string, value: number, formula?: string) {
  return replaceCell(sheet, reference, `${formula ? `<f>${xml(formula)}</f>` : ""}<v>${value}</v>`);
}

function excelDate(date: Date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000) + 25569;
}

function amount(value: string | null) {
  if (!value) return null;
  const parsed = Number(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function fundingText(source: string | null) {
  if (source === "SUPPLIER") return "[X] A supplier paid for the prize(s) listed     [ ] Insight paid for the prize(s) listed     [ ] Pay amount to PayCard";
  if (source === "PAYCARD") return "[ ] A supplier paid for the prize(s) listed     [ ] Insight paid for the prize(s) listed     [X] Pay amount to PayCard (must attach VP approval)";
  return "[ ] A supplier paid for the prize(s) listed     [X] Insight paid for the prize(s) listed     [ ] Pay amount to PayCard";
}

function fillSheet(templateSheet: string, event: ReceiptEvent, prizes: SignedPrize[], pageIndex: number, useFormControls: boolean) {
  let sheet = templateSheet;
  sheet = textCell(sheet, "B3", event.prizeReceiptSubmitter || "");
  sheet = textCell(sheet, "F3", event.prizeReceiptExtension || "");
  sheet = numericCell(sheet, "B4", excelDate(new Date()));
  if (!useFormControls) sheet = textCell(sheet, "A8", fundingText(event.prizeFundingSource));

  const pagePrizes = prizes.slice(pageIndex * 20, pageIndex * 20 + 20);
  for (let index = 0; index < 20; index += 1) {
    const row = index + 10;
    const prize = pagePrizes[index];
    if (!prize) {
      for (const column of ["A", "B", "C", "D", "E", "F", "G"]) sheet = textCell(sheet, `${column}${row}`, "");
      continue;
    }
    sheet = textCell(sheet, `A${row}`, prize.acceptanceSignerName || prize.winnerName || "");
    sheet = textCell(sheet, `B${row}`, prize.acceptanceSapId || "");
    sheet = textCell(sheet, `C${row}`, event.name);
    sheet = textCell(sheet, `D${row}`, prize.description ? `${prize.name} — ${prize.description}` : prize.name);
    const fairMarketValue = amount(prize.value);
    sheet = fairMarketValue === null ? textCell(sheet, `E${row}`, prize.value || "") : numericCell(sheet, `E${row}`, fairMarketValue);
    sheet = textCell(sheet, `F${row}`, "");
    sheet = prize.acceptedAt ? numericCell(sheet, `G${row}`, excelDate(prize.acceptedAt)) : textCell(sheet, `G${row}`, "");
  }
  sheet = numericCell(sheet, "E30", 0, "SUM(E10:E29)");
  return sheet;
}

function setCheckbox(xmlSource: string, checked: boolean) {
  const withoutChecked = xmlSource.replace(/\schecked="[^"]*"/, "");
  return checked ? withoutChecked.replace(" objectType=\"CheckBox\"", ' objectType="CheckBox" checked="Checked"') : withoutChecked;
}

function signatureDrawing(prizes: SignedPrize[], pageIndex: number, existingDrawing = "") {
  const pagePrizes = prizes.slice(pageIndex * 20, pageIndex * 20 + 20);
  let relationshipIndex = 1;
  const anchors: string[] = [];
  const relationships: string[] = [];
  const media: Array<{ name: string; data: Uint8Array<ArrayBuffer> }> = [];

  pagePrizes.forEach((prize, rowIndex) => {
    if (!prize.signatureDataUrl) return;
    const relId = `rId${relationshipIndex}`;
    const imageName = `signature-${pageIndex + 1}-${rowIndex + 1}.png`;
    const row = rowIndex + 9;
    anchors.push(`<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>5</xdr:col><xdr:colOff>95250</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>19050</xdr:rowOff></xdr:from><xdr:to><xdr:col>6</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row + 1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${2000 + rowIndex}" name="Employee Signature ${rowIndex + 1}"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>`);
    relationships.push(`<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${imageName}"/>`);
    media.push({ name: imageName, data: Uint8Array.from(Buffer.from(prize.signatureDataUrl.split(",")[1] || "", "base64")) });
    relationshipIndex += 1;
  });

  const drawing = existingDrawing
    ? existingDrawing.replace("<xdr:wsDr ", '<xdr:wsDr xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ').replace("</xdr:wsDr>", `${anchors.join("")}</xdr:wsDr>`)
    : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anchors.join("")}</xdr:wsDr>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships.join("")}</Relationships>`;
  return { drawing, rels, media };
}

function additionalSheet(templateSheet: string) {
  return templateSheet
    .replace(/<legacyDrawing\s+r:id="rId3"\s*\/>/, "")
    .replace(/<mc:AlternateContent[^>]*>[\s\S]*?<controls>[\s\S]*?<\/controls>[\s\S]*?<\/mc:AlternateContent>\s*<\/worksheet>/, "</worksheet>");
}

export function createPrizeReceiptWorkbook(event: ReceiptEvent, prizes: SignedPrize[]) {
  const files = unzipSync(new Uint8Array(Buffer.from(prizeReceiptTemplateBase64, "base64")));
  const templateSheet = strFromU8(files["xl/worksheets/sheet1.xml"]);
  const originalDrawing = strFromU8(files["xl/drawings/drawing1.xml"]);
  const sheetCount = Math.max(1, Math.ceil(prizes.length / 20));

  files["xl/worksheets/sheet1.xml"] = strToU8(fillSheet(templateSheet, event, prizes, 0, true));
  files["xl/ctrlProps/ctrlProp1.xml"] = strToU8(setCheckbox(strFromU8(files["xl/ctrlProps/ctrlProp1.xml"]), event.prizeFundingSource === "SUPPLIER"));
  files["xl/ctrlProps/ctrlProp2.xml"] = strToU8(setCheckbox(strFromU8(files["xl/ctrlProps/ctrlProp2.xml"]), event.prizeFundingSource === "INSIGHT"));
  files["xl/ctrlProps/ctrlProp3.xml"] = strToU8(setCheckbox(strFromU8(files["xl/ctrlProps/ctrlProp3.xml"]), event.prizeFundingSource === "PAYCARD"));

  const firstDrawing = signatureDrawing(prizes, 0, originalDrawing);
  files["xl/drawings/drawing1.xml"] = strToU8(firstDrawing.drawing);
  files["xl/drawings/_rels/drawing1.xml.rels"] = strToU8(firstDrawing.rels);
  firstDrawing.media.forEach((item) => { files[`xl/media/${item.name}`] = item.data; });

  let workbook = strFromU8(files["xl/workbook.xml"]);
  let workbookRels = strFromU8(files["xl/_rels/workbook.xml.rels"]);
  let contentTypes = strFromU8(files["[Content_Types].xml"]);
  if (!contentTypes.includes('Extension="png"')) contentTypes = contentTypes.replace("<Override ", '<Default Extension="png" ContentType="image/png"/><Override ');

  for (let pageIndex = 1; pageIndex < sheetCount; pageIndex += 1) {
    const sheetNumber = pageIndex + 1;
    const relationshipId = `rId${5 + pageIndex}`;
    const strippedSheet = additionalSheet(templateSheet);
    files[`xl/worksheets/sheet${sheetNumber}.xml`] = strToU8(fillSheet(strippedSheet, event, prizes, pageIndex, false));
    files[`xl/worksheets/_rels/sheet${sheetNumber}.xml.rels`] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/printerSettings" Target="../printerSettings/printerSettings1.bin"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${sheetNumber}.xml"/></Relationships>`);
    const drawing = signatureDrawing(prizes, pageIndex);
    files[`xl/drawings/drawing${sheetNumber}.xml`] = strToU8(drawing.drawing);
    files[`xl/drawings/_rels/drawing${sheetNumber}.xml.rels`] = strToU8(drawing.rels);
    drawing.media.forEach((item) => { files[`xl/media/${item.name}`] = item.data; });
    workbook = workbook.replace("</sheets>", `<sheet name="Receipt of Prize - Page ${sheetNumber}" sheetId="${sheetNumber}" r:id="${relationshipId}"/></sheets>`);
    workbookRels = workbookRels.replace("</Relationships>", `<Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sheetNumber}.xml"/></Relationships>`);
    contentTypes = contentTypes.replace("</Types>", `<Override PartName="/xl/worksheets/sheet${sheetNumber}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/drawings/drawing${sheetNumber}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>`);
  }

  files["xl/workbook.xml"] = strToU8(workbook);
  files["xl/_rels/workbook.xml.rels"] = strToU8(workbookRels);
  files["[Content_Types].xml"] = strToU8(contentTypes);
  return zipSync(files, { level: 6 });
}
