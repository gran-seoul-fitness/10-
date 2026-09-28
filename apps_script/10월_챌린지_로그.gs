/**
 * 그랑서울 피트니스 10월 건강 챌린지 - 자동 기록 스크립트
 *
 * 사용법:
 * 1. 이 스프레드시트에서 [확장 프로그램] > [Apps Script]를 엽니다.
 * 2. 기본으로 열려있는 코드를 모두 지우고, 이 파일 내용 전체를 붙여넣습니다.
 * 3. 우측 상단 [배포] > [새 배포]를 클릭합니다.
 * 4. 유형에서 톱니바퀴를 눌러 "웹 앱"을 선택합니다.
 * 5. "액세스 권한"을 "모든 사용자"로 설정합니다. (이래야 웹사이트에서 접근 가능해요)
 * 6. [배포]를 누르고, 권한 요청 화면이 뜨면 본인 계정으로 승인합니다.
 * 7. 배포가 끝나면 나오는 "웹 앱 URL"을 복사해서 저에게 알려주세요.
 *    (또는 gym_map.html의 SHEET_LOG_URL 상수에 직접 붙여넣어도 됩니다.)
 */

// 이 순서가 "요약" 탭의 12개 미션 열 순서가 됩니다. 앱의 zones 구조와 반드시 동일해야 해요.
const MISSION_LIST = [
  { zone: '스트레칭', mission: '기구 스트레칭' },
  { zone: '스트레칭', mission: '폼롤러·매트 스트레칭' },
  { zone: '스트레칭', mission: '엘라스코 스트레칭' },
  { zone: '근력', mission: '등 운동' },
  { zone: '근력', mission: '하체 운동' },
  { zone: '근력', mission: '가슴 운동' },
  { zone: '근력', mission: '어깨 운동' },
  { zone: '근력', mission: '프리웨이트' },
  { zone: '그룹운동', mission: '그룹운동 프로그램' },
  { zone: '유산소', mission: '사이클 타기' },
  { zone: '유산소', mission: '트레드밀·계단·일립티컬' },
  { zone: '유산소', mission: '무동력·싱크로' },
];

const PHOTO_FOLDER_NAME = '그랑서울_챌린지_인증사진';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const name = (data.name || '').toString().trim();
    const month = (data.month || '10월').toString().trim();
    const missionName = (data.missionName || '').toString().trim();
    const zoneName = (data.zoneName || '').toString().trim();

    if (!name || !missionName) {
      return jsonResponse({ ok: false, error: 'name/missionName required' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    let photoUrl = '';
    if (data.photoBase64) {
      photoUrl = savePhotoToDrive(data.photoBase64, name, missionName);
    }

    appendStampRow(ss, month, name, zoneName, missionName, photoUrl);
    updateSummary(ss, month, name, missionName);

    return jsonResponse({ ok: true });
  } catch (err) {
    logError(err);
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  return ContentService.createTextOutput('그랑서울 피트니스 챌린지 로그 서비스가 정상 작동 중입니다.');
}

function appendStampRow(ss, month, name, zoneName, missionName, photoUrl) {
  const sheetName = month + ' stamps';
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(['시간', '이름', '구역', '미션', '사진']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }
  sheet.appendRow([new Date(), name, zoneName, missionName, photoUrl]);
}

function updateSummary(ss, month, name, missionName) {
  const sheetName = month + ' 요약';
  let sheet = ss.getSheetByName(sheetName);
  const missionCount = MISSION_LIST.length;

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const header = ['이름', '달성'].concat(
      MISSION_LIST.map(function (m) { return m.zone + '·' + m.mission; })
    ).concat(['수령 유무']);
    sheet.appendRow(header);
    sheet.getRange(1, 1, 1, header.length).setFontWeight('bold');
  }

  const missionColIdx = MISSION_LIST.findIndex(function (m) { return m.mission === missionName; });
  if (missionColIdx === -1) return; // 알 수 없는 미션명이면 무시
  const missionCol = 3 + missionColIdx; // A:이름 B:달성 C부터 미션들

  const lastRow = sheet.getLastRow();
  let targetRow = -1;
  if (lastRow >= 2) {
    const names = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < names.length; i++) {
      if (names[i][0] === name) { targetRow = i + 2; break; }
    }
  }
  if (targetRow === -1) {
    targetRow = lastRow + 1;
    sheet.getRange(targetRow, 1).setValue(name);
  }

  sheet.getRange(targetRow, missionCol).setValue('✓');

  const rowValues = sheet.getRange(targetRow, 3, 1, missionCount).getValues()[0];
  const doneCount = rowValues.filter(function (v) { return v === '✓'; }).length;
  sheet.getRange(targetRow, 2).setValue(doneCount + '/' + missionCount);
}

function savePhotoToDrive(dataUrl, name, missionName) {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.*)$/);
  if (!match) return '';
  const contentType = match[1];
  const base64 = match[2];
  const bytes = Utilities.base64Decode(base64);
  const ext = contentType.split('/')[1] || 'jpg';
  const fileName = name + '_' + missionName + '_' + new Date().getTime() + '.' + ext;
  const blob = Utilities.newBlob(bytes, contentType, fileName);

  const folders = DriveApp.getFoldersByName(PHOTO_FOLDER_NAME);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(PHOTO_FOLDER_NAME);

  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function logError(err) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('에러로그');
    if (!sheet) {
      sheet = ss.insertSheet('에러로그');
      sheet.appendRow(['시간', '에러 내용']);
      sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    }
    sheet.appendRow([new Date(), String(err)]);
  } catch (e2) {
    // 에러 로그 기록 자체가 실패하면 조용히 무시
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
