import { describe, expect, it } from "vitest";
import { getSchoolTheme, SCHOOL_OPTIONS } from "@/lib/school-theme";

describe("school theme system", () => {
  it("centralizes the school options used across UI and export", () => {
    expect(SCHOOL_OPTIONS).toEqual([
      "北京大学",
      "清华大学",
      "清+北（TP-LINK）",
      "复旦大学",
      "上海交大",
      "中国人民大学",
      "其他",
    ]);
  });

  it("maps each school to its export badge color and direction", () => {
    expect(getSchoolTheme("北京大学").exportBadge).toMatchObject({
      background: "rgb(167, 42, 42)",
      direction: "left",
    });
    expect(getSchoolTheme("清华大学").exportBadge).toMatchObject({
      background: "rgb(124, 46, 154)",
      direction: "right",
    });
    expect(getSchoolTheme("清+北（TP-LINK）").exportBadge).toMatchObject({
      background:
        "linear-gradient(to right, rgb(192, 0, 0) 0%, rgb(112, 48, 160) 80%)",
      direction: "right",
    });
    expect(getSchoolTheme("复旦大学").exportBadge.background).toBe(
      "rgb(0, 91, 172)",
    );
    expect(getSchoolTheme("上海交大").exportBadge.background).toBe(
      "rgb(0, 135, 60)",
    );
    expect(getSchoolTheme("中国人民大学").exportBadge.background).toBe(
      "rgb(14, 65, 156)",
    );
    expect(getSchoolTheme("其他：某某大学").key).toBe("其他");
  });
});
