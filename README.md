# 🧱 레고 카드메이커

부수기 전에, 내 레고 작품을 포켓몬 카드처럼 간직하세요.

**🌐 웹앱: https://zed-leo-23.github.io/lego-card-maker/**

사진을 찍으면 배경을 지우고(AI 또는 간단 방식, 직접 탭해서 다듬기도 가능), 사진을 분석해 이름·속성·능력치(HP/ATK/DEF)를 자동으로 만들어서 실제 인쇄할 수 있는 트레이딩 카드로 완성해줍니다. 모든 처리는 브라우저 안에서만 일어나고(서버 없음), 카드는 기기에 로컬로 저장됩니다.

## GPU로 더 깨끗한 배경 제거 (선택)

웹앱의 배경 제거는 어떤 기기에서도 동작하도록 가벼운 모델을 씁니다. 더 정교한 결과가 필요하면 Colab의 무료 GPU로 돌리는 노트북을 써보세요.

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/Zed-leo-23/lego-card-maker/blob/main/colab/lego_bg_removal_gpu.ipynb)

노트북에서 만든 투명 배경 PNG를 웹앱 1단계에 업로드하면, 이미 배경이 없는 걸 자동으로 인식해서 2단계를 건너뛰고 바로 카드를 완성합니다.

## 개발

```bash
npm install
npm run dev
npm run build
```

`main` 브랜치에 push하면 GitHub Actions가 자동으로 빌드해서 GitHub Pages에 배포합니다.
