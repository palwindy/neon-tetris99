
// VS CPU ベストタイム（レベルごとの最速秒数）
const CPU_TIMES_KEY = 'tetris_cpu_best_times';
// SINGLE モード TOP5
const SINGLE_RECORDS_KEY = 'tetris_single_records';

export interface SingleRecord {
  score: number;
  lines: number;
  level: number;
  date: string; // ISO string
}

export interface CpuBestTimes {
  1?: number;
  2?: number;
  3?: number;
  4?: number;
  5?: number;
}

function loadCpuTimes(): CpuBestTimes {
  try {
    const raw = localStorage.getItem(CPU_TIMES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCpuTimes(times: CpuBestTimes): void {
  localStorage.setItem(CPU_TIMES_KEY, JSON.stringify(times));
}

function loadSingleRecords(): SingleRecord[] {
  try {
    const raw = localStorage.getItem(SINGLE_RECORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSingleRecords(records: SingleRecord[]): void {
  localStorage.setItem(SINGLE_RECORDS_KEY, JSON.stringify(records));
}

/** VS CPU クリアタイム（秒）を登録。新記録ならtrueを返す */
export function submitCpuTime(level: 1 | 2 | 3 | 4 | 5, seconds: number): boolean {
  const times = loadCpuTimes();
  const existing = times[level];
  if (existing === undefined || seconds < existing) {
    times[level] = seconds;
    saveCpuTimes(times);
    return true;
  }
  return false;
}

/** 全レベルのベストタイムを取得 */
export function getCpuBestTimes(): CpuBestTimes {
  return loadCpuTimes();
}

/** SINGLEモードのスコアを登録してTOP5を返す。isNewRecord=trueなら上位入り */
export function submitSingleScore(score: number, lines: number, level: number): {
  records: SingleRecord[];
  rank: number; // 1始まり。TOP5外なら6
  isNewRecord: boolean;
} {
  const records = loadSingleRecords();
  const newEntry: SingleRecord = {
    score, lines, level,
    date: new Date().toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }),
  };
  const updated = [...records, newEntry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  saveSingleRecords(updated);

  const rank = updated.findIndex(r => r === newEntry) + 1;
  return {
    records: updated,
    rank: rank > 0 ? rank : 6,
    isNewRecord: rank > 0,
  };
}

/** SINGLEモードのTOP5を取得 */
export function getSingleRecords(): SingleRecord[] {
  return loadSingleRecords();
}

/** タイム（秒）を "M:SS.cc" 形式に変換 */
export function formatTime(seconds: number): string {
  const m  = Math.floor(seconds / 60);
  const s  = Math.floor(seconds % 60);
  const cc = Math.floor((seconds % 1) * 100);
  if (m > 0) {
    return `${m}:${String(s).padStart(2, '0')}.${String(cc).padStart(2, '0')}`;
  }
  return `${s}.${String(cc).padStart(2, '0')}`;
}
