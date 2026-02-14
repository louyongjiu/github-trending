/** API 返回的 trending 仓库项，供 fetchTrending 使用 */
export interface Repo {
  name: string;
  url: string;
  author: string;
  description?: string;
  language?: string;
  languageColor?: string;
  stars: number;
  forks: number;
  builtBy?: { username: string; href: string }[];
  currentPeriodStars: number;
}

/** 汇总表一行所需的四列：Repository | Description | Language | Stars（取最后一次出现的行） */
export type SummaryColumns = [string, string, string, string];

/** 汇总阶段按仓库去重后的条目，供 summary 使用 */
export type RepoData = {
  firstAppearanceMonth: string;
  firstAppearanceDate: string;
  latestDate: string;
  /** 用于汇总表展示的 [repo, desc, lang, stars]；仅当某次日表行列数 >= MIN_COLUMNS_FOR_SUMMARY 时才有值，否则不参与表格展示 */
  summaryColumns?: SummaryColumns;
  totalDays: number;
  months: Set<string>;
};
