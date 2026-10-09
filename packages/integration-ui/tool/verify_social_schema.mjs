import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const domain = process.argv[2] ?? "match";
const source = path.join(
  process.env.SOCIAL_CONTRACT_SOURCE_ROOT ?? root,
  "packages",
);
const base =
  domain === "match" ? root + "/packages/match" : source + "/" + domain;
const req = createRequire(base + "/package.json");
req("reflect-metadata");
const { Test } = req("@nestjs/testing");
const { GraphQLSchemaBuilderModule, GraphQLSchemaFactory } =
  req("@nestjs/graphql");
const { parse, validate, printSchema } = req("graphql");
const pairs = [
  [
    root + "/packages/match/dist/src/social/social.resolver.js",
    "SocialResolver",
  ],
  [
    source + "/chat/dist/src/room/infrastructure/graphql/room.resolver.js",
    "RoomResolver",
  ],
  [
    source +
      "/chat/dist/src/message/infrastructure/graphql/message.resolver.js",
    "MessageResolver",
  ],
  [
    source +
      "/chat/dist/src/participant/infrastructure/graphql/participant.resolver.js",
    "ParticipantResolver",
  ],
  [
    source + "/chat/dist/src/common/infrastructure/chat-events.resolver.js",
    "ChatEventsResolver",
  ],
  [
    source +
      "/account/dist/src/user/infrastructure/adapter/inbound/gql/user.resolver.js",
    "UserResolver",
  ],
  [
    source +
      "/account/dist/src/pet/infrastructure/adapter/inbound/gql/pet.resolver.js",
    "PetResolver",
  ],
  [
    source +
      "/account/dist/src/common/profile-images/profile-image.resolver.js",
    "ProfileImageResolver",
  ],
];
const resolvers = [];
for (const [path, name] of pairs.filter(([p]) => p.startsWith(base + "/"))) {
  resolvers.push((await import(pathToFileURL(path)))[name]);
}
const mod = await Test.createTestingModule({
  imports: [GraphQLSchemaBuilderModule],
}).compile();
const schema = await mod.get(GraphQLSchemaFactory).create(resolvers);
const dir = root + "/packages/integration-ui/build/social-review";
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(
  dir + "/" + domain + "-source-schema.graphql",
  printSchema(schema),
);
const docs = JSON.parse(fs.readFileSync(dir + "/operation-documents.json"));
const results = Object.entries(docs)
  .filter(([name]) =>
    domain === "match"
      ? [
          "myReceivedLikes",
          "mySentLikes",
          "myPairs",
          "acceptLike",
          "declineLike",
          "cancelPair",
          "reportPair",
        ].includes(name)
      : domain === "chat"
        ? [
            "chatRooms",
            "syncChatRooms",
            "chatRoom",
            "chatMessages",
            "sendChatMessage",
            "markChatRead",
            "chatEvents",
          ].includes(name)
        : ![
            "myReceivedLikes",
            "mySentLikes",
            "myPairs",
            "acceptLike",
            "declineLike",
            "cancelPair",
            "reportPair",
            "chatRooms",
            "syncChatRooms",
            "chatRoom",
            "chatMessages",
            "sendChatMessage",
            "markChatRead",
            "chatEvents",
          ].includes(name),
  )
  .map(([operation, query]) => ({
    operation,
    errors: validate(schema, parse(query)).map((e) => e.message),
  }));
fs.writeFileSync(
  dir + "/" + domain + "-schema-validation.json",
  JSON.stringify(
    {
      mode: "source code-first schema; not deployed Gateway",
      operations: results,
    },
    null,
    2,
  ),
);
const invalid = results.filter((r) => r.errors.length);
console.log(JSON.stringify({ domain, operations: results.length, invalid }));
await mod.close();
if (invalid.length) process.exitCode = 1;
