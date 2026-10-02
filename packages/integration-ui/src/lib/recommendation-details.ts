import { graphql } from "@gaegaeting/ui-common";
import type { Pet } from "../types.js";

export type RecommendationDetails = {
  nickname?: string;
  pets: Pet[];
};

export async function loadRecommendationDetails(
  endpoint: string,
  targetUserIds: string[],
  token: string,
): Promise<Record<string, RecommendationDetails>> {
  const ids = [...new Set(targetUserIds)];
  if (!ids.length) return {};

  const variables = Object.fromEntries(ids.map((id, i) => [`id${i}`, id]));
  const declarations = ids.map((_, i) => `$id${i}: String!`).join(", ");
  const selections = ids
    .map(
      (_, i) => `
    profile${i}: profile(id: $id${i}) { nickname }
    pets${i}: petsByUserId(userId: $id${i}) {
      id name age gender breed size personalities description
      isCertificated profileImages
    }
  `,
    )
    .join("\n");
  const data = await graphql<
    Record<string, { nickname: string } | Pet[] | null>
  >(
    endpoint,
    `query RecommendationDetails(${declarations}) { ${selections} }`,
    variables,
    token,
  );
  return Object.fromEntries(
    ids.map((id, i) => [
      id,
      {
        nickname: (data[`profile${i}`] as { nickname: string } | null)
          ?.nickname,
        pets: data[`pets${i}`] as Pet[],
      },
    ]),
  );
}
