import fs from "fs";
import path from "path";
import {
  MIN_COLUMNS_FOR_PARSE,
  MIN_COLUMNS_FOR_SUMMARY,
  SUMMARY_TABLE_HEADER,
  SUMMARY_TABLE_SEPARATOR,
  TABLE_SEPARATOR_MARKER,
} from "./constants";
import type { RepoData, SummaryColumns } from "./types";
import { sanitizeTableCellDescription } from "./utils";

/** 解析并清洗表格行：一次 split，返回去掉首尾空列后的列数组，描述列已清洗；列数不足时返回 null */
function parseTableRow(row: string): string[] | null {
  const columns = row
    .split("|")
    .slice(1, -1)
    .map((col) => col.trim());
  if (columns.length < MIN_COLUMNS_FOR_PARSE) return null;
  const descColIndex = 2;
  if (columns[descColIndex] != null) {
    columns[descColIndex] = sanitizeTableCellDescription(columns[descColIndex]);
  }
  return columns;
}

/** 从解析后的列取前 4 列作为汇总表 [repo, desc, lang, stars]，不足补空串 */
function toSummaryColumns(columns: string[]): SummaryColumns {
  return [
    columns[0] ?? "",
    columns[1] ?? "",
    columns[2] ?? "",
    columns[3] ?? "",
  ];
}

function buildSummaryTable(sortedRepos: Array<[string, RepoData]>): string {
  const rows: string[] = [];
  for (const [, repoData] of sortedRepos) {
    if (!repoData.summaryColumns) continue;
    const { summaryColumns, firstAppearanceDate, totalDays, months } = repoData;
    const rowCells = [
      ...summaryColumns,
      firstAppearanceDate,
      String(totalDays),
      String(months.size),
    ];
    rows.push(`| ${rowCells.join(" | ")} |\n`);
  }
  return SUMMARY_TABLE_HEADER + SUMMARY_TABLE_SEPARATOR + rows.join("");
}

function summary(year?: string) {
  const currentDate = new Date();
  const currentYear = year ?? currentDate.getFullYear().toString();

  const inputDirectory = path.join(__dirname, "trending", currentYear, "daily"); // 日数据目录
  const outputDirectory = path.join(__dirname, "trending", currentYear, "summary"); // 汇总输出目录

  // 根输出目录在首次写入前创建；年份子目录在确有数据时再创建

  // 检查输入目录是否存在
  if (!fs.existsSync(inputDirectory)) {
    console.error(`Directory ${inputDirectory} does not exist.`);
    return;
  }

  const files = fs
    .readdirSync(inputDirectory)
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.md$/.test(file))
    .sort(); // 日数据文件名为 YYYY-MM-DD.md，按文件名排序

  // 用于存储去重数据
  const uniqueRepos: Record<string, RepoData> = {};

  for (const file of files) {
    // 日数据文件名为 YYYY-MM-DD.md
    const fileDateStr = file.split(".")[0]; // 提取 "YYYY-MM-DD"
    const fileYearMonth = fileDateStr.slice(0, 7); // 提取 "YYYY-MM"

    const filePath = path.join(inputDirectory, file);
    const content = fs.readFileSync(filePath, "utf-8");

    // 解析 Markdown 表格内容
    const lines = content.split("\n");

    // 查找表格开始位置（跳过表头和分隔符）
    const tableStartIndex = lines.findIndex((line) =>
      line.includes(TABLE_SEPARATOR_MARKER)
    );
    if (tableStartIndex === -1) {
      console.warn(`No table found in file ${file}, skipping.`);
      continue;
    }
    const dataStartIndex = tableStartIndex + 1;

    // 处理表格数据行：parseTableRow 一次 split，清洗描述列并返回列数组
    for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === "" || !line.includes("|")) continue;

      const columns = parseTableRow(line);
      if (!columns) continue;

      const repoIdentifier = columns[0];
      if (!repoIdentifier || repoIdentifier === "") continue;

      const data = uniqueRepos[repoIdentifier];
      if (!data) {
        uniqueRepos[repoIdentifier] = {
          firstAppearanceMonth: fileYearMonth,
          firstAppearanceDate: fileDateStr,
          latestDate: fileDateStr,
          summaryColumns:
            columns.length >= MIN_COLUMNS_FOR_SUMMARY
              ? toSummaryColumns(columns)
              : undefined,
          totalDays: 1,
          months: new Set([fileYearMonth]),
        };
      } else {
        data.months.add(fileYearMonth);
        data.totalDays++;
        // YYYY-MM-DD 可直接字符串比较，无需 new Date()
        if (fileDateStr > data.latestDate) {
          data.latestDate = fileDateStr;
          if (columns.length >= MIN_COLUMNS_FOR_SUMMARY) {
            data.summaryColumns = toSummaryColumns(columns);
          }
        }
      }
    }
  }

  // 无数据时不创建输出目录和文件
  const totalRepoCount = Object.keys(uniqueRepos).length;
  if (totalRepoCount === 0) {
    console.log(`当前年份 ${currentYear} 无汇总数据，跳过输出。`);
    return;
  }

  // 确保年份输出目录存在
  fs.mkdirSync(outputDirectory, { recursive: true });

  // 按首次出现月份升序排列，相同月份则按首次出现日期排序，最后按活跃天数降序排序
  const sortedRepos = Object.entries(uniqueRepos).sort((a, b) => {
    const monthA = a[1].firstAppearanceMonth;
    const monthB = b[1].firstAppearanceMonth;
    if (monthA !== monthB) {
      return monthA.localeCompare(monthB);
    }
    if (a[1].firstAppearanceDate !== b[1].firstAppearanceDate) {
      return a[1].firstAppearanceDate.localeCompare(b[1].firstAppearanceDate);
    }
    return b[1].totalDays - a[1].totalDays;
  });

  // 按月份分组（月度统计由 reposByMonth 推导，单一数据源）
  const reposByMonth = new Map<string, Array<[string, RepoData]>>();
  for (const entry of sortedRepos) {
    const monthKey = entry[1].firstAppearanceMonth;
    if (!reposByMonth.has(monthKey)) {
      reposByMonth.set(monthKey, []);
    }
    reposByMonth.get(monthKey)!.push(entry);
  }
  const monthlyTableRows = Array.from(reposByMonth.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, entries]) => `| ${month} | ${entries.length} |`);
  const monthlyTable =
    "| Month | First Appearance Count |\n" +
    "|-------|------------------------|\n" +
    monthlyTableRows.join("\n");

  // 生成当前年份的 Markdown 文件（年度汇总）
  const annualSections = [
    `# ${currentYear} Annual GitHub Trending Repositories Summary\n\n> Summary Date: ${currentDate.toLocaleDateString("en-US")}`,
    `## Statistics Overview\n\n- Total Repositories: ${totalRepoCount}\n- Summary Year: ${currentYear}`,
    "## Repository List\n\n" + buildSummaryTable(sortedRepos),
    "## Monthly Distribution Statistics\n\n" + monthlyTable,
  ];
  const markdownContent = annualSections.join("\n\n");

  const annualFilePath = path.join(outputDirectory, `${currentYear}-summary.md`);
  fs.writeFileSync(annualFilePath, markdownContent);
  console.log(`年度汇总文件 ${annualFilePath} 创建成功！`);

  // 生成月度汇总文件（reposByMonth 已在上面单遍循环中构建）
  for (const [yearMonth, monthRepos] of reposByMonth) {
    const [, month] = yearMonth.split("-");
    const monthFilePath = path.join(outputDirectory, `${currentYear}-${month}.md`);
    const monthTitle = `${currentYear}年${month}月 GitHub Trending 首次出现仓库汇总`;
    const monthSections = [
      `# ${monthTitle}\n\n> Summary Date: ${currentDate.toLocaleDateString("en-US")}`,
      `## Statistics Overview\n\n- First Appearance Count (本月): ${monthRepos.length}`,
      "## Repository List\n\n" + buildSummaryTable(monthRepos),
    ];
    const monthContent = monthSections.join("\n\n");
    fs.writeFileSync(monthFilePath, monthContent);
    console.log(`月度汇总文件 ${monthFilePath} 创建成功！`);
  }

  console.log(`共汇总了 ${totalRepoCount} 个仓库的数据`);
}

// 如果直接运行此文件，则执行汇总；支持传入年份参数，如 npx ts-node summary.ts 2025
if (require.main === module) {
  const yearArg = process.argv[2];
  summary(yearArg);
}

export { summary };
