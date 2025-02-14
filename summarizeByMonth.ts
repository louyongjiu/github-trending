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
  const uniqueRepos: { [key: string]: { date: string; line: string } } = {};

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
        if (
          !uniqueRepos[repoIdentifier] ||
          new Date(fileDateStr) > new Date(uniqueRepos[repoIdentifier].date)
        ) {
          uniqueRepos[repoIdentifier] = {
            date: fileDateStr, // 存储日期
            line: line, // 存储 Markdown 表格行
          };
        }
      });
    }
  });

  // 生成当前月份的 Markdown 文件
  let markdownContent = "## Trending Repositories\n\n";
  markdownContent +=
    "| Repository | Description | Language | Stars | Forks | Built By | Current Period Stars |\n";
  markdownContent +=
    "|------------|-------------|----------|-------|-------|----------|---------------------|\n";

  // 将去重后的数据按行写入
  Object.values(uniqueRepos).forEach(({ line }) => {
    markdownContent += line + "\n";
  });

  const fileName = path.join(outputDirectory, `${currentYearMonth}.md`);
  fs.writeFileSync(fileName, markdownContent);
  console.log(`Markdown file ${fileName} created successfully.`);
}

summarizeByMonth();
