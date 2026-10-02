import type { SocialPerson } from "../lib/social-preview.js";

export function SocialPersonAvatar({
  person,
  small = false,
}: {
  person: SocialPerson;
  small?: boolean;
}) {
  return (
    <span
      className={`social-avatar social-avatar--${Number(person.id.replace(/\D/g, "")) % 3} ${small ? "social-avatar--small" : ""}`}
      role="img"
      aria-label={`${person.petName} 기본 이미지`}
    >
      <span aria-hidden="true">🐶</span>
    </span>
  );
}
