alter table public.comments
  add column if not exists parent_id uuid references public.comments(id) on delete cascade;

create index if not exists comments_parent_created_idx
  on public.comments(parent_id, created_at);

create policy "public can delete comments"
  on public.comments for delete to anon, authenticated using (true);

create or replace function public.validate_comment_location()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_project_id uuid;
  target_duration numeric;
  parent_project_id uuid;
  parent_track_id uuid;
  parent_position numeric;
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

  if new.parent_id is not null then
    select project_id, track_id, position_seconds
      into parent_project_id, parent_track_id, parent_position
      from public.comments
     where id = new.parent_id;

    if parent_project_id is null then
      raise exception 'Parent comment does not exist';
    end if;

    if parent_project_id <> new.project_id
       or parent_track_id <> new.track_id
       or parent_position <> new.position_seconds then
      raise exception 'Reply must share its parent comment location';
    end if;
  end if;

  return new;
end;
$$;
