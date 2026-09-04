# Pet Memory — 으라차차 (4조)

내배캠 PM 7기 4조 최종 프로젝트. 생전 버킷 리스트와 사후 추억 리스트를 기록하고 홈 여정 노드·메모리로 모아 봅니다.

화면은 [피그마 화면설계서](https://www.figma.com/design/Xx5ldWXp2UzfwsitIPUJcw/%EC%9C%BC%EB%9D%BC%EC%B0%A8%EC%B0%A8?node-id=157-21253)를 기준으로 맞췄습니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000

화면은 390px 폭 + `#DADBDF` 레터박스입니다. 개발자 도구 모바일 뷰(390×844)로 보는 것이 가장 가깝습니다.

## 데이터

- 로그인·반려동물·리스트·기록은 이 브라우저 `localStorage`에 캐시되고, Supabase `accounts` / `pets` / `list_items` / `memories`에 동기화됩니다.
- 카카오 로그인: `.env.local`에 `NEXT_PUBLIC_KAKAO_JS_KEY`가 있으면 Kakao JS SDK로 인증하고 `kakao_{id}` 계정으로 동기화합니다. 키가 없으면 버튼만 동작하는 데모 로그인입니다.
- 세션은 30일입니다. 로그아웃 시 임시저장만 지웁니다. 기록 작성 중 세션이 만료되면 임시저장한 뒤 로그인 화면으로 보내고, 재로그인 후 복원합니다.
- 회원 탈퇴 시 로컬과 Supabase 계정 데이터를 함께 삭제합니다.

## 환경변수

`.env.local`에 넣고, Vercel이면 Project Settings → Environment Variables에도 같은 이름으로 넣습니다.

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 앱 실행 | Supabase Project URL (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 앱 실행 | Publishable key (`sb_publishable_...`) |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | 실제 카카오 로그인 | [카카오 개발자](https://developers.kakao.com) JavaScript 키. 없으면 데모 로그인 |
| `DATABASE_URL` | 스키마 적용 시에만 | `postgresql://postgres:[DB-PASSWORD]@db.xxxx.supabase.co:5432/postgres` |

`NEXT_PUBLIC_` 값은 브라우저에 노출됩니다. Database password / service role key는 넣지 마세요.

테이블이 아직 없으면:

```bash
npm run db:schema
```

또는 [SQL Editor](https://supabase.com/dashboard/project/hivegovswxbzotqshkun/sql/new)에 `supabase/schema.sql`을 붙여넣고 Run 합니다.

## 화면

- Onboard-01 로그인 → Onboard-02 반려동물 정보
- Home-01 여정 노드 5개 (생전 상단 적재 / 사후 하단 적재)
- List-01 버킷·추억 리스트, List-02 기록 작성, 완료·임시저장 모달
- Memory-01 카드 그리드, Memory-02 상세
- Profile-01 모드 전환·로그아웃·탈퇴, Profile-02 수정
