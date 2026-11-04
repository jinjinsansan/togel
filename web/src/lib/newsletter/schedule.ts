import { BROADCAST_TOTAL_ISSUES } from "./issues";

/**
 * 誰に、何通目を送るか。cron は毎日走り、ここで「今日送る人」を決める。
 *
 * - 通目は購読者ごと（last_issue）。登録した日から1通目が始まる
 * - 前回から7日たった人に次の1通。cron の実行時刻の揺れで1日ずれないよう、2時間の余裕を持たせる
 * - 15通で止まる（巡回させない）
 * - 1日に送る上限がある（Resend の無料枠は1日100通。確認メール・再設定メールも同じ枠を使うので、
 *   既定では80通にして20通を残す）。溢れた人は翌日に回る。前回の送信が古い人から順に送る
 */

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const SCHEDULE_SLACK_MS = 2 * 60 * 60 * 1000;
export const DEFAULT_DAILY_LIMIT = 80;

export type ScheduleRow = {
  last_issue: number;
  last_sent_at: string | null;
};

/** 今日送るべき通目。送らない日は null */
export const dueIssue = (row: ScheduleRow, now: Date): number | null => {
  if (!Number.isInteger(row.last_issue) || row.last_issue < 0) return null;
  if (row.last_issue >= BROADCAST_TOTAL_ISSUES) return null;
  if (row.last_sent_at) {
    const last = new Date(row.last_sent_at).getTime();
    if (!Number.isFinite(last)) return null;
    if (now.getTime() - last < WEEK_MS - SCHEDULE_SLACK_MS) return null;
  }
  return row.last_issue + 1;
};

/** 1日の上限。環境変数で下げられる（上げるのは有料プランにしてから） */
export const dailyLimit = (raw: string | undefined): number => {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) return DEFAULT_DAILY_LIMIT;
  return Math.min(value, 100);
};
