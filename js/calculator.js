/**
 * 공간 이용료 계산기
 * 호스트 수익과 게스트 결제금액을 실시간으로 계산합니다.
 *
 * 추가 비용 항목:
 * - 시즌 요금 (기본/성수기/극성수기/핫타임/휴일/휴일전일)
 * - 인당 가격 (인원 수에 따른 요금)
 * - 추가 인원 비용 (기준 인원 초과 시)
 * - 옵션 상품 (동적 추가)
 */

// ===================================
// 설정 상수
// ===================================
const CONFIG = {
  PLATFORM_FEE_RATE: 0.1,  // 플랫폼 수수료율 10%
  VAT_RATE: 0.1,           // 부가세율 10%
  MIN_HOURS: 1,            // 최소 이용 시간
  SEASON_RATES: {
    standard: { rate: 1.0, label: '기본' },
    peak: { rate: 1.2, label: '성수기' },
    highPeak: { rate: 1.5, label: '극성수기' },
    hotTime: { rate: 1.3, label: '핫타임' },
    holiday: { rate: 1.2, label: '휴일' },
    holidayEve: { rate: 1.1, label: '휴일전일' }
  }
};

// ===================================
// 상태 관리
// ===================================
let optionItems = [];
let optionIdCounter = 0;

// ===================================
// DOM 요소
// ===================================
const elements = {
  // 기본 정보 입력
  hourlyRate: document.getElementById('hourlyRate'),
  perPersonPrice: document.getElementById('perPersonPrice'),
  personCountGroup: document.getElementById('personCountGroup'),
  personCount: document.getElementById('personCount'),
  hours: document.getElementById('hours'),
  seasonType: document.getElementById('seasonType'),

  // 추가 인원 비용
  extraPersonCheck: document.getElementById('extraPersonCheck'),
  extraPersonFields: document.getElementById('extraPersonFields'),
  basePersonCount: document.getElementById('basePersonCount'),
  extraPersonCount: document.getElementById('extraPersonCount'),
  extraPersonPrice: document.getElementById('extraPersonPrice'),
  extraPersonPerHour: document.getElementById('extraPersonPerHour'),

  // 옵션 상품
  optionItemsContainer: document.getElementById('optionItemsContainer'),
  addOptionBtn: document.getElementById('addOptionBtn'),

  // 기타 옵션
  vatIncluded: document.getElementById('vatIncluded'),

  // 결과 표시
  baseAmount: document.getElementById('baseAmount'),
  seasonRow: document.getElementById('seasonRow'),
  seasonLabel: document.getElementById('seasonLabel'),
  seasonAmount: document.getElementById('seasonAmount'),
  perPersonRow: document.getElementById('perPersonRow'),
  perPersonLabel: document.getElementById('perPersonLabel'),
  perPersonAmount: document.getElementById('perPersonAmount'),
  extraPersonRow: document.getElementById('extraPersonRow'),
  extraPersonLabel: document.getElementById('extraPersonLabel'),
  extraPersonAmount: document.getElementById('extraPersonAmount'),
  optionRow: document.getElementById('optionRow'),
  optionAmount: document.getElementById('optionAmount'),
  vatRow: document.getElementById('vatRow'),
  vatAmount: document.getElementById('vatAmount'),
  guestPayment: document.getElementById('guestPayment'),
  platformFee: document.getElementById('platformFee'),
  hostRevenue: document.getElementById('hostRevenue'),

  // 버튼
  copyBtn: document.getElementById('copyBtn'),
  resetBtn: document.getElementById('resetBtn'),

  // 토스트
  toast: document.getElementById('toast')
};

// ===================================
// 유틸리티 함수
// ===================================

const formatNumber = (num) => {
  return new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

const parseNumber = (str) => {
  if (!str) return 0;
  const num = parseInt(str.replace(/,/g, ''), 10);
  return isNaN(num) ? 0 : num;
};

const formatCurrency = (num) => {
  return formatNumber(num) + '원';
};

// ===================================
// 계산 함수
// ===================================

const calculate = () => {
  // 기본 입력값
  const hourlyRate = parseNumber(elements.hourlyRate.value);
  const hours = parseInt(elements.hours.value, 10) || CONFIG.MIN_HOURS;
  const perPersonEnabled = elements.perPersonPrice.checked;
  const personCount = perPersonEnabled ? (parseInt(elements.personCount.value, 10) || 1) : 1;
  const seasonType = elements.seasonType.value;
  const seasonRate = CONFIG.SEASON_RATES[seasonType]?.rate || 1.0;
  const seasonLabel = CONFIG.SEASON_RATES[seasonType]?.label || '기본';

  // 추가 인원 비용
  const extraPersonEnabled = elements.extraPersonCheck.checked;
  const extraPersonCnt = extraPersonEnabled ? (parseInt(elements.extraPersonCount.value, 10) || 0) : 0;
  const extraPersonPriceValue = extraPersonEnabled ? parseNumber(elements.extraPersonPrice.value) : 0;
  const extraPersonPerHour = elements.extraPersonPerHour.checked;

  // 옵션 상품 비용
  let optionTotalPrice = 0;
  optionItems.forEach(item => {
    const price = parseNumber(item.priceInput.value) || 0;
    const qty = parseInt(item.qtyInput.value, 10) || 1;
    optionTotalPrice += price * qty;
  });

  // 부가세
  const vatIncluded = elements.vatIncluded.checked;

  // 계산
  // 1. 기본 요금 (시간당 요금 × 시간)
  const baseAmount = hourlyRate * hours;

  // 2. 시즌 할증 금액
  const seasonAdjustment = baseAmount * (seasonRate - 1);
  const afterSeason = baseAmount + seasonAdjustment;

  // 3. 인당 요금 (인당 가격이면 인원 수를 곱함)
  const perPersonMultiplier = perPersonEnabled ? personCount : 1;
  const perPersonAdjustment = perPersonEnabled ? afterSeason * (perPersonMultiplier - 1) : 0;
  const afterPerPerson = afterSeason * perPersonMultiplier;

  // 4. 추가 인원 비용
  let extraPersonCost = 0;
  if (extraPersonEnabled && extraPersonCnt > 0) {
    if (extraPersonPerHour) {
      extraPersonCost = extraPersonPriceValue * extraPersonCnt * hours;
    } else {
      extraPersonCost = extraPersonPriceValue * extraPersonCnt;
    }
  }

  // 5. 소계 (기본요금 + 시즌 + 인당 + 추가인원 + 옵션)
  const subtotal = afterPerPerson + extraPersonCost + optionTotalPrice;

  // 6. 부가세
  const vatAmount = vatIncluded ? subtotal * CONFIG.VAT_RATE : 0;
  const guestPayment = subtotal + vatAmount;

  // 7. 플랫폼 수수료 및 호스트 정산액
  const platformFee = guestPayment * CONFIG.PLATFORM_FEE_RATE;
  const hostRevenue = guestPayment - platformFee;

  // 결과 표시
  updateResults({
    baseAmount,
    seasonAdjustment,
    seasonRate,
    seasonLabel,
    perPersonEnabled,
    perPersonAdjustment,
    personCount,
    extraPersonEnabled,
    extraPersonCost,
    extraPersonCnt,
    optionTotalPrice,
    vatAmount,
    vatIncluded,
    guestPayment,
    platformFee,
    hostRevenue
  });
};

const updateResults = (results) => {
  // 기본 요금
  elements.baseAmount.textContent = formatCurrency(results.baseAmount);

  // 시즌 할증
  if (results.seasonRate > 1) {
    elements.seasonRow.style.display = 'flex';
    elements.seasonLabel.textContent = results.seasonLabel + ' 할증 (' + Math.round((results.seasonRate - 1) * 100) + '%)';
    elements.seasonAmount.textContent = '+' + formatCurrency(results.seasonAdjustment);
  } else {
    elements.seasonRow.style.display = 'none';
  }

  // 인당 요금
  if (results.perPersonEnabled && results.personCount > 1) {
    elements.perPersonRow.style.display = 'flex';
    elements.perPersonLabel.textContent = '인원 요금 (' + results.personCount + '명)';
    elements.perPersonAmount.textContent = '+' + formatCurrency(results.perPersonAdjustment);
  } else {
    elements.perPersonRow.style.display = 'none';
  }

  // 추가 인원 비용
  if (results.extraPersonEnabled && results.extraPersonCost > 0) {
    elements.extraPersonRow.style.display = 'flex';
    elements.extraPersonLabel.textContent = '추가 인원 (' + results.extraPersonCnt + '명)';
    elements.extraPersonAmount.textContent = '+' + formatCurrency(results.extraPersonCost);
  } else {
    elements.extraPersonRow.style.display = 'none';
  }

  // 옵션 상품
  if (results.optionTotalPrice > 0) {
    elements.optionRow.style.display = 'flex';
    elements.optionAmount.textContent = '+' + formatCurrency(results.optionTotalPrice);
  } else {
    elements.optionRow.style.display = 'none';
  }

  // 부가세
  elements.vatRow.style.display = results.vatIncluded ? 'flex' : 'none';
  elements.vatAmount.textContent = '+' + formatCurrency(results.vatAmount);

  // 최종 결과
  elements.guestPayment.textContent = formatCurrency(results.guestPayment);
  elements.platformFee.textContent = formatCurrency(results.platformFee);
  elements.hostRevenue.textContent = formatCurrency(results.hostRevenue);
};

// ===================================
// 옵션 상품 관리
// ===================================

const createOptionItem = () => {
  const id = ++optionIdCounter;
  const item = document.createElement('div');
  item.className = 'option-item';
  item.dataset.id = id;
  item.innerHTML = '<input type="text" class="option-item__name" placeholder="옵션명" />' +
    '<input type="text" class="option-item__price" placeholder="가격" inputmode="numeric" />' +
    '<input type="number" class="option-item__qty" value="1" min="1" />' +
    '<button type="button" class="option-item__remove">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
    '<line x1="18" y1="6" x2="6" y2="18"></line>' +
    '<line x1="6" y1="6" x2="18" y2="18"></line>' +
    '</svg></button>';

  const nameInput = item.querySelector('.option-item__name');
  const priceInput = item.querySelector('.option-item__price');
  const qtyInput = item.querySelector('.option-item__qty');
  const removeBtn = item.querySelector('.option-item__remove');

  // 가격 입력 시 천단위 콤마
  priceInput.addEventListener('input', (e) => {
    const num = parseNumber(e.target.value);
    e.target.value = num > 0 ? formatNumber(num) : '';
    calculate();
  });

  // 수량 변경 시 계산
  qtyInput.addEventListener('input', calculate);

  // 삭제 버튼
  removeBtn.addEventListener('click', () => {
    const index = optionItems.findIndex(opt => opt.id === id);
    if (index > -1) {
      optionItems.splice(index, 1);
    }
    item.remove();
    calculate();
  });

  elements.optionItemsContainer.appendChild(item);

  const optionData = { id, element: item, nameInput, priceInput, qtyInput };
  optionItems.push(optionData);

  nameInput.focus();
  return optionData;
};

// ===================================
// 입력 필드 이벤트 핸들러
// ===================================

const handleNumberInput = (e) => {
  const input = e.target;
  const cursorPos = input.selectionStart;
  const oldValue = input.value;
  const oldLength = oldValue.length;

  const num = parseNumber(oldValue);
  const formatted = num > 0 ? formatNumber(num) : '';
  input.value = formatted;

  const newLength = formatted.length;
  const diff = newLength - oldLength;
  const newPos = Math.max(0, cursorPos + diff);
  input.setSelectionRange(newPos, newPos);

  calculate();
};

// ===================================
// 액션 버튼 핸들러
// ===================================

const copyToClipboard = async () => {
  const hourlyRate = parseNumber(elements.hourlyRate.value);
  const hours = parseInt(elements.hours.value, 10) || CONFIG.MIN_HOURS;
  const seasonType = elements.seasonType.value;
  const seasonLabel = CONFIG.SEASON_RATES[seasonType]?.label || '기본';
  const guestPayment = elements.guestPayment.textContent;
  const platformFee = elements.platformFee.textContent;
  const hostRevenue = elements.hostRevenue.textContent;

  let text = '[공간 이용료 계산 결과]\n' +
    '시간당 요금: ' + formatCurrency(hourlyRate) + '\n' +
    '이용 시간: ' + hours + '시간\n' +
    '시즌: ' + seasonLabel;

  if (elements.perPersonPrice.checked) {
    const personCount = parseInt(elements.personCount.value, 10) || 1;
    text += '\n인원: ' + personCount + '명 (인당 가격)';
  }

  if (elements.extraPersonCheck.checked) {
    const extraPersonCnt = parseInt(elements.extraPersonCount.value, 10) || 0;
    if (extraPersonCnt > 0) {
      text += '\n추가 인원: ' + extraPersonCnt + '명';
    }
  }

  if (optionItems.length > 0) {
    text += '\n옵션 상품: ' + optionItems.length + '개';
  }

  text += '\n────────────────\n' +
    '게스트 결제금액: ' + guestPayment + '\n' +
    '플랫폼 수수료: ' + platformFee + '\n' +
    '호스트 정산액: ' + hostRevenue;

  try {
    await navigator.clipboard.writeText(text);
    showToast('결과가 복사되었습니다');
  } catch (err) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('결과가 복사되었습니다');
  }
};

const resetForm = () => {
  // 기본 정보
  elements.hourlyRate.value = '';
  elements.perPersonPrice.checked = false;
  elements.personCountGroup.style.display = 'none';
  elements.personCount.value = '1';
  elements.hours.value = '1';
  elements.seasonType.value = 'standard';

  // 추가 인원
  elements.extraPersonCheck.checked = false;
  elements.extraPersonFields.style.display = 'none';
  elements.basePersonCount.value = '2';
  elements.extraPersonCount.value = '0';
  elements.extraPersonPrice.value = '';
  elements.extraPersonPerHour.checked = false;

  // 옵션 상품
  optionItems = [];
  elements.optionItemsContainer.innerHTML = '';

  // 기타 옵션
  elements.vatIncluded.checked = false;

  calculate();
  showToast('초기화되었습니다');
};

const showToast = (message, duration = 2000) => {
  elements.toast.textContent = message;
  elements.toast.classList.add('toast--visible');

  setTimeout(() => {
    elements.toast.classList.remove('toast--visible');
  }, duration);
};

// ===================================
// 이벤트 리스너 등록
// ===================================
const initEventListeners = () => {
  // 기본 정보
  elements.hourlyRate.addEventListener('input', handleNumberInput);

  elements.perPersonPrice.addEventListener('change', () => {
    elements.personCountGroup.style.display = elements.perPersonPrice.checked ? 'block' : 'none';
    if (elements.perPersonPrice.checked) {
      elements.personCount.focus();
    }
    calculate();
  });

  elements.personCount.addEventListener('input', () => {
    const value = parseInt(elements.personCount.value, 10);
    if (value < 1) {
      elements.personCount.value = 1;
    }
    calculate();
  });

  elements.hours.addEventListener('input', () => {
    const value = parseInt(elements.hours.value, 10);
    if (value < CONFIG.MIN_HOURS) {
      elements.hours.value = CONFIG.MIN_HOURS;
    }
    calculate();
  });

  elements.seasonType.addEventListener('change', calculate);

  // 추가 인원 비용
  elements.extraPersonCheck.addEventListener('change', () => {
    elements.extraPersonFields.style.display = elements.extraPersonCheck.checked ? 'block' : 'none';
    calculate();
  });

  elements.basePersonCount.addEventListener('input', calculate);
  elements.extraPersonCount.addEventListener('input', calculate);
  elements.extraPersonPrice.addEventListener('input', handleNumberInput);
  elements.extraPersonPerHour.addEventListener('change', calculate);

  // 옵션 상품
  elements.addOptionBtn.addEventListener('click', createOptionItem);

  // 기타 옵션
  elements.vatIncluded.addEventListener('change', calculate);

  // 버튼
  elements.copyBtn.addEventListener('click', copyToClipboard);
  elements.resetBtn.addEventListener('click', resetForm);

  // 폼 제출 방지
  document.getElementById('calculatorForm').addEventListener('submit', (e) => {
    e.preventDefault();
  });
};

// ===================================
// 초기화
// ===================================
const init = () => {
  initEventListeners();
  calculate();
};

document.addEventListener('DOMContentLoaded', init);
