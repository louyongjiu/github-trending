import fs from 'fs';
import path from 'path';
import axios from 'axios';

interface Repo {
  name: string;
  url: string;
  author: string;
  description: string;
  language: string;
  languageColor: string;
  stars: number;
  forks: number;
  builtBy: { username: string; href: string }[];
  currentPeriodStars: number;
}

async function fetchTrendingRepos() {
  try {
    const response = await axios.get<Repo[]>('https://github-api.nines.world/trending');
    const repos = response.data;

    let markdownContent = '## Trending Repositories\n\n';

    repos.forEach(repo => {
      markdownContent += `### [${repo.name}](${repo.url})\n\n`;
      markdownContent += `- **Author:** [${repo.author}](${repo.url})\n`;
      markdownContent += `- **Description:** ${repo.description}\n`;
      markdownContent += `- **Language:** ${repo.language} ![${repo.languageColor}](https://via.placeholder.com/15/${repo.languageColor}/000000?text=+)\n`;
      markdownContent += `- **Stars:** ${repo.stars}\n`;
      markdownContent += `- **Forks:** ${repo.forks}\n`;
      markdownContent += `- **Built By:** ${repo.builtBy.map(builder => `[${builder.username}](${builder.href})`).join(', ')}\n`;
      markdownContent += `- **Current Period Stars:** ${repo.currentPeriodStars}\n\n`;
    });

    const date = new Date().toISOString().split('T')[0];
    const directory = path.join(__dirname, 'trending');
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory);
    }
    const fileName = path.join(directory, `trending-${date}.md`);
    fs.writeFileSync(fileName, markdownContent);
    console.log(`Markdown file ${fileName} created successfully.`);

  } catch (error) {
    console.error('Error fetching trending repositories:', error);
  }
}

fetchTrendingRepos();
