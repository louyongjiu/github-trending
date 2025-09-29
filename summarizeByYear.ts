import fs from "fs";
import path from "path";

function summarizeByYear() {
  // 获取当前时间的年份
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear().toString();

  const inputDirectory = path.join(__dirname, "trending", currentYear); // 输入目录
  const outputDirectory = path.join(__dirname, "yearly-summaries"); // 年度汇总输出目录

  // 如果输出目录不存在，则创建
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory);
  }

  // 检查输入目录是否存在
  if (!fs.existsSync(inputDirectory)) {
    console.error(`Directory ${inputDirectory} does not exist.`);
    return;
  }

  const files = fs
    .readdirSync(inputDirectory)
    .filter((file) => file.endsWith(".md"))
    .sort(); // 按文件名排序，确保按时间顺序处理

  // 用于存储去重数据
  const uniqueRepos: {
    [key: string]: {
      firstAppearanceMonth: string;
      firstAppearanceDate: string;
      latestDate: string;
      line: string;
      totalDays: number;
      months: Set<string>;
    };
  } = {};

  files.forEach((file) => {
    // 提取文件名中的日期部分（格式为 "trending-YYYY-MM-DD.md"）
    const fileDateStr = file.split(".")[0].split("-").slice(1).join("-"); // 提取 "YYYY-MM-DD"
    const fileYearMonth = fileDateStr.slice(0, 7); // 提取 "YYYY-MM"
    const fileYear = fileDateStr.slice(0, 4); // 提取 "YYYY"

    // 只处理当前年份的文件
    if (fileYear === currentYear) {
      const filePath = path.join(inputDirectory, file);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`File ${filePath} does not exist, skipping.`);
        return;
      }

      const content = fs.readFileSync(filePath, "utf-8");

      // 解析 Markdown 表格内容
      const lines = content.split("\n");
      
      // 查找表格开始位置（跳过表头和分隔符）
      let tableStartIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("|------------|")) {
          tableStartIndex = i + 1;
          break;
        }
      }
      
      if (tableStartIndex === -1) {
        console.warn(`No table found in file ${file}, skipping.`);
        return;
      }

      // 处理表格数据行
      for (let i = tableStartIndex; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === "" || !line.includes("|")) continue; // 跳过空行和非表格行
        
        const columns = line.split("|").map(col => col.trim());
        if (columns.length < 3) continue; // 确保有足够的列
        
        // 提取仓库的唯一标识（第二列是仓库链接）
        const repoIdentifier = columns[1];
        if (!repoIdentifier || repoIdentifier === "") continue;
        
        // 如果是第一次遇到这个仓库
        if (!uniqueRepos[repoIdentifier]) {
          uniqueRepos[repoIdentifier] = {
            firstAppearanceMonth: fileYearMonth,
            firstAppearanceDate: fileDateStr,
            latestDate: fileDateStr,
            line: line,
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
            uniqueRepos[repoIdentifier].line = line;
          }
        }
      }
    }
  });

  // 生成当前年份的 Markdown 文件
  let markdownContent = `# ${currentYear} Annual GitHub Trending Repositories Summary\n\n`;
  markdownContent += `> Summary Date: ${currentDate.toLocaleDateString('en-US')}\n\n`;
  markdownContent += `## Statistics Overview\n\n`;
  markdownContent += `- Total Repositories: ${Object.keys(uniqueRepos).length}\n`;
  markdownContent += `- Summary Year: ${currentYear}\n\n`;
  markdownContent += "## Repository List\n\n";
  markdownContent += "| Repository | Description | Language | Stars | Forks | Built By | Current Period Stars | First Appearance Month | Days Active | Months Covered |\n";
  markdownContent += "|------------|-------------|----------|-------|-------|----------|---------------------|----------------------|-------------|----------------|\n";

  // 按首次出现月份升序排列
  const sortedRepos = Object.entries(uniqueRepos).sort((a, b) => {
    const monthA = a[1].firstAppearanceMonth;
    const monthB = b[1].firstAppearanceMonth;
    if (monthA !== monthB) {
      return monthA.localeCompare(monthB);
    }
    // 如果月份相同，按首次出现日期排序
    return a[1].firstAppearanceDate.localeCompare(b[1].firstAppearanceDate);
  });

  sortedRepos.forEach(([repoIdentifier, repoData]) => {
    const { line: repoLine, firstAppearanceMonth, totalDays, months } = repoData;
    const columns = repoLine
      .split("|")
      .slice(1, -1)
      .map((col) => col.trim());
    
    if (columns.length < 7) return;

    // 格式化首次出现月份显示
    const formattedMonth = firstAppearanceMonth; // 保持 YYYY-MM 格式
    
    markdownContent += `| ${columns.join(" | ")} | ${formattedMonth} | ${totalDays} | ${months.size} |\n`;
  });

  // 添加月度统计信息
  markdownContent += "\n## Monthly Distribution Statistics\n\n";
  const monthlyStats: { [month: string]: number } = {};
  
  Object.values(uniqueRepos).forEach(repo => {
    const month = repo.firstAppearanceMonth;
    monthlyStats[month] = (monthlyStats[month] || 0) + 1;
  });

  markdownContent += "| Month | First Appearance Count |\n";
  markdownContent += "|-------|------------------------|\n";
  
  Object.keys(monthlyStats)
    .sort()
    .forEach(month => {
      markdownContent += `| ${month} | ${monthlyStats[month]} |\n`;
    });

  const fileName = path.join(outputDirectory, `${currentYear}.md`);
  fs.writeFileSync(fileName, markdownContent);
  console.log(`年度汇总文件 ${fileName} 创建成功！`);
  console.log(`共汇总了 ${Object.keys(uniqueRepos).length} 个仓库的数据`);
}

// 如果直接运行此文件，则执行汇总
if (require.main === module) {
  summarizeByYear();
}

export { summarizeByYear };