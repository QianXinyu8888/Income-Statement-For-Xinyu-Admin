import type { Transaction } from './transaction';

const HEADERS = [
  '商品名称',
  '分类',
  '售价',
  '成本',
  '运费',
  '利润',
  '利润率',
  '状态',
  '日期',
  '备注',
];

function safeCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function buildCsv(records: Transaction[]): string {
  const rows = records.map((record) => [
    record.title,
    record.category,
    record.salePrice,
    record.costPrice,
    record.shippingFee,
    record.profit,
    record.profitRate === null ? '' : `${(record.profitRate * 100).toFixed(2)}%`,
    record.status,
    record.transactionDate,
    record.note,
  ]);
  return `\uFEFF${[HEADERS, ...rows].map((row) => row.map(safeCell).join(',')).join('\r\n')}`;
}

export function downloadCsv(records: Transaction[], filename: string) {
  const blob = new Blob([buildCsv(records)], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function downloadExcel(records: Transaction[], filename: string) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('交易明细');
  sheet.columns = HEADERS.map((header, index) => ({
    header,
    key: String(index),
    width: index === 0 ? 28 : index === 9 ? 30 : 14,
  }));
  records.forEach((record) => {
    sheet.addRow([
      safeCell(record.title),
      safeCell(record.category),
      record.salePrice,
      record.costPrice,
      record.shippingFee,
      record.profit,
      record.profitRate,
      record.status,
      record.transactionDate,
      safeCell(record.note),
    ]);
  });
  sheet.getRow(1).font = { bold: true };
  sheet.getColumn(3).numFmt = '¥#,##0.00';
  sheet.getColumn(4).numFmt = '¥#,##0.00';
  sheet.getColumn(5).numFmt = '¥#,##0.00';
  sheet.getColumn(6).numFmt = '¥#,##0.00';
  sheet.getColumn(7).numFmt = '0.00%';
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
