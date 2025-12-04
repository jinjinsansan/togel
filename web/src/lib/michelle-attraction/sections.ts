export type AttractionSection = {
  level: number;
  section: number;
  title: string;
};

export const ATTRACTION_SECTIONS: AttractionSection[] = [
  { level: 1, section: 1, title: "私とソースの関係" },
  { level: 1, section: 2, title: "ソースの本質" },
  { level: 1, section: 3, title: "思考ちゃんとマインド様" },
  { level: 1, section: 4, title: "「無」と時間の概念" },
  { level: 2, section: 5, title: "100%信じる力" },
  { level: 2, section: 6, title: "量子物理学と引き寄せ" },
  { level: 2, section: 7, title: "マインド状態と周波数" },
  { level: 3, section: 8, title: "お金の本質" },
  { level: 3, section: 9, title: "仕事と節約のマインド" },
  { level: 3, section: 10, title: "感謝の実践" },
  { level: 3, section: 11, title: "ソースに任せる" },
  { level: 3, section: 12, title: "感覚体験の理解" },
  { level: 3, section: 13, title: "ネガティブ感情の対処法" },
  { level: 3, section: 14, title: "時間は存在しない（実践）" },
  { level: 4, section: 15, title: "引き寄せの6ステップ" },
  { level: 4, section: 16, title: "よくある注意事項" },
  { level: 4, section: 17, title: "日常での小さな引き寄せ" },
  { level: 5, section: 18, title: "過去への感謝" },
  { level: 5, section: 19, title: "様々な教えとの共通点" },
  { level: 5, section: 20, title: "永遠の幸せへ" },
];

export const PROGRESS_STATUSES = ["OK", "IP", "RV"] as const;

export type ProgressStatus = (typeof PROGRESS_STATUSES)[number];

export const generateProgressCode = (level: number, sectionNumber: number, status: ProgressStatus) =>
  `MCL-L${level}-S${sectionNumber.toString().padStart(2, "0")}-${status}`;

export const getSectionByNumber = (sectionNumber: number) =>
  ATTRACTION_SECTIONS.find((section) => section.section === sectionNumber) ?? null;

export const findSection = (level: number, sectionNumber: number) =>
  ATTRACTION_SECTIONS.find((section) => section.level === level && section.section === sectionNumber) ?? null;

const getSectionIndex = (sectionNumber: number) =>
  ATTRACTION_SECTIONS.findIndex((section) => section.section === sectionNumber);

export const getNextSection = (currentSectionNumber: number) => {
  const index = getSectionIndex(currentSectionNumber);
  if (index === -1 || index >= ATTRACTION_SECTIONS.length - 1) {
    return null;
  }
  return ATTRACTION_SECTIONS[index + 1];
};

export const getPreviousSection = (currentSectionNumber: number) => {
  const index = getSectionIndex(currentSectionNumber);
  if (index <= 0) {
    return null;
  }
  return ATTRACTION_SECTIONS[index - 1];
};

export const formatSectionLabel = (level: number, sectionNumber: number) => {
  const section = findSection(level, sectionNumber);
  if (!section) {
    return `L${level}-S${sectionNumber}`;
  }
  return `L${level}-S${sectionNumber} 「${section.title}」`;
};

export const sectionsByLevel = ATTRACTION_SECTIONS.reduce<Record<number, AttractionSection[]>>((acc, section) => {
  if (!acc[section.level]) {
    acc[section.level] = [];
  }
  acc[section.level]?.push(section);
  return acc;
}, {});
