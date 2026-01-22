/**
 * 팀 무드 체크 보드
 * 팀원들의 일일 컨디션/기분을 익명으로 체크인하고 팀 전체 분위기를 파악합니다.
 */

// ===================================
// 설정 상수
// ===================================
const CONFIG = {
  TEAM_TOTAL: 15,           // 팀 총 인원
  MAX_COMMENTS_DISPLAY: 5,  // 표시할 최근 코멘트 수
  MOOD_EMOJIS: ['😫', '😕', '😐', '🙂', '😄'],
  MOOD_LABELS: ['매우 나쁨', '나쁨', '보통', '좋음', '매우 좋음'],
  STORAGE_PREFIX: 'moodboard_'
};

// ===================================
// DOM 요소
// ===================================
const elements = {
  // 체크인 폼
  checkinForm: document.getElementById('checkinForm'),
  moodInputs: document.querySelectorAll('input[name="mood"]'),
  comment: document.getElementById('comment'),
  commentLength: document.getElementById('commentLength'),
  checkinBtn: document.getElementById('checkinBtn'),

  // 대시보드
  checkinCount: document.getElementById('checkinCount'),
  teamTotal: document.getElementById('teamTotal'),
  checkinBar: document.getElementById('checkinBar'),
  averageEmoji: document.getElementById('averageEmoji'),
  averageScore: document.getElementById('averageScore'),
  moodMeter: document.getElementById('moodMeter'),
  commentsList: document.getElementById('commentsList'),

  // 토스트
  toast: document.getElementById('toast')
};

// ===================================
// 유틸리티 함수
// ===================================

/**
 * 오늘 날짜 키 생성
 */
const getTodayKey = () => {
  return CONFIG.STORAGE_PREFIX + new Date().toISOString().split('T')[0];
};

/**
 * 사용자 ID 가져오기 (없으면 생성)
 */
const getUserId = () => {
  let userId = localStorage.getItem(CONFIG.STORAGE_PREFIX + 'user_id');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem(CONFIG.STORAGE_PREFIX + 'user_id', userId);
  }
  return userId;
};

/**
 * UUID 생성
 */
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// ===================================
// 데이터 관리
// ===================================

/**
 * 오늘 데이터 가져오기
 */
const getTodayData = () => {
  const key = getTodayKey();
  const data = localStorage.getItem(key);

  if (data) {
    return JSON.parse(data);
  }

  return {
    date: new Date().toISOString().split('T')[0],
    checkins: []
  };
};

/**
 * 오늘 데이터 저장하기
 */
const saveTodayData = (data) => {
  const key = getTodayKey();
  localStorage.setItem(key, JSON.stringify(data));
};

/**
 * 체크인 저장
 */
const saveCheckin = (mood, comment) => {
  const userId = getUserId();
  const data = getTodayData();

  // 기존 체크인 찾기 (동일 사용자)
  const existingIndex = data.checkins.findIndex(c => c.userId === userId);

  const checkinData = {
    id: existingIndex >= 0 ? data.checkins[existingIndex].id : generateUUID(),
    userId: userId,
    mood: mood,
    comment: comment.trim(),
    timestamp: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    // 기존 체크인 업데이트
    data.checkins[existingIndex] = checkinData;
  } else {
    // 새 체크인 추가
    data.checkins.push(checkinData);
  }

  saveTodayData(data);
  return existingIndex >= 0 ? 'updated' : 'created';
};

/**
 * 현재 사용자의 오늘 체크인 가져오기
 */
const getUserCheckin = () => {
  const userId = getUserId();
  const data = getTodayData();
  return data.checkins.find(c => c.userId === userId);
};

/**
 * 통계 계산
 */
const calculateStats = () => {
  const data = getTodayData();
  const checkins = data.checkins;

  if (checkins.length === 0) {
    return {
      total: 0,
      average: 0,
      comments: []
    };
  }

  const totalMood = checkins.reduce((sum, c) => sum + c.mood, 0);
  const average = totalMood / checkins.length;

  // 코멘트가 있는 체크인만 필터링하고 최신순 정렬
  const comments = checkins
    .filter(c => c.comment && c.comment.trim() !== '')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, CONFIG.MAX_COMMENTS_DISPLAY)
    .map(c => c.comment);

  return {
    total: checkins.length,
    average: average,
    comments: comments
  };
};

// ===================================
// UI 렌더링
// ===================================

/**
 * 무드 이모지 가져오기
 */
const getMoodEmoji = (score) => {
  if (score <= 0) return '😐';
  const index = Math.min(Math.round(score) - 1, 4);
  return CONFIG.MOOD_EMOJIS[Math.max(0, index)];
};

/**
 * 통계 업데이트
 */
const updateStats = () => {
  const stats = calculateStats();

  // 체크인 현황
  elements.checkinCount.textContent = stats.total;
  elements.teamTotal.textContent = CONFIG.TEAM_TOTAL;
  const checkinPercent = (stats.total / CONFIG.TEAM_TOTAL) * 100;
  elements.checkinBar.style.width = `${Math.min(checkinPercent, 100)}%`;

  // 평균 무드
  elements.averageEmoji.textContent = getMoodEmoji(stats.average);
  elements.averageScore.textContent = stats.total > 0 ? stats.average.toFixed(1) : '0.0';

  // 무드 미터 (1~5 점수를 0~100%로 변환)
  const moodPercent = stats.total > 0 ? ((stats.average - 1) / 4) * 100 : 0;
  elements.moodMeter.style.width = `${moodPercent}%`;

  // 코멘트 피드
  renderComments(stats.comments);
};

/**
 * 코멘트 피드 렌더링
 */
const renderComments = (comments) => {
  if (comments.length === 0) {
    elements.commentsList.innerHTML = '<li class="comments-list__empty">아직 코멘트가 없어요</li>';
    return;
  }

  elements.commentsList.innerHTML = comments
    .map(comment => `<li class="comments-list__item">${escapeHtml(comment)}</li>`)
    .join('');
};

/**
 * HTML 이스케이프
 */
const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * 체크인 버튼 상태 업데이트
 */
const updateCheckinButton = () => {
  const selectedMood = document.querySelector('input[name="mood"]:checked');
  elements.checkinBtn.disabled = !selectedMood;
};

/**
 * 기존 체크인 데이터로 폼 채우기
 */
const fillExistingCheckin = () => {
  const existingCheckin = getUserCheckin();

  if (existingCheckin) {
    // 무드 선택
    const moodInput = document.querySelector(`input[name="mood"][value="${existingCheckin.mood}"]`);
    if (moodInput) {
      moodInput.checked = true;
    }

    // 코멘트
    if (existingCheckin.comment) {
      elements.comment.value = existingCheckin.comment;
      elements.commentLength.textContent = existingCheckin.comment.length;
    }

    updateCheckinButton();
  }
};

/**
 * 토스트 메시지 표시
 */
const showToast = (message, duration = 2000) => {
  elements.toast.textContent = message;
  elements.toast.classList.add('toast--visible');

  setTimeout(() => {
    elements.toast.classList.remove('toast--visible');
  }, duration);
};

// ===================================
// 이벤트 핸들러
// ===================================

/**
 * 무드 선택 핸들러
 */
const handleMoodSelect = () => {
  updateCheckinButton();
};

/**
 * 코멘트 입력 핸들러
 */
const handleCommentInput = () => {
  const length = elements.comment.value.length;
  elements.commentLength.textContent = length;
};

/**
 * 체크인 제출 핸들러
 */
const handleCheckin = (e) => {
  e.preventDefault();

  const selectedMood = document.querySelector('input[name="mood"]:checked');
  if (!selectedMood) {
    showToast('기분을 선택해주세요');
    return;
  }

  const mood = parseInt(selectedMood.value, 10);
  const comment = elements.comment.value.trim();

  const result = saveCheckin(mood, comment);

  if (result === 'updated') {
    showToast('체크인이 업데이트되었습니다!');
  } else {
    showToast('체크인 완료! 오늘도 좋은 하루 보내세요');
  }

  updateStats();
};

// ===================================
// 이벤트 리스너 등록
// ===================================
const initEventListeners = () => {
  // 무드 선택
  elements.moodInputs.forEach(input => {
    input.addEventListener('change', handleMoodSelect);
  });

  // 코멘트 입력
  elements.comment.addEventListener('input', handleCommentInput);

  // 체크인 폼 제출
  elements.checkinForm.addEventListener('submit', handleCheckin);
};

// ===================================
// 초기화
// ===================================
const init = () => {
  initEventListeners();
  fillExistingCheckin();
  updateStats();
};

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', init);
