import { expect, test } from "@playwright/test";

function createSilentWav(durationSeconds = 1, sampleRate = 8000) {
  const sampleCount = durationSeconds * sampleRate;
  const buffer = Buffer.alloc(44 + sampleCount * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + sampleCount * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(sampleCount * 2, 40);
  return buffer;
}

test("홈에서 프로젝트 생성 진입점을 표시한다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /음악을 들은 그 순간에/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /프로젝트 만들기/ })).toBeVisible();
});

test("Supabase 검증 프로젝트의 파형과 위치 댓글을 표시한다", async ({ page }) => {
  const slug = process.env.VERIFY_PROJECT_SLUG;
  test.skip(!slug, "VERIFY_PROJECT_SLUG가 설정된 원격 검증에서만 실행합니다.");

  await page.goto(`/p/${slug}`);
  await expect(page.getByRole("heading", { name: "MVP verification" })).toBeVisible();
  await expect(page.getByText("verification.wav", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Realtime verification", { exact: true })).toBeVisible();

  const waveform = page.getByRole("slider", { name: "파형에서 재생 또는 댓글 위치 선택" });
  await waveform.click({ position: { x: 120, y: 80 } });
  await expect(page.getByPlaceholder("닉네임 / 이름")).toBeVisible();
  await expect(page.getByPlaceholder("이 순간에 대한 의견을 남겨주세요.")).toBeVisible();
});

test("UI에서 프로젝트, 트랙, 위치 댓글을 생성한다", async ({ page }) => {
  test.skip(process.env.RUN_REMOTE_E2E !== "1", "RUN_REMOTE_E2E=1인 원격 검증에서만 실행합니다.");

  await page.goto("/");
  await page.getByLabel("곡 프로젝트 이름").fill("Browser E2E verification");
  await page.getByLabel("BPM").fill("128");
  await page.getByRole("button", { name: /프로젝트 만들기/ }).click();
  await expect(page).toHaveURL(/\/p\/[a-z0-9-]+$/);
  await expect(page.getByRole("heading", { name: "Browser E2E verification" })).toBeVisible();
  await expect(page.getByLabel("BPM")).toHaveValue("128");
  await expect(page.getByText("Bars", { exact: true })).toBeVisible();

  const wavBase64 = createSilentWav(10).toString("base64");
  const dataTransfer = await page.evaluateHandle((base64) => {
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], "browser-verification.wav", { type: "audio/wav" }));
    return transfer;
  }, wavBase64);
  await page.getByTestId("timeline-scroll").dispatchEvent("dragenter", { dataTransfer });
  await expect(page.getByText("오디오 파일을 놓아 업로드", { exact: true })).toBeVisible();
  await page.getByTestId("timeline-scroll").dispatchEvent("drop", { dataTransfer });
  await expect(page.getByText("browser-verification.wav", { exact: true }).first()).toBeVisible();

  await page.getByLabel("타임라인 확대/축소").fill("4");
  await expect.poll(() => page.getByTestId("timeline-scroll").evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await page.getByTestId("timeline-scroll").evaluate((element) => { element.scrollLeft = 300; });
  await expect.poll(() => page.getByTestId("timeline-scroll").evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

  const rulerBar = await page.getByTestId("ruler-bar-marker").first().boundingBox();
  const waveformBar = await page.getByTestId("waveform-bar-marker").first().boundingBox();
  expect(rulerBar).not.toBeNull();
  expect(waveformBar).not.toBeNull();
  expect(Math.abs((rulerBar?.x ?? 0) - (waveformBar?.x ?? 0))).toBeLessThan(1);

  const timingSaved = page.waitForResponse((response) =>
    response.url().includes("/rest/v1/projects")
    && response.request().method() === "PATCH"
    && response.ok(),
  );
  await page.getByRole("button", { name: "1마디 시작 수정" }).click();
  const waveform = page.getByRole("slider", { name: "1마디 시작점을 선택할 파형" });
  const waveformBox = await waveform.boundingBox();
  await waveform.click({ position: { x: (waveformBox?.width ?? 400) * 0.25, y: 80 } });
  await timingSaved;
  await page.reload();
  await expect(page.getByText("0:02.5", { exact: true })).toBeVisible();

  await page.locator("body").press("Space");
  await expect(page.getByRole("button", { name: "일시 정지" })).toBeVisible();
  await page.locator("body").press("Space");
  await expect(page.getByRole("button", { name: "재생" })).toBeVisible();

  await page.getByRole("slider", { name: "파형에서 재생 또는 댓글 위치 선택" }).click({ position: { x: 160, y: 80 } });
  await page.getByPlaceholder("닉네임 / 이름").fill("Browser verifier");
  await page.getByPlaceholder("이 순간에 대한 의견을 남겨주세요.").fill("UI comment verification");
  await page.getByRole("button", { name: "등록" }).click();
  await expect(page.getByText("UI comment verification", { exact: true })).toBeVisible();
});
