/**
 * 清洗表格单元格内容：统一管道符为空格、折叠连续空白与换行，避免破坏 Markdown 表格。
 * 供 fetchTrending 与 summary 共用，保证日表与汇总表展示一致。
 */
export function sanitizeTableCellDescription(text: string): string {
  return (text ?? "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
