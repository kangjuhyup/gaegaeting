import { useState } from "react";
import { Alert, Button } from "@gaegaeting/ui-common";
import type { FeedItem, Pet } from "../types.js";
import type { RecommendationDetails } from "../lib/recommendation-details.js";
import {
  breeds,
  genders,
  petLabel,
  sizes,
  traits,
} from "../lib/pet-options.js";

function PetPhoto({ pet }: { pet?: Pet }) {
  const [failed, setFailed] = useState(false);
  const url = pet?.profileImages[0];
  return url && !failed ? (
    <img
      src={url}
      alt={`${pet.name} 프로필 사진`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  ) : (
    <span role="img" aria-label="강아지 기본 이미지">
      🐕
    </span>
  );
}

export function RecommendationCard({
  item,
  slot,
  index,
  details,
  detailsLoading,
  detailsFailed,
  acted,
  pending = false,
  onAction,
}: {
  item: FeedItem;
  slot?: string;
  index: number;
  details?: RecommendationDetails;
  detailsLoading: boolean;
  detailsFailed: boolean;
  acted?: string;
  pending?: boolean;
  onAction: (state: "LIKE" | "PASS") => void;
}) {
  const pets = details?.pets ?? [];
  const primaryPet = pets[0];
  const reaction =
    acted ?? (["LIKE", "PASS"].includes(item.state) ? item.state : undefined);
  const interested = reaction === "LIKE";
  return (
    <article
      className={`match-card${interested ? " match-card--interested" : ""}`}
    >
      <div className={`match-photo match-photo--${index % 4}`}>
        <PetPhoto
          key={primaryPet?.profileImages[0] ?? "default"}
          pet={primaryPet}
        />
        {pets.length > 0 && <b>반려견 {pets.length}마리</b>}
      </div>
      <div className="match-card__body">
        <h2>
          {details?.nickname
            ? `${details.nickname}님의 산책 친구`
            : "새로운 산책 친구"}
        </h2>
        {detailsLoading ? (
          <p role="status">강아지 정보를 불러오는 중이에요.</p>
        ) : detailsFailed ? (
          <p>강아지 정보를 불러오지 못했어요.</p>
        ) : pets.length === 0 ? (
          <p>아직 등록된 강아지 정보가 없어요.</p>
        ) : (
          <ul className="match-pets" aria-label="함께 산책할 강아지">
            {pets.map((pet) => (
              <li className="match-pet" key={pet.id}>
                {pets.length > 1 && (
                  <div className="match-pet__photo">
                    <PetPhoto
                      key={pet.profileImages[0] ?? "default"}
                      pet={pet}
                    />
                  </div>
                )}
                <div className="match-pet__info">
                  <h3>{pet.name}</h3>
                  <p>
                    {[
                      petLabel(breeds, pet.breed),
                      `${pet.age}살`,
                      petLabel(genders, pet.gender),
                      petLabel(sizes, pet.size),
                    ].join(" · ")}
                  </p>
                  <div className="match-pet__traits">
                    {pet.personalities.map((value) => (
                      <span key={value}>{petLabel(traits, value)}</span>
                    ))}
                  </div>
                  {pet.description && (
                    <p className="match-pet__description">{pet.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="match-meta">
          <span>☀ {slot || "오늘"}</span>
          {interested && (
            <span className="match-interest" role="status">
              관심 보냄 ♥
            </span>
          )}
        </div>
        {reaction ? (
          <Alert type="success">
            {interested ? "관심을 보냈어요 ♥" : "다음 추천을 볼게요."}
          </Alert>
        ) : (
          <div className="card-actions">
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => onAction("PASS")}
            >
              다음에
            </Button>
            <Button disabled={pending} onClick={() => onAction("LIKE")}>
              {pending ? "저장 중…" : "♥ 관심 있어요"}
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}
