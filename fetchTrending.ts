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
    markdownContent += '| Repository | Description | Language | Stars | Forks | Built By | Current Period Stars |\n';
    markdownContent += '|------------|-------------|----------|-------|-------|----------|---------------------|\n';

    repos.forEach(repo => {
      markdownContent += `| [${repo.author} / ${repo.name}](${repo.url}) | ${repo.description} | ${repo.language} | ${repo.stars} | ${repo.forks} | ${repo.builtBy.map(builder => `[${builder.username}](${builder.href})`).join(', ')} | ${repo.currentPeriodStars} |\n`;
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
