import fs from "fs";
import path from "path";

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

function summarizeByMonth() {
  // 获取当前时间的年月
  const currentDate = new Date();
  const currentYearMonth = currentDate.toISOString().slice(0, 7); // 格式为 "YYYY-MM"
  const currentYear = currentYearMonth.slice(0, 4);

  const inputDirectory = path.join(__dirname, "trending", currentYear); // 输入目录
  const outputDirectory = path.join(__dirname, "monthly-summaries", currentYear); // 按年份组织输出目录

  // 如果输出目录不存在，则递归创建
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
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
    [key: string]: { dates: Set<string>; latestDate: string; line: string };
  } = {};

  // 生成当月日期列表
  const tempDate = new Date(currentYearMonth + "-01");
  const lastDay = new Date(
    tempDate.getFullYear(),
    tempDate.getMonth() + 1,
    0
  ).getDate();
  const dayHeaders = Array.from({ length: lastDay }, (_, i) =>
    (i + 1).toString().padStart(2, "0")
  );

  files.forEach((file) => {
    // 提取文件名中的日期部分（格式为 "trending-YYYY-MM-DD.md"）
    const fileDateStr = file.split(".")[0].split("-").slice(1).join("-"); // 提取 "YYYY-MM-DD"
    const fileYearMonth = fileDateStr.slice(0, 7); // 提取 "YYYY-MM"

    // 只处理当前月份的文件
    if (fileYearMonth === currentYearMonth) {
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
        
        const columns = line.split("|").map((col: string) => col.trim());
        if (columns.length < 3) continue; // 确保有足够的列
        
        // 提取仓库的唯一标识（第二列是仓库链接）
        const repoIdentifier = columns[1];
        if (!repoIdentifier || repoIdentifier === "") continue;
        
        // 数据清洗：处理描述字段中的管道符，防止破坏Markdown表格格式
        const cleanedLine = cleanTableRow(line);
        
        // 如果当前记录比已存储的记录更新，则替换
        if (!uniqueRepos[repoIdentifier]) {
          uniqueRepos[repoIdentifier] = {
            dates: new Set([fileDateStr]),
            latestDate: fileDateStr, // 存储日期
            line: cleanedLine, // 存储 Markdown 表格行
          };
        } else {
          uniqueRepos[repoIdentifier].dates.add(fileDateStr);
          const currentFileDate = new Date(fileDateStr);
          const existingDate = new Date(uniqueRepos[repoIdentifier].latestDate);
          if (currentFileDate > existingDate) {
            uniqueRepos[repoIdentifier].latestDate = fileDateStr;
            uniqueRepos[repoIdentifier].line = cleanedLine;
          }
        }
      }
    }
  });

  // 生成当前月份的 Markdown 文件
  let markdownContent = "## Trending Repositories\n\n";
  markdownContent +=
    "| Repository | Description | Language | Stars | Forks | Built By | Current Period Stars | Days Active |";
  markdownContent += dayHeaders.join(" | ") + " |\n";

  // 构建分隔线
  markdownContent +=
    "|------------|-------------|----------|-------|-------|----------|---------------------|------|";
  markdownContent += dayHeaders.map(() => "---").join("|") + "|\n";

  // 填充数据 - 按活跃天数排序，活跃天数相同则按最新出现日期排序
  Object.values(uniqueRepos)
    .sort((a, b) => {
      // 首先按活跃天数降序排列
      if (b.dates.size !== a.dates.size) {
        return b.dates.size - a.dates.size;
      }
      // 活跃天数相同时，按最新出现日期降序排列
      return b.latestDate.localeCompare(a.latestDate);
    })
    .forEach(({ line: repoLine, dates }) => {
      const columns = repoLine
        .split("|")
        .slice(1, -1)
        .map((col) => col.trim());
      
      // 支持不同列数格式，最少需要5列
      if (columns.length < 5) {
        console.warn(`跳过格式不正确的行: ${repoLine}`);
        return;
      }

      let processedColumns = [...columns];
      
      // 根据列数调整格式以匹配标准的7列输出
      if (columns.length === 5) {
        // 5列格式：Repository | Description | Language | Stars | Built By
        // 插入 Forks 和 Current Period Stars 列
        processedColumns.splice(4, 0, "", ""); // 在 Built By 前插入 Forks 和 Current Period Stars
      } else if (columns.length === 6) {
        // 6列格式：Repository | Description | Language | Stars | Built By | Current Period Stars
        // 插入 Forks 列
        processedColumns.splice(4, 0, ""); // 在 Built By 前插入 Forks
      }
      // 7列格式已经是标准格式，不需要调整

      const dateChecks = dayHeaders.map((day) =>
        dates.has(`${currentYearMonth}-${day}`) ? "✓" : ""
      );

      markdownContent += `| ${processedColumns.join(" | ")} | ${
        dates.size
      } | ${dateChecks.join(" | ")} |\n`;
    });
    
  const fileName = path.join(outputDirectory, `${currentYearMonth}.md`);
  fs.writeFileSync(fileName, markdownContent);
  console.log(`月度汇总文件 ${fileName} 创建成功！`);
  console.log(`共汇总了 ${Object.keys(uniqueRepos).length} 个仓库的数据`);
  console.log(`统计月份: ${currentYearMonth}`);
}

summarizeByMonth();