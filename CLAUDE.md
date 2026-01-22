# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

공간 대여 서비스 조직을 위한 사내 토이 프로젝트. 순수 HTML, CSS, JavaScript만 사용하며 모바일 반응형 디자인을 적용한다.

## 기술 스택

- **HTML5**: 시맨틱 마크업 사용
- **CSS3**: Flexbox/Grid 레이아웃, CSS Variables, Media Queries
- **JavaScript (ES6+)**: 바닐라 JS, 프레임워크 없음
- **빌드 도구**: 없음 (순수 정적 파일)

## 개발 환경

### 로컬 서버 실행
```bash
# Python 사용
python3 -m http.server 8080

# Node.js 사용 (npx)
npx serve .

# VS Code Live Server 확장 프로그램 사용 가능
```

### 파일 구조
```
/
├── index.html          # 메인 페이지
├── css/
│   └── style.css       # 메인 스타일시트
├── js/
│   └── main.js         # 메인 스크립트
├── assets/
│   └── images/         # 이미지 리소스
├── CLAUDE.md
└── .claude/
    ├── plan/           # 프로젝트 기획 문서
    └── settings.json   # Claude Code 설정
```

## 코딩 컨벤션

### HTML
- 들여쓰기: 2 spaces
- 모든 태그 소문자 사용
- alt 속성 필수 (이미지)
- lang="ko" 설정

### CSS
- BEM 네이밍 컨벤션 권장: `.block__element--modifier`
- CSS Variables 활용: `--color-primary`, `--spacing-md` 등
- 모바일 퍼스트 접근: 기본 스타일은 모바일, 미디어 쿼리로 확장

### JavaScript
- const/let 사용 (var 금지)
- 화살표 함수 선호
- DOM 조작 시 querySelector/querySelectorAll 사용
- 이벤트 위임 패턴 활용

## 반응형 디자인 브레이크포인트

```css
/* 모바일 (기본) */
/* 태블릿 */
@media (min-width: 768px) { }
/* 데스크톱 */
@media (min-width: 1024px) { }
/* 대형 화면 */
@media (min-width: 1440px) { }
```

## 브라우저 지원

- Chrome (최신)
- Safari (최신)
- Firefox (최신)
- 모바일 Safari (iOS)
- Chrome Mobile (Android)
