import type { Transaction } from './transaction';

const HEADERS = [
  '商品名称',
  '交易状态',
  '购入日期',
  '售出日期',
  '成交价',
  '购入成本',
  '运费',
  '总成本',
  '利润',
  'ROI',
  '持有天数',
  '排序',
  '备注',
];

function safeCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replaceAll('"', '""')}"`;
  return text;
}

function row(record: Transaction): unknown[] {
  return [
    record.title,
    record.status,
    record.purchaseDate,
    record.soldDate,
    record.salePrice,
    record.costPrice,
    record.shippingFee,
    record.totalCost,
    record.profit,
    record.roi,
    record.holdingDays,
    record.sortOrder,
    record.note,
  ];
}

export function buildCsv(records: Transaction[]): string {
  return `\uFEFF${[HEADERS, ...records.map(row)].map((values) => values.map(safeCell).join(',')).join('\r\n')}`;
}

function download(blob: Blob, filename: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function downloadCsv(records: Transaction[], filename: string) {
  download(new Blob([buildCsv(records)], { type: 'text/csv;charset=utf-8' }), filename);
}

export async function downloadExcel(records: Transaction[], filename: string) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('闲鱼交易明细');
  sheet.columns = HEADERS.map((header, index) => ({
    header,
    key: String(index),
    width: index === 0 ? 42 : index === 12 ? 30 : 14,
  }));
  records.forEach((record) =>
    sheet.addRow(
      row(record).map((value, index) => (index === 0 || index === 12 ? safeCell(value) : value)),
    ),
  );
  sheet.getRow(1).font = { bold: true };
  [5, 6, 7, 8, 9].forEach((column) => {
    sheet.getColumn(column).numFmt = '¥#,##0.00';
  });
  sheet.getColumn(10).numFmt = '0.00%';
  const buffer = await workbook.xlsx.writeBuffer();
  download(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename,
  );
}
