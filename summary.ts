import fs from "fs";
import path from "path";
import type { RepoData } from "./types";

// 数据清洗函数：处理描述字段中的管道符
function cleanTableRow(row: string): string {
  const columns = row.split('|');
  if (columns.length < 3) return row;
  
  // 只清洗描述字段（通常是第3列，index=2），替换为短横线而非空格
  if (columns.length > 2) {
    columns[2] = columns[2].replace(/\|/g, '-');
  }
  
  return columns.join('|');
}

// 汇总表格表头与分隔符，供 buildSummaryTable 与文档生成复用
const SUMMARY_TABLE_HEADER =
  "| Repository | Description | Language | Stars | Forks | Built By | Current Period Stars | First Appearance Month | Days Active | Months Covered |\n";
const SUMMARY_TABLE_SEPARATOR =
  "|------------|-------------|----------|-------|-------|----------|---------------------|----------------------|-------------|----------------|\n";

function buildSummaryTable(sortedRepos: Array<[string, RepoData]>): string {
  const rows: string[] = [];
  for (const [, repoData] of sortedRepos) {
    const { line: repoLine, firstAppearanceMonth, totalDays, months } = repoData;
    const columns = repoLine
      .split("|")
      .slice(1, -1)
      .map((col) => col.trim());
    if (columns.length < 5) continue;
    const processedColumns = [...columns];
    while (processedColumns.length < 7) {
      processedColumns.splice(4, 0, "");
    }
    rows.push(`| ${processedColumns.join(" | ")} | ${firstAppearanceMonth} | ${totalDays} | ${months.size} |\n`);
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
    const fileYear = fileDateStr.slice(0, 4); // 提取 "YYYY"

    // 只处理当前年份的文件
    if (fileYear !== currentYear) continue;

    const filePath = path.join(inputDirectory, file);
    const content = fs.readFileSync(filePath, "utf-8");

    // 解析 Markdown 表格内容
    const lines = content.split("\n");

    // 查找表格开始位置（跳过表头和分隔符）
    const tableStartIndex = lines.findIndex((line) =>
      line.includes("|------------|")
    );
    if (tableStartIndex === -1) {
      console.warn(`No table found in file ${file}, skipping.`);
      continue;
    }
    const dataStartIndex = tableStartIndex + 1;

    // 处理表格数据行
    for (let i = dataStartIndex; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === "" || !line.includes("|")) continue; // 跳过空行和非表格行
        
        const columns = line.split("|").map(col => col.trim());
        if (columns.length < 3) continue; // 确保有足够的列
        
        // 提取仓库的唯一标识（第二列是仓库链接）
        const repoIdentifier = columns[1];
        if (!repoIdentifier || repoIdentifier === "") continue;
        
        // 数据清洗：处理描述字段中的管道符，防止破坏Markdown表格格式
        const cleanedLine = cleanTableRow(line);
        
        // 如果是第一次遇到这个仓库
        if (!uniqueRepos[repoIdentifier]) {
          uniqueRepos[repoIdentifier] = {
            firstAppearanceMonth: fileYearMonth,
            firstAppearanceDate: fileDateStr,
            latestDate: fileDateStr,
            line: cleanedLine,
            totalDays: 1,
            months: new Set([fileYearMonth])
          };
        } else {
          // 更新统计信息
          uniqueRepos[repoIdentifier].months.add(fileYearMonth);
          uniqueRepos[repoIdentifier].totalDays++;
          
          const currentDate = new Date(fileDateStr);
          const existingDate = new Date(uniqueRepos[repoIdentifier].latestDate);
          if (currentDate > existingDate) {
            uniqueRepos[repoIdentifier].latestDate = fileDateStr;
            uniqueRepos[repoIdentifier].line = cleanedLine;
          }
        }
    }
  }

  // 无数据时不创建输出目录和文件
  if (Object.keys(uniqueRepos).length === 0) {
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

  // 月度分布统计（年度汇总用）
  const monthlyStats: { [month: string]: number } = {};
  Object.values(uniqueRepos).forEach((repo) => {
    const month = repo.firstAppearanceMonth;
    monthlyStats[month] = (monthlyStats[month] || 0) + 1;
  });
  const monthlyTableRows = Object.keys(monthlyStats)
    .sort()
    .map((month) => `| ${month} | ${monthlyStats[month]} |`);
  const monthlyTable =
    "| Month | First Appearance Count |\n" +
    "|-------|------------------------|\n" +
    monthlyTableRows.join("\n");

  // 生成当前年份的 Markdown 文件（年度汇总）
  const annualSections = [
    `# ${currentYear} Annual GitHub Trending Repositories Summary\n\n> Summary Date: ${currentDate.toLocaleDateString("en-US")}`,
    `## Statistics Overview\n\n- Total Repositories: ${Object.keys(uniqueRepos).length}\n- Summary Year: ${currentYear}`,
    "## Repository List\n\n" + buildSummaryTable(sortedRepos),
    "## Monthly Distribution Statistics\n\n" + monthlyTable,
  ];
  const markdownContent = annualSections.join("\n\n");

  const annualFilePath = path.join(outputDirectory, `${currentYear}-summary.md`);
  fs.writeFileSync(annualFilePath, markdownContent);
  console.log(`年度汇总文件 ${annualFilePath} 创建成功！`);

  // 按 firstAppearanceMonth 分组，生成月度汇总文件
  const reposByMonth = new Map<string, Array<[string, RepoData]>>();
  for (const entry of sortedRepos) {
    const monthKey = entry[1].firstAppearanceMonth;
    if (!reposByMonth.has(monthKey)) {
      reposByMonth.set(monthKey, []);
    }
    reposByMonth.get(monthKey)!.push(entry);
  }

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

  console.log(`共汇总了 ${Object.keys(uniqueRepos).length} 个仓库的数据`);
}

// 如果直接运行此文件，则执行汇总；支持传入年份参数，如 npx ts-node summary.ts 2025
if (require.main === module) {
  const yearArg = process.argv[2];
  summary(yearArg);
}

export { summary };
