# AudioFigma

로그인 없이 공유 링크로 오디오 파형의 특정 위치에 코멘트를 남기는 협업 MVP입니다.

## MVP 범위

- 곡 프로젝트 생성과 공개 링크 공유
- 홈페이지 최근 공개 곡 목록과 트랙 수 Realtime 갱신
- 프로젝트별 다중 오디오 트랙 업로드(파일당 최대 50MB)
- 브라우저 `Web Audio API` 기반 실제 파형 표시
- 트랙 재생, 파형 탐색, 시간 표시
- BPM 기반 4/4 마디 눈금과 움직일 수 있는 1마디 시작점
- 공통 축척의 시간/마디 ruler, 전체 보기–400% zoom과 가로 scroll
- zoom에 따라 자동 전환되는 마디·4박·8분 subdivision grid와 시간/마디 댓글 위치
- 위치로 이동하는 댓글 thread, 답글 작성과 공개 삭제
- 파일 선택 및 다중 오디오 drag & drop 업로드
- Space 키 재생/정지
- 트랙·시간 위치별 닉네임 코멘트와 Supabase Realtime 갱신
- 로그인 없는 공개 열람/업로드/코멘트

## 로컬 실행

요구 환경은 Node.js 22.14 이상과 pnpm 10.29 이상입니다.

1. Supabase 무료 프로젝트를 만듭니다.
2. Supabase SQL Editor에서 `supabase/migrations` 안의 SQL 파일을 파일명 순서대로 실행합니다.
3. `.env.example`을 `.env.local`로 복사하고 Supabase Project URL과 publishable/anon key를 입력합니다. `service_role` key는 사용하지 않습니다.
4. 앱을 실행합니다.

```bash
pnpm install
pnpm dev
```

`http://localhost:3000`에서 프로젝트를 만들고 오디오를 올릴 수 있습니다.

연결 후 Storage, 공개 조회, 위치 댓글 무결성, Realtime을 한 번에 검증하려면 아래 명령을 실행합니다. 검증용 프로젝트 하나가 생성되며 출력된 slug로 앱에서도 열 수 있습니다.

```bash
pnpm verify:supabase
```

## Vercel 배포

1. 이 저장소를 GitHub에 push하고 Vercel에서 Next.js 프로젝트로 import합니다.
2. Vercel Project Settings → Environment Variables에 아래 값을 추가합니다.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Production 배포 후 프로젝트 생성 → 트랙 업로드 → 다른 브라우저에서 공유 링크 열기 → 코멘트 실시간 반영 순으로 확인합니다.

별도 `vercel.json`은 필요하지 않으며 build command는 `pnpm build`입니다.

## 검증

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## 현재 보안 경계

MVP 요구사항 때문에 링크를 가진 익명 사용자가 프로젝트 timing을 수정하고, 트랙과 코멘트를 추가할 수 있습니다. Storage bucket도 파형 재생을 위해 public입니다. 공개 URL 유출, 스팸, 저장 공간 남용을 막는 인증·권한·rate limit은 후속 단계의 필수 작업입니다.

롤백은 Supabase에서 migration으로 생성한 `comments`, `tracks`, `projects` 테이블과 `audio-tracks` bucket을 삭제하고 Vercel 배포를 이전 버전으로 되돌리는 방식입니다. 운영 데이터가 생긴 뒤에는 삭제 전에 반드시 backup을 만드세요.
