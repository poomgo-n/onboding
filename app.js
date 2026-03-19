const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbweXsPBao0-wELhpfnBsSgU_J4IPGUCXY571lUHkAC4e2PYAHlmz_Alv-P6T7nM3KAq/exec';

const state = {
  code: '',
  token: '',
  client: null,
  response: null,
  ui: {},
  faqs: {
    presurvey: [],
    guide: {
      step1: [],
      step2: [],
      step3: [],
      step4: [],
      step5: []
    }
  },
  steps: {},
  assets: {
    logoUrl: './logo.png'
  },
  currentStep: 1,
  currentSubStep: 1
};

const PACKAGING_IMAGE_LINKS = {
  '기본 포장': 'https://drive.google.com/file/d/1tITH7c-WsVejDK2F2JsECSvHMcpDnMJt/view?usp=drive_link',
  '에어캡 포장': 'https://drive.google.com/file/d/110e8PsWHq-2XkOYg7bXiONNn_1XpA-ip/view?usp=drive_link',
  '버블페이퍼 포장': 'https://drive.google.com/file/d/1W2CYbdHLX7Uj2InTm-0HH-CaKnmAOomg/view?usp=drive_link'
};

document.addEventListener('DOMContentLoaded', init);
window.addEventListener('resize', scheduleHtmlStageFit);
document.addEventListener('keydown', handleGlobalKeydown);

async function init() {
  try {
    const params = new URLSearchParams(location.search);
    state.code = params.get('code') || '';
    state.token = params.get('token') || '';

    if (!state.code || !state.token) {
      renderError('유효하지 않은 접속 링크입니다.');
      return;
    }

    const data = await apiGet('bootstrap', {
      code: state.code,
      token: state.token
    });

    if (!data.ok) throw new Error(data.message || '초기화 실패');

    state.client = data.client;
    state.response = data.response || null;
    state.ui = data.ui || {};
    state.faqs = data.faqs || state.faqs;
    state.steps = buildGithubStepMap();
    state.assets = data.assets || state.assets;
    state.currentStep = 1;
    state.currentSubStep = 1;

    if (
      String(state.client?.preSubmitted || '').toUpperCase() === 'Y' &&
      String(state.client?.guideOpen || '').toUpperCase() === 'Y'
    ) {
      loadGuideProgress();
    }

    renderByState();
  } catch (err) {
    console.error(err);
    renderError(err?.message || '페이지를 불러오지 못했습니다.');
  }
}

function buildGithubStepMap() {
  return {
    step1: [
      {
        title: '품고 나우 로그인',
        desc: '품고 나우에 로그인해주세요.',
        mediaType: 'html',
        mediaValue: './steps/step1.html',
        layout: 'text-media'
      }
    ],
    step2: [
      {
        title: '판매처 등록 (1/2)',
        desc: '판매처 등록 1단계를 진행해주세요.',
        mediaType: 'html',
        mediaValue: './steps/step2-1.html',
        layout: 'text-media',
        subStep: 1,
        totalSubSteps: 2
      },
      {
        title: '판매처 등록 (2/2)',
        desc: '판매처 등록 2단계를 진행해주세요.',
        mediaType: 'html',
        mediaValue: './steps/step2-2.html',
        layout: 'text-media',
        subStep: 2,
        totalSubSteps: 2
      }
    ],
    step3: [
      {
        title: 'SKU 등록 (1/3)',
        desc: 'SKU 등록 1단계를 진행해주세요.',
        mediaType: 'html',
        mediaValue: './steps/step3-1.html',
        layout: 'text-media',
        subStep: 1,
        totalSubSteps: 3
      },
      {
        title: 'SKU 등록 (2/3)',
        desc: 'SKU 등록 2단계를 진행해주세요.',
        mediaType: 'html',
        mediaValue: './steps/step3-2.html',
        layout: 'text-media',
        subStep: 2,
        totalSubSteps: 3
      },
      {
        title: 'SKU 등록 (3/3)',
        desc: 'SKU 등록 3단계를 진행해주세요.',
        mediaType: 'html',
        mediaValue: './steps/step3-3.html',
        layout: 'text-media',
        subStep: 3,
        totalSubSteps: 3
      }
    ],
    step4: [
      {
        title: '입고 준비',
        desc: '입고 준비 사항을 확인해주세요.',
        mediaType: 'html',
        mediaValue: './steps/step4.html',
        layout: 'text-media'
      }
    ],
    step5: [
      {
        title: 'N배송 설정하기',
        desc: '최종 N배송 설정을 진행해주세요.',
        mediaType: 'html',
        mediaValue: './steps/step5.html',
        layout: 'text-media'
      }
    ]
  };
}

function renderByState() {
  if (!state.client) {
    renderError('고객사 정보를 찾을 수 없습니다.');
    return;
  }

  if (String(state.client.active).toUpperCase() !== 'Y') {
    renderError('현재 비활성화된 링크입니다.');
    return;
  }

  if (!state.client.preSubmitted || String(state.client.preSubmitted).toUpperCase() !== 'Y') {
    renderIntroAndForm();
    return;
  }

  if (String(state.client.guideOpen).toUpperCase() !== 'Y') {
    renderWaitingGuideOpen();
    return;
  }

  renderGuide();
}

function renderIntroAndForm() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="container">
      ${renderTopbar()}
      <section class="hero">
        <h1>${escapeHtml(state.ui.INTRO_TITLE || '원활한 운영을 위한 사전 문의')}</h1>
        <p>${escapeHtml(state.ui.INTRO_DESC || '')}</p>
      </section>

      <div id="formWrap" style="margin-top:18px;">
        ${renderPreSurveyForm()}
      </div>

      ${renderFaqSection(
        state.ui.PRE_FAQ_TITLE || '자주 묻는 질문',
        state.faqs.presurvey || []
      )}
    </div>
  `;

  bindPreSurveyForm();
  bindFaqToggle();
}

function renderPreSurveyForm() {
  const r = state.response || {};
  const brandAddressDefault = r.brandAddress || state.client.brandAddress || '';
  const csPhoneDefault = r.csPhone || state.client.csPhone || '';

  return `
    <form id="preSurveyForm">
      <section class="section-card">
        <div class="section-title">
          <div class="section-badge">1</div>
          <h2>시스템 등록</h2>
        </div>
        <div class="section-desc">기본 시스템 등록 및 운영 담당자 정보를 입력해주세요.</div>

        <div class="form-grid">
          <div class="form-group">
            <label>이메일 <span class="req">*</span></label>
            <input type="email" name="email" value="${escapeAttr(r.email || '')}" placeholder="example@brand.com" required />
          </div>

          <div class="form-group">
            <label>담당자명 <span class="req">*</span></label>
            <input type="text" name="managerName" value="${escapeAttr(r.managerName || '')}" placeholder="담당자명을 입력해주세요." required />
          </div>

          <div class="form-group">
            <label>연락처 <span class="req">*</span></label>
            <input type="text" name="phone" value="${escapeAttr(r.phone || '')}" placeholder="실제 연락 가능한 번호를 입력해주세요." required />
          </div>

          <div class="form-group full">
            <label>브랜드 사업자 주소 <span class="req">*</span></label>
            <input type="text" name="brandAddress" value="${escapeAttr(brandAddressDefault)}" placeholder="사업자 주소를 입력해주세요." required />
          </div>

          <div class="form-group">
            <label>CS 대표번호 <span class="req">*</span></label>
            <input type="text" name="csPhone" value="${escapeAttr(csPhoneDefault)}" placeholder="대표번호를 입력해주세요." required />
          </div>
        </div>
      </section>

      <section class="section-card">
        <div class="section-title">
          <div class="section-badge">2</div>
          <h2>입고</h2>
        </div>
        <div class="section-desc">초도 입고 관련 기본 정보를 입력해주세요.</div>

        <div class="form-grid">
          <div class="form-group">
            <label>초도 입고일 <span class="req">*</span></label>
            <input type="date" name="firstInboundDate" value="${escapeAttr(r.firstInboundDate || '')}" required />
          </div>

          <div class="form-group">
            <label>입고 방식 <span class="req">*</span></label>
            <select name="inboundType" required>
              <option value="">선택해주세요</option>
              <option value="택배" ${r.inboundType === '택배' ? 'selected' : ''}>택배</option>
              <option value="차량" ${r.inboundType === '차량' ? 'selected' : ''}>차량</option>
            </select>
          </div>
        </div>
      </section>

      <section class="section-card">
        <div class="section-title">
          <div class="section-badge">3</div>
          <h2>출고</h2>
        </div>
        <div class="section-desc">출고 운영에 필요한 정보를 입력해주세요.</div>

        <div class="form-grid">
          <div class="form-group full">
            <label>단수 출고 SKU 유무 <span class="req">*</span></label>
            <div class="radio-row">
              ${radioChip('singleSkuYn', 'Y', '있음', r.singleSkuYn)}
              ${radioChip('singleSkuYn', 'N', '없음', r.singleSkuYn)}
            </div>
            <div class="help">상품(SKU)에 박스 포장 없이, 송장만 부착하여 출고하는 형태를 의미합니다.</div>
          </div>

          <div class="form-group full">
            <label>반품 회수지 <span class="req">*</span></label>
            <div class="radio-row">
              ${radioChip('returnDest', '품고', '품고', r.returnDest)}
              ${radioChip('returnDest', '자사물류', '자사물류', r.returnDest)}
            </div>
            <div class="help">반품 발생 시 회수 및 입고를 진행할 기준지를 선택해주세요.</div>
          </div>

          <div class="form-group full">
            <label>초도 입고월 예정된 행사 유무 <span class="req">*</span></label>
            <div class="radio-row">
              ${radioChip('eventYn', 'Y', '있음', r.eventYn)}
              ${radioChip('eventYn', 'N', '없음', r.eventYn)}
            </div>
            <div class="help">
              예시) 초도 입고일이 4/1인 경우, 4월 내 예정된 스마트스토어 행사 유무를 전달해주세요.<br>
              행사 예시: 오늘끝딜, 슈퍼위크, 슈퍼적립, 브랜드데이, 라이브 등
            </div>
          </div>

          <div id="eventFields" class="form-group full" style="display:none;">
            <div class="form-grid">
              <div class="form-group">
                <label>행사명 <span class="req">*</span></label>
                <input type="text" name="eventName" value="${escapeAttr(r.eventName || '')}" placeholder="예: 브랜드데이">
              </div>

              <div class="form-group">
                <label>예상 송장건수 <span class="req">*</span></label>
                <input type="number" name="expectedOrders" value="${escapeAttr(r.expectedOrders || '')}" placeholder="예: 500">
              </div>

              <div class="form-group full">
                <label>행사 일시 <span class="req">*</span></label>
                <input type="text" name="eventDatetime" value="${escapeAttr(r.eventDatetime || '')}" placeholder="예: 2026-04-15 19:00 ~ 2026-04-16 23:59">
              </div>
            </div>
          </div>

          <div class="form-group full">
            <label>포장 방법 <span class="req">*</span></label>
            <div class="pack-grid" id="packGrid">
              ${renderPackCard('기본 포장', '기본 포장', '상품을 박스 내부 완충재와 함께 출고하는 기본 포장 방식입니다.', r.packingMethod)}
              ${renderPackCard('에어캡 포장', '에어캡 포장', '상품 전체를 에어캡으로 감싸 보호하는 포장 방식입니다.', r.packingMethod)}
              ${renderPackCard('버블페이퍼 포장', '버블페이퍼 포장', '상품 외부를 벌집형 완충지로 감싸 보호하는 포장 방식입니다.', r.packingMethod)}
            </div>
            <input type="hidden" name="packingMethod" id="packingMethod" value="${escapeAttr(r.packingMethod || '')}">
          </div>
        </div>
      </section>

      <section class="section-card">
        <div class="section-title">
          <div class="section-badge">4</div>
          <h2>품고에 문의하고 싶은 내용</h2>
        </div>
        <div class="section-desc">추가로 전달하거나 문의하실 내용이 있다면 자유롭게 작성해주세요.</div>

        <div class="form-grid">
          <div class="form-group full">
            <label>문의 내용</label>
            <textarea name="inquiry" placeholder="자유롭게 작성해주세요.">${escapeHtml(r.inquiry || '')}</textarea>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn btn-primary" type="submit">제출하기</button>
        </div>
      </section>
    </form>
  `;
}

function bindPreSurveyForm() {
  const form = document.getElementById('preSurveyForm');
  if (!form) return;

  const eventRadios = form.querySelectorAll('input[name="eventYn"]');
  const eventFields = document.getElementById('eventFields');
  const packGrid = document.getElementById('packGrid');
  const packingMethodInput = document.getElementById('packingMethod');

  function toggleEventFields() {
    const val = form.querySelector('input[name="eventYn"]:checked')?.value || '';
    eventFields.style.display = val === 'Y' ? 'block' : 'none';
  }

  function bindPackCards() {
    packGrid.querySelectorAll('.pack-card').forEach(card => {
      card.addEventListener('click', () => {
        packGrid.querySelectorAll('.pack-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        packingMethodInput.value = card.dataset.value;
      });
    });
  }

  eventRadios.forEach(radio => radio.addEventListener('change', toggleEventFields));
  bindPackCards();
  toggleEventFields();

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = readForm(form);
    const valid = validateFormData(data);
    if (!valid.ok) {
      toast(valid.message);
      return;
    }

    openSummaryModal(data);
  });
}

function renderWaitingGuideOpen() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="container">
      ${renderTopbar()}
      <section class="wait-wrap">
        <div class="wait-icon">⏳</div>
        <h2>${escapeHtml(state.ui.GUIDE_WAIT_TITLE || '사전문의가 제출되었습니다')}</h2>
        <p>${escapeHtml(state.ui.GUIDE_WAIT_DESC || '')}</p>
      </section>
    </div>
  `;
}

function renderGuide() {
  const app = document.getElementById('app');
  const currentStep = state.currentStep || 1;
  const stepTitleMap = {
    1: '품고 나우 로그인',
    2: '판매처 등록',
    3: 'SKU 등록',
    4: '입고 준비',
    5: 'N배송 설정하기'
  };

  app.innerHTML = `
    <div class="container guide-shell">
      <div class="guide-wizard">
        ${renderWizardHeader(currentStep, stepTitleMap[currentStep])}
        ${renderWizardProgress(currentStep)}
        ${renderWizardBody(currentStep)}
        ${renderWizardFooter(currentStep)}
      </div>
    </div>

    <div id="helpDrawer" class="help-drawer hidden">
      <div class="help-backdrop" id="helpBackdrop"></div>
      <div class="help-panel">
        <div class="help-head">
          <h3>도움말</h3>
          <button type="button" class="icon-btn" id="closeHelpBtn">✕</button>
        </div>
        <div class="help-body">
          ${renderStepFaqContent(currentStep)}
        </div>
      </div>
    </div>

    <div id="stepWaitModal" class="step-wait-modal hidden">
      <div class="step-wait-backdrop"></div>
      <div class="step-wait-panel">
        <div class="step-wait-emoji">🙏</div>
        <div class="step-wait-title">품고에서 확인 후 다음 STEP 가이드를 오픈해드릴게요!</div>
        <div class="step-wait-desc">조금만 기다려주세요🙏</div>
        <div class="step-wait-actions">
          <button type="button" class="btn btn-primary" id="closeStepWaitModalBtn">확인</button>
        </div>
      </div>
    </div>
  `;

  bindWizardNav();
  bindHelpDrawer();
  bindFaqToggle();
  bindStepWaitModal();
  hydrateCurrentStepHtml();
  scheduleHtmlStageFit();
}

function renderWizardHeader(stepNo, stepTitle) {
  let subLabel = '';

  if (stepNo === 2) {
    subLabel = `<span class="wizard-substep-badge">${state.currentSubStep}/2</span>`;
  }

  if (stepNo === 3) {
    subLabel = `<span class="wizard-substep-badge">${state.currentSubStep}/3</span>`;
  }

  return `
    <div class="wizard-header">
      <div class="wizard-header-left">
        <img class="wizard-logo" src="${state.assets.logoUrl || './logo.png'}" alt="logo">
        <div class="wizard-title">
          ${escapeHtml(state.client.name)}_STEP ${stepNo}. ${escapeHtml(stepTitle)} ${subLabel}
        </div>
      </div>
    </div>
  `;
}

function renderWizardProgress(currentStep) {
  const steps = [1, 2, 3, 4, 5];
  const progressPercent = ((currentStep - 1) / (steps.length - 1)) * 100;

  return `
    <div class="wizard-progress-wrap">
      <div class="wizard-progress-bar">
        <div class="wizard-progress-fill" style="width:${progressPercent}%"></div>
      </div>

      <div class="wizard-step-track">
        ${steps.map((step, idx) => `
          <div class="wizard-step-node ${step === currentStep ? 'active' : ''} ${step < currentStep ? 'done' : ''}">
            <div class="wizard-step-circle">${step}</div>
            <div class="wizard-step-label">STEP ${step}</div>
            ${idx < steps.length - 1 ? `<div class="wizard-step-arrow">></div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function getCurrentGuideItem(stepNo) {
  const stepKey = `step${stepNo}`;
  const items = state.steps[stepKey] || [];

  if (stepNo === 2 || stepNo === 3) {
    return items.find(item => Number(item.subStep || 1) === Number(state.currentSubStep)) || items[0] || null;
  }

  return items[0] || null;
}

function renderWizardBody(stepNo) {
  const isOpenNow = isStepOpen(stepNo);
  const item = getCurrentGuideItem(stepNo);

  if (!isOpenNow && stepNo >= 3) {
    return `
      <div class="wizard-body">
        <div class="wizard-locked">
          <h2>아직 오픈되지 않은 단계입니다</h2>
          <p>품고에서 확인 후 다음 단계가 오픈됩니다. 현재 단계까지 진행 후 안내를 기다려주세요.</p>
        </div>
      </div>
    `;
  }

  if (!item) {
    return `
      <div class="wizard-body">
        <div class="wizard-empty">
          <h2>콘텐츠 준비중</h2>
          <p>GitHub의 STEP HTML 파일을 확인해주세요.</p>
        </div>
      </div>
    `;
  }

  const mediaType = (item.mediaType || '').toLowerCase();
  const hasHtml = mediaType === 'html';

  return `
    <div class="wizard-body ${hasHtml ? 'wizard-body-has-html' : ''}">
      ${renderWizardContentBlock(item, stepNo)}
    </div>
  `;
}

function renderWizardContentBlock(item, stepNo) {
  const mediaType = (item.mediaType || '').toLowerCase();

  if (mediaType === 'html') {
    let subStepGuide = '';

    if (stepNo === 2) {
      subStepGuide = `<div class="wizard-substep-guide">판매처 등록 ${state.currentSubStep}/2</div>`;
    }

    if (stepNo === 3) {
      subStepGuide = `<div class="wizard-substep-guide">SKU 등록 ${state.currentSubStep}/3</div>`;
    }

    return `
      <section class="wizard-block-full wizard-block-html">
        ${subStepGuide}
        <div class="wizard-html-stage wizard-html-stage-fit">
          <div class="wizard-html-content" id="guideHtmlMount"></div>
        </div>
      </section>
    `;
  }

  const media = renderStepMedia(item);

  const textCol = `
    <div class="wizard-col wizard-text">
      <div class="wizard-content-card">
        <h3>${escapeHtml(item.title || '')}</h3>
        <div class="wizard-content-desc">${nl2br(escapeHtml(item.desc || ''))}</div>
        ${
          item.buttonText
            ? `<div class="wizard-inline-btn-wrap">
                <a href="${escapeAttr(item.buttonLink || '#')}" class="screen-link" target="_blank" rel="noopener noreferrer">${escapeHtml(item.buttonText)}</a>
              </div>`
            : ''
        }
      </div>
    </div>
  `;

  const mediaCol = `
    <div class="wizard-col wizard-media">
      <div class="wizard-media-card">
        ${media}
      </div>
    </div>
  `;

  return `
    <section class="wizard-block ${item.layout === 'media-text' ? 'reverse' : ''}">
      ${item.layout === 'media-text' ? mediaCol + textCol : textCol + mediaCol}
    </section>
  `;
}

async function hydrateCurrentStepHtml() {
  const mount = document.getElementById('guideHtmlMount');
  if (!mount) return;

  const item = getCurrentGuideItem(state.currentStep);
  if (!item) {
    mount.innerHTML = `<div class="wizard-media-empty">콘텐츠가 없습니다.</div>`;
    return;
  }

  const mediaType = (item.mediaType || '').toLowerCase();
  if (mediaType !== 'html') return;

  try {
    const res = await fetch(item.mediaValue, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTML 파일 로드 실패: ${item.mediaValue}`);
    }

    const html = await res.text();
    mount.innerHTML = normalizeStepHtml(html);

    initManualSteps(mount);
    bindInjectedHtmlInteractions(mount);
    bindImageZoom(mount);
    scheduleHtmlStageFit();
  } catch (err) {
    console.error(err);
    mount.innerHTML = `<div class="wizard-media-empty">HTML 파일을 불러오지 못했습니다.</div>`;
  }
}

function bindInjectedHtmlInteractions(scope) {
  if (!scope || scope.dataset.injectedBound === 'true') return;
  scope.dataset.injectedBound = 'true';

  scope.addEventListener('click', (e) => {
    const prevBtn = e.target.closest('[data-manual-prev]');
    const nextBtn = e.target.closest('[data-manual-next]');
    const stepBtn = e.target.closest('[data-manual-step]');
    const viewer = e.target.closest('.manual-viewer');

    if (!viewer) return;

    if (stepBtn) {
      e.preventDefault();
      const step = Number(stepBtn.dataset.manualStep || 1);
      updateManualViewer(viewer, step);
      return;
    }

    if (prevBtn) {
      e.preventDefault();
      const current = Number(viewer.dataset.currentManualStep || 1);
      updateManualViewer(viewer, current - 1);
      return;
    }

    if (nextBtn) {
      e.preventDefault();
      const current = Number(viewer.dataset.currentManualStep || 1);
      updateManualViewer(viewer, current + 1);
    }
  });
}

function initManualSteps(scope) {
  const roots = (scope || document).querySelectorAll('.poomgo-step1-wrap .manual-viewer, .manual-viewer');

  roots.forEach((viewer) => {
    if (!viewer) return;
    const current = Number(viewer.dataset.currentManualStep || 1);
    updateManualViewer(viewer, current);
  });
}

function updateManualViewer(viewer, step) {
  if (!viewer) return;

  const views = Array.from(viewer.querySelectorAll('.manual-step-view'));
  const stepBtns = Array.from(viewer.querySelectorAll('[data-manual-step]'));
  const prevBtns = Array.from(viewer.querySelectorAll('[data-manual-prev]'));
  const nextBtns = Array.from(viewer.querySelectorAll('[data-manual-next]'));
  const max = views.length || 1;
  const current = Math.max(1, Math.min(step, max));

  viewer.dataset.currentManualStep = String(current);

  views.forEach((view) => {
    const isActive = Number(view.dataset.stepView || 0) === current;
    view.style.display = isActive ? 'flex' : 'none';
  });

  stepBtns.forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.manualStep || 0) === current);
  });

  prevBtns.forEach((btn) => {
    btn.disabled = current === 1;
  });

  nextBtns.forEach((btn) => {
    btn.disabled = current === max;
  });
}

function bindImageZoom(scope) {
  const container = scope || document.getElementById('guideHtmlMount');
  if (!container) return;

  const images = container.querySelectorAll('img');
  images.forEach((img) => {
    if (img.dataset.zoomBound === 'true') return;
    img.dataset.zoomBound = 'true';
    img.style.cursor = 'zoom-in';

    img.addEventListener('click', (e) => {
      e.stopPropagation();
      openImageZoom(img.src, img.alt || '');
    });
  });
}

function ensureImageZoomModal() {
  let modal = document.getElementById('imageZoomModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'imageZoomModal';
  modal.className = 'image-zoom-modal hidden';
  modal.innerHTML = `
    <div class="image-zoom-backdrop"></div>
    <div class="image-zoom-shell">
      <button type="button" class="image-zoom-close" aria-label="닫기">✕</button>
      <img id="imageZoomTarget" class="image-zoom-target" src="" alt="">
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('.image-zoom-backdrop').addEventListener('click', closeImageZoom);
  modal.querySelector('.image-zoom-close').addEventListener('click', closeImageZoom);

  return modal;
}

function openImageZoom(src, alt = '') {
  const modal = ensureImageZoomModal();
  const target = modal.querySelector('#imageZoomTarget');
  target.src = src;
  target.alt = alt;
  modal.classList.remove('hidden');
  modal.classList.add('active');
}

function closeImageZoom() {
  const modal = document.getElementById('imageZoomModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('active');
}

function handleGlobalKeydown(e) {
  if (e.key === 'Escape') {
    closeImageZoom();
    closeStepWaitModal();
  }
}

function renderStepMedia(item) {
  const mediaType = (item.mediaType || '').toLowerCase();
  const mediaValue = item.mediaValue || '';

  if (!mediaValue) {
    return `<div class="wizard-media-empty">시각 자료 준비중</div>`;
  }

  if (mediaType === 'image') {
    return `<img src="${escapeAttr(mediaValue)}" alt="${escapeAttr(item.title || '')}" class="wizard-media-image">`;
  }

  if (mediaType === 'video') {
    if (mediaValue.includes('youtube.com') || mediaValue.includes('youtu.be') || mediaValue.includes('embed')) {
      return `<iframe class="wizard-media-video" src="${escapeAttr(mediaValue)}" frameborder="0" allowfullscreen></iframe>`;
    }
    return `<video class="wizard-media-video" controls playsinline src="${escapeAttr(mediaValue)}"></video>`;
  }

  if (mediaType === 'html') {
    return `<div class="wizard-media-empty">HTML 콘텐츠는 별도 영역에 표시됩니다.</div>`;
  }

  return `<div class="wizard-media-empty">지원하지 않는 미디어 타입입니다.</div>`;
}

function normalizeStepHtml(html = '') {
  let s = String(html || '');
  s = s.replace(/height\s*:\s*720px/gi, 'height:100%');
  s = s.replace(/height\s*:\s*760px/gi, 'height:100%');
  s = s.replace(/height\s*:\s*800px/gi, 'height:100%');
  s = s.replace(/min-height\s*:\s*720px/gi, 'min-height:0');
  s = s.replace(/white-space\s*:\s*nowrap\s*;?/gi, '');
  s = s.replace(/max-width\s*:\s*1120px/gi, 'max-width:none');
  s = s.replace(/max-width\s*:\s*1200px/gi, 'max-width:none');
  return s;
}

function renderWizardFooter(currentStep) {
  const prevDisabled = currentStep === 1 && state.currentSubStep === 1;
  const nextDisabled = currentStep === 5;

  return `
    <div class="wizard-footer">
      <button type="button" class="btn btn-light" id="prevStepBtn" ${prevDisabled ? 'disabled' : ''}>이전</button>
      <div class="wizard-footer-right">
        <button type="button" class="btn btn-light" id="helpBtn">도움말</button>
        <button type="button" class="btn btn-primary" id="nextStepBtn" ${nextDisabled ? 'disabled' : ''}>다음</button>
      </div>
    </div>
  `;
}

function renderStepFaqContent(stepNo) {
  const faqMap = {
    1: state.faqs.guide.step1 || [],
    2: state.faqs.guide.step2 || [],
    3: state.faqs.guide.step3 || [],
    4: state.faqs.guide.step4 || [],
    5: state.faqs.guide.step5 || []
  };

  const items = faqMap[stepNo] || [];
  if (!items.length) {
    return `<div class="help-empty">등록된 도움말이 없습니다.</div>`;
  }

  return items.map(item => `
    <div class="help-faq-item">
      <div class="help-faq-q">${escapeHtml(item.question)}</div>
      <div class="help-faq-a">${nl2br(escapeHtml(item.answer))}</div>
    </div>
  `).join('');
}

function bindWizardNav() {
  const prevBtn = document.getElementById('prevStepBtn');
  const nextBtn = document.getElementById('nextStepBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (state.currentStep === 3 && state.currentSubStep === 3) {
        state.currentSubStep = 2;
        saveGuideProgress();
        renderGuide();
        return;
      }

      if (state.currentStep === 3 && state.currentSubStep === 2) {
        state.currentSubStep = 1;
        saveGuideProgress();
        renderGuide();
        return;
      }

      if (state.currentStep === 2 && state.currentSubStep === 2) {
        state.currentSubStep = 1;
        saveGuideProgress();
        renderGuide();
        return;
      }

      if (state.currentStep > 1) {
        state.currentStep -= 1;

        if (state.currentStep === 3) {
          state.currentSubStep = 3;
        } else if (state.currentStep === 2) {
          state.currentSubStep = 2;
        } else {
          state.currentSubStep = 1;
        }

        saveGuideProgress();
        renderGuide();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', async () => {
      if (state.currentStep === 2 && state.currentSubStep === 1) {
        state.currentSubStep = 2;
        saveGuideProgress();
        renderGuide();
        return;
      }

      if (state.currentStep === 2 && state.currentSubStep === 2) {
        if (isStepOpen(3)) {
          state.currentStep = 3;
          state.currentSubStep = 1;
          saveGuideProgress();
          renderGuide();
          return;
        }

        try {
          await apiGet('requestStepOpen', {
            code: state.code,
            token: state.token,
            step: '3'
          });
        } catch (err) {
          console.error(err);
        }

        openStepWaitModal();
        return;
      }

      if (state.currentStep === 3 && state.currentSubStep === 1) {
        state.currentSubStep = 2;
        saveGuideProgress();
        renderGuide();
        return;
      }

      if (state.currentStep === 3 && state.currentSubStep === 2) {
        state.currentSubStep = 3;
        saveGuideProgress();
        renderGuide();
        return;
      }

      if (state.currentStep === 3 && state.currentSubStep === 3) {
        if (isStepOpen(4)) {
          state.currentStep = 4;
          state.currentSubStep = 1;
          saveGuideProgress();
          renderGuide();
          return;
        }

        try {
          await apiGet('requestStepOpen', {
            code: state.code,
            token: state.token,
            step: '4'
          });
        } catch (err) {
          console.error(err);
        }

        openStepWaitModal();
        return;
      }

      const nextStep = state.currentStep + 1;
      if (nextStep > 5) return;

      if (nextStep >= 3 && !isStepOpen(nextStep)) {
        try {
          const result = await apiGet('requestStepOpen', {
            code: state.code,
            token: state.token,
            step: String(nextStep)
          });
          toast(result.message || '품고에서 확인중입니다.');
        } catch (err) {
          toast(err?.message || '요청 처리에 실패했습니다.');
        }
        return;
      }

      state.currentStep = nextStep;
      state.currentSubStep = 1;
      saveGuideProgress();
      renderGuide();
    });
  }
}

function bindHelpDrawer() {
  const helpBtn = document.getElementById('helpBtn');
  const closeBtn = document.getElementById('closeHelpBtn');
  const backdrop = document.getElementById('helpBackdrop');
  const drawer = document.getElementById('helpDrawer');

  function openDrawer() {
    drawer.classList.remove('hidden');
  }

  function closeDrawer() {
    drawer.classList.add('hidden');
  }

  if (helpBtn) helpBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);
}

function openStepWaitModal() {
  const modal = document.getElementById('stepWaitModal');
  if (!modal) return;
  modal.classList.remove('hidden');
}

function closeStepWaitModal() {
  const modal = document.getElementById('stepWaitModal');
  if (!modal) return;
  modal.classList.add('hidden');
}

function bindStepWaitModal() {
  const modal = document.getElementById('stepWaitModal');
  const closeBtn = document.getElementById('closeStepWaitModalBtn');
  const backdrop = modal?.querySelector('.step-wait-backdrop');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeStepWaitModal);
  }

  if (backdrop) {
    backdrop.addEventListener('click', closeStepWaitModal);
  }
}

function scheduleHtmlStageFit() {
  cancelAnimationFrame(scheduleHtmlStageFit._raf1);
  cancelAnimationFrame(scheduleHtmlStageFit._raf2);

  scheduleHtmlStageFit._raf1 = requestAnimationFrame(() => {
    scheduleHtmlStageFit._raf2 = requestAnimationFrame(() => {
      fitHtmlStages();
    });
  });
}

function fitHtmlStages() {
  const stages = document.querySelectorAll('.wizard-html-stage-fit');
  if (!stages.length) return;

  stages.forEach(stage => {
    const content = stage.querySelector('.wizard-html-content');
    if (!content) return;

    content.style.transform = 'scale(1)';
    content.style.width = '100%';

    const availableWidth = stage.clientWidth;
    const availableHeight = stage.clientHeight;

    if (!availableWidth || !availableHeight) return;

    const contentWidth = content.scrollWidth;
    const contentHeight = content.scrollHeight;

    if (!contentWidth || !contentHeight) return;

    const widthScale = availableWidth / contentWidth;
    const heightScale = availableHeight / contentHeight;
    const scale = Math.min(widthScale, heightScale, 1);

    content.style.transform = `scale(${scale})`;
  });
}

function isStepOpen(stepNo) {
  if (stepNo === 1 || stepNo === 2) return true;
  if (stepNo === 3) return String(state.client.step3Open).toUpperCase() === 'Y';
  if (stepNo === 4) return String(state.client.step4Open).toUpperCase() === 'Y';
  if (stepNo === 5) return String(state.client.step5Open).toUpperCase() === 'Y';
  return false;
}

function getProgressStorageKey() {
  return `poomgo-guide-progress:${state.code}:${state.token}`;
}

function saveGuideProgress() {
  if (!state.code || !state.token) return;

  const payload = {
    step: Number(state.currentStep || 1),
    subStep: Number(state.currentSubStep || 1)
  };

  try {
    localStorage.setItem(getProgressStorageKey(), JSON.stringify(payload));
  } catch (err) {
    console.error('guide progress save error', err);
  }
}

function loadGuideProgress() {
  if (!state.code || !state.token) return;

  try {
    const raw = localStorage.getItem(getProgressStorageKey());
    if (!raw) return;

    const parsed = JSON.parse(raw);
    const savedStep = Number(parsed.step || 1);
    const savedSubStep = Number(parsed.subStep || 1);

    if (savedStep >= 1 && savedStep <= 5) {
      state.currentStep = savedStep;
    }

    if (state.currentStep === 2) {
      state.currentSubStep = savedSubStep === 2 ? 2 : 1;
    } else if (state.currentStep === 3) {
      if ([1, 2, 3].includes(savedSubStep)) {
        state.currentSubStep = savedSubStep;
      } else {
        state.currentSubStep = 1;
      }
    } else {
      state.currentSubStep = 1;
    }
  } catch (err) {
    console.error('guide progress load error', err);
  }
}

function bindSummaryModalButtons(data) {
  const closeBtn = document.getElementById('closeSummaryBtn');
  const editBtn = document.getElementById('editBtn');
  const confirmBtn = document.getElementById('confirmSubmitBtn');

  closeBtn.onclick = closeSummaryModal;
  editBtn.onclick = closeSummaryModal;

  confirmBtn.onclick = async () => {
    confirmBtn.disabled = true;
    confirmBtn.textContent = '제출중...';

    try {
      const payload = {
        code: state.code,
        token: state.token,
        ...data
      };

      const result = await apiGet('submitPreSurvey', payload);
      if (!result.ok) throw new Error(result.message || '제출 실패');

      closeSummaryModal();

      state.client.preSubmitted = 'Y';
      if (result.guideOpen) {
        state.client.guideOpen = 'Y';
        state.currentStep = 1;
        state.currentSubStep = 1;
        saveGuideProgress();
        renderGuide();
      } else {
        renderWaitingGuideOpen();
      }
    } catch (err) {
      toast(err?.message || '제출에 실패했습니다.');
      confirmBtn.disabled = false;
      confirmBtn.textContent = '제출하기';
    }
  };
}

function openSummaryModal(data) {
  const modal = document.getElementById('summaryModal');
  const content = document.getElementById('summaryContent');

  content.innerHTML = `
    <div class="summary-box">
      <h4>1. 시스템 등록</h4>
      <div class="summary-table">
        <div class="summary-key">이메일</div><div class="summary-val">${escapeHtml(data.email)}</div>
        <div class="summary-key">담당자명</div><div class="summary-val">${escapeHtml(data.managerName)}</div>
        <div class="summary-key">연락처</div><div class="summary-val">${escapeHtml(data.phone)}</div>
        <div class="summary-key">브랜드 사업자 주소</div><div class="summary-val">${escapeHtml(data.brandAddress)}</div>
        <div class="summary-key">CS 대표번호</div><div class="summary-val">${escapeHtml(data.csPhone)}</div>
      </div>
    </div>

    <div class="summary-box">
      <h4>2. 입고</h4>
      <div class="summary-table">
        <div class="summary-key">초도 입고일</div><div class="summary-val">${escapeHtml(data.firstInboundDate)}</div>
        <div class="summary-key">입고 방식</div><div class="summary-val">${escapeHtml(data.inboundType)}</div>
      </div>
    </div>

    <div class="summary-box">
      <h4>3. 출고</h4>
      <div class="summary-table">
        <div class="summary-key">단수 출고 SKU 유무</div><div class="summary-val">${escapeHtml(data.singleSkuYn)}</div>
        <div class="summary-key">반품 회수지</div><div class="summary-val">${escapeHtml(data.returnDest)}</div>
        <div class="summary-key">행사 유무</div><div class="summary-val">${escapeHtml(data.eventYn)}</div>
        <div class="summary-key">행사명</div><div class="summary-val">${escapeHtml(data.eventName || '-')}</div>
        <div class="summary-key">예상 송장건수</div><div class="summary-val">${escapeHtml(data.expectedOrders || '-')}</div>
        <div class="summary-key">행사 일시</div><div class="summary-val">${escapeHtml(data.eventDatetime || '-')}</div>
        <div class="summary-key">포장 방법</div><div class="summary-val">${escapeHtml(data.packingMethod)}</div>
      </div>
    </div>

    <div class="summary-box">
      <h4>4. 문의 내용</h4>
      <div class="summary-table">
        <div class="summary-key">문의</div><div class="summary-val">${escapeHtml(data.inquiry || '-')}</div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  bindSummaryModalButtons(data);
}

function closeSummaryModal() {
  document.getElementById('summaryModal').classList.add('hidden');
}

function readForm(form) {
  const fd = new FormData(form);
  return {
    email: (fd.get('email') || '').toString().trim(),
    managerName: (fd.get('managerName') || '').toString().trim(),
    phone: (fd.get('phone') || '').toString().trim(),
    brandAddress: (fd.get('brandAddress') || '').toString().trim(),
    csPhone: (fd.get('csPhone') || '').toString().trim(),
    firstInboundDate: (fd.get('firstInboundDate') || '').toString().trim(),
    inboundType: (fd.get('inboundType') || '').toString().trim(),
    singleSkuYn: (fd.get('singleSkuYn') || '').toString().trim(),
    returnDest: (fd.get('returnDest') || '').toString().trim(),
    eventYn: (fd.get('eventYn') || '').toString().trim(),
    eventName: (fd.get('eventName') || '').toString().trim(),
    expectedOrders: (fd.get('expectedOrders') || '').toString().trim(),
    eventDatetime: (fd.get('eventDatetime') || '').toString().trim(),
    packingMethod: (fd.get('packingMethod') || '').toString().trim(),
    inquiry: (fd.get('inquiry') || '').toString().trim()
  };
}

function validateFormData(data) {
  if (!data.email) return { ok: false, message: '이메일을 입력해주세요.' };
  if (!data.managerName) return { ok: false, message: '담당자명을 입력해주세요.' };
  if (!data.phone) return { ok: false, message: '연락처를 입력해주세요.' };
  if (!data.brandAddress) return { ok: false, message: '브랜드 사업자 주소를 입력해주세요.' };
  if (!data.csPhone) return { ok: false, message: 'CS 대표번호를 입력해주세요.' };
  if (!data.firstInboundDate) return { ok: false, message: '초도 입고일을 입력해주세요.' };
  if (!data.inboundType) return { ok: false, message: '입고 방식을 선택해주세요.' };
  if (!data.singleSkuYn) return { ok: false, message: '단수 출고 SKU 유무를 선택해주세요.' };
  if (!data.returnDest) return { ok: false, message: '반품 회수지를 선택해주세요.' };
  if (!data.eventYn) return { ok: false, message: '행사 유무를 선택해주세요.' };
  if (!data.packingMethod) return { ok: false, message: '포장 방법을 선택해주세요.' };

  if (data.eventYn === 'Y') {
    if (!data.eventName) return { ok: false, message: '행사명을 입력해주세요.' };
    if (!data.expectedOrders) return { ok: false, message: '예상 송장건수를 입력해주세요.' };
    if (!data.eventDatetime) return { ok: false, message: '행사 일시를 입력해주세요.' };
  }

  return { ok: true };
}

function renderTopbar() {
  return `
    <div class="topbar">
      <img class="logo" src="${state.assets.logoUrl || './logo.png'}" alt="logo">
    </div>
  `;
}

function renderError(message) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="container">
      <section class="wait-wrap">
        <div class="wait-icon">!</div>
        <h2>접속할 수 없습니다</h2>
        <p>${escapeHtml(message)}</p>
      </section>
    </div>
  `;
}

function renderPackCard(value, title, desc, selectedValue) {
  const selected = value === selectedValue ? 'selected' : '';
  const rawLink = PACKAGING_IMAGE_LINKS[value] || '';
  const imgSrc = buildGoogleDriveImageUrl(rawLink);

  return `
    <div class="pack-card ${selected}" data-value="${escapeAttr(value)}">
      <div class="pack-title">
        <h4>${escapeHtml(title)}</h4>
        <span class="pack-radio"></span>
      </div>

      <div class="pack-figure pack-figure-photo">
        <img
          class="pack-photo"
          src="${escapeAttr(imgSrc)}"
          alt="${escapeAttr(title)}"
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="this.style.display='none'; if(!this.parentElement.querySelector('.pack-photo-fallback')){ this.parentElement.classList.add('pack-photo-error'); this.parentElement.insertAdjacentHTML('beforeend', '<div class=\\'pack-photo-fallback\\'>이미지를 불러오지 못했습니다.</div>'); }"
        >
      </div>

      <div class="pack-desc">${escapeHtml(desc)}</div>
    </div>
  `;
}

function renderFaqSection(title, items = [], compact = false) {
  if (!items || !items.length) return '';

  return `
    <section class="section-card faq-section ${compact ? 'faq-section-compact' : ''}">
      <div class="section-title">
        <div class="section-badge">?</div>
        <h2>${escapeHtml(title)}</h2>
      </div>

      <div class="faq-list">
        ${items.map((item, idx) => `
          <div class="faq-item">
            <button type="button" class="faq-q" data-faq-toggle="faq-${compact ? 'g' : 'p'}-${idx}">
              <span>${escapeHtml(item.question)}</span>
              <span class="faq-icon">+</span>
            </button>
            <div class="faq-a" id="faq-${compact ? 'g' : 'p'}-${idx}">
              ${nl2br(escapeHtml(item.answer))}
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function extractGoogleDriveFileId(url = '') {
  const s = String(url || '').trim();
  if (!s) return '';

  let m = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];

  m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];

  m = s.match(/uc\?[^#]*id=([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];

  m = s.match(/^([a-zA-Z0-9_-]{20,})$/);
  if (m && m[1]) return m[1];

  return '';
}

function buildGoogleDriveImageUrl(url = '') {
  const fileId = extractGoogleDriveFileId(url);
  if (!fileId) return '';
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
}

function radioChip(name, value, label, selected) {
  return `
    <label class="choice-chip">
      <input type="radio" name="${name}" value="${value}" ${selected === value ? 'checked' : ''}>
      <span>${label}</span>
    </label>
  `;
}

async function apiGet(action, params = {}) {
  const url = new URL(API_BASE_URL);
  url.searchParams.set('action', action);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value == null ? '' : String(value));
  });

  const response = await fetch(url.toString(), {
    method: 'GET'
  });

  if (!response.ok) {
    throw new Error(`네트워크 오류 (${response.status})`);
  }

  return await response.json();
}

function bindFaqToggle() {
  document.querySelectorAll('[data-faq-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-faq-toggle');
      const answer = document.getElementById(targetId);
      if (!answer) return;

      const isOpen = answer.classList.contains('open');
      answer.classList.toggle('open', !isOpen);
      btn.classList.toggle('open', !isOpen);

      const icon = btn.querySelector('.faq-icon');
      if (icon) icon.textContent = isOpen ? '+' : '−';
    });
  });
}

function nl2br(str = '') {
  return String(str).replace(/\n/g, '<br>');
}

function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;

  el.textContent = message;
  el.classList.remove('hidden');

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    el.classList.add('hidden');
  }, 2500);
}

function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(str = '') {
  return escapeHtml(str);
}
