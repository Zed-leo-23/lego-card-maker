# 🧱 레고 카드메이커

부수기 전에, 내 레고 작품을 포켓몬 카드처럼 간직하세요.

**🌐 웹앱: https://zed-leo-23.github.io/lego-card-maker/**

사진을 찍으면 그 사진을 분석해서 이름·속성·능력치(HP/ATK/DEF)를 자동으로 만들어주고, 실제 인쇄할 수 있는 트레이딩 카드로 완성해줍니다. 모든 처리는 브라우저 안에서만 일어나고(서버 없음), 카드는 기기에 로컬로 저장됩니다.

## 개발

```bash
npm install
npm run dev
npm run build
```

`main` 브랜치에 push하면 GitHub Actions가 자동으로 빌드해서 GitHub Pages에 배포합니다.
