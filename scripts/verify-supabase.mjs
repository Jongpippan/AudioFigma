import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY가 필요합니다.");
}

const supabase = createClient(url, key);
const slug = `verify-${Date.now().toString(36)}`;

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const { data: project, error: projectError } = await supabase
  .from("projects")
  .insert({ slug, title: "MVP verification", bpm: 120, bar_offset_seconds: 0 })
  .select("*")
  .single();
if (projectError) throw projectError;

const storagePath = `${project.id}/verification.wav`;
const { error: uploadError } = await supabase.storage
  .from("audio-tracks")
  .upload(storagePath, createSilentWav(), { contentType: "audio/wav", upsert: false });
if (uploadError) throw uploadError;

const { data: track, error: trackError } = await supabase
  .from("tracks")
  .insert({
    project_id: project.id,
    name: "verification.wav",
    storage_path: storagePath,
    mime_type: "audio/wav",
    duration_seconds: 1,
    sort_order: 0,
  })
  .select("*")
  .single();
if (trackError) throw trackError;

const realtimeResult = new Promise((resolve, reject) => {
  let inserted = false;
  const timeout = setTimeout(async () => {
    const { count } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("project_id", project.id);
    reject(new Error(`Realtime comment event timeout (stored comments: ${count ?? "unknown"})`));
  }, 8000);
  const channel = supabase
    .channel(`verify:${project.id}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments", filter: `project_id=eq.${project.id}` }, (payload) => {
      clearTimeout(timeout);
      resolve({ channel, payload });
    })
    .subscribe(async (status) => {
      console.log(`Realtime subscription: ${status}`);
      if (status !== "SUBSCRIBED" || inserted) return;
      inserted = true;
      const { error } = await supabase.from("comments").insert({
        project_id: project.id,
        track_id: track.id,
        position_seconds: 0.5,
        author_name: "Verifier",
        body: "Realtime verification",
        parent_id: null,
      });
      if (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
});

const { channel, payload } = await realtimeResult;
assert(payload.new.project_id === project.id, "Realtime payload project가 예상과 다릅니다.");
await supabase.removeChannel(channel);

const { error: invalidPositionError } = await supabase.from("comments").insert({
  project_id: project.id,
  track_id: track.id,
  position_seconds: 2,
  author_name: "Verifier",
  body: "This insert must fail",
  parent_id: null,
});
assert(invalidPositionError, "트랙 길이를 넘는 댓글이 거부되지 않았습니다.");

const publicUrl = supabase.storage.from("audio-tracks").getPublicUrl(storagePath).data.publicUrl;
const audioResponse = await fetch(publicUrl);
assert(audioResponse.ok, `공개 오디오 조회 실패: ${audioResponse.status}`);

const { data: comments, error: commentsError } = await supabase
  .from("comments")
  .select("*")
  .eq("project_id", project.id);
if (commentsError) throw commentsError;
assert(comments.length === 1, "검증 댓글 수가 예상과 다릅니다.");

const { data: reply, error: replyError } = await supabase.from("comments").insert({
  project_id: project.id,
  track_id: track.id,
  position_seconds: 0.5,
  author_name: "Reply verifier",
  body: "Reply verification",
  parent_id: comments[0].id,
}).select("*").single();
if (replyError) throw replyError;
assert(reply.parent_id === comments[0].id, "답글 관계가 저장되지 않았습니다.");

const { error: deleteReplyError } = await supabase.from("comments").delete().eq("id", reply.id);
if (deleteReplyError) throw deleteReplyError;

const { count: remainingCommentCount, error: countError } = await supabase
  .from("comments")
  .select("*", { count: "exact", head: true })
  .eq("project_id", project.id);
if (countError) throw countError;
assert(remainingCommentCount === 1, "답글 삭제 후 댓글 수가 예상과 다릅니다.");

console.log(`Supabase MVP verification passed: /p/${slug}`);
console.log("검증용 프로젝트는 Supabase Dashboard에서 삭제할 수 있습니다.");
