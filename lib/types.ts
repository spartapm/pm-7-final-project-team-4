export type Journey = "before" | "after";
export type Species = "dog" | "cat";

export type Pet = {
  species: Species;
  name: string;
  age: number | null;
  photo?: string;
  journey: Journey;
};

export type DraftRecord = {
  title: string;
  story: string;
  date: string;
  photos: string[];
};

export type ListItem = {
  id: string;
  journey: Journey;
  title: string;
  createdAt: number;
  isExample: boolean;
  draft?: DraftRecord;
};

export type Memory = {
  id: string;
  itemId: string;
  journey: Journey;
  title: string;
  story: string;
  date: string;
  photos: string[];
  createdAt: number;
  updatedAt: number;
};

export type AppState = {
  accountId: string;
  loggedIn: boolean;
  loginAt: number | null;
  pet: Pet | null;
  items: ListItem[];
  memories: Memory[];
  seeded: { before: boolean; after: boolean };
};

export const BEFORE_EXAMPLES = [
  "제일 좋아하는 간식 사주기",
  "노을 같이 보기",
  "하루동안 시간 보내기",
  "아이가 제일 좋아하는 장난감 사주기",
  "원없이 냄새 맡게 하기",
];

export const AFTER_EXAMPLES = [
  "이별 편지 쓰기",
  "아이가 나한테 남긴 좋은 습관 기록해보기",
  "함께 찍은 사진 중 제일 좋아하는 것 고르기",
  "아이에게 고마웠던 순간 작성해보기",
  "아이가 좋아했던 산책 코스 가보기",
];

export const NAME_RE = /^[A-Za-z가-힣0-9]+$/;
