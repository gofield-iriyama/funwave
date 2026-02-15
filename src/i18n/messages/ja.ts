export const ja = {
  appTitle: "四国サーフコンディション",
  appSubtitle: "小松・生見・浮鞭の今日の波を、ボード別に判定します",
  levelLabel: "ボード",
  spotLabel: "スポット",
  decisionGo: "ノレる",
  decisionMellow: "チル",
  decisionTough: "見送り",
  decisionUnavailable: "判定待ち",
  reasonLabel: "判定理由",
  bestTimeLabel: "ベスト時間帯",
  noBestTime: "該当なし",
  scoreLabel: "スコア",
  staleWarning: "データが古い可能性があります",
  updateErrorWarning: "最新更新に失敗しています",
  lastUpdated: "最終更新",
  generatedAt: "画面生成時刻",
  retryHint: "次回の毎時更新で自動再試行されます",
} as const;

export type JaDictionary = typeof ja;
