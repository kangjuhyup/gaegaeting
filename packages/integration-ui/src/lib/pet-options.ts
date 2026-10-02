export const breeds = [
  ["MALTESE", "말티즈"],
  ["POODLE", "푸들"],
  ["CHIHUAHUA", "치와와"],
  ["POMERANIAN", "포메라니안"],
  ["SHIH_TZU", "시츄"],
  ["YORKSHIRE", "요크셔테리어"],
  ["BEAGLE", "비글"],
  ["GOLDEN_RETRIEVER", "골든리트리버"],
  ["LABRADOR", "래브라도"],
  ["HUSKY", "허스키"],
  ["SAMOYED", "사모예드"],
  ["WELSH_CORGI", "웰시코기"],
  ["JINDO", "진돗개"],
  ["MIXED", "믹스"],
  ["OTHER", "기타"],
] as const;

export const traits = [
  ["FRIENDLY", "사교적"],
  ["SHY", "수줍음"],
  ["ACTIVE", "활발함"],
  ["CALM", "차분함"],
  ["PLAYFUL", "장난꾸러기"],
  ["PROTECTIVE", "든든함"],
  ["CURIOUS", "호기심"],
  ["INDEPENDENT", "독립적"],
] as const;

export function petLabel(
  options: ReadonlyArray<readonly [string, string]>,
  value: string,
): string {
  return options.find(([key]) => key === value)?.[1] ?? value;
}

export const sizes = [
  ["SMALL", "소형"],
  ["MEDIUM", "중형"],
  ["LARGE", "대형"],
] as const;

export const genders = [
  ["MALE", "남아"],
  ["FEMALE", "여아"],
] as const;
