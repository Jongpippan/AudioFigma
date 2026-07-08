create or replace function public.validate_comment_location()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_project_id uuid;
  target_duration numeric;
begin
  select project_id, duration_seconds
    into target_project_id, target_duration
    from public.tracks
   where id = new.track_id;

  if target_project_id is null then
    raise exception 'Track does not exist';
  end if;

  if target_project_id <> new.project_id then
    raise exception 'Comment project must match its track project';
  end if;

  if new.position_seconds > target_duration then
    raise exception 'Comment position exceeds track duration';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_comment_location_before_write on public.comments;
create trigger validate_comment_location_before_write
before insert or update on public.comments
for each row execute function public.validate_comment_location();

revoke update on table public.projects from anon, authenticated;
grant update (bpm, bar_offset_seconds) on table public.projects to anon, authenticated;

drop policy if exists "public can upload audio" on storage.objects;
create policy "public can upload audio" on storage.objects for insert to anon, authenticated
with check (
  bucket_id = 'audio-tracks'
  and exists (
    select 1
      from public.projects
     where projects.id::text = (storage.foldername(name))[1]
  )
);
