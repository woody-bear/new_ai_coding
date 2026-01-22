/**
 * 공간 이용료 계산기
 * 호스트 수익과 게스트 결제금액을 실시간으로 계산합니다.
 */

// ===================================
// 설정 상수
// ===================================
const CONFIG = {
  PLATFORM_FEE_RATE: 0.1,  // 플랫폼 수수료율 10%
  VAT_RATE: 0.1,           // 부가세율 10%
  MIN_HOURS: 1,            // 최소 이용 시간
  MAX_DISCOUNT: 100,       // 최대 할인율
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
// DOM 요소
// ===================================
const elements = {
  // 기본 입력 필드
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

  // 기타 비용
  cleaningFeeCheck: document.getElementById('cleaningFeeCheck'),
  cleaningFee: document.getElementById('cleaningFee'),
  cleaningFeeWrapper: document.getElementById('cleaningFeeWrapper'),
  discountCheck: document.getElementById('discountCheck'),
  discountRate: document.getElementById('discountRate'),
  discountWrapper: document.getElementById('discountWrapper'),
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
  cleaningRow: document.getElementById('cleaningRow'),
  cleaningAmount: document.getElementById('cleaningAmount'),
  discountRow: document.getElementById('discountRow'),
  discountAmount: document.getElementById('discountAmount'),
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

// 옵션 아이템 카운터
let optionCounter = 0;

// ===================================
// 유틸리티 함수
// ===================================

/**
 * 숫자를 천단위 콤마가 포함된 문자열로 변환
 */
const formatNumber = (num) => {
  return new Intl.NumberFormat('ko-KR').format(Math.round(num));
};

/**
 * 천단위 콤마가 포함된 문자열을 숫자로 변환
 */
const parseNumber = (str) => {
  if (!str) return 0;
  const num = parseInt(str.replace(/,/g, ''), 10);
  return isNaN(num) ? 0 : num;
};

/**
 * 금액 문자열 생성 (원 단위)
 */
const formatCurrency = (num) => {
  return formatNumber(num) + '원';
};

// ===================================
// 옵션 아이템 관리
// ===================================

/**
 * 옵션 아이템 추가
 */
const addOptionItem = () => {
  optionCounter++;
  const itemId = `option-${optionCounter}`;

  const itemHtml = `
    <div class="option-item" id="${itemId}">
      <input type="text" class="option-item__name" placeholder="옵션명" data-field="name">
      <input type="text" class="option-item__price" placeholder="가격" inputmode="numeric" data-field="price">
      <input type="number" class="option-item__qty" value="1" min="1" data-field="qty">
      <button type="button" class="option-item__remove" data-item-id="${itemId}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `;

  elements.optionItemsContainer.insertAdjacentHTML('beforeend', itemHtml);

  // 이벤트 리스너 추가
  const newItem = document.getElementById(itemId);
  newItem.querySelector('[data-field="price"]').addEventListener('input', handleNumberInput);
  newItem.querySelector('[data-field="qty"]').addEventListener('input', calculate);
  newItem.querySelector('.option-item__remove').addEventListener('click', (e) => {
    removeOptionItem(e.target.closest('.option-item__remove').dataset.itemId);
  });

  calculate();
};

/**
 * 옵션 아이템 삭제
 */
const removeOptionItem = (itemId) => {
  const item = document.getElementById(itemId);
  if (item) {
    item.remove();
    calculate();
  }
};

/**
 * 모든 옵션 아이템의 총합 계산
 */
const calculateOptionsTotal = () => {
  let total = 0;
  const optionItems = elements.optionItemsContainer.querySelectorAll('.option-item');

  optionItems.forEach(item => {
    const price = parseNumber(item.querySelector('[data-field="price"]').value);
    const qty = parseInt(item.querySelector('[data-field="qty"]').value, 10) || 1;
    total += price * qty;
  });

  return total;
};

// ===================================
// 계산 함수
// ===================================

/**
 * 전체 계산 실행
 */
const calculate = () => {
  // 기본 입력값 가져오기
  const hourlyRate = parseNumber(elements.hourlyRate.value);
  const hours = parseInt(elements.hours.value, 10) || CONFIG.MIN_HOURS;
  const isPerPersonPrice = elements.perPersonPrice.checked;
  const personCount = isPerPersonPrice ? (parseInt(elements.personCount.value, 10) || 1) : 1;
  const seasonType = elements.seasonType.value;
  const seasonInfo = CONFIG.SEASON_RATES[seasonType] || CONFIG.SEASON_RATES.standard;

  // 추가 인원 비용
  const extraPersonEnabled = elements.extraPersonCheck.checked;
  const basePersonCount = parseInt(elements.basePersonCount.value, 10) || 2;
  const extraPersonCount = parseInt(elements.extraPersonCount.value, 10) || 0;
  const extraPersonPrice = parseNumber(elements.extraPersonPrice.value);
  const extraPersonPerHour = elements.extraPersonPerHour.checked;

  // 기타 비용
  const cleaningFeeEnabled = elements.cleaningFeeCheck.checked;
  const cleaningFee = cleaningFeeEnabled ? parseNumber(elements.cleaningFee.value) : 0;
  const discountEnabled = elements.discountCheck.checked;
  const discountRate = discountEnabled ? Math.min(parseFloat(elements.discountRate.value) || 0, CONFIG.MAX_DISCOUNT) : 0;
  const vatIncluded = elements.vatIncluded.checked;

  // 기본 요금 계산
  let baseAmount = hourlyRate * hours;

  // 인당 가격인 경우 인원수 적용
  let perPersonTotal = 0;
  if (isPerPersonPrice) {
    perPersonTotal = baseAmount * personCount;
    baseAmount = hourlyRate * hours; // 기본 요금은 1인 기준
  }

  // 시즌 할증 계산
  const priceBeforeSeason = isPerPersonPrice ? perPersonTotal : baseAmount;
  const seasonMultiplier = seasonInfo.rate - 1;
  const seasonAmount = priceBeforeSeason * seasonMultiplier;
  const afterSeason = priceBeforeSeason + seasonAmount;

  // 추가 인원 비용 계산
  let extraPersonAmount = 0;
  if (extraPersonEnabled && extraPersonCount > 0) {
    if (extraPersonPerHour) {
      extraPersonAmount = extraPersonPrice * extraPersonCount * hours;
    } else {
      extraPersonAmount = extraPersonPrice * extraPersonCount;
    }
  }

  // 옵션 상품 총액
  const optionTotal = calculateOptionsTotal();

  // 소계 (시즌 적용 후 + 추가인원 + 옵션 + 청소비)
  const subtotal = afterSeason + extraPersonAmount + optionTotal + cleaningFee;

  // 할인 계산
  const discountAmount = subtotal * (discountRate / 100);
  const afterDiscount = subtotal - discountAmount;

  // 부가세 계산
  const vatAmount = vatIncluded ? afterDiscount * CONFIG.VAT_RATE : 0;

  // 게스트 결제금액
  const guestPayment = afterDiscount + vatAmount;

  // 플랫폼 수수료 및 호스트 정산액
  const platformFee = guestPayment * CONFIG.PLATFORM_FEE_RATE;
  const hostRevenue = guestPayment - platformFee;

  // 결과 표시
  updateResults({
    baseAmount: isPerPersonPrice ? hourlyRate * hours : baseAmount,
    isPerPersonPrice,
    personCount,
    perPersonTotal,
    seasonInfo,
    seasonAmount,
    extraPersonEnabled,
    extraPersonCount,
    extraPersonAmount,
    extraPersonPerHour,
    optionTotal,
    cleaningFee,
    cleaningFeeEnabled,
    discountAmount,
    discountEnabled,
    vatAmount,
    vatIncluded,
    guestPayment,
    platformFee,
    hostRevenue,
    hours
  });
};

/**
 * 결과 DOM 업데이트
 */
const updateResults = (results) => {
  // 기본 요금
  elements.baseAmount.textContent = formatCurrency(results.baseAmount);

  // 인원 요금 (인당 가격인 경우)
  if (results.isPerPersonPrice && results.personCount > 1) {
    elements.perPersonRow.style.display = 'flex';
    elements.perPersonLabel.textContent = `인원 요금 (${results.personCount}명)`;
    elements.perPersonAmount.textContent = formatCurrency(results.perPersonTotal);
  } else {
    elements.perPersonRow.style.display = 'none';
  }

  // 시즌 할증
  if (results.seasonInfo.rate > 1) {
    elements.seasonRow.style.display = 'flex';
    elements.seasonLabel.textContent = `${results.seasonInfo.label} 할증 (+${Math.round((results.seasonInfo.rate - 1) * 100)}%)`;
    elements.seasonAmount.textContent = '+' + formatCurrency(results.seasonAmount);
  } else {
    elements.seasonRow.style.display = 'none';
  }

  // 추가 인원 비용
  if (results.extraPersonEnabled && results.extraPersonAmount > 0) {
    elements.extraPersonRow.style.display = 'flex';
    const timeLabel = results.extraPersonPerHour ? ` x ${results.hours}시간` : '';
    elements.extraPersonLabel.textContent = `추가 인원 (${results.extraPersonCount}명${timeLabel})`;
    elements.extraPersonAmount.textContent = '+' + formatCurrency(results.extraPersonAmount);
  } else {
    elements.extraPersonRow.style.display = 'none';
  }

  // 옵션 상품
  if (results.optionTotal > 0) {
    elements.optionRow.style.display = 'flex';
    elements.optionAmount.textContent = '+' + formatCurrency(results.optionTotal);
  } else {
    elements.optionRow.style.display = 'none';
  }

  // 청소비
  elements.cleaningRow.style.display = results.cleaningFeeEnabled ? 'flex' : 'none';
  elements.cleaningAmount.textContent = '+' + formatCurrency(results.cleaningFee);

  // 할인
  elements.discountRow.style.display = results.discountEnabled && results.discountAmount > 0 ? 'flex' : 'none';
  elements.discountAmount.textContent = '-' + formatCurrency(results.discountAmount);

  // 부가세
  elements.vatRow.style.display = results.vatIncluded ? 'flex' : 'none';
  elements.vatAmount.textContent = '+' + formatCurrency(results.vatAmount);

  // 최종 결과
  elements.guestPayment.textContent = formatCurrency(results.guestPayment);
  elements.platformFee.textContent = formatCurrency(results.platformFee);
  elements.hostRevenue.textContent = formatCurrency(results.hostRevenue);
};

// ===================================
// 입력 필드 이벤트 핸들러
// ===================================

/**
 * 숫자 입력 필드에 천단위 콤마 적용
 */
const handleNumberInput = (e) => {
  const input = e.target;
  const cursorPos = input.selectionStart;
  const oldValue = input.value;
  const oldLength = oldValue.length;

  // 숫자만 추출하고 포맷팅
  const num = parseNumber(oldValue);
  const formatted = num > 0 ? formatNumber(num) : '';
  input.value = formatted;

  // 커서 위치 조정
  const newLength = formatted.length;
  const diff = newLength - oldLength;
  const newPos = Math.max(0, cursorPos + diff);
  input.setSelectionRange(newPos, newPos);

  calculate();
};

/**
 * 체크박스 토글 핸들러
 */
const handleCheckboxToggle = (checkbox, inputElement) => {
  const enabled = checkbox.checked;
  inputElement.disabled = !enabled;

  if (!enabled) {
    inputElement.value = '';
  } else {
    inputElement.focus();
  }

  calculate();
};

// ===================================
// 액션 버튼 핸들러
// ===================================

/**
 * 결과를 클립보드에 복사
 */
const copyToClipboard = async () => {
  const hourlyRate = parseNumber(elements.hourlyRate.value);
  const hours = parseInt(elements.hours.value, 10) || CONFIG.MIN_HOURS;
  const guestPayment = elements.guestPayment.textContent;
  const platformFee = elements.platformFee.textContent;
  const hostRevenue = elements.hostRevenue.textContent;

  const isPerPersonPrice = elements.perPersonPrice.checked;
  const personCount = isPerPersonPrice ? (parseInt(elements.personCount.value, 10) || 1) : 1;
  const seasonType = elements.seasonType.value;
  const seasonInfo = CONFIG.SEASON_RATES[seasonType];

  let text = `[공간 이용료 계산 결과]\n`;
  text += `시간당 요금: ${formatCurrency(hourlyRate)}`;
  if (isPerPersonPrice) text += ` (인당)`;
  text += `\n`;
  text += `이용 시간: ${hours}시간\n`;
  if (isPerPersonPrice) text += `이용 인원: ${personCount}명\n`;
  if (seasonInfo.rate > 1) text += `시즌: ${seasonInfo.label} (+${Math.round((seasonInfo.rate - 1) * 100)}%)\n`;
  text += `────────────────\n`;
  text += `게스트 결제금액: ${guestPayment}\n`;
  text += `플랫폼 수수료: ${platformFee}\n`;
  text += `호스트 정산액: ${hostRevenue}`;

  try {
    await navigator.clipboard.writeText(text);
    showToast('결과가 복사되었습니다');
  } catch (err) {
    // 폴백: execCommand 사용
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

/**
 * 폼 초기화
 */
const resetForm = () => {
  elements.hourlyRate.value = '';
  elements.perPersonPrice.checked = false;
  elements.personCountGroup.style.display = 'none';
  elements.personCount.value = '1';
  elements.hours.value = '1';
  elements.seasonType.value = 'standard';

  elements.extraPersonCheck.checked = false;
  elements.extraPersonFields.style.display = 'none';
  elements.basePersonCount.value = '2';
  elements.extraPersonCount.value = '0';
  elements.extraPersonPrice.value = '';
  elements.extraPersonPerHour.checked = false;

  // 옵션 아이템 모두 삭제
  elements.optionItemsContainer.innerHTML = '';

  elements.cleaningFeeCheck.checked = false;
  elements.cleaningFee.value = '';
  elements.cleaningFee.disabled = true;
  elements.discountCheck.checked = false;
  elements.discountRate.value = '';
  elements.discountRate.disabled = true;
  elements.vatIncluded.checked = false;

  calculate();
  showToast('초기화되었습니다');
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
// 이벤트 리스너 등록
// ===================================
const initEventListeners = () => {
  // 숫자 입력 필드 (천단위 콤마 적용)
  elements.hourlyRate.addEventListener('input', handleNumberInput);
  elements.cleaningFee.addEventListener('input', handleNumberInput);
  elements.extraPersonPrice.addEventListener('input', handleNumberInput);

  // 인당 가격 토글
  elements.perPersonPrice.addEventListener('change', () => {
    elements.personCountGroup.style.display = elements.perPersonPrice.checked ? 'block' : 'none';
    calculate();
  });

  // 인원수 입력
  elements.personCount.addEventListener('input', calculate);

  // 시간 입력
  elements.hours.addEventListener('input', () => {
    const value = parseInt(elements.hours.value, 10);
    if (value < CONFIG.MIN_HOURS) {
      elements.hours.value = CONFIG.MIN_HOURS;
    }
    calculate();
  });

  // 시즌 선택
  elements.seasonType.addEventListener('change', calculate);

  // 추가 인원 비용 토글
  elements.extraPersonCheck.addEventListener('change', () => {
    elements.extraPersonFields.style.display = elements.extraPersonCheck.checked ? 'block' : 'none';
    calculate();
  });

  // 추가 인원 필드들
  elements.basePersonCount.addEventListener('input', calculate);
  elements.extraPersonCount.addEventListener('input', calculate);
  elements.extraPersonPerHour.addEventListener('change', calculate);

  // 옵션 추가 버튼
  elements.addOptionBtn.addEventListener('click', addOptionItem);

  // 할인율 입력
  elements.discountRate.addEventListener('input', () => {
    const value = parseFloat(elements.discountRate.value);
    if (value > CONFIG.MAX_DISCOUNT) {
      elements.discountRate.value = CONFIG.MAX_DISCOUNT;
    }
    calculate();
  });

  // 체크박스 토글
  elements.cleaningFeeCheck.addEventListener('change', () => {
    handleCheckboxToggle(elements.cleaningFeeCheck, elements.cleaningFee);
  });

  elements.discountCheck.addEventListener('change', () => {
    handleCheckboxToggle(elements.discountCheck, elements.discountRate);
  });

  // 부가세 토글
  elements.vatIncluded.addEventListener('change', calculate);

  // 버튼
  elements.copyBtn.addEventListener('click', copyToClipboard);
  elements.resetBtn.addEventListener('click', resetForm);

  // 숫자 필드에서 Enter 키 방지 (폼 제출 방지)
  document.getElementById('calculatorForm').addEventListener('submit', (e) => {
    e.preventDefault();
  });
};

// ===================================
// 초기화
// ===================================
const init = () => {
  initEventListeners();
  calculate(); // 초기 계산
};

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', init);
