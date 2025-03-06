import fs from "fs";
import path from "path";

function summarizeByMonth() {
  // 获取当前时间的年月
  const currentDate = new Date();
  const currentYearMonth = currentDate.toISOString().slice(0, 7); // 格式为 "YYYY-MM"
  const currentYear = currentYearMonth.slice(0, 4);

  const inputDirectory = path.join(__dirname, "trending", currentYear); // 输入目录
  const outputDirectory = path.join(__dirname, "monthly-summaries"); // 固定输出目录

  // 如果输出目录不存在，则创建
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory);
  }

  const files = fs
    .readdirSync(inputDirectory)
    .filter((file) => file.endsWith(".md"));
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
      const content = fs.readFileSync(filePath, "utf-8");

      // 解析 Markdown 表格内容
      const lines = content.split("\n").slice(4); // 跳过表头和分隔符
      lines.forEach((line) => {
        if (line.trim() === "") return; // 跳过空行
        // 提取仓库的唯一标识
        const repoIdentifier = line.split("|")[1].trim(); // 第二列是仓库链接
        // 如果当前记录比已存储的记录更新，则替换
        if (!uniqueRepos[repoIdentifier]) {
          uniqueRepos[repoIdentifier] = {
            dates: new Set([fileDateStr]),
            latestDate: fileDateStr, // 存储日期
            line: line, // 存储 Markdown 表格行
          };
        } else {
          uniqueRepos[repoIdentifier].dates.add(fileDateStr);
          const currentDate = new Date(fileDateStr);
          const existingDate = new Date(uniqueRepos[repoIdentifier].latestDate);
          if (currentDate > existingDate) {
            uniqueRepos[repoIdentifier].latestDate = fileDateStr;
            uniqueRepos[repoIdentifier].line = line;
          }
        }
      });
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

  // 填充数据
  Object.values(uniqueRepos).forEach(({ line: repoLine, dates }) => {
    const columns = repoLine
      .split("|")
      .slice(1, -1)
      .map((col) => col.trim());
    if (columns.length !== 7) return;

    const dateChecks = dayHeaders.map((day) =>
      dates.has(`${currentYearMonth}-${day}`) ? "✓" : ""
    );

    markdownContent += `| ${columns.join(" | ")} | ${
      dates.size
    } | ${dateChecks.join(" | ")} |\n`;
  });

  const fileName = path.join(outputDirectory, `${currentYearMonth}.md`);
  fs.writeFileSync(fileName, markdownContent);
  console.log(`Markdown file ${fileName} created successfully.`);
}

summarizeByMonth();
