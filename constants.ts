/** 日表列数：Repository | Description | Language | Stars | Forks | Built By | Current Period Stars */
export const DAILY_TABLE_COLUMN_COUNT = 7;

/** 解析日表行时至少需要的列数（至少 repo、desc、lang 才能入库参与去重与聚合） */
export const MIN_COLUMNS_FOR_PARSE = 3;

/** 汇总表展示所需的最少列数（前 4 列 repo/desc/lang/stars 齐全时才在汇总表中输出该行），兼容 5/6/7 列日表 */
export const MIN_COLUMNS_FOR_SUMMARY = 5;

/** 日表表头，与 summary 汇总表前 7 列一致 */
export const DAILY_TABLE_HEADER =
  "| Repository | Description | Language | Stars | Forks | Built By | Current Period Stars |\n";

/** 日表分隔符 */
export const DAILY_TABLE_SEPARATOR =
  "|------------|-------------|----------|-------|-------|----------|---------------------|\n";

/** 用于检测 Markdown 表格分隔符行的特征子串（与日表/汇总表分隔符一致） */
export const TABLE_SEPARATOR_MARKER = "|------------|";

/** 汇总表表头：Repository | Description | Language | Stars (last appearance) | First Appearance Date | Days Active | Months Covered */
export const SUMMARY_TABLE_HEADER =
  "| Repository | Description | Language | Stars (last appearance) | First Appearance Date | Days Active | Months Covered |\n";

/** 汇总表分隔符 */
export const SUMMARY_TABLE_SEPARATOR =
  "|------------|-------------|----------|-------------------------|----------------------|-------------|----------------|\n";
