import fs from "fs";
import path from "path";
import axios from "axios";
import { DAILY_TABLE_HEADER, DAILY_TABLE_SEPARATOR } from "./constants";
import type { Repo } from "./types";
import { sanitizeTableCellDescription } from "./utils";

function buildDailyTable(repos: Repo[]): string {
  const tableRows = repos
    .map((repo) => {
      const builtBy = (repo.builtBy ?? [])
        .map((builder) => `[${builder.username}](${builder.href})`)
        .join(", ");
      const desc = sanitizeTableCellDescription(repo.description ?? "");
      return `| [${repo.author}/${repo.name}](${repo.url}) | ${desc} | ${repo.language ?? ""} | ${repo.stars} | ${repo.forks} | ${builtBy} | ${repo.currentPeriodStars} |\n`;
    })
    .join("");
  return (
    "## Trending Repositories\n\n" +
    DAILY_TABLE_HEADER +
    DAILY_TABLE_SEPARATOR +
    tableRows
  );
}

function writeDailyMarkdown(content: string, date: string): void {
  const currentYear = date.slice(0, 4);
  const directory = path.join(__dirname, "trending", currentYear, "daily");
  fs.mkdirSync(directory, { recursive: true });
  const fileName = path.join(directory, `${date}.md`);
  fs.writeFileSync(fileName, content);
  console.log(`Markdown file ${fileName} created successfully.`);
}

async function fetchTrendingRepos() {
  try {
    const response = await axios.get<Repo[]>(
      "https://github-api.nines.world/trending",
      { timeout: 15000 }
    );
    const data = response.data;
    if (!Array.isArray(data)) {
      console.error("Unexpected API response: expected array of repos.");
      process.exit(1);
    }
    const date = new Date().toISOString().split("T")[0];
    const markdownContent = buildDailyTable(data);
    writeDailyMarkdown(markdownContent, date);
  } catch (error) {
    console.error("Error fetching trending repositories:", error);
    process.exit(1);
  }
}

fetchTrendingRepos();
