export const SCHOOL_OPTIONS = [
  "北京大学",
  "清华大学",
  "清+北（TP-LINK）",
  "复旦大学",
  "上海交大",
  "中国人民大学",
  "其他",
] as const;

export type SchoolKey = (typeof SCHOOL_OPTIONS)[number];

export type SchoolTheme = {
  key: SchoolKey;
  label: SchoolKey;
  ui: {
    color: string;
    background: string;
    border: string;
  };
  exportBadge: {
    background: string;
    direction: "left" | "right";
  };
};

const SCHOOL_THEMES: Record<SchoolKey, SchoolTheme> = {
  北京大学: {
    key: "北京大学",
    label: "北京大学",
    ui: {
      color: "rgb(167, 42, 42)",
      background: "rgba(167, 42, 42, 0.1)",
      border: "rgba(167, 42, 42, 0.28)",
    },
    exportBadge: {
      background: "rgb(167, 42, 42)",
      direction: "left",
    },
  },
  清华大学: {
    key: "清华大学",
    label: "清华大学",
    ui: {
      color: "rgb(124, 46, 154)",
      background: "rgba(124, 46, 154, 0.1)",
      border: "rgba(124, 46, 154, 0.28)",
    },
    exportBadge: {
      background: "rgb(124, 46, 154)",
      direction: "right",
    },
  },
  "清+北（TP-LINK）": {
    key: "清+北（TP-LINK）",
    label: "清+北（TP-LINK）",
    ui: {
      color: "rgb(149, 22, 131)",
      background: "rgba(149, 22, 131, 0.1)",
      border: "rgba(149, 22, 131, 0.28)",
    },
    exportBadge: {
      background:
        "linear-gradient(to right, rgb(192, 0, 0) 0%, rgb(112, 48, 160) 80%)",
      direction: "right",
    },
  },
  复旦大学: {
    key: "复旦大学",
    label: "复旦大学",
    ui: {
      color: "rgb(0, 91, 172)",
      background: "rgba(0, 91, 172, 0.1)",
      border: "rgba(0, 91, 172, 0.28)",
    },
    exportBadge: {
      background: "rgb(0, 91, 172)",
      direction: "right",
    },
  },
  上海交大: {
    key: "上海交大",
    label: "上海交大",
    ui: {
      color: "rgb(0, 135, 60)",
      background: "rgba(0, 135, 60, 0.1)",
      border: "rgba(0, 135, 60, 0.28)",
    },
    exportBadge: {
      background: "rgb(0, 135, 60)",
      direction: "left",
    },
  },
  中国人民大学: {
    key: "中国人民大学",
    label: "中国人民大学",
    ui: {
      color: "rgb(14, 65, 156)",
      background: "rgba(14, 65, 156, 0.1)",
      border: "rgba(14, 65, 156, 0.28)",
    },
    exportBadge: {
      background: "rgb(14, 65, 156)",
      direction: "right",
    },
  },
  其他: {
    key: "其他",
    label: "其他",
    ui: {
      color: "rgb(86, 122, 148)",
      background: "rgba(86, 122, 148, 0.1)",
      border: "rgba(86, 122, 148, 0.28)",
    },
    exportBadge: {
      background: "rgb(86, 122, 148)",
      direction: "left",
    },
  },
};

export function getSchoolKey(school: string): SchoolKey {
  const exact = SCHOOL_OPTIONS.find((option) => option === school);
  if (exact) {
    return exact;
  }

  return "其他";
}

export function getSchoolTheme(school: string): SchoolTheme {
  return SCHOOL_THEMES[getSchoolKey(school)];
}
