# 튜터 피드백 ver1.2 반영 메모

소스 (2026-09-08):

- 화면설계서 ver1.2: https://www.figma.com/design/Xx5ldWXp2UzfwsitIPUJcw/으라차차?node-id=1086-12184
- 유저플로우: https://www.figma.com/design/Xx5ldWXp2UzfwsitIPUJcw/으라차차?node-id=1197-14575
- 정책서: https://www.notion.so/3c32dc3ef514801ca115e91d9e8819e4
- PRD 7-2: https://www.notion.so/3c32dc3ef514805ea9bdf945c335a6c9
- 아이콘: `assets/icons/` → 런타임은 `public/icons`, `public/bg`

충돌 시 **화면설계서(피그마) 우선**.

## 화면설계서 1.2 장별

보드 섹션을 장마다 대조한 결과. 빨간 주석 기준.

### 공용 General-01 / General-02

- 헤더·탭바는 콘텐츠 스크롤과 분리해 고정
- 탭바 높이·아이콘 축소, 배경 `#FBF6EF`
- 미트볼/정렬 메뉴는 카드·다음 행보다 위. 바깥 클릭 시 닫힘
- 모달은 폰 셸 정중앙, 딤 `position: fixed`
- List-03-01·Memory-03-01만 딤 클릭으로 안 닫힘. 나머지 모달은 딤 클릭으로 닫힘

### Onboard-01 / Onboard-02

- 인라인 문구: 유효 입력 시 해제, 라벨 바로 오른쪽
- 여정 버튼: 테두리 1px `#000`, 기본 `#FBF6EF`, 선택 `#F0E0C8`
- 강아지/고양이 카드 중앙, 배경 `#FBF6EF`
- 나이 + 입력 가로, `(선택)` `#7B7878`
- 완료하기: 채우기/테두리 반전 (검정 채움, 크림 글자)

### Home-01

- 발바닥은 노드(슬롯) 안에만 표시

### List-01-01

- 행(제목) 클릭 → List-02
- ⋯ → 수정 → 그 자리 인라인 이름 수정. 기록 화면으로 안 감
- ⋯ → 삭제 → List-01-04 `리스트를 삭제할까요?`
- 메뉴가 다음 행에 가려 수정이 기록으로 가던 버그 수정
- + 버튼은 셸 우측 하단 고정, 리스트 스크롤과 무관

### List-02 / List-03

- 뒤로가기: 변경 있음 → List-03-03, 없음 → List-01-01
- 제목 placeholder `제목을 입력해주세요.`
- 본문 placeholder `소중한 순간들을 기록해보세요. (1,000자 내)`
- 완료 시 검증 실패는 인라인 (`제목을 입력해주세요.` / `이야기를 입력해주세요.`). 실패 모달 아님
- List-03-01 취소 라벨 `뒤로가기`. 딤 클릭 유지. 배경 입력값 유지
- List-03-02는 `다시하기`만

### Memory-01-01 / Memory-02 / Memory-03

- 정렬: 0~1장이면 버튼 숨김. 최신/오래된순은 완료 날짜. 배경 `#FBF6EF`
- 삭제 메뉴는 미트볼 아래, 카드 클릭과 분리
- 썸네일 178×178, `object-fit: contain`, 여백 `#FBF6EF`
- Memory-02 사진 300×300 contain, 흰 레터박스. `등록한 사진` 뱃지 삭제
- Memory-03: 완료만. 검증 실패 인라인. 성공/저장실패는 List-03-01/02
- 본문 placeholder `최대 1000자 입력 가능`
- 뒤로가기 변경 있음 → Memory-03-01 (딤 클릭 유지)

### Profile-01 / Profile-02

- 사후 얼굴 원 지름은 생전과 동일, 날개만 바깥
- 비선택 세그먼트 `#FBF6EF`
- 사진 있으면 camera_icon 오버레이 + `기본 프로필로 변경`
- 인라인 문구: 유효 입력 시 해제, 라벨 오른쪽

## 정책 5-1 / 5-2 / 7

- 5-1 엔티티는 기존과 동일 (User 1:1 Pet, ListItem 완료 시 Memory로 전환 후 리스트에서 삭제, 사진 0~5).
- 5-2 완료 기록 수정 경로가 **Memory-03**. 리스트 미트볼 수정 = 인라인 제목.
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
