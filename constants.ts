/** 日表列数：Repository | Description | Language | Stars | Forks | Built By | Current Period Stars */
export const DAILY_TABLE_COLUMN_COUNT = 7;

/** 汇总表最少需要的日表列数（前 4 列 + 至少 1 列即可输出），兼容 5/6/7 列日表 */
export const MIN_COLUMNS_FOR_SUMMARY = 5;

/** 日表表头，与 summary 汇总表前 7 列一致 */
export const DAILY_TABLE_HEADER =
  "| Repository | Description | Language | Stars | Forks | Built By | Current Period Stars |\n";

/** 日表分隔符 */
export const DAILY_TABLE_SEPARATOR =
  "|------------|-------------|----------|-------|-------|----------|---------------------|\n";

/** 汇总表表头：Repository | Description | Language | Stars (last appearance) | First Appearance Date | Days Active | Months Covered */
export const SUMMARY_TABLE_HEADER =
  "| Repository | Description | Language | Stars (last appearance) | First Appearance Date | Days Active | Months Covered |\n";

/** 汇总表分隔符 */
export const SUMMARY_TABLE_SEPARATOR =
  "|------------|-------------|----------|-------------------------|----------------------|-------------|----------------|\n";
