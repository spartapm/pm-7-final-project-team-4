# 튜터 피드백 ver1.2 반영 메모

소스 (2026-09-08):

- 화면설계서 ver1.2: https://www.figma.com/design/Xx5ldWXp2UzfwsitIPUJcw/으라차차?node-id=1086-12184
- 유저플로우: https://www.figma.com/design/Xx5ldWXp2UzfwsitIPUJcw/으라차차?node-id=1197-14575
- 정책서: https://www.notion.so/3c32dc3ef514801ca115e91d9e8819e4
- PRD 7-2: https://www.notion.so/3c32dc3ef514805ea9bdf945c335a6c9
- 아이콘: `assets/icons/` → 런타임은 `public/icons`, `public/bg`

충돌 시 **화면설계서(피그마) 우선**.

## 자산

| 파일 | 처리 |
| --- | --- |
| `main_logo_text.png` | 로그인 로고+슬로건. `/` 에서 사용 |
| `camera_icon.png` | 프로필 수정 빈 사진 |
| `dog_img.png` / `cat_img.png` | 온보딩 카드 (파일명 유지, PNG 교체) |
| `home_bg_before.png` / `onboarding_bg_01.png` | 배경 교체 |

## 화면설계서 1.2

- **Memory-03 신설.** Memory-02 수정 → `/memory/[id]/edit`. List-02는 리스트 신규 작성만.
- List-02 뒤로가기: 변경 있음 → List-03-03, 없음 → List-01-01 (`/list`).
- Memory-03 뒤로가기: 변경 있음 → Memory-03-01, 없음 → Memory-02.
- Memory-03-01 저장하고 나가기: 검증 실패면 인라인 문구, 성공이면 Memory-02로.
- 완료 모달(List-03-01) 동안 입력값 유지. **딤 클릭으로 닫히지 않음.**
- 그 외 모달(List-03-02/03, Memory-03-01 등)은 딤 클릭으로 닫힘.
- 모달은 폰 셸 뷰포트 중앙, 딤은 `position: fixed`.

## 정책 5-1 / 5-2 / 7

- 5-1 엔티티는 기존과 동일 (User 1:1 Pet, ListItem 완료 시 Memory로 전환 후 리스트에서 삭제, 사진 0~5).
- 5-2 완료 기록 수정 경로가 **Memory-03**.
- 7은 임시저장만. 파기: 기록 완료 / 리스트 항목 삭제. 로그아웃 시 초안 삭제는 3-4 유지.

## PRD 7-2 트래킹

추가·변경:

- `sign_up` — 신규(온보딩 미완료)만
- `sign_up_fail` — `auth_cancel` / `auth_error` / `network`
- `nav_tab_click` — `tab_name`
- `record_edit_view.entry_point` — `list`만
- `record_photo_upload_fail`, `record_temp_save_fail`
- List-03-03 `record_exit_modal_action` / `record_complete_modal_action(item_id)`
- Memory-03: `memory_edit_view`, `memory_photo_add`, `memory_photo_upload_fail`, `memory_complete`, `memory_complete_fail`
- Memory-03-01: `memory_exit_modal_action`, `memory_complete_modal_action`
- `memory_detail_view.entry_point` — `home` / `memory`
