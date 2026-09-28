/**
 * 자강 피트니스 챌린지 - 백엔드 (Google Apps Script)
 *
 * 【이번 업데이트: 10월 사이트(gran-seoul-fitness/10-) 추가】
 * 9월 챌린지가 아직 끝나지 않은 상태라, 9월 사이트는 지금 그대로 계속 쓸 수 있어야
 * 합니다. 그래서 8월/9월을 나눌 때와 똑같은 방식으로 — 요청 내용을 보고 자동으로
 * 구분하는 방식 — 10월 사이트용 요청만 새로 알아보고 별도 탭("10월 stamps"/
 * "10월 요약")에 기록하도록 분기를 하나 더 추가했습니다.
 *
 * - 9월 사이트는 지금처럼 zoneKey/missionId/title/equipment/photo만 보내고
 *   month 필드를 보내지 않으므로, 이전과 완전히 동일하게 "9월 stamps"/"9월 요약"에
 *   기록됩니다. 9월 쪽 코드/탭/로직은 한 글자도 건드리지 않았습니다.
 * - 10월 사이트(gym_map.html)는 요청에 month: "10월" 을 함께 보내서, 그 요청만
 *   새 10월 분기로 들어가 "10월 stamps"/"10월 요약"에 기록됩니다.
 * - 8월(레거시, week 필드로 구분)도 기존 그대로 완전히 동일하게 동작합니다.
 * - 같은 배포 URL을 세 사이트가 동시에 써도 서로 안 섞입니다.
 *
 * 【적용 방법】
 * 1. 이 파일 내용을 Apps Script 편집기에 그대로 붙여넣고 저장 (기존 코드는 전부 지우고
 *    이 파일로 통째로 교체하시면 됩니다 — 8월/9월 로직이 그대로 다 들어있어요).
 * 2. "배포" > "배포 관리" > 연필 아이콘 > 버전: "새 버전" > 배포.
 *    (기존 배포를 새 버전으로 올리는 거라 실행 URL은 그대로 유지돼요 — 9월 사이트가
 *    쓰고 있는 URL도 그대로라 9월 쪽은 아무 조치도 필요 없어요.)
 * 3. 그 배포 URL을 10월 사이트(gym_map.html)의 SHEET_LOG_URL 상수에 넣으면 끝입니다.
 */

const PHOTO_FOLDER_NAME = "자강피트니스_인증사진";

// ══════════════════════════════════════════════════════════════════
// 8월 (challenge/index.html, 14개 미션 · 주차별) — 기존 로직 그대로, 손대지 않음
// ══════════════════════════════════════════════════════════════════

const LEGACY_SHEET_NAME = "stamps";
const LEGACY_SUMMARY_SHEET_NAME = "요약";

const LEGACY_QUEST_COLUMNS = [
  { key: "cardio-w0", label: "1주·유산소" },
  { key: "gx-w0", label: "1주·GX" },
  { key: "lower-w0", label: "1주·하체" },
  { key: "cardio-w1", label: "2주·유산소" },
  { key: "gx-w1", label: "2주·GX" },
  { key: "back-w1", label: "2주·등" },
  { key: "cardio-w2", label: "3주·유산소" },
  { key: "gx-w2", label: "3주·GX" },
  { key: "chest-w2", label: "3주·가슴" },
  { key: "shoulder-w2", label: "3주·어깨" },
  { key: "cardio-w3", label: "4주·유산소" },
  { key: "gx-w3", label: "4주·GX" },
  { key: "lower-w3", label: "4주·하체" },
  { key: "back-w3", label: "4주·등" },
];

const LEGACY_QUEST_DETAILS = {
  "cardio-w0": { title: "사이클 워밍업 + 인터벌", equipment: "사이클" },
  "cardio-w1": { title: "러닝머신 경사 걷기", equipment: "러닝머신" },
  "cardio-w2": { title: "천국의 계단 + 무동력 러닝머신 인터벌", equipment: "천국의계단 · 무동력 러닝머신" },
  "cardio-w3": { title: "유산소 피크 세션: 싱크로 · 스킬로우 · 일립티컬 로테이션", equipment: "싱크로 · 스킬로우 · 일립티컬 (기구 바꿔가며 30분)" },
  "gx-w0": { title: "G.X 수업 참여: 덤벨 트레이닝 · 파워코어 트레이닝 · 요가 중 택1", equipment: "월·금 덤벨 트레이닝 · 화·목 파워코어 트레이닝 · 수 요가" },
  "gx-w1": { title: "G.X 수업 참여: 덤벨 트레이닝 · 파워코어 트레이닝 · 매트 필라테스 중 택1", equipment: "월·금 덤벨 트레이닝 · 화·목 파워코어 트레이닝 · 수 매트 필라테스" },
  "gx-w2": { title: "G.X 수업 참여: 덤벨 트레이닝 · 파워코어 트레이닝 · 요가 중 택1", equipment: "월·금 덤벨 트레이닝 · 화·목 파워코어 트레이닝 · 수 요가" },
  "gx-w3": { title: "G.X 수업 참여: 덤벨 트레이닝 · 파워코어 트레이닝 · 매트 필라테스 중 택1 · 리워드 수령", equipment: "월·금 덤벨 트레이닝 · 화·목 파워코어 트레이닝 · 수 매트 필라테스 · 리워드 수령" },
  "lower-w0": { title: "하체 적응주: 레그익스텐션·컬 + 어덕터/어브덕터", equipment: "레그 익스텐션 · 레그 컬 · 힙 어덕터/어브덕터" },
  "lower-w3": { title: "하체 총정리 (최고 중량 도전)", equipment: "레그프레스 · 레그익스텐션·컬 · 어덕터" },
  "back-w1": { title: "등 적응주: 랫풀다운 + 로우머신 + 케이블", equipment: "랫풀다운 · 로우 머신(Low Row) · 케이블 펑셔널 트레이너" },
  "back-w3": { title: "등 총정리: 로우 + 맥그립(U-Grip) 다양하게 시도", equipment: "로우 머신 · 프로그 U-그립(다양한 그립 교체 가능)" },
  "chest-w2": { title: "가슴 강도업: 벤치프레스 · 체스트프레스 · 인클라인 · 펙토랄 · 스미스머신", equipment: "벤치프레스 · 체스트프레스 머신 · 인클라인 체스트프레스(노랑) · 펙토랄 · 스미스머신" },
  "shoulder-w2": { title: "덤벨 컬 + 트라이셉스 익스텐션 슈퍼셋", equipment: "숄더프레스 · 덤벨 · 케이블 트라이셉스" },
};

function handleLegacyPost(data) {
  const sheet = getOrCreateSheetLegacy();
  const folder = getOrCreateFolder(PHOTO_FOLDER_NAME);

  let photoUrl = "";
  if (data.photo) {
    const base64Data = data.photo.split(",")[1];
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      "image/jpeg",
      `${data.name}_${data.zoneKey}_w${data.week}_${Date.now()}.jpg`
    );
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    photoUrl = file.getUrl();
  }

  upsertStampRowLegacy(sheet, {
    time: new Date(),
    name: data.name,
    zoneKey: data.zoneKey,
    week: data.week,
    title: data.title,
    equipment: data.equipment || "",
    photoUrl: photoUrl,
  });

  rebuildSummaryLegacy();

  return { success: true, photoUrl: photoUrl };
}

function upsertStampRowLegacy(sheet, row) {
  const values = sheet.getDataRange().getValues();
  const targetName = normalizeName(row.name);
  for (let i = 1; i < values.length; i++) {
    if (
      normalizeName(values[i][1]) === targetName &&
      values[i][2] === row.zoneKey &&
      Number(values[i][3]) === Number(row.week)
    ) {
      sheet
        .getRange(i + 1, 1, 1, 7)
        .setValues([[row.time, row.name, row.zoneKey, row.week, row.title, row.equipment, row.photoUrl]]);
      return;
    }
  }
  sheet.appendRow([row.time, row.name, row.zoneKey, row.week, row.title, row.equipment, row.photoUrl]);
}

function handleLegacyGet(name) {
  const target = normalizeName(name);
  const sheet = getOrCreateSheetLegacy();
  const rows = sheet.getDataRange().getValues();
  const stamps = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (normalizeName(row[1]) === target) {
      stamps.push({
        at: row[0],
        name: row[1],
        zoneKey: row[2],
        week: row[3],
        title: row[4],
        equipment: row[5],
        photoUrl: row[6],
      });
    }
  }
  return stamps;
}

function rebuildSummaryLegacy() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const src = getOrCreateSheetLegacy();
  let summary = ss.getSheetByName(LEGACY_SUMMARY_SHEET_NAME);
  if (!summary) summary = ss.insertSheet(LEGACY_SUMMARY_SHEET_NAME);
  summary.clear();
  summary.clearConditionalFormatRules();

  const rows = src.getDataRange().getValues();
  const byMember = {};
  const namesInOrder = [];

  for (let i = 1; i < rows.length; i++) {
    const rawName = rows[i][1];
    if (!rawName) continue;
    const key = normalizeName(rawName);
    const zoneKey = rows[i][2];
    const week = rows[i][3];
    const photoUrl = rows[i][6];
    const questKey = `${zoneKey}-w${week}`;
    if (!byMember[key]) {
      byMember[key] = { displayName: rawName, done: {} };
      namesInOrder.push(key);
    }
    byMember[key].done[questKey] = photoUrl || true;
  }

  const header = ["이름", "달성", ...LEGACY_QUEST_COLUMNS.map((q) => q.label)];
  summary.appendRow(header);
  summary.getRange(1, 1, 1, header.length).setFontWeight("bold").setBackground("#20392C").setFontColor("#FFFFFF");

  namesInOrder.sort((a, b) => byMember[a].displayName.localeCompare(byMember[b].displayName, "ko"));
  namesInOrder.forEach((key) => {
    const member = byMember[key];
    const done = member.done;
    let count = 0;
    const cells = LEGACY_QUEST_COLUMNS.map((q) => {
      const val = done[q.key];
      if (val && typeof val === "string" && val.indexOf("http") === 0) {
        count++;
        return `=HYPERLINK("${val}","✓")`;
      }
      if (val) {
        count++;
        return "✓";
      }
      return "";
    });
    summary.appendRow([member.displayName, `${count}/${LEGACY_QUEST_COLUMNS.length}`, ...cells]);
  });

  summary.setFrozenRows(1);
  summary.setFrozenColumns(2);
  summary.autoResizeColumns(1, header.length);

  if (namesInOrder.length > 0) {
    const range = summary.getRange(2, 3, namesInOrder.length, LEGACY_QUEST_COLUMNS.length);
    const rule = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=NOT(ISBLANK(C2))')
      .setBackground("#D9EAD3")
      .setRanges([range])
      .build();
    summary.setConditionalFormatRules([rule]);
  }
}

function recoverMissingFromDriveLegacy() {
  const sheet = getOrCreateSheetLegacy();
  const values = sheet.getDataRange().getValues();
  const existingKeys = new Set();
  for (let i = 1; i < values.length; i++) {
    existingKeys.add(`${normalizeName(values[i][1])}||${values[i][2]}||${values[i][3]}`);
  }

  const folder = getOrCreateFolder(PHOTO_FOLDER_NAME);
  const files = folder.getFiles();
  const nameRe = /^(.+)_(cardio|gx|lower|back|chest|shoulder)_w(\d)_(\d+)\.(jpe?g)$/i;
  let recovered = 0;
  const skippedUnknown = [];

  while (files.hasNext()) {
    const file = files.next();
    const m = file.getName().match(nameRe);
    if (!m) continue;
    const memberName = m[1];
    const zoneKey = m[2];
    const week = Number(m[3]);
    const ts = Number(m[4]);
    const key = `${normalizeName(memberName)}||${zoneKey}||${week}`;
    if (existingKeys.has(key)) continue;

    const quest = LEGACY_QUEST_DETAILS[`${zoneKey}-w${week}`];
    if (!quest) { skippedUnknown.push(file.getName()); continue; }

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const time = ts > 0 ? new Date(ts) : file.getDateCreated();

    sheet.appendRow([time, memberName, zoneKey, week, quest.title, quest.equipment, file.getUrl()]);
    existingKeys.add(key);
    recovered++;
  }

  rebuildSummaryLegacy();
  const msg = `복구 완료: ${recovered}건의 누락된 기록을 되살렸습니다.` +
    (skippedUnknown.length ? `\n\n확인 필요(자동 인식 안 됨): ${skippedUnknown.join(", ")}` : "");
  SpreadsheetApp.getUi().alert(msg);
}

function dedupeStampsLegacy() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheetLegacy();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;
  const header = values[0];

  const lastIndexByKey = {};
  for (let i = 1; i < values.length; i++) {
    const key = `${normalizeName(values[i][1])}||${values[i][2]}||${values[i][3]}`;
    lastIndexByKey[key] = i;
  }
  const keepIndexes = Object.values(lastIndexByKey).sort((a, b) => a - b);
  const newData = [header, ...keepIndexes.map((i) => values[i])];

  const backupName = `${LEGACY_SHEET_NAME}_백업_${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss")}`;
  sheet.copyTo(ss).setName(backupName);

  const tempName = LEGACY_SHEET_NAME + "_new";
  const oldTemp = ss.getSheetByName(tempName);
  if (oldTemp) ss.deleteSheet(oldTemp);
  const temp = ss.insertSheet(tempName);
  temp.getRange(1, 1, newData.length, header.length).setValues(newData);

  const originalIndex = sheet.getIndex();
  ss.deleteSheet(sheet);
  temp.setName(LEGACY_SHEET_NAME);
  ss.setActiveSheet(temp);
  ss.moveActiveSheet(originalIndex);

  rebuildSummaryLegacy();
  SpreadsheetApp.getUi().alert(
    `정리 완료: ${values.length - 1}개 행 -> ${newData.length - 1}개 행으로 정리되었습니다.\n` +
    `(원본은 "${backupName}" 탭에 백업되어 있습니다. 문제 없으면 나중에 지우셔도 됩니다.)`
  );
}

function getOrCreateSheetLegacy() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(LEGACY_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(LEGACY_SHEET_NAME);
    sheet.appendRow(["시간", "이름", "구역", "주차", "미션명", "기구", "사진링크"]);
  }
  return sheet;
}

// ══════════════════════════════════════════════════════════════════
// 9월 (캐릭터선택→헬스장맵→미션인증, 10개 미션 · 주차 없음) — 기존 로직 그대로, 손대지 않음
// ══════════════════════════════════════════════════════════════════

const CURRENT_SHEET_NAME = "9월 stamps";
const CURRENT_SUMMARY_SHEET_NAME = "9월 요약";

// gymmap.html의 ZONES/EQUIP_OPTIONS와 동일한 미션 10개.
// key는 미션 id 그대로라서(구역 간에 겹치지 않음) 이 id 하나로 충분해요.
const CURRENT_QUEST_COLUMNS = [
  { key: "back", label: "웨이트·등" },
  { key: "chest", label: "웨이트·가슴" },
  { key: "legs", label: "웨이트·하체" },
  { key: "shoulder", label: "웨이트·어깨" },
  { key: "abs", label: "웨이트·코어" },
  { key: "treadmill", label: "유산소·러닝머신" },
  { key: "bike", label: "유산소·사이클·로잉·스텝밀" },
  { key: "gxclass", label: "GX 수업·쿨다운" },
  { key: "foamroll", label: "스트레칭·폼롤러" },
  { key: "matstretch", label: "스트레칭·머신 스트레칭" },
];

const CURRENT_QUEST_DETAILS = {
  back: { zoneKey: "weight", title: "등", equipment: "랫풀다운 · 로우머신 · 암풀다운·펑셔널 트레이닝" },
  chest: { zoneKey: "weight", title: "가슴", equipment: "체스트프레스 · 펙덱 · 인클라인 체스트프레스 · 벤치프레스" },
  legs: { zoneKey: "weight", title: "하체", equipment: "레그프레스 · 레그익스텐션·컬 · 어덕터·어브덕터 · 플레이트로드 스쿼트" },
  shoulder: { zoneKey: "weight", title: "어깨", equipment: "숄더프레스 · 덤벨존 · 케이블(펑셔널 트레이너)" },
  abs: { zoneKey: "weight", title: "코어", equipment: "백익스텐션 · 복근 벤치 · TOTAL ABDOMINAL" },
  treadmill: { zoneKey: "cardio", title: "러닝머신", equipment: "러닝머신 · 무동력머신 · 싱크로 · 일립티컬" },
  bike: { zoneKey: "cardio", title: "사이클·로잉·스텝밀", equipment: "사이클 · 로잉머신 · 천국의 계단" },
  gxclass: { zoneKey: "gx", title: "GX 수업·쿨다운", equipment: "덤벨 트레이닝 · 파워코어트레이닝 · 요가 · 매트필라테스 · 런지 스트레칭 · 다운독 스트레칭 · 플로우 스트레칭" },
  foamroll: { zoneKey: "stretch", title: "폼롤러", equipment: "폼롤러" },
  matstretch: { zoneKey: "stretch", title: "머신 스트레칭", equipment: "FLEXABILITY ANTERIOR · FLEXABILITY POSTERIOR" },
};

function handleCurrentPost(data, lockMs) {
  const perf = { t0: Date.now() };
  const sheet = getOrCreateSheetCurrent();
  const folder = getOrCreateFolder(PHOTO_FOLDER_NAME);
  perf.tFolder = Date.now();

  let photoUrl = "";
  if (data.photo) {
    const base64Data = data.photo.split(",")[1];
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      "image/jpeg",
      `${data.name}_${data.zoneKey}_${data.missionId}_${Date.now()}.jpg`
    );
    const file = folder.createFile(blob);
    perf.tCreateFile = Date.now();
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    perf.tSharing = Date.now();
    // getUrl()은 드라이브 "보기" 페이지 링크라 <img>에 그대로 못 써요.
    // 썸네일 프록시 URL로 저장해야 사이트 화면(내 사진 미리보기)에서 바로 렌더링돼요.
    photoUrl = `https://drive.google.com/thumbnail?id=${file.getId()}&sz=w1000`;
  } else {
    perf.tCreateFile = Date.now();
    perf.tSharing = Date.now();
  }

  upsertStampRowCurrent(sheet, {
    time: new Date(),
    name: data.name,
    zoneKey: data.zoneKey,
    missionId: data.missionId,
    title: data.title,
    equipment: data.equipment || "",
    photoUrl: photoUrl,
  });
  perf.tSheetWrite = Date.now();

  rebuildSummaryCurrent();
  perf.tSummary = Date.now();

  // 어느 단계가 오래 걸리는지 실측하려고 남겨요 ("성능로그" 탭에서 확인 가능).
  logPerf({
    name: data.name,
    missionId: data.missionId,
    lockMs: lockMs || 0,
    folderMs: perf.tFolder - perf.t0,
    driveCreateMs: perf.tCreateFile - perf.tFolder,
    driveShareMs: perf.tSharing - perf.tCreateFile,
    sheetWriteMs: perf.tSheetWrite - perf.tSharing,
    summaryMs: perf.tSummary - perf.tSheetWrite,
    totalMs: (lockMs || 0) + (perf.tSummary - perf.t0),
  });

  return { success: true, photoUrl: photoUrl };
}

function upsertStampRowCurrent(sheet, row) {
  const values = sheet.getDataRange().getValues();
  const targetName = normalizeName(row.name);
  for (let i = 1; i < values.length; i++) {
    if (
      normalizeName(values[i][1]) === targetName &&
      values[i][3] === row.missionId
    ) {
      sheet
        .getRange(i + 1, 1, 1, 7)
        .setValues([[row.time, row.name, row.zoneKey, row.missionId, row.title, row.equipment, row.photoUrl]]);
      return;
    }
  }
  sheet.appendRow([row.time, row.name, row.zoneKey, row.missionId, row.title, row.equipment, row.photoUrl]);
}

function rebuildSummaryCurrent() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const src = getOrCreateSheetCurrent();
  let summary = ss.getSheetByName(CURRENT_SUMMARY_SHEET_NAME);
  if (!summary) summary = ss.insertSheet(CURRENT_SUMMARY_SHEET_NAME);
  summary.clear();
  summary.clearConditionalFormatRules();

  const rows = src.getDataRange().getValues();
  const byMember = {};
  const namesInOrder = [];

  for (let i = 1; i < rows.length; i++) {
    const rawName = rows[i][1];
    if (!rawName) continue;
    const key = normalizeName(rawName);
    const missionId = rows[i][3];
    const photoUrl = rows[i][6];
    if (!byMember[key]) {
      byMember[key] = { displayName: rawName, done: {} };
      namesInOrder.push(key);
    }
    byMember[key].done[missionId] = photoUrl || true;
  }

  namesInOrder.sort((a, b) => byMember[a].displayName.localeCompare(byMember[b].displayName, "ko"));

  // 회원이 늘어날수록 한 명씩 appendRow()로 쓰면(=API 호출 N번) 매 인증마다 점점
  // 느려져요. 헤더 포함 전체를 한 번의 setValues() 호출로 몰아서 써서, 회원이
  // 몇 명이든 인증 완료까지 걸리는 시간이 거의 일정하게 유지되도록 했어요.
  const header = ["이름", "달성", ...CURRENT_QUEST_COLUMNS.map((q) => q.label)];
  const dataRows = namesInOrder.map((key) => {
    const member = byMember[key];
    const done = member.done;
    let count = 0;
    const cells = CURRENT_QUEST_COLUMNS.map((q) => {
      const val = done[q.key];
      if (val && typeof val === "string" && val.indexOf("http") === 0) {
        count++;
        return `=HYPERLINK("${val}","✓")`;
      }
      if (val) {
        count++;
        return "✓";
      }
      return "";
    });
    return [member.displayName, `${count}/${CURRENT_QUEST_COLUMNS.length}`, ...cells];
  });

  const allRows = [header, ...dataRows];
  summary.getRange(1, 1, allRows.length, header.length).setValues(allRows);
  summary.getRange(1, 1, 1, header.length).setFontWeight("bold").setBackground("#20392C").setFontColor("#FFFFFF");
  // 달성 열 텍스트 고정(자동 날짜 변환 방지) — 실제로 쓴 행까지만 서식 적용해요.
  // 예전엔 getMaxRows()(최대 1000행)까지 매번 서식을 걸어서 느려졌어요.
  summary.getRange(1, 2, allRows.length, 1).setNumberFormat("@");

  summary.setFrozenRows(1);
  summary.setFrozenColumns(2);
  // 열 너비 자동 맞춤(autoResizeColumns)은 매번 할 필요 없어서 뺐어요 — 필요하면
  // 시트에서 수동으로 "열 크기 자동 조정"을 한 번 해주시면 돼요.

  if (namesInOrder.length > 0) {
    const range = summary.getRange(2, 3, namesInOrder.length, CURRENT_QUEST_COLUMNS.length);
    const rule = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=NOT(ISBLANK(C2))')
      .setBackground("#D9EAD3")
      .setRanges([range])
      .build();
    summary.setConditionalFormatRules([rule]);
  }
}

function recoverMissingFromDriveCurrent() {
  const sheet = getOrCreateSheetCurrent();
  const values = sheet.getDataRange().getValues();
  const existingKeys = new Set();
  for (let i = 1; i < values.length; i++) {
    existingKeys.add(`${normalizeName(values[i][1])}||${values[i][3]}`);
  }

  const folder = getOrCreateFolder(PHOTO_FOLDER_NAME);
  const files = folder.getFiles();
  const missionIds = Object.keys(CURRENT_QUEST_DETAILS).join("|");
  const nameRe = new RegExp(`^(.+)_(weight|cardio|gx|stretch)_(${missionIds})_(\\d+)\\.(jpe?g)$`, "i");
  let recovered = 0;
  const skippedUnknown = [];

  while (files.hasNext()) {
    const file = files.next();
    const m = file.getName().match(nameRe);
    if (!m) continue;
    const memberName = m[1];
    const zoneKey = m[2];
    const missionId = m[3];
    const ts = Number(m[4]);
    const key = `${normalizeName(memberName)}||${missionId}`;
    if (existingKeys.has(key)) continue;

    const quest = CURRENT_QUEST_DETAILS[missionId];
    if (!quest) { skippedUnknown.push(file.getName()); continue; }

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const time = ts > 0 ? new Date(ts) : file.getDateCreated();

    sheet.appendRow([time, memberName, zoneKey, missionId, quest.title, quest.equipment, file.getUrl()]);
    existingKeys.add(key);
    recovered++;
  }

  rebuildSummaryCurrent();
  const msg = `복구 완료: ${recovered}건의 누락된 기록을 되살렸습니다.` +
    (skippedUnknown.length ? `\n\n확인 필요(자동 인식 안 됨): ${skippedUnknown.join(", ")}` : "");
  SpreadsheetApp.getUi().alert(msg);
}

function dedupeStampsCurrent() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheetCurrent();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;
  const header = values[0];

  const lastIndexByKey = {};
  for (let i = 1; i < values.length; i++) {
    const key = `${normalizeName(values[i][1])}||${values[i][3]}`;
    lastIndexByKey[key] = i;
  }
  const keepIndexes = Object.values(lastIndexByKey).sort((a, b) => a - b);
  const newData = [header, ...keepIndexes.map((i) => values[i])];

  const backupName = `${CURRENT_SHEET_NAME}_백업_${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss")}`;
  sheet.copyTo(ss).setName(backupName);

  const tempName = CURRENT_SHEET_NAME + "_new";
  const oldTemp = ss.getSheetByName(tempName);
  if (oldTemp) ss.deleteSheet(oldTemp);
  const temp = ss.insertSheet(tempName);
  temp.getRange(1, 1, newData.length, header.length).setValues(newData);

  const originalIndex = sheet.getIndex();
  ss.deleteSheet(sheet);
  temp.setName(CURRENT_SHEET_NAME);
  ss.setActiveSheet(temp);
  ss.moveActiveSheet(originalIndex);

  rebuildSummaryCurrent();
  SpreadsheetApp.getUi().alert(
    `정리 완료: ${values.length - 1}개 행 -> ${newData.length - 1}개 행으로 정리되었습니다.\n` +
    `(원본은 "${backupName}" 탭에 백업되어 있습니다. 문제 없으면 나중에 지우셔도 됩니다.)`
  );
}

function getOrCreateSheetCurrent() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CURRENT_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CURRENT_SHEET_NAME);
    sheet.appendRow(["시간", "이름", "구역", "미션id", "미션명", "기구", "사진링크"]);
  }
  return sheet;
}

// ══════════════════════════════════════════════════════════════════
// 10월 (gran-seoul-fitness/10- : health_challenge.html → gym_map.html,
//        12개 미션 · 십이교 놀이 · 주차 없음) — 새로 추가
// ══════════════════════════════════════════════════════════════════

const OCTOBER_SHEET_NAME = "10월 stamps";
const OCTOBER_SUMMARY_SHEET_NAME = "10월 요약";

// gym_map.html의 zones/EQUIP_OPTIONS와 동일한 미션 12개.
// key는 gym_map.html이 쓰는 missionKey 그대로(예: "strength-2")라서 구역 간에도 겹치지 않아요.
const OCTOBER_QUEST_COLUMNS = [
  { key: "stretch-0", label: "스트레칭·기구" },
  { key: "stretch-1", label: "스트레칭·폼롤러" },
  { key: "stretch-2", label: "스트레칭·엘라스코" },
  { key: "strength-0", label: "근력·등" },
  { key: "strength-1", label: "근력·하체" },
  { key: "strength-2", label: "근력·가슴" },
  { key: "strength-3", label: "근력·어깨" },
  { key: "strength-4", label: "근력·프리웨이트" },
  { key: "gx-0", label: "그룹운동·프로그램" },
  { key: "cardio-0", label: "유산소·사이클" },
  { key: "cardio-1", label: "유산소·트레드밀" },
  { key: "cardio-2", label: "유산소·무동력" },
];

const OCTOBER_QUEST_DETAILS = {
  "stretch-0": { zoneKey: "stretch", title: "기구 스트레칭", equipment: "스트레칭 기구 (전면) · 스트레칭 기구 (후면)" },
  "stretch-1": { zoneKey: "stretch", title: "폼롤러·매트 스트레칭", equipment: "폼롤러" },
  "stretch-2": { zoneKey: "stretch", title: "엘라스코 스트레칭", equipment: "엘라스코" },
  "strength-0": { zoneKey: "strength", title: "등 운동", equipment: "랫풀다운 · 로우머신 · 암풀다운·펑셔널 · 플레이트로드 로우" },
  "strength-1": { zoneKey: "strength", title: "하체 운동", equipment: "레그프레스 · 레그익스텐션·컬 · 어덕터·어브덕터 · 플레이트로드 스쿼트" },
  "strength-2": { zoneKey: "strength", title: "가슴 운동", equipment: "체스트프레스 · 펙덱 · 인클라인 체스트프레스 · 벤치프레스 · 스미스 머신 · 바벨 · 덤벨" },
  "strength-3": { zoneKey: "strength", title: "어깨 운동", equipment: "숄더프레스 머신 · 스미스 머신 · 덤벨" },
  "strength-4": { zoneKey: "strength", title: "프리웨이트", equipment: "덤벨 · 바벨" },
  "gx-0": { zoneKey: "gx", title: "그룹운동 프로그램", equipment: "파워코어 트레이닝 · 덤벨 트레이닝 · 요가 · 매트필라테스" },
  "cardio-0": { zoneKey: "cardio", title: "사이클 타기", equipment: "사이클 · 로잉머신" },
  "cardio-1": { zoneKey: "cardio", title: "트레드밀·계단·일립티컬", equipment: "러닝머신 · 천국의 계단 · 일립티컬" },
  "cardio-2": { zoneKey: "cardio", title: "무동력·싱크로", equipment: "무동력머신 · 싱크로" },
};

function handleOctoberPost(data, lockMs) {
  const perf = { t0: Date.now() };
  const sheet = getOrCreateSheetOctober();
  const folder = getOrCreateFolder(PHOTO_FOLDER_NAME);
  perf.tFolder = Date.now();

  let photoUrl = "";
  if (data.photo) {
    const base64Data = data.photo.split(",")[1];
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      "image/jpeg",
      `${data.name}_${data.zoneKey}_${data.missionId}_${Date.now()}.jpg`
    );
    const file = folder.createFile(blob);
    perf.tCreateFile = Date.now();
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    perf.tSharing = Date.now();
    photoUrl = `https://drive.google.com/thumbnail?id=${file.getId()}&sz=w1000`;
  } else {
    perf.tCreateFile = Date.now();
    perf.tSharing = Date.now();
  }

  upsertStampRowOctober(sheet, {
    time: new Date(),
    name: data.name,
    zoneKey: data.zoneKey,
    missionId: data.missionId,
    title: data.title,
    equipment: data.equipment || "",
    photoUrl: photoUrl,
  });
  perf.tSheetWrite = Date.now();

  rebuildSummaryOctober();
  perf.tSummary = Date.now();

  logPerf({
    name: data.name,
    missionId: data.missionId,
    lockMs: lockMs || 0,
    folderMs: perf.tFolder - perf.t0,
    driveCreateMs: perf.tCreateFile - perf.tFolder,
    driveShareMs: perf.tSharing - perf.tCreateFile,
    sheetWriteMs: perf.tSheetWrite - perf.tSharing,
    summaryMs: perf.tSummary - perf.tSheetWrite,
    totalMs: (lockMs || 0) + (perf.tSummary - perf.t0),
  });

  return { success: true, photoUrl: photoUrl };
}

function upsertStampRowOctober(sheet, row) {
  const values = sheet.getDataRange().getValues();
  const targetName = normalizeName(row.name);
  for (let i = 1; i < values.length; i++) {
    if (
      normalizeName(values[i][1]) === targetName &&
      values[i][3] === row.missionId
    ) {
      sheet
        .getRange(i + 1, 1, 1, 7)
        .setValues([[row.time, row.name, row.zoneKey, row.missionId, row.title, row.equipment, row.photoUrl]]);
      return;
    }
  }
  sheet.appendRow([row.time, row.name, row.zoneKey, row.missionId, row.title, row.equipment, row.photoUrl]);
}

function rebuildSummaryOctober() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const src = getOrCreateSheetOctober();
  let summary = ss.getSheetByName(OCTOBER_SUMMARY_SHEET_NAME);
  if (!summary) summary = ss.insertSheet(OCTOBER_SUMMARY_SHEET_NAME);
  summary.clear();
  summary.clearConditionalFormatRules();

  const rows = src.getDataRange().getValues();
  const byMember = {};
  const namesInOrder = [];

  for (let i = 1; i < rows.length; i++) {
    const rawName = rows[i][1];
    if (!rawName) continue;
    const key = normalizeName(rawName);
    const missionId = rows[i][3];
    const photoUrl = rows[i][6];
    if (!byMember[key]) {
      byMember[key] = { displayName: rawName, done: {} };
      namesInOrder.push(key);
    }
    byMember[key].done[missionId] = photoUrl || true;
  }

  namesInOrder.sort((a, b) => byMember[a].displayName.localeCompare(byMember[b].displayName, "ko"));

  const header = ["이름", "달성", ...OCTOBER_QUEST_COLUMNS.map((q) => q.label), "수령 유무"];
  const dataRows = namesInOrder.map((key) => {
    const member = byMember[key];
    const done = member.done;
    let count = 0;
    const cells = OCTOBER_QUEST_COLUMNS.map((q) => {
      const val = done[q.key];
      if (val && typeof val === "string" && val.indexOf("http") === 0) {
        count++;
        return `=HYPERLINK("${val}","✓")`;
      }
      if (val) {
        count++;
        return "✓";
      }
      return "";
    });
    return [member.displayName, `${count}/${OCTOBER_QUEST_COLUMNS.length}`, ...cells, ""];
  });

  const allRows = [header, ...dataRows];
  summary.getRange(1, 1, allRows.length, header.length).setValues(allRows);
  summary.getRange(1, 1, 1, header.length).setFontWeight("bold").setBackground("#20392C").setFontColor("#FFFFFF");
  summary.getRange(1, 2, allRows.length, 1).setNumberFormat("@");

  summary.setFrozenRows(1);
  summary.setFrozenColumns(2);

  if (namesInOrder.length > 0) {
    const range = summary.getRange(2, 3, namesInOrder.length, OCTOBER_QUEST_COLUMNS.length);
    const rule = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=NOT(ISBLANK(C2))')
      .setBackground("#D9EAD3")
      .setRanges([range])
      .build();
    summary.setConditionalFormatRules([rule]);
  }
}

function recoverMissingFromDriveOctober() {
  const sheet = getOrCreateSheetOctober();
  const values = sheet.getDataRange().getValues();
  const existingKeys = new Set();
  for (let i = 1; i < values.length; i++) {
    existingKeys.add(`${normalizeName(values[i][1])}||${values[i][3]}`);
  }

  const folder = getOrCreateFolder(PHOTO_FOLDER_NAME);
  const files = folder.getFiles();
  const missionIds = Object.keys(OCTOBER_QUEST_DETAILS).join("|");
  const nameRe = new RegExp(`^(.+)_(stretch|strength|gx|cardio)_(${missionIds})_(\\d+)\\.(jpe?g)$`, "i");
  let recovered = 0;
  const skippedUnknown = [];

  while (files.hasNext()) {
    const file = files.next();
    const m = file.getName().match(nameRe);
    if (!m) continue;
    const memberName = m[1];
    const zoneKey = m[2];
    const missionId = m[3];
    const ts = Number(m[4]);
    const key = `${normalizeName(memberName)}||${missionId}`;
    if (existingKeys.has(key)) continue;

    const quest = OCTOBER_QUEST_DETAILS[missionId];
    if (!quest) { skippedUnknown.push(file.getName()); continue; }

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const time = ts > 0 ? new Date(ts) : file.getDateCreated();

    sheet.appendRow([time, memberName, zoneKey, missionId, quest.title, quest.equipment, `https://drive.google.com/thumbnail?id=${file.getId()}&sz=w1000`]);
    existingKeys.add(key);
    recovered++;
  }

  rebuildSummaryOctober();
  const msg = `복구 완료: ${recovered}건의 누락된 기록을 되살렸습니다.` +
    (skippedUnknown.length ? `\n\n확인 필요(자동 인식 안 됨): ${skippedUnknown.join(", ")}` : "");
  SpreadsheetApp.getUi().alert(msg);
}

function dedupeStampsOctober() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheetOctober();
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;
  const header = values[0];

  const lastIndexByKey = {};
  for (let i = 1; i < values.length; i++) {
    const key = `${normalizeName(values[i][1])}||${values[i][3]}`;
    lastIndexByKey[key] = i;
  }
  const keepIndexes = Object.values(lastIndexByKey).sort((a, b) => a - b);
  const newData = [header, ...keepIndexes.map((i) => values[i])];

  const backupName = `${OCTOBER_SHEET_NAME}_백업_${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss")}`;
  sheet.copyTo(ss).setName(backupName);

  const tempName = OCTOBER_SHEET_NAME + "_new";
  const oldTemp = ss.getSheetByName(tempName);
  if (oldTemp) ss.deleteSheet(oldTemp);
  const temp = ss.insertSheet(tempName);
  temp.getRange(1, 1, newData.length, header.length).setValues(newData);

  const originalIndex = sheet.getIndex();
  ss.deleteSheet(sheet);
  temp.setName(OCTOBER_SHEET_NAME);
  ss.setActiveSheet(temp);
  ss.moveActiveSheet(originalIndex);

  rebuildSummaryOctober();
  SpreadsheetApp.getUi().alert(
    `정리 완료: ${values.length - 1}개 행 -> ${newData.length - 1}개 행으로 정리되었습니다.\n` +
    `(원본은 "${backupName}" 탭에 백업되어 있습니다. 문제 없으면 나중에 지우셔도 됩니다.)`
  );
}

function getOrCreateSheetOctober() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(OCTOBER_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(OCTOBER_SHEET_NAME);
    sheet.appendRow(["시간", "이름", "구역", "미션id", "미션명", "기구", "사진링크"]);
  }
  return sheet;
}

// ══════════════════════════════════════════════════════════════════
// 공통: 요청 분기, 이름 정규화, 에러로그, 드라이브 폴더, 메뉴
// ══════════════════════════════════════════════════════════════════

// 이름 비교용: 앞뒤 공백, 중간 공백, 기기별 한글 입력 차이(유니코드 정규화)를 무시하고 비교
function normalizeName(s) {
  return String(s || "").normalize("NFC").replace(/\s+/g, "");
}

// 에러가 나면 Apps Script 실행 로그 대신, 스프레드시트의 "에러로그" 탭에 바로 남깁니다.
function logError(context, err, extra) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let log = ss.getSheetByName("에러로그");
    if (!log) {
      log = ss.insertSheet("에러로그");
      log.appendRow(["시간", "위치", "에러 내용", "추가 정보"]);
    }
    log.appendRow([new Date(), context, String(err), extra ? JSON.stringify(extra).slice(0, 500) : ""]);
  } catch (e) {
    // 로그 남기는 것 자체가 실패해도 원래 요청 처리는 막지 않음
  }
}

// 회원이 사진을 인증할 때 (POST 요청) — 8월 사이트(week 있음) / 10월 사이트
// (month: "10월") / 9월 사이트(둘 다 없음, 기본값)를 요청 내용만 보고 자동으로
// 구분해요. 여러 회원이 비슷한 시간에 동시에 인증하는 경우를 대비해 저장 작업은
// 한 번에 한 건씩만 처리되도록 잠금(Lock)을 겁니다.
function doPost(e) {
  const tLockStart = Date.now();
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // 최대 30초까지 다른 요청이 끝나길 기다림
  } catch (lockErr) {
    return jsonResponse({ success: false, error: "서버가 혼잡해요, 잠시 후 다시 시도해주세요." });
  }
  const lockMs = Date.now() - tLockStart;

  let data;
  let isLegacy;
  let isOctober;
  try {
    data = JSON.parse(e.postData.contents);
    isLegacy = Object.prototype.hasOwnProperty.call(data, "week");
    isOctober = !isLegacy && data.month === "10월";
    const result = isLegacy
      ? handleLegacyPost(data)
      : isOctober
      ? handleOctoberPost(data, lockMs)
      : handleCurrentPost(data, lockMs);
    return jsonResponse(result);
  } catch (err) {
    logError("doPost", err, { name: data && data.name, zoneKey: data && data.zoneKey, week: data && data.week, missionId: data && data.missionId, month: data && data.month });
    return jsonResponse({ success: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// 인증 한 건이 처리되는 데 각 단계(락 대기/드라이브 파일 생성/공유 설정/시트 기록/요약 갱신)가
// 얼마나 걸렸는지 "성능로그" 탭에 남겨요. 로딩이 오래 걸릴 때 어디가 병목인지 바로 확인할 수 있어요.
function logPerf(p) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let log = ss.getSheetByName("성능로그");
    if (!log) {
      log = ss.insertSheet("성능로그");
      log.appendRow(["시간", "이름", "미션", "락대기(ms)", "폴더조회(ms)", "사진생성(ms)", "공유설정(ms)", "시트기록(ms)", "요약갱신(ms)", "총합(ms)"]);
    }
    log.appendRow([new Date(), p.name, p.missionId, p.lockMs, p.folderMs, p.driveCreateMs, p.driveShareMs, p.sheetWriteMs, p.summaryMs, p.totalMs]);
  } catch (e) {
    // 로그 남기는 것 자체가 실패해도 원래 요청 처리는 막지 않음
  }
}

// 회원이 페이지에 접속할 때, 자신의 기존 기록을 불러올 때 (GET 요청)
// 지금은 8월 사이트(challenge/index.html)만 이 기능을 써서 8월 기록 기준으로 조회해요.
function doGet(e) {
  try {
    const stamps = handleLegacyGet(e.parameter.name);
    return jsonResponse({ stamps: stamps });
  } catch (err) {
    logError("doGet", err, { name: e && e.parameter && e.parameter.name });
    return jsonResponse({ stamps: [], error: String(err) });
  }
}

// 스프레드시트를 열면 상단에 "챌린지 도구" 메뉴를 추가 (8월/9월/10월 각각 따로)
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("챌린지 도구")
    .addItem("8월 요약 다시 만들기", "rebuildSummaryLegacy")
    .addItem("8월 중복 기록 정리 (한 번만 실행)", "dedupeStampsLegacy")
    .addItem("8월 드라이브에서 누락된 기록 복구", "recoverMissingFromDriveLegacy")
    .addSeparator()
    .addItem("9월 요약 다시 만들기", "rebuildSummaryCurrent")
    .addItem("9월 중복 기록 정리 (한 번만 실행)", "dedupeStampsCurrent")
    .addItem("9월 드라이브에서 누락된 기록 복구", "recoverMissingFromDriveCurrent")
    .addSeparator()
    .addItem("10월 요약 다시 만들기", "rebuildSummaryOctober")
    .addItem("10월 중복 기록 정리 (한 번만 실행)", "dedupeStampsOctober")
    .addItem("10월 드라이브에서 누락된 기록 복구", "recoverMissingFromDriveOctober")
    .addToUi();
}

// 폴더를 이름으로 매번 찾으면 느려서, 한 번 찾은 폴더 ID를 저장해뒀다가 재사용해요.
function getOrCreateFolder(name) {
  const folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
