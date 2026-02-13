/** API 返回的 trending 仓库项，供 fetchTrending 使用 */
export interface Repo {
  name: string;
  url: string;
  author: string;
  description: string;
  language?: string;
  languageColor: string;
  stars: number;
  forks: number;
  builtBy?: { username: string; href: string }[];
  currentPeriodStars: number;
}

/** 汇总阶段按仓库去重后的条目，供 summary 使用 */
export type RepoData = {
  firstAppearanceMonth: string;
  firstAppearanceDate: string;
  latestDate: string;
  line: string;
  totalDays: number;
  months: Set<string>;
};
