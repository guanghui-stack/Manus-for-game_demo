import type { SkillEffect } from "@/game/content/skills";

export type GeneralId = "zhang-fei" | "guan-yu" | "zhao-yun" | "huang-zhong" | "ma-chao";

export interface GeneralDefinition {
  id: GeneralId;
  name: string;
  role: string;
  strength: string;
  weakness: string;
  portrait: string;
  accent: "fire" | "jade" | "silver" | "gold" | "sky";
  effects: readonly SkillEffect[];
}

export const GENERALS: readonly GeneralDefinition[] = [
  {
    id: "zhang-fei", name: "Trương Phi", role: "Người mở trận", accent: "fire",
    strength: "Xung phong: đúng câu đầu được mở thêm một nước chiếm ô trong 6 giây.",
    weakness: "Sai câu đầu thì hồi lệnh nhân đôi; đã tuyên chiến không đổi câu.",
    portrait: "/manus-storage/zhang-fei-portrait_0f366b2d.png",
    effects: [{ kind: "range", hexes: 1 }, { kind: "extraCaptureInSameAction", seconds: 6 }, { kind: "cooldownPenaltyOnMiss", factor: 2 }],
  },
  {
    id: "guan-yu", name: "Quan Vũ", role: "Người giữ chính đạo", accent: "jade",
    strength: "Trấn thủ: ô chiếm được trở thành kiên thành, cần hai lần phá vây.",
    weakness: "Tầm một ô, không nhảy và không đổi đề.",
    portrait: "/manus-storage/guan-yu-portrait_e980aebd.png",
    effects: [{ kind: "range", hexes: 1 }, { kind: "fortify", correctAnswersToBreak: 2 }],
  },
  {
    id: "zhao-yun", name: "Triệu Vân", role: "Người giữ bình tĩnh", accent: "silver",
    strength: "Đơn kỵ: nhảy về ô nhà có dấu vây và xóa dấu đó.",
    weakness: "Mỗi cú nhảy đốt 15 giây đồng hồ bàn cờ.",
    portrait: "/manus-storage/zhao-yun-portrait_f46dd0c7.png",
    effects: [{ kind: "range", hexes: 2 }, { kind: "jumpToBesiegedHome" }, { kind: "answerSecondsDelta", seconds: 3 }],
  },
  {
    id: "huang-zhong", name: "Hoàng Trung", role: "Người chứng minh sức bền", accent: "gold",
    strength: "Lão tướng: tầm đi nở ở phút 3 và 6; phục bàn mở rộng chiếm đất.",
    weakness: "Ba phút đầu không được tuyên chiến và chỉ có tầm một ô.",
    portrait: "/manus-storage/huang-zhong-portrait_a58bb729.png",
    effects: [{ kind: "rangeSchedule", steps: [{ atSecond: 0, hexes: 1 }, { atSecond: 180, hexes: 2 }, { atSecond: 360, hexes: 3 }] }, { kind: "replayBonusHexes", hexes: 2 }],
  },
  {
    id: "ma-chao", name: "Mã Siêu", role: "Người phá thế bằng biến hoá", accent: "sky",
    strength: "Thiết kỵ: đi thẳng ba ô qua đất nhà hoặc đất trống, được đổi đề một lần.",
    weakness: "Đất quá xa tướng trở về trung lập sau 90 giây.",
    portrait: "/manus-storage/ma-chao-portrait_62528d9e.png",
    effects: [{ kind: "straightLineOnly", hexes: 3 }, { kind: "rerollItem", timesPerAction: 1 }, { kind: "decayIfFarFromCommander", maxHexes: 3, seconds: 90 }],
  },
] as const;

export function getGeneral(id: GeneralId): GeneralDefinition {
  return GENERALS.find((general) => general.id === id) ?? GENERALS[0];
}
