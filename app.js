const FILTER_OPTIONS = {
  tracks: ["인문", "사회", "상경", "자연", "공학", "의약·보건", "교육", "예체능", "융합·자율전공"],
  subjects: ["국어", "수학", "영어", "사회", "역사", "윤리", "물리", "화학", "생명과학", "지구과학", "정보", "기술·가정", "보건", "예술·체육"],
  activityTypes: ["자료조사형", "설문조사형", "실험·측정형", "토론·논증형", "데이터분석형", "제작·설계형", "발표·보고서형", "캠페인·기획형", "독서연계형"],
  difficulty: ["기초형", "발전형", "심화형"],
  gradeTerms: ["1학년 1학기", "1학년 2학기", "2학년 1학기", "2학년 2학기", "3학년 1학기"],
  assessmentTypes: ["보고서", "발표", "토론", "실험", "프로젝트", "포트폴리오", "모둠활동", "개인탐구"]
};

const FILTER_LABELS = {
  tracks: "관심 계열",
  subjects: "과목",
  activityTypes: "활동 방식",
  difficulty: "난이도",
  gradeTerms: "학년·학기",
  assessmentTypes: "수행평가 형식"
};

const plannerTemplate = [
  "[내 활동 계획서 초안]",
  "",
  "1. 선택한 활동명:",
  "2. 현재 수업 또는 수행평가와 연결되는 교과 단원 또는 개념:",
  "3. 내가 바꾸어 적용할 탐구 질문:",
  "4. 직접 모을 자료 또는 기록할 내용:",
  "5. 실행 단계:",
  "6. 예상 결과 또는 발표 방식:",
  "7. 담당 선생님께 확인할 점:",
  "8. 주의할 점(익명 처리, 동의, 안전 등):"
].join("\n");

const state = {
  keyword: "",
  tracks: "",
  subjects: "",
  activityTypes: "",
  difficulty: "",
  gradeTerms: "",
  assessmentTypes: ""
};

const savedActivityIds = [];
const compareVotes = {};
let compareSelectionIds = [];
let currentModalActivity = null;
let showAllCompareRows = false;

const keywordInput = document.querySelector("#keyword-search");
const filterGrid = document.querySelector("#filter-grid");
const resultsGrid = document.querySelector("#results-grid");
const resultCount = document.querySelector("#result-count");
const activeFilters = document.querySelector("#active-filters");
const emptyState = document.querySelector("#empty-state");
const resetButton = document.querySelector("#reset-button");
const copyTemplateButton = document.querySelector("#copy-template-button");
const savedCount = document.querySelector("#saved-count");
const savedList = document.querySelector("#saved-list");
const copySavedButton = document.querySelector("#copy-saved-button");
const clearSavedButton = document.querySelector("#clear-saved-button");
const comparePanel = document.querySelector("#compare-panel");
const compareSummary = document.querySelector("#compare-summary");
const compareResults = document.querySelector("#compare-results");
const clearCompareButton = document.querySelector("#clear-compare-button");
const detailModal = document.querySelector("#detail-modal");
const modalTitle = document.querySelector("#modal-title");
const modalContent = document.querySelector("#modal-content");
const modalCopyButton = document.querySelector("#modal-copy-button");
const modalSaveButton = document.querySelector("#modal-save-button");
const closeModalButton = document.querySelector("#close-modal-button");
const cardTemplate = document.querySelector("#card-template");

init();

function init() {
  hydrateStateFromUrl();
  buildFilters();
  keywordInput.value = state.keyword;
  render();

  keywordInput.addEventListener("input", (event) => {
    state.keyword = event.target.value.trim();
    syncUrl();
    render();
  });

  resetButton.addEventListener("click", () => {
    Object.keys(state).forEach((key) => {
      state[key] = "";
    });

    keywordInput.value = "";
    filterGrid.querySelectorAll("select").forEach((select) => {
      select.value = "";
    });

    syncUrl();
    render();
  });

  copyTemplateButton.addEventListener("click", async () => {
    await copyText(plannerTemplate, "활동 계획서 초안이 복사되었습니다.");
    flashButton(copyTemplateButton, "복사됨");
  });

  copySavedButton.addEventListener("click", async () => {
    if (savedActivityIds.length === 0) {
      window.alert("먼저 활동을 1개 이상 담아 주세요.");
      return;
    }

    const previousText = copySavedButton.textContent;
    await copyText(buildSavedActivitiesCopy(), "담은 활동과 계획서 초안이 복사되었습니다.");
    flashButton(copySavedButton, "복사됨", previousText);
  });

  clearSavedButton.addEventListener("click", () => {
    savedActivityIds.splice(0, savedActivityIds.length);
    compareSelectionIds = [];
    showAllCompareRows = false;
    clearCompareVotes();
    render();
    syncModalButtons();
  });

  clearCompareButton.addEventListener("click", () => {
    compareSelectionIds = [];
    clearCompareVotes();
    render();
  });

  closeModalButton.addEventListener("click", () => {
    detailModal.close();
  });

  modalCopyButton.addEventListener("click", async () => {
    if (!currentModalActivity) {
      return;
    }

    await copyText(buildActivityCopy(currentModalActivity), "활동 내용과 계획서 초안이 복사되었습니다.");
    flashButton(modalCopyButton, "복사됨");
  });

  modalSaveButton.addEventListener("click", () => {
    if (!currentModalActivity) {
      return;
    }

    toggleSavedActivity(currentModalActivity.id);
  });

  detailModal.addEventListener("click", (event) => {
    const bounds = detailModal.getBoundingClientRect();
    const clickedOutside =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;

    if (clickedOutside) {
      detailModal.close();
    }
  });
}

function buildFilters() {
  filterGrid.innerHTML = "";

  Object.entries(FILTER_OPTIONS).forEach(([key, options]) => {
    const wrapper = document.createElement("div");
    wrapper.className = "filter-field";

    const label = document.createElement("label");
    label.htmlFor = `filter-${key}`;
    label.textContent = FILTER_LABELS[key];

    const select = document.createElement("select");
    select.id = `filter-${key}`;
    select.setAttribute("aria-label", FILTER_LABELS[key]);
    select.innerHTML = [
      `<option value="">전체 보기</option>`,
      ...options.map((option) => `<option value="${option}">${option}</option>`)
    ].join("");

    select.addEventListener("change", (event) => {
      state[key] = event.target.value;
      syncUrl();
      render();
    });

    const selectWrap = document.createElement("div");
    selectWrap.className = "filter-select-wrap";
    selectWrap.append(select);

    const hint = document.createElement("p");
    hint.className = "filter-hint";
    hint.textContent = `${FILTER_LABELS[key]} 기준으로 결과를 줄여볼 수 있습니다.`;

    wrapper.append(label, selectWrap, hint);
    filterGrid.append(wrapper);
  });

  Object.entries(state).forEach(([key, value]) => {
    if (key === "keyword") {
      return;
    }

    const select = document.querySelector(`#filter-${key}`);
    if (select) {
      select.value = value;
    }
  });
}

function hydrateStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  Object.keys(state).forEach((key) => {
    const next = params.get(key);
    if (next) {
      state[key] = next;
    }
  });
}

function syncUrl() {
  const params = new URLSearchParams();

  Object.entries(state).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const nextUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
  window.history.replaceState({}, "", nextUrl);
}

function render() {
  const filteredActivities = window.ACTIVITIES.filter(matchesFilters);

  renderActiveFilters();
  renderSavedActivities();
  renderComparePanel();
  resultCount.textContent = String(filteredActivities.length);
  resultsGrid.innerHTML = "";

  if (filteredActivities.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  filteredActivities.forEach((activity) => {
    const fragment = cardTemplate.content.cloneNode(true);
    const badges = fragment.querySelector(".card-badges");
    const saveButton = fragment.querySelector(".save-button");
    const copyButton = fragment.querySelector(".copy-button");

    createBadge(badges, activity.difficulty, "badge-difficulty");
    createBadge(badges, activity.subjects[0], "badge-subject");
    createBadge(badges, activity.tracks[0], "badge-track");
    createBadge(badges, activity.activityTypes[0], "badge-type");

    fragment.querySelector(".card-title").textContent = activity.title;
    fragment.querySelector(".card-one-line").textContent = activity.oneLine;
    fragment.querySelector(".card-concepts").textContent = activity.concepts.join(", ");
    fragment.querySelector(".card-career-fit").textContent = activity.careerFit.join(", ");
    fragment.querySelector(".card-assessment").textContent = activity.assessmentTypes.join(" / ");

    fragment.querySelector(".detail-button").addEventListener("click", () => openDetailModal(activity));
    copyButton.addEventListener("click", async () => {
      await copyText(buildActivityCopy(activity), "활동 내용과 계획서 초안이 복사되었습니다.");
      flashButton(copyButton, "복사됨");
    });

    saveButton.textContent = isSaved(activity.id) ? "담음 완료" : "담기";
    saveButton.classList.toggle("is-saved", isSaved(activity.id));
    saveButton.addEventListener("click", () => {
      toggleSavedActivity(activity.id);
    });

    resultsGrid.append(fragment);
  });
}

function renderSavedActivities() {
  savedCount.textContent = String(savedActivityIds.length);
  savedList.innerHTML = "";
  copySavedButton.disabled = savedActivityIds.length === 0;
  clearSavedButton.disabled = savedActivityIds.length === 0;

  if (savedActivityIds.length === 0) {
    const empty = document.createElement("p");
    empty.className = "saved-empty";
    empty.textContent = "아직 담은 활동이 없습니다. 카드의 담기 버튼을 눌러 보세요.";
    savedList.append(empty);
    return;
  }

  savedActivityIds
    .map((id) => findActivityById(id))
    .filter(Boolean)
    .forEach((activity) => {
      const chip = document.createElement("div");
      chip.className = "saved-chip";

      const title = document.createElement("div");
      title.className = "saved-chip-title";
      title.textContent = activity.title;

      const meta = document.createElement("div");
      meta.className = "saved-chip-meta";
      meta.textContent = `${activity.difficulty} · ${activity.subjects[0]} · ${activity.tracks[0]}`;

      chip.append(title, meta);

      const selectWrap = document.createElement("label");
      selectWrap.className = "saved-chip-select";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = compareSelectionIds.includes(activity.id);
      checkbox.addEventListener("change", () => {
        toggleCompareSelection(activity.id, checkbox.checked);
      });

      const labelText = document.createElement("span");
      labelText.textContent = "비교 선택";

      selectWrap.append(checkbox, labelText);
      chip.append(selectWrap);

      const openButton = document.createElement("button");
      openButton.className = "chip-mini-button";
      openButton.type = "button";
      openButton.textContent = "자세히 보기";
      openButton.addEventListener("click", () => openDetailModal(activity));

      const removeButton = document.createElement("button");
      removeButton.className = "chip-mini-button";
      removeButton.type = "button";
      removeButton.textContent = "빼기";
      removeButton.addEventListener("click", () => toggleSavedActivity(activity.id));

      chip.append(openButton, removeButton);
      savedList.append(chip);
    });
}

function renderComparePanel() {
  comparePanel.hidden = compareSelectionIds.length < 2;
  compareSummary.innerHTML = "";

  if (compareSelectionIds.length < 2) {
    compareResults.innerHTML = "";
    return;
  }

  renderCompareSummary();
  renderCompareResults();
}

function renderCompareSummary() {
  compareSummary.innerHTML = "";

  const selectedActivities = compareSelectionIds.map(findActivityById).filter(Boolean);
  if (selectedActivities.length !== 2) {
    return;
  }

  const spacer = document.createElement("div");
  spacer.className = "compare-summary-spacer";
  spacer.textContent = "비교 점수";
  compareSummary.append(spacer);

  selectedActivities.forEach((activity) => {
    const box = document.createElement("div");
    box.className = "compare-summary-chip";

    const title = document.createElement("div");
    title.className = "compare-summary-title";
    title.textContent = activity.title;

    const score = document.createElement("div");
    score.className = "compare-score";
    score.innerHTML = `선택된 항목 <strong>${countVotesForActivity(activity.id)}</strong>개`;

    box.append(title, score);
    compareSummary.append(box);
  });
}

function renderCompareResults() {
  compareResults.innerHTML = "";
  compareResults.classList.toggle("show-all", showAllCompareRows);

  const selectedActivities = compareSelectionIds.map(findActivityById).filter(Boolean);
  if (selectedActivities.length !== 2) {
    const empty = document.createElement("p");
    empty.className = "compare-empty";
    empty.textContent = "위의 담은 활동 목록에서 비교할 활동 2개를 선택하면 여기에서 차이를 볼 수 있습니다.";
    compareResults.append(empty);
    return;
  }

  const rows = [
    ["tracks", "관심 계열", (activity) => activity.tracks.join(", "), true],
    ["careerFit", "추천 대상", (activity) => activity.careerFit.join(", "), true],
    ["difficulty", "난이도", (activity) => activity.difficulty, true],
    ["subjects", "과목", (activity) => activity.subjects.join(", "), true],
    ["question", "탐구 질문", (activity) => activity.inquiryQuestion, true],
    ["rawData", "직접 수집 가능한 자료", (activity) => activity.rawData.join(", "), true],
    ["concepts", "관련 개념 키워드", (activity) => activity.concepts.join(", "), false],
    ["basic", "기초형 버전", (activity) => activity.basicVersion, false],
    ["advanced", "심화형 버전", (activity) => activity.advancedVersion, false],
    ["warnings", "주의사항", (activity) => activity.warnings.join(" / "), false]
  ];

  rows.forEach(([rowKey, labelText, valueGetter, isCore]) => {
    const row = document.createElement("section");
    row.className = "compare-row";
    if (!isCore) {
      row.classList.add("is-optional");
    }

    const label = document.createElement("div");
    label.className = "compare-label";
    label.textContent = labelText;
    row.append(label);

    selectedActivities.forEach((activity) => {
      const cell = document.createElement("div");
      cell.className = "compare-cell";
      cell.classList.toggle("is-voted", compareVotes[rowKey] === activity.id);
      cell.addEventListener("click", () => {
        if (compareVotes[rowKey] === activity.id) {
          delete compareVotes[rowKey];
        } else {
          compareVotes[rowKey] = activity.id;
        }
        renderComparePanel();
      });

      const cellTitle = document.createElement("div");
      cellTitle.className = "compare-cell-title";
      cellTitle.textContent = activity.title;

      const value = document.createElement("div");
      value.textContent = valueGetter(activity);

      cell.append(cellTitle, value);
      row.append(cell);
    });

    compareResults.append(row);
  });

  const moreWrap = document.createElement("div");
  moreWrap.className = "compare-more-wrap";

  const moreButton = document.createElement("button");
  moreButton.type = "button";
  moreButton.className = "ghost-button";
  moreButton.textContent = showAllCompareRows ? "핵심 항목만 보기" : "자세한 항목 보기";
  moreButton.addEventListener("click", () => {
    showAllCompareRows = !showAllCompareRows;
    renderComparePanel();
  });

  moreWrap.append(moreButton);
  compareResults.append(moreWrap);
}

function toggleSavedActivity(activityId) {
  const existingIndex = savedActivityIds.indexOf(activityId);

  if (existingIndex >= 0) {
    savedActivityIds.splice(existingIndex, 1);
    compareSelectionIds = compareSelectionIds.filter((id) => id !== activityId);
  } else {
    savedActivityIds.push(activityId);
  }

  if (savedActivityIds.length < 2) {
    compareSelectionIds = [];
    showAllCompareRows = false;
    clearCompareVotes();
  }

  cleanupCompareVotes();
  render();
  syncModalButtons();
}

function toggleCompareSelection(activityId, shouldSelect) {
  if (shouldSelect) {
    if (compareSelectionIds.length >= 2) {
      render();
      window.alert("비교는 2개 활동까지만 고를 수 있습니다.");
      return;
    }

    if (!compareSelectionIds.includes(activityId)) {
      compareSelectionIds.push(activityId);
    }
  } else {
    compareSelectionIds = compareSelectionIds.filter((id) => id !== activityId);
  }

  cleanupCompareVotes();
  render();
}

function cleanupCompareVotes() {
  Object.keys(compareVotes).forEach((key) => {
    if (!compareSelectionIds.includes(compareVotes[key])) {
      delete compareVotes[key];
    }
  });
}

function clearCompareVotes() {
  Object.keys(compareVotes).forEach((key) => {
    delete compareVotes[key];
  });
}

function countVotesForActivity(activityId) {
  return Object.values(compareVotes).filter((id) => id === activityId).length;
}

function isSaved(activityId) {
  return savedActivityIds.includes(activityId);
}

function syncModalButtons() {
  if (!currentModalActivity) {
    return;
  }

  const saved = isSaved(currentModalActivity.id);
  modalSaveButton.textContent = saved ? "담은 활동에서 빼기" : "이 활동 담기";
  modalSaveButton.classList.toggle("is-saved", saved);
}

function matchesFilters(activity) {
  const keyword = state.keyword.toLowerCase();
  const matchesKeyword = !keyword || buildSearchableText(activity).includes(keyword);

  return (
    matchesKeyword &&
    matchesSelect(activity.tracks, state.tracks) &&
    matchesSelect(activity.subjects, state.subjects) &&
    matchesSelect(activity.activityTypes, state.activityTypes) &&
    matchesSelect([activity.difficulty], state.difficulty) &&
    matchesSelect(activity.gradeTerms, state.gradeTerms) &&
    matchesSelect(activity.assessmentTypes, state.assessmentTypes)
  );
}

function matchesSelect(values, selectedValue) {
  return !selectedValue || values.includes(selectedValue);
}

function buildSearchableText(activity) {
  return [
    activity.id,
    activity.title,
    activity.oneLine,
    activity.inquiryQuestion,
    ...activity.tracks,
    ...activity.subjects,
    ...activity.gradeTerms,
    ...activity.activityTypes,
    ...activity.assessmentTypes,
    activity.difficulty,
    ...activity.concepts,
    ...activity.careerFit,
    ...activity.steps,
    ...activity.rawData,
    ...activity.recordPoint,
    ...activity.evaluationElements,
    ...activity.connectFromGrade1,
    activity.basicVersion,
    activity.advancedVersion,
    ...activity.checkBeforeUse,
    ...activity.warnings
  ].join(" ").toLowerCase();
}

function renderActiveFilters() {
  activeFilters.innerHTML = "";

  Object.entries(state)
    .filter(([, value]) => value)
    .forEach(([key, value]) => {
      const chip = document.createElement("span");
      chip.className = "active-chip";
      chip.textContent = key === "keyword" ? `검색어: ${value}` : `${FILTER_LABELS[key]}: ${value}`;
      activeFilters.append(chip);
    });
}

function createBadge(container, text, className) {
  const badge = document.createElement("span");
  badge.className = `badge ${className}`;
  badge.textContent = text;
  container.append(badge);
}

function openDetailModal(activity) {
  currentModalActivity = activity;
  modalTitle.textContent = activity.title;
  modalContent.innerHTML = "";
  modalContent.scrollTop = 0;
  syncModalButtons();

  const summary = document.createElement("section");
  summary.className = "detail-summary";
  summary.innerHTML = `
    <p><strong>한 줄 개요</strong><br>${escapeHtml(activity.oneLine)}</p>
    <p><strong>추천 대상</strong><br>${escapeHtml(activity.careerFit.join(", "))}</p>
    <p><strong>탐구 질문</strong><br>${escapeHtml(activity.inquiryQuestion)}</p>
    <p><strong>활용 안내</strong><br>아래 키워드를 현재 배우는 단원 개념과 연결해 더 구체적인 주제로 좁혀 보세요.</p>
  `;

  const grid = document.createElement("div");
  grid.className = "detail-grid";

  grid.append(
    buildSection("관련 개념 키워드", activity.concepts),
    buildSection("실행 단계", activity.steps),
    buildSection("직접 수집 가능한 자료", activity.rawData),
    buildSection("1학년 활동과 연결하기", activity.connectFromGrade1),
    buildParagraphSection("기초형 버전", activity.basicVersion),
    buildParagraphSection("심화형 버전", activity.advancedVersion),
    buildSection("세특에 드러날 수 있는 역량", activity.recordPoint),
    buildSection("평가 요소", activity.evaluationElements),
    buildSection("수행평가 적용 전 확인할 점", activity.checkBeforeUse),
    buildSection("주의사항", activity.warnings)
  );

  const meta = document.createElement("section");
  meta.className = "detail-section";
  meta.innerHTML = `
    <h3>기본 정보</h3>
    <div class="detail-tags">
      ${[activity.difficulty, ...activity.tracks, ...activity.subjects, ...activity.activityTypes, ...activity.assessmentTypes]
        .map((tag) => `<span>${escapeHtml(tag)}</span>`)
        .join("")}
    </div>
    <p><strong>권장 학년·학기</strong><br>${escapeHtml(activity.gradeTerms.join(", "))}</p>
    <p><strong>활동 ID</strong><br>${escapeHtml(activity.id)}</p>
  `;

  modalContent.append(summary, meta, grid);
  detailModal.showModal();
  modalContent.scrollTop = 0;
}

function buildSection(title, items) {
  const section = document.createElement("section");
  section.className = "detail-section";

  const heading = document.createElement("h3");
  heading.textContent = title;

  const list = document.createElement("ul");
  list.className = "detail-list";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  });

  section.append(heading, list);
  return section;
}

function buildParagraphSection(title, text) {
  const section = document.createElement("section");
  section.className = "detail-section";

  const heading = document.createElement("h3");
  heading.textContent = title;

  const paragraph = document.createElement("p");
  paragraph.textContent = text;

  section.append(heading, paragraph);
  return section;
}

function buildActivityCopy(activity) {
  return buildActivitySummary(activity, true);
}

function buildSavedActivitiesCopy() {
  const savedActivities = savedActivityIds.map(findActivityById).filter(Boolean);

  return [
    "[담은 활동 모음]",
    "",
    savedActivities.map((activity) => buildActivitySummary(activity, false)).join("\n\n--------------------\n\n"),
    "",
    plannerTemplate
  ].join("\n");
}

function buildActivitySummary(activity, includeTemplate) {
  const lines = [
    `[${activity.title}]`,
    `활동 ID: ${activity.id}`,
    `난이도: ${activity.difficulty}`,
    `관심 계열: ${activity.tracks.join(", ")}`,
    `과목: ${activity.subjects.join(", ")}`,
    `활동 방식: ${activity.activityTypes.join(", ")}`,
    `수행평가 형식: ${activity.assessmentTypes.join(" / ")}`,
    `권장 학년·학기: ${activity.gradeTerms.join(", ")}`,
    "",
    `한 줄 설명: ${activity.oneLine}`,
    `탐구 질문: ${activity.inquiryQuestion}`,
    `관련 개념 키워드: ${activity.concepts.join(", ")}`,
    `추천 대상: ${activity.careerFit.join(", ")}`,
    "",
    "실행 단계:",
    ...activity.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    `직접 수집 가능한 자료: ${activity.rawData.join(", ")}`,
    `세특에 드러날 수 있는 역량: ${activity.recordPoint.join(", ")}`,
    `수행평가 적용 전 확인할 점: ${activity.checkBeforeUse.join(" / ")}`,
    `주의사항: ${activity.warnings.join(" / ")}`
  ];

  if (includeTemplate) {
    lines.push("", plannerTemplate);
  }

  return lines.join("\n");
}

function findActivityById(id) {
  return window.ACTIVITIES.find((activity) => activity.id === id);
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    showTransientLabel(successMessage);
  } catch (error) {
    window.alert("복사에 실패했습니다. 브라우저 권한을 확인해 주세요.");
  }
}

function flashButton(button, activeText, fallbackText) {
  const originalText = fallbackText || button.textContent;
  button.textContent = activeText;
  button.disabled = true;
  window.setTimeout(() => {
    button.textContent = originalText;
    button.disabled = false;
  }, 1200);
}

function showTransientLabel(message) {
  const label = document.createElement("div");
  label.className = "active-chip";
  label.textContent = message;
  activeFilters.prepend(label);
  window.setTimeout(() => label.remove(), 1800);
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
