// ==========================================================================
// 2026中元普渡超薦祈福大法會義工點名系統 - 前端邏輯 (main.js)
// ==========================================================================

// 請替換為您部署的 GAS Web App URL
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzAaG-lHvKI0F4lJMd5hnTfXP5-0Wva3vfcz0EjBeDEq-Ynt8ZAAEZN_dylJHan15oz/exec";

// 全域狀態變數
let volunteers = [];
let logs = [];
let schema = {
  attendanceColumns: [],
  mealColumns: [],
  detailColumns: []
};
let settings = {};

let currentDay = "8/22"; // 預設操作日期
let currentGroup = "";  // 當前選取的大組名稱
let isSyncing = false;

// DOM 元素引用
const dom = {
  syncStatus: document.getElementById("sync-status"),
  syncDot: document.getElementById("sync-dot"),
  syncText: document.getElementById("sync-text"),
  
  loadingScreen: document.getElementById("loading-screen"),
  mainContent: document.getElementById("main-content"),
  headerTime: document.getElementById("header-time"),
  btnReload: document.getElementById("btn-reload"),
  
  // 統計
  statTotalCount: document.getElementById("stat-total-count"),
  statPresent822: document.getElementById("stat-present-822"),
  statPresent823: document.getElementById("stat-present-823"),
  progress822: document.getElementById("progress-822"),
  progress823: document.getElementById("progress-823"),
  
  // 大組
  groupListContainer: document.getElementById("group-list-container"),
  
  // 工作板
  workspaceEmpty: document.getElementById("workspace-empty"),
  checkinBoard: document.getElementById("checkin-board"),
  boardTitle: document.getElementById("board-title"),
  boardBadge: document.getElementById("board-badge"),
  btnExport: document.getElementById("btn-export"),
  
  // Tabs
  tab822: document.getElementById("tab-822"),
  tab823: document.getElementById("tab-823"),
  
  // 篩選與搜尋
  memberSearch: document.getElementById("member-search"),
  subgroupSelect: document.getElementById("subgroup-select"),
  statusSelect: document.getElementById("status-select"),
  
  // 人數摘要
  boardFilteredCount: document.getElementById("board-filtered-count"),
  boardPresentCount: document.getElementById("board-present-count"),
  boardTotalCount: document.getElementById("board-total-count"),
  boardPresentPct: document.getElementById("board-present-pct"),
  
  // 成員列表
  memberListContainer: document.getElementById("member-list-container"),
  
  // 懸浮與彈窗
  floatActionContainer: document.getElementById("float-action-container"),
  btnFloatRegister: document.getElementById("btn-float-register"),
  registerModal: document.getElementById("register-modal"),
  registerForm: document.getElementById("register-form"),
  detailsModal: document.getElementById("details-modal"),
  detailsForm: document.getElementById("details-form"),
  
  // 現場報名欄位
  regName: document.getElementById("reg-name"),
  regGroup: document.getElementById("reg-group"),
  regSubgroup: document.getElementById("reg-subgroup"),
  regPhone: document.getElementById("reg-phone"),
  regCheckinNow: document.getElementById("reg-checkin-now"),
  regLunchNow: document.getElementById("reg-lunch-now"),
  
  // 用餐修改 Modal
  editUid: document.getElementById("edit-uid"),
  editVolName: document.getElementById("edit-vol-name"),
  editVolUid: document.getElementById("edit-vol-uid"),
  mealsSwitchesContainer: document.getElementById("meals-switches-container"),
  otherInputsContainer: document.getElementById("other-inputs-container"),
  otherInputsWrapper: document.getElementById("other-inputs-wrapper"),
  
  // 操作紀錄
  logListContainer: document.getElementById("log-list-container")
};

// ==========================================================================
// 初始化與時鐘
// ==========================================================================

window.addEventListener("DOMContentLoaded", () => {
  // 自動判斷今天日期 (若是 8/23 則自動切換)
  const today = new Date();
  const month = today.getMonth() + 1;
  const date = today.getDate();
  if (month === 8 && date === 23) {
    currentDay = "8/23";
    dom.tab822.classList.remove("active");
    dom.tab823.classList.add("active");
  }
  
  // 啟動時間顯示
  updateClock();
  setInterval(updateClock, 1000);
  
  // 綁定事件監聽器
  bindEvents();
  
  // 載入資料
  loadData();
});

function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  dom.headerTime.innerText = `${hours}:${minutes}:${seconds}`;
}

function bindEvents() {
  dom.btnReload.addEventListener("click", loadData);
  
  // Tabs 切換
  dom.tab822.addEventListener("click", () => switchDay("8/22"));
  dom.tab823.addEventListener("click", () => switchDay("8/23"));
  
  // 搜尋與篩選事件
  dom.memberSearch.addEventListener("input", filterVolunteers);
  dom.subgroupSelect.addEventListener("change", filterVolunteers);
  dom.statusSelect.addEventListener("change", filterVolunteers);
  
  // 現場報名表單提交
  dom.registerForm.addEventListener("submit", submitRegister);
  dom.btnFloatRegister.addEventListener("click", openRegisterModal);
  
  // 用餐微調表單提交
  dom.detailsForm.addEventListener("submit", submitDetailsUpdate);
  
  // 匯出報表
  dom.btnExport.addEventListener("click", exportToCSV);
}

// ==========================================================================
// API 資料載入邏輯
// ==========================================================================

function loadData() {
  showLoading(true);
  
  // 併發獲取志工與日誌資料
  const fetchVolunteersPromise = fetch(`${GAS_WEB_APP_URL}?action=getVolunteers`).then(res => res.json());
  const fetchLogsPromise = fetch(`${GAS_WEB_APP_URL}?action=getLogs`).then(res => res.json()).catch(() => ({ status: 'error', data: [] }));

  Promise.all([fetchVolunteersPromise, fetchLogsPromise])
    .then(([resVol, resLog]) => {
      showLoading(false);
      
      if (resVol.status === 'success') {
        volunteers = resVol.data;
        schema = resVol.schema;
        settings = resVol.settings;
        
        // 渲染整體狀態
        calculateOverviewStats();
        renderGroupList();
        
        // 渲染日誌
        if (resLog.status === 'success') {
          logs = resLog.data;
        } else {
          logs = [];
        }
        renderLogList();
        
        // 若本來就在某個大組中，重新渲染名單
        if (currentGroup) {
          openCheckinBoard(currentGroup);
        }
      } else {
        alert("讀取失敗：" + resVol.message);
      }
    })
    .catch(err => {
      showLoading(false);
      console.error(err);
      alert("網路連線錯誤，請確認 GAS 是否已部署，且設定為「任何人」可匿名存取，並且已經解決 CORS 問題。");
    });
}

function showLoading(show) {
  if (show) {
    dom.loadingScreen.classList.remove("hidden");
    dom.mainContent.classList.add("hidden");
  } else {
    dom.loadingScreen.classList.add("hidden");
    dom.mainContent.classList.remove("hidden");
  }
}

// ==========================================================================
// 全域與大組別渲染邏輯
// ==========================================================================

function calculateOverviewStats() {
  const total = volunteers.length;
  dom.statTotalCount.innerText = total;
  
  // 計算 8/22
  const count822 = volunteers.filter(v => {
    const val = v.attendance["8/22報到"];
    return val && (val.toString().startsWith("是") || val.toString().startsWith("1"));
  }).length;
  dom.statPresent822.innerText = count822;
  const pct822 = total > 0 ? Math.round((count822 / total) * 100) : 0;
  dom.progress822.style.width = `${pct822}%`;
  
  // 計算 8/23
  const count823 = volunteers.filter(v => {
    const val = v.attendance["8/23報到"];
    return val && (val.toString().startsWith("是") || val.toString().startsWith("1"));
  }).length;
  dom.statPresent823.innerText = count823;
  const pct823 = total > 0 ? Math.round((count823 / total) * 100) : 0;
  dom.progress823.style.width = `${pct823}%`;
}

function renderGroupList() {
  const groups = [...new Set(volunteers.map(v => v.mainGroup))].filter(Boolean);
  
  if (groups.length === 0) {
    dom.groupListContainer.innerHTML = `<div class="log-empty">目前名單中無大組別資料。</div>`;
    return;
  }

  dom.groupListContainer.innerHTML = groups.map(groupName => {
    const groupMembers = volunteers.filter(v => v.mainGroup === groupName);
    const presentCount = groupMembers.filter(v => {
      const val = v.attendance[`${currentDay}報到`];
      return val && (val.toString().startsWith("是") || val.toString().startsWith("1"));
    }).length;

    const leaveCount = groupMembers.filter(v => {
      const val = v.attendance[`${currentDay}報到`];
      return val && val.toString().trim() === "請假";
    }).length;
    
    const activeClass = groupName === currentGroup ? 'active' : '';

    return `
      <div onclick="openCheckinBoard('${groupName}')" class="group-item ${activeClass}">
        <div class="group-info">
          <h3>${groupName}</h3>
          <p>總人數: ${groupMembers.length} 人</p>
        </div>
        <div class="group-stat">
          <div class="group-present-num text-cyan">
            <span class="text-emerald">${presentCount}</span>
          </div>
          <div class="group-status-desc">
            ${leaveCount > 0 ? `<span class="text-orange">請假: ${leaveCount}人</span>` : '出席正常'}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ==========================================================================
// 點名工作板邏輯
// ==========================================================================

window.openCheckinBoard = function(groupName) {
  currentGroup = groupName;
  
  // 更新側邊欄 active 樣式
  const items = dom.groupListContainer.querySelectorAll(".group-item");
  const groups = [...new Set(volunteers.map(v => v.mainGroup))].filter(Boolean);
  items.forEach((item, idx) => {
    if (groups[idx] === groupName) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  dom.workspaceEmpty.classList.add("hidden");
  dom.checkinBoard.classList.remove("hidden");
  dom.floatActionContainer.classList.remove("hidden");

  dom.boardTitle.innerText = `${groupName} 點名板`;
  dom.boardBadge.innerText = groupName;

  // 動態更新「小組別」篩選下拉選單
  const groupMembers = volunteers.filter(v => v.mainGroup === currentGroup);
  const subgroups = [...new Set(groupMembers.map(v => v.subGroup))].filter(Boolean);
  
  dom.subgroupSelect.innerHTML = '<option value="">全部小組</option>' + 
    subgroups.map(sub => `<option value="${sub}">${sub}</option>`).join("");
  
  // 重設篩選器與搜尋
  dom.subgroupSelect.value = "";
  dom.statusSelect.value = "";
  dom.memberSearch.value = "";

  // 渲染名單
  renderMemberList();
};

function switchDay(day) {
  currentDay = day;
  if (day === "8/22") {
    dom.tab822.classList.add("active");
    dom.tab823.classList.remove("active");
  } else {
    dom.tab822.classList.remove("active");
    dom.tab823.classList.add("active");
  }
  
  // 重新計算大組統計與渲染
  renderGroupList();
  if (currentGroup) {
    renderMemberList();
  }
}

// 取得過濾後的義工清單
function getFilteredVolunteers() {
  let list = volunteers.filter(v => v.mainGroup === currentGroup);
  
  // 小組篩選
  const subVal = dom.subgroupSelect.value;
  if (subVal) {
    list = list.filter(v => v.subGroup === subVal);
  }
  
  // 狀態篩選
  const statusVal = dom.statusSelect.value;
  if (statusVal) {
    list = list.filter(v => {
      const attVal = v.attendance[`${currentDay}報到`] ? v.attendance[`${currentDay}報到`].toString().trim() : "0";
      const isCheckedIn = attVal.startsWith("是") || attVal === "1" || attVal.startsWith("1 (");
      const isLeave = attVal === "請假";
      
      if (statusVal === "present") return isCheckedIn;
      if (statusVal === "leave") return isLeave;
      if (statusVal === "absent") return !isCheckedIn && !isLeave;
      return true;
    });
  }
  
  // 搜尋字串
  const q = dom.memberSearch.value.trim().toLowerCase();
  if (q) {
    list = list.filter(v => 
      v.name.toLowerCase().includes(q) || 
      v.uid.toLowerCase().includes(q) ||
      (v.phone && v.phone.includes(q))
    );
  }
  
  return list;
}

function filterVolunteers() {
  renderMemberList();
}

// 渲染成員卡片
function renderMemberList() {
  const filteredList = getFilteredVolunteers();
  const allGroupMembers = volunteers.filter(v => v.mainGroup === currentGroup);
  
  // 當日此大組已報到人數
  const presentCount = allGroupMembers.filter(v => {
    const val = v.attendance[`${currentDay}報到`];
    return val && (val.toString().startsWith("是") || val.toString().startsWith("1"));
  }).length;
  
  // 更新統計文字
  dom.boardFilteredCount.innerText = filteredList.length;
  dom.boardPresentCount.innerText = presentCount;
  dom.boardTotalCount.innerText = allGroupMembers.length;
  const pct = allGroupMembers.length > 0 ? Math.round((presentCount / allGroupMembers.length) * 100) : 0;
  dom.boardPresentPct.innerText = `${pct}%`;

  if (filteredList.length === 0) {
    dom.memberListContainer.innerHTML = `<div class="log-empty">此組別中無相符的志工資料。</div>`;
    return;
  }

  dom.memberListContainer.innerHTML = filteredList.map(v => {
    const attVal = v.attendance[`${currentDay}報到`] ? v.attendance[`${currentDay}報到`].toString().trim() : "0";
    const isCheckedIn = attVal.startsWith("是") || attVal === "1" || attVal.startsWith("1 (");
    const isLeave = attVal === "請假";

    let cardClass = "member-card";
    let statusBadge = "";
    
    if (isCheckedIn) {
      cardClass += " checked-in";
      statusBadge = '<span class="status-badge present">已報到</span>';
    } else if (isLeave) {
      cardClass += " leave";
      statusBadge = '<span class="status-badge leave">已請假</span>';
    }

    // 用餐 badge
    let mealBadges = "";
    const lunchVal = v.meals[`${currentDay}午餐`];
    if (lunchVal === true || lunchVal === "是" || lunchVal === "1" || (lunchVal && lunchVal.toString().startsWith("1"))) {
      mealBadges += `<span class="meal-badge">午餐</span>`;
    }

    return `
      <div class="${cardClass}" data-uid="${v.uid}">
        <div class="member-info">
          <div class="member-name-row">
            <span class="member-name">${v.name}</span>
            ${statusBadge}
          </div>
          <div class="member-meta-row">
            <span class="subgroup-tag">${v.subGroup}</span>
            ${mealBadges}
          </div>
          <div class="member-phone">
            <span class="material-icons" style="font-size:10px;vertical-align:middle;margin-right:2px;">phone</span>${v.phone || '無電話'}
          </div>
        </div>
        
        <div class="action-controls">
          <!-- 報到勾選 -->
          <button onclick="toggleAttendance('${v.uid}', ${isCheckedIn})" class="btn-action btn-check ${isCheckedIn ? 'active' : ''}" title="點選報到">
            <span class="material-icons">check</span>
          </button>
          
          <!-- 請假 -->
          <button onclick="toggleLeave('${v.uid}', ${isLeave})" class="btn-action btn-leave ${isLeave ? 'active' : ''}" title="點選請假">
            <span class="material-icons">person_off</span>
          </button>
          
          <!-- 修改用餐與細節 -->
          <button onclick="openDetailsModal('${v.uid}')" class="btn-action btn-edit" title="修改詳細狀態">
            <span class="material-icons">edit</span>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

// ==========================================================================
// 點名與請假 API 互動
// ==========================================================================

function setSyncStatus(syncing, statusType = 'syncing', text = '雲端同步中...') {
  isSyncing = syncing;
  dom.syncStatus.className = "sync-status";
  
  if (syncing) {
    dom.syncStatus.classList.add("syncing");
    dom.syncStatus.style.display = "flex";
    dom.syncText.innerText = text;
  } else {
    if (statusType === 'success') {
      dom.syncStatus.classList.add("success");
      dom.syncText.innerText = text || "同步成功";
      setTimeout(() => {
        if (!isSyncing) dom.syncStatus.style.display = "none";
      }, 1500);
    } else {
      dom.syncStatus.style.display = "none";
    }
  }
}

window.toggleAttendance = function(uid, isCurrentlyCheckedIn) {
  if (isSyncing) return;
  const nextStatus = isCurrentlyCheckedIn ? "0" : "1";
  
  setSyncStatus(true, 'syncing', "正在更新報到狀態...");
  
  const payload = {
    action: "updateAttendance",
    uid: uid,
    status: nextStatus,
    targetColumn: `${currentDay}報到`,
    operator: `${currentGroup}網頁窗口`,
    actualCount: 1
  };

  fetch(GAS_WEB_APP_URL, {
    method: "POST",
    mode: "cors",
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(res => {
    if (res.status === 'success') {
      // 更新本地資料
      const idx = volunteers.findIndex(v => v.uid === uid);
      if (idx !== -1) {
        volunteers[idx].attendance[`${currentDay}報到`] = nextStatus;
      }
      
      setSyncStatus(false, 'success', "報到更新成功！");
      
      // 連動報到邏輯
      if (settings['連動報到'] === '1' || settings['連動報到'] === '是') {
        loadData(); // 整頁重刷以套用連動
      } else {
        calculateOverviewStats();
        renderGroupList();
        renderMemberList();
        refreshLogs();
      }
    } else {
      setSyncStatus(false);
      alert("更新失敗：" + res.message);
    }
  })
  .catch(err => {
    setSyncStatus(false);
    console.error(err);
    alert("通訊失敗，請檢查網路。");
  });
};

window.toggleLeave = function(uid, isCurrentlyLeave) {
  if (isSyncing) return;
  const nextStatus = isCurrentlyLeave ? "0" : "請假";
  
  setSyncStatus(true, 'syncing', "正在更新請假狀態...");
  
  const payload = {
    action: "updateAttendance",
    uid: uid,
    status: nextStatus,
    targetColumn: `${currentDay}報到`,
    operator: `${currentGroup}網頁窗口`,
    actualCount: 1
  };

  fetch(GAS_WEB_APP_URL, {
    method: "POST",
    mode: "cors",
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(res => {
    if (res.status === 'success') {
      const idx = volunteers.findIndex(v => v.uid === uid);
      if (idx !== -1) {
        volunteers[idx].attendance[`${currentDay}報到`] = nextStatus;
      }
      setSyncStatus(false, 'success', "請假更新成功！");
      calculateOverviewStats();
      renderGroupList();
      renderMemberList();
      refreshLogs();
    } else {
      setSyncStatus(false);
      alert("請假更新失敗：" + res.message);
    }
  })
  .catch(err => {
    setSyncStatus(false);
    console.error(err);
    alert("網路異常，請稍後重試。");
  });
};

function refreshLogs() {
  fetch(`${GAS_WEB_APP_URL}?action=getLogs`)
    .then(res => res.json())
    .then(res => {
      if (res.status === 'success') {
        logs = res.data;
        renderLogList();
      }
    })
    .catch(() => {});
}

// ==========================================================================
// 現場新增義工 Modal
// ==========================================================================

window.openRegisterModal = function() {
  dom.regGroup.value = currentGroup;
  dom.regSubgroup.value = "";
  dom.regName.value = "";
  dom.regPhone.value = "";
  
  // 更新方塊標題
  const labels = dom.registerModal.querySelectorAll(".preset-checkboxes span");
  labels[0].innerText = `完成 ${currentDay} 報到`;
  labels[1].innerText = `登記 ${currentDay} 午餐`;
  
  dom.registerModal.classList.remove("hidden");
};

window.closeRegisterModal = function() {
  dom.registerModal.classList.add("hidden");
};

function submitRegister(e) {
  e.preventDefault();
  
  const name = dom.regName.value.trim();
  const subGroup = dom.regSubgroup.value.trim() || "一般";
  const phone = dom.regPhone.value.trim();
  
  const checkinNow = dom.regCheckinNow.checked;
  const lunchNow = dom.regLunchNow.checked;

  setSyncStatus(true, 'syncing', "正在現場登記新義工...");
  closeRegisterModal();

  const registerPayload = {
    action: "registerNew",
    operator: `${currentGroup}網頁窗口`,
    newData: {
      name: name,
      group: currentGroup,
      subGroup: subGroup,
      phone: phone
    }
  };

  fetch(GAS_WEB_APP_URL, {
    method: "POST",
    mode: "cors",
    body: JSON.stringify(registerPayload)
  })
  .then(res => res.json())
  .then(res => {
    if (res.status === 'success') {
      const newUid = res.uid;
      
      if (!checkinNow && !lunchNow) {
        setSyncStatus(false, 'success', "現場報名完成！");
        loadData();
        return;
      }
      
      // 有勾選報到/用餐，批次更新
      setSyncStatus(true, 'syncing', "正在同步新義工報到用餐狀態...");
      const batchUpdates = [];
      
      if (checkinNow) {
        batchUpdates.push({
          uid: newUid,
          status: "1",
          targetColumn: `${currentDay}報到`,
          actualCount: 1
        });
      }
      
      if (lunchNow) {
        batchUpdates.push({
          uid: newUid,
          status: "是",
          targetColumn: `${currentDay}午餐`,
          actualCount: 1
        });
      }

      fetch(GAS_WEB_APP_URL, {
        method: "POST",
        mode: "cors",
        body: JSON.stringify({
          action: "batchUpdateAttendance",
          operator: `${currentGroup}網頁窗口`,
          updates: batchUpdates
        })
      })
      .then(resSub => resSub.json())
      .then(() => {
        setSyncStatus(false, 'success', "現場報名及狀態更新完成！");
        loadData();
      })
      .catch(() => {
        setSyncStatus(false);
        loadData();
      });
    } else {
      setSyncStatus(false);
      alert("現場報名失敗：" + res.message);
    }
  })
  .catch(err => {
    setSyncStatus(false);
    console.error(err);
    alert("網路超時，無法完成現場報名。");
  });
}

// ==========================================================================
// 用餐微調詳細 Modal (小畫筆)
// ==========================================================================

window.openDetailsModal = function(uid) {
  const v = volunteers.find(vol => vol.uid === uid);
  if (!v) return;
  
  dom.editUid.value = uid;
  dom.editVolName.innerText = v.name;
  dom.editVolUid.innerText = `UID: ${v.uid}`;
  
  // 1) 渲染用餐選項 (排除住宿)
  if (schema.mealColumns && schema.mealColumns.length > 0) {
    const activeMealCols = schema.mealColumns.filter(col => !col.includes("住宿"));
    
    dom.mealsSwitchesContainer.innerHTML = activeMealCols.map(mealCol => {
      const hasMeal = v.meals[mealCol] === true || v.meals[mealCol] === "是" || v.meals[mealCol] === "1" || (v.meals[mealCol] && v.meals[mealCol].toString().startsWith("1"));
      return `
        <div class="switch-item">
          <span class="form-label">${mealCol}</span>
          <label class="checkbox-label">
            <input type="checkbox" name="meal-switch" value="${mealCol}" ${hasMeal ? 'checked' : ''}>
            <span>登記</span>
          </label>
        </div>
      `;
    }).join("");
  } else {
    dom.mealsSwitchesContainer.innerHTML = '<div class="log-empty">此活動未設定用餐欄位。</div>';
  }

  // 2) 渲染其他前台可顯示欄位 (排除住宿、房、床等)
  const activeDetailCols = schema.detailColumns.filter(col => !col.includes("住宿") && !col.includes("房") && !col.includes("床"));
  
  if (activeDetailCols.length > 0) {
    dom.otherInputsWrapper.classList.remove("hidden");
    dom.otherInputsContainer.innerHTML = activeDetailCols.map(detCol => {
      const val = v.details[detCol] || "";
      return `
        <div class="form-group">
          <label class="form-label">${detCol}</label>
          <input type="text" name="other-input" data-col="${detCol}" value="${val}">
        </div>
      `;
    }).join("");
  } else {
    dom.otherInputsWrapper.classList.add("hidden");
    dom.otherInputsContainer.innerHTML = '';
  }

  dom.detailsModal.classList.remove("hidden");
};

window.closeDetailsModal = function() {
  dom.detailsModal.classList.add("hidden");
};

function submitDetailsUpdate(e) {
  e.preventDefault();
  if (isSyncing) return;
  
  const uid = dom.editUid.value;
  const updatesPayload = {};
  
  // 1) 收集膳宿開關狀態
  const mealSwitches = dom.detailsForm.querySelectorAll('input[name="meal-switch"]');
  mealSwitches.forEach(sw => {
    updatesPayload[sw.value] = sw.checked ? "是" : "否";
  });
  
  // 2) 收集其他輸入框內容
  const otherInputs = dom.detailsForm.querySelectorAll('input[name="other-input"]');
  otherInputs.forEach(input => {
    updatesPayload[input.getAttribute("data-col")] = input.value.trim();
  });

  setSyncStatus(true, 'syncing', "正在更新詳細狀態...");
  closeDetailsModal();

  fetch(GAS_WEB_APP_URL, {
    method: "POST",
    mode: "cors",
    body: JSON.stringify({
      action: "updateDetails",
      uid: uid,
      updates: updatesPayload
    })
  })
  .then(res => res.json())
  .then(res => {
    if (res.status === 'success') {
      // 本地記憶體同步更新
      const vIdx = volunteers.findIndex(vol => vol.uid === uid);
      if (vIdx !== -1) {
        // 更新 Meals
        schema.mealColumns.forEach(col => {
          if (updatesPayload[col] !== undefined) {
            volunteers[vIdx].meals[col] = (updatesPayload[col] === "是" || updatesPayload[col] === "1");
          }
        });
        // 更新 Details
        schema.detailColumns.forEach(col => {
          if (updatesPayload[col] !== undefined) {
            volunteers[vIdx].details[col] = updatesPayload[col];
          }
        });
      }
      setSyncStatus(false, 'success', "修改成功！");
      renderMemberList();
      refreshLogs();
    } else {
      setSyncStatus(false);
      alert("儲存失敗：" + res.message);
    }
  })
  .catch(err => {
    setSyncStatus(false);
    console.error(err);
    alert("通訊中斷，修改未能存入雲端。");
  });
}

// ==========================================================================
// 日誌渲染邏輯
// ==========================================================================

function renderLogList() {
  if (!logs || logs.length === 0) {
    dom.logListContainer.innerHTML = `<div class="log-empty">尚無最近操作紀錄</div>`;
    return;
  }

  // 將日誌按時間最新排序（原本後端 fetchLogs 已經按倒序回傳，保險起見）
  dom.logListContainer.innerHTML = logs.map(log => {
    let logClass = "log-item";
    let icon = "info";
    
    const item = log.item || "";
    const val = log.value || "";
    
    if (item.includes("報到")) {
      if (val === "1" || val.startsWith("1 (")) {
        logClass += " log-checkin";
        icon = "check_circle";
      } else if (val === "請假") {
        logClass += " log-leave";
        icon = "person_off";
      }
    } else if (item.includes("現場")) {
      logClass += " log-register";
      icon = "person_add";
    }

    // 格式化時間 (從 2026/7/24 下午 2:30:15 中取出時分秒)
    let timeStr = log.timestamp;
    try {
      const match = log.timestamp.match(/(?:下午|上午|PM|AM)?\s*(\d+:\d+(?::\d+)?)/i);
      if (match) {
        timeStr = match[1];
        if (log.timestamp.includes("下午") || log.timestamp.includes("PM")) {
          const parts = timeStr.split(":");
          const hr = parseInt(parts[0]);
          if (hr < 12) parts[0] = String(hr + 12);
          timeStr = parts.join(":");
        }
      }
    } catch(e) {}

    return `
      <div class="${logClass}">
        <div class="log-meta">
          <span>UID: ${log.uid}</span>
          <span>${timeStr}</span>
        </div>
        <div class="log-desc" style="display:flex;align-items:center;gap:4px;">
          <span class="material-icons" style="font-size:12px;color:inherit;">${icon}</span>
          <span>
            <strong>${log.name}</strong> 
            ${item === "現場報名" ? '由 ' + log.operator + ' 現場登記新入' : log.item + '已設為 [' + log.value + ']'}
          </span>
        </div>
      </div>
    `;
  }).join("");
}

// ==========================================================================
// 報表匯出邏輯 (CSV)
// ==========================================================================

function exportToCSV() {
  if (!currentGroup) return;
  const list = getFilteredVolunteers();
  
  if (list.length === 0) {
    alert("目前無相符名單可供匯出。");
    return;
  }
  
  // 建立表頭
  const csvHeaders = ["UID", "姓名", "大組", "小組", "電話"];
  schema.attendanceColumns.forEach(col => csvHeaders.push(col));
  schema.mealColumns.forEach(col => csvHeaders.push(col));
  schema.detailColumns.forEach(col => csvHeaders.push(col));
  
  // CSV 內容
  let csvContent = "\uFEFF"; // UTF-8 BOM，避免 Excel 亂碼
  csvContent += csvHeaders.map(h => `"${h}"`).join(",") + "\r\n";
  
  list.forEach(v => {
    const row = [
      v.uid,
      v.name,
      v.mainGroup,
      v.subGroup,
      v.phone || ""
    ];
    
    schema.attendanceColumns.forEach(col => {
      row.push(v.attendance[col] || "0");
    });
    
    schema.mealColumns.forEach(col => {
      row.push(v.meals[col] ? "是" : "否");
    });
    
    schema.detailColumns.forEach(col => {
      row.push(v.details[col] || "");
    });
    
    csvContent += row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(",") + "\r\n";
  });
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const formattedDate = currentDay.replace("/", "");
  link.setAttribute("href", url);
  link.setAttribute("download", `2026中元普渡超薦祈福大法會_${currentGroup}_點名統計表_${formattedDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
