const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbweXsPBao0-wELhpfnBsSgU_J4IPGUCXY571lUHkAC4e2PYAHlmz_Alv-P6T7nM3KAq/exec';

const state = {
  code: '',
  token: '',
  client: null,
  response: null,
  assets: {
    logoUrl: './logo.png'
  }
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  const params = new URLSearchParams(location.search);
  state.code = params.get('code') || '';
  state.token = params.get('token') || '';

  if (!state.code || !state.token) {
    renderError('유효하지 않은 접속 링크입니다.');
    return;
  }

  try {
    const data = await apiGet('bootstrap', {
      code: state.code,
      token: state.token
    });

    if (!data.ok) throw new Error(data.message || '초기화 실패');

    state.client = data.client;
    state.response = data.response;
    state.assets = data.assets || state.assets;

    renderByState();
  } catch (err) {
    renderError(err.message || '페이지를 불러오지 못했습니다.');
  }
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
        <h1>원활한 운영을 위한 사전 문의</h1>
        <p>
          초도 입고와 출고를 안정적으로 운영하기 위해 필요한 정보를 사전에 확인하고 있습니다.
          아래 사전 문의를 제출해주시면 품고에서 확인 후 이후 N배송 가이드를 순차적으로 오픈해드립니다.
        </p>
        <div class="hero-actions">
          <button class="btn btn-primary" id="goFormBtn" type="button">제출하러 가기</button>
        </div>
      </section>

      <div id="formWrap" style="display:none; margin-top:18px;">
        ${renderPreSurveyForm()}
      </div>
    </div>
  `;

  document.getElementById('goFormBtn').addEventListener('click', () => {
    const wrap = document.getElementById('formWrap');
    wrap.style.display = 'block';
    wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    bindPreSurveyForm();
  });
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
            <label>초도 입고월 예정된 행사 유무 <span class="req">*</span></label>
            <div class="radio-row">
              ${radioChip('eventYn', 'Y', '있음', r.eventYn)}
              ${radioChip('eventYn', 'N', '없음', r.eventYn)}
            </div>
            <div class="help">
              예시) 초도 입고일이 4/1인 경우, 4월 내 예정된 스마트스토어 행사 유무를 전달해주세요.<br/>
              행사 예시: 오늘끝딜, 슈퍼위크, 슈퍼적립, 브랜드데이, 라이브 등
            </div>
          </div>

          <div id="eventFields" class="form-group full" style="display:none;">
            <div class="form-grid">
              <div class="form-group">
                <label>행사명 <span class="req">*</span></label>
                <input type="text" name="eventName" value="${escapeAttr(r.eventName || '')}" placeholder="예: 브랜드데이" />
              </div>

              <div class="form-group">
                <label>예상 송장건수 <span class="req">*</span></label>
                <input type="number" name="expectedOrders" value="${escapeAttr(r.expectedOrders || '')}" placeholder="예: 500" />
              </div>

              <div class="form-group full">
                <label>행사 일시 <span class="req">*</span></label>
                <input type="text" name="eventDatetime" value="${escapeAttr(r.eventDatetime || '')}" placeholder="예: 2026-04-15 19:00 ~ 2026-04-16 23:59" />
              </div>
            </div>
          </div>

          <div class="form-group full">
            <label>포장 방법 <span class="req">*</span></label>
            <div class="pack-grid" id="packGrid">
              ${renderPackCard('기본 포장', '기본 포장', '상품 박스를 기준으로 위/아래 완충재를 넣는 기본 형태입니다.', r.packingMethod)}
              ${renderPackCard('에어캡 포장', '에어캡 포장', '상품 단위에 에어캡을 추가 적용하는 형태입니다.', r.packingMethod)}
              ${renderPackCard('버블페이퍼 포장', '버블페이퍼 포장', '버블페이퍼로 감싸 보호하는 형태입니다.', r.packingMethod)}
            </div>
            <input type="hidden" name="packingMethod" id="packingMethod" value="${escapeAttr(r.packingMethod || '')}" />
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
        <h2>사전문의가 제출되었습니다</h2>
        <p>
          제출해주신 내용을 품고에서 확인하고 있습니다.<br/>
          확인 후 N배송 가이드를 오픈해드릴 예정이며, 최대 1영업일 소요될 수 있는 점 양해 부탁드립니다.
        </p>
      </section>
    </div>
  `;
}

function renderGuide() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="container">
      ${renderTopbar()}
      <div class="guide-layout">
        <aside class="guide-sidebar">
          <h3>온보딩 가이드</h3>
          <div class="step-nav">
            <button class="active" data-step-anchor="step1">STEP1. 품고 나우 로그인</button>
            <button data-step-anchor="step2">STEP2. 판매처 등록</button>
            <button data-step-anchor="step3">STEP3. SKU 등록</button>
            <button data-step-anchor="step4">STEP4. 입고 준비</button>
            <button data-step-anchor="step5">STEP5. N배송 설정하기</button>
          </div>
        </aside>

        <main class="guide-content">
          ${renderGuideStep1()}
          ${renderGuideStep2()}
          ${renderGuideStep3()}
          ${renderGuideStep4()}
          ${renderGuideStep5()}
        </main>
      </div>
    </div>
  `;

  bindGuideNav();
  bindLockedStepButtons();
}

function renderGuideStep1() {
  return `
    <section class="step-card" id="step1">
      <div class="step-head">
        <div class="step-title-wrap">
          <h2>STEP1. 품고 나우 로그인 하기</h2>
          <p>기본 계정 접속과 구성원 등록까지 먼저 진행해주세요.</p>
        </div>
        <div class="step-status status-open">OPEN</div>
      </div>

      <div class="task-list">
        <div class="task-item">
          <h4>품고 나우 로그인 하기</h4>
          <p>안내받은 계정으로 품고 나우에 로그인해주세요.</p>
        </div>
        <div class="task-item">
          <h4>구성원 추가하기</h4>
          <p>운영에 필요한 구성원이 있다면 함께 등록해주세요.</p>
        </div>
      </div>
    </section>
  `;
}

function renderGuideStep2() {
  return `
    <section class="step-card" id="step2">
      <div class="step-head">
        <div class="step-title-wrap">
          <h2>STEP2. 판매처 등록</h2>
          <p>판매처/풀필먼트/N배송 약관 동의 등 기초 세팅을 진행해주세요.</p>
        </div>
        <div class="step-status status-open">OPEN</div>
      </div>

      <div class="task-list">
        <div class="task-item">
          <h4>판매처 등록</h4>
          <p>운영할 판매처를 등록해주세요.</p>
        </div>
        <div class="task-item">
          <h4>풀필먼트 연동</h4>
          <p>출고 운영을 위한 풀필먼트 연동을 진행해주세요.</p>
        </div>
        <div class="task-item">
          <h4>N배송 약관 동의</h4>
          <p>N배송 운영에 필요한 약관 동의를 진행해주세요.</p>
        </div>
      </div>

      <div class="step-actions">
        <button type="button" class="btn btn-primary" data-request-step="3">다음 단계 보기</button>
      </div>
      <div class="lock-note">다음 단계는 품고 확인 후 오픈됩니다.</div>
    </section>
  `;
}

function renderGuideStep3() {
  const open = String(state.client.step3Open).toUpperCase() === 'Y';
  return `
    <section class="step-card" id="step3">
      <div class="step-head">
        <div class="step-title-wrap">
          <h2>STEP3. SKU 등록</h2>
          <p>SKU 등록 및 연결 상품 매핑을 진행하는 단계입니다.</p>
        </div>
        <div class="step-status ${open ? 'status-open' : 'status-locked'}">${open ? 'OPEN' : 'LOCKED'}</div>
      </div>

      <div class="task-list">
        <div class="task-item">
          <h4>SKU 등록</h4>
          <p>운영 예정 상품의 SKU를 등록해주세요.</p>
        </div>
        <div class="task-item">
          <h4>연결 상품 매핑</h4>
          <p>판매처 상품과 물류 운영 SKU를 연결해주세요.</p>
        </div>
      </div>

      <div class="step-actions">
        ${
          open
            ? `<button type="button" class="btn btn-primary" data-request-step="4">다음 단계 보기</button>`
            : `<button type="button" class="btn btn-light" data-request-step="3">품고에서 확인중입니다</button>`
        }
      </div>

      ${
        open
          ? `<div class="lock-note">다음 단계 또한 품고 확인 후 순차 오픈됩니다.</div>`
          : `<div class="lock-note">품고에서 확인 후 다음 가이드를 오픈해드립니다. 기다려주세요.</div>`
      }
    </section>
  `;
}

function renderGuideStep4() {
  const open = String(state.client.step4Open).toUpperCase() === 'Y';
  return `
    <section class="step-card" id="step4">
      <div class="step-head">
        <div class="step-title-wrap">
          <h2>STEP4. 입고 준비</h2>
          <p>입고 가이드를 확인하고 초도 입고 패킹리스트를 제출해주세요.</p>
        </div>
        <div class="step-status ${open ? 'status-open' : 'status-locked'}">${open ? 'OPEN' : 'LOCKED'}</div>
      </div>

      <div class="task-list">
        <div class="task-item">
          <h4>입고 가이드 보기</h4>
          <p>입고 시 유의사항 및 입고 기준을 확인해주세요. 이 항목은 별도 화면 전환이 필요한 가이드 영역으로 연결할 수 있습니다.</p>
        </div>
        <div class="task-item">
          <h4>초도 입고 패킹리스트 제출</h4>
          <p>초도 입고될 상품 정보를 패킹리스트 양식에 맞춰 제출해주세요.</p>
        </div>
      </div>

      <div class="step-actions">
        ${
          open
            ? `
              <a href="#step4" class="screen-link">입고 가이드 보기</a>
              <button type="button" class="btn btn-primary" data-request-step="5">다음 단계 보기</button>
            `
            : `<button type="button" class="btn btn-light" data-request-step="4">품고에서 확인중입니다</button>`
        }
      </div>

      ${
        open
          ? `<div class="lock-note">품고 입고 완료 후 마지막 단계가 오픈됩니다.</div>`
          : `<div class="lock-note">품고에 입고가 완료된 후 오픈 가능합니다. 입고 완료 후 담당자의 안내를 기다려주세요.</div>`
      }
    </section>
  `;
}

function renderGuideStep5() {
  const open = String(state.client.step5Open).toUpperCase() === 'Y';
  return `
    <section class="step-card" id="step5">
      <div class="step-head">
        <div class="step-title-wrap">
          <h2>STEP5. N배송 설정하기</h2>
          <p>최종 설정을 완료하면 온보딩 가이드가 마무리됩니다.</p>
        </div>
        <div class="step-status ${open ? 'status-open' : 'status-locked'}">${open ? 'OPEN' : 'LOCKED'}</div>
      </div>

      <div class="task-list">
        <div class="task-item">
          <h4>N배송 설정하기</h4>
          <p>최종 운영 설정을 완료해주세요. 여기까지 진행되면 가이드가 종료됩니다.</p>
        </div>
      </div>

      ${
        open
          ? `<div class="step-actions"><button type="button" class="btn btn-primary">가이드 완료</button></div>`
          : `<div class="step-actions"><button type="button" class="btn btn-light" data-request-step="5">품고에서 확인중입니다</button></div>`
      }
    </section>
  `;
}

function bindGuideNav() {
  document.querySelectorAll('[data-step-anchor]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.stepAnchor);
      if (!target) return;

      document.querySelectorAll('[data-step-anchor]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function bindLockedStepButtons() {
  document.querySelectorAll('[data-request-step]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const step = btn.dataset.requestStep;
      try {
        const result = await apiGet('requestStepOpen', {
          code: state.code,
          token: state.token,
          step
        });

        if (!result.ok) throw new Error(result.message || '요청 실패');
        toast(result.message || '품고에서 확인중입니다.');
      } catch (err) {
        toast(err.message || '요청 처리에 실패했습니다.');
      }
    });
  });
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
        renderGuide();
      } else {
        renderWaitingGuideOpen();
      }
    } catch (err) {
      toast(err.message || '제출에 실패했습니다.');
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
    eventYn: (fd.get('eventYn') || '').toString().trim(),
    eventName: (fd.get('eventName') || '').toString().trim(),
    expectedOrders: (fd.get('expectedOrders') || '').toString().trim(),
    eventDatetime: (fd.get('eventDatetime') || '').toString().trim(),
    packingMethod: (fd.get('packingMethod') || '').toString().trim(),
    inquiry: (fd.get('inquiry') || '').toString().trim()
  };
}

function validateFormData(data) {
  if (!data.email) return { ok:false, message:'이메일을 입력해주세요.' };
  if (!data.managerName) return { ok:false, message:'담당자명을 입력해주세요.' };
  if (!data.phone) return { ok:false, message:'연락처를 입력해주세요.' };
  if (!data.brandAddress) return { ok:false, message:'브랜드 사업자 주소를 입력해주세요.' };
  if (!data.csPhone) return { ok:false, message:'CS 대표번호를 입력해주세요.' };
  if (!data.firstInboundDate) return { ok:false, message:'초도 입고일을 입력해주세요.' };
  if (!data.inboundType) return { ok:false, message:'입고 방식을 선택해주세요.' };
  if (!data.singleSkuYn) return { ok:false, message:'단수 출고 SKU 유무를 선택해주세요.' };
  if (!data.eventYn) return { ok:false, message:'행사 유무를 선택해주세요.' };
  if (!data.packingMethod) return { ok:false, message:'포장 방법을 선택해주세요.' };

  if (data.eventYn === 'Y') {
    if (!data.eventName) return { ok:false, message:'행사명을 입력해주세요.' };
    if (!data.expectedOrders) return { ok:false, message:'예상 송장건수를 입력해주세요.' };
    if (!data.eventDatetime) return { ok:false, message:'행사 일시를 입력해주세요.' };
  }

  return { ok:true };
}

function renderTopbar() {
  return `
    <div class="topbar">
      <img class="logo" src="${state.assets.logoUrl || './logo.png'}" alt="logo" />
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

  let figureHtml = '';

  if (value === '기본 포장') {
    figureHtml = `
      <div class="pack-figure realistic-box">
        <div class="pkg-flap top"></div>
        <div class="pkg-flap left"></div>
        <div class="pkg-flap right"></div>
        <div class="pkg-flap bottom"></div>

        <div class="pkg-floor"></div>
        <div class="pkg-side-shadow left"></div>
        <div class="pkg-side-shadow right"></div>

        <div class="pkg-inner-cushion"></div>

        <div class="pkg-product can basic"></div>
      </div>
    `;
  } else if (value === '에어캡 포장') {
    figureHtml = `
      <div class="pack-figure realistic-box">
        <div class="pkg-flap top"></div>
        <div class="pkg-flap left"></div>
        <div class="pkg-flap right"></div>
        <div class="pkg-flap bottom"></div>

        <div class="pkg-floor"></div>
        <div class="pkg-side-shadow left"></div>
        <div class="pkg-side-shadow right"></div>

        <div class="pkg-product can wrapped"></div>
        <div class="pkg-bubble-wrap around-product"></div>
      </div>
    `;
  } else if (value === '버블페이퍼 포장') {
    figureHtml = `
      <div class="pack-figure realistic-box">
        <div class="pkg-flap top"></div>
        <div class="pkg-flap left"></div>
        <div class="pkg-flap right"></div>
        <div class="pkg-flap bottom"></div>

        <div class="pkg-floor"></div>
        <div class="pkg-side-shadow left"></div>
        <div class="pkg-side-shadow right"></div>

        <div class="pkg-product bottle honey"></div>
        <div class="pkg-bottle-cap"></div>
        <div class="pkg-honeycomb-wrap"></div>
      </div>
    `;
  }

  return `
    <div class="pack-card ${selected}" data-value="${escapeAttr(value)}">
      <div class="pack-title">
        <h4>${escapeHtml(title)}</h4>
        <span class="pack-radio"></span>
      </div>
      ${figureHtml}
      <div class="pack-desc">${escapeHtml(desc)}</div>
    </div>
  `;
}

function radioChip(name, value, label, selected) {
  return `
    <label class="choice-chip">
      <input type="radio" name="${name}" value="${value}" ${selected === value ? 'checked' : ''} />
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

function toast(message) {
  const el = document.getElementById('toast');
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
