// Firestore를 데이터 저장소로 사용해서, 어느 기기/브라우저에서 접속해도
// 같은 카드 컬렉션이 보이게 한다. 여기 들어있는 설정값(firebaseConfig)은
// 비밀키가 아니라 공개 식별값이다 - 실제 보안은 Firestore 보안 규칙이 맡는다.
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDKUBKNAi1J2b35FhGOFlBoiTUPF8_A39k',
  authDomain: 'lego-card.firebaseapp.com',
  projectId: 'lego-card',
  storageBucket: 'lego-card.firebasestorage.app',
  messagingSenderId: '361895092053',
  appId: '1:361895092053:web:6e30ebfe32365ef05759dc',
  measurementId: 'G-WQ89LHEFHY',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const cardsCol = collection(db, 'cards');

function toPlainCard(docSnap) {
  return { ...docSnap.data(), id: docSnap.id };
}

/** 한 번만 전체 카드를 읽어온다 (최신순). */
export async function fetchAllCardsOnce() {
  const q = query(cardsCol, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(toPlainCard);
}

/**
 * 카드 컬렉션 변경을 실시간으로 구독한다. 다른 기기에서 저장/삭제해도
 * 콜백이 자동으로 다시 불린다.
 * @param {(cards: object[]) => void} onChange
 * @param {(err: Error) => void} [onError]
 * @returns {() => void} 구독 해제 함수
 */
export function subscribeToCards(onChange, onError) {
  const q = query(cardsCol, orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map(toPlainCard)),
    onError
  );
}

/** 카드를 저장(또는 덮어쓰기)한다. card.id를 문서 ID로 그대로 쓴다. */
export async function pushCard(card) {
  await setDoc(doc(cardsCol, card.id), card);
}

export async function removeCard(id) {
  await deleteDoc(doc(cardsCol, id));
}
