import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

async function bundle(app) {
  const directory = new URL(`../packages/${app}/dist/assets/`, import.meta.url);
  const files = (await readdir(directory)).filter((file) =>
    file.endsWith(".js"),
  );
  return (
    await Promise.all(
      files.map((file) => readFile(new URL(file, directory), "utf8")),
    )
  ).join("\n");
}

test("production user bundle includes photo uploads and excludes administrator actions", async () => {
  const source = await bundle("integration-ui");
  assert.match(source, /GeneratePresignedUrl/);
  assert.match(source, /GeneratePetPresignedUrl/);
  assert.doesNotMatch(
    source,
    /AdminPendingProfileImages|ReviewProfileImage|CanReviewProfileImages|관리자로 로그인/,
  );
});

test("production admin bundle includes review and excludes signup and owner uploads", async () => {
  const source = await bundle("admin-ui");
  assert.match(source, /AdminPendingProfileImages/);
  assert.match(source, /ReviewProfileImage/);
  assert.doesNotMatch(
    source,
    /RegisterAccount|GeneratePresignedUrl|GeneratePetPresignedUrl|CreateProfile|CreatePet/,
  );
  const html = await readFile(
    new URL("../packages/admin-ui/dist/index.html", import.meta.url),
    "utf8",
  );
  assert.match(source, /\/admin\/config\.js/);
  assert.match(html, /\/admin\/assets\//);
  assert.doesNotMatch(html, /src="\/assets\//);
});
