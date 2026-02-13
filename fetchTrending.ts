import fs from "fs";
import path from "path";
import axios from "axios";
import type { Repo } from "./types";

async function fetchTrendingRepos() {
  try {
    const response = await axios.get<Repo[]>(
      "https://github-api.nines.world/trending"
    );
    const repos = response.data;

    const tableHeader =
      "| Repository | Description | Language | Stars | Forks | Built By | Current Period Stars |\n";
    const tableSeparator =
      "|------------|-------------|----------|-------|-------|----------|---------------------|\n";
    const tableRows = repos
      .map((repo) => {
        const builtBy = (repo.builtBy ?? [])
          .map((builder) => `[${builder.username}](${builder.href})`)
          .join(", ");
        return `| [${repo.author}/${repo.name}](${repo.url}) | ${repo.description.replace(/\|/g, " ")} | ${repo.language ?? ""} | ${repo.stars} | ${repo.forks} | ${builtBy} | ${repo.currentPeriodStars} |\n`;
      })
      .join("");

    const markdownContent =
      "## Trending Repositories\n\n" + tableHeader + tableSeparator + tableRows;

    const date = new Date().toISOString().split("T")[0];
    const currentYear = date.slice(0, 4);
    const directory = path.join(__dirname, "trending", currentYear, "daily");
    fs.mkdirSync(directory, { recursive: true });
    const fileName = path.join(directory, `${date}.md`);
    fs.writeFileSync(fileName, markdownContent);
    console.log(`Markdown file ${fileName} created successfully.`);
  } catch (error) {
    console.error("Error fetching trending repositories:", error);
    process.exit(1);
  }
}

fetchTrendingRepos();
