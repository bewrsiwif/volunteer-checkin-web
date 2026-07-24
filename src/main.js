// 填入您剛才複製的 Web App URL
const API_URL = "https://script.google.com/macros/s/您的部署ID/exec"; 

// 1. 取得名單的函數
async function fetchVolunteers() {
  document.getElementById('loading-screen').classList.remove('hidden');
  try {
    const response = await fetch(API_URL);
    const result = await response.json();
    if (result.status === 'success') {
      console.log('載入成功', result.data);
      // 在這裡將 result.data 渲染到您的卡片 (member-list-container) 與統計圖表中
    }
  } catch (error) {
    console.error("讀取資料失敗", error);
  } finally {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
  }
}

// 2. 現場報名的函數 (綁定到 id="register-form" 的 submit 事件)
async function registerVolunteer(formData) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "register",
        name: formData.name,
        group: formData.group,
        subgroup: formData.subgroup,
        phone: formData.phone,
        status822: formData.checkinNow ? 'present' : 'absent',
        meal822: formData.lunchNow
      })
    });
    const result = await response.json();
    if (result.status === 'success') {
      alert("現場新增成功！");
      fetchVolunteers(); // 重新載入畫面資料
    }
  } catch (error) {
    console.error("新增失敗", error);
  }
}

// 網頁載入後啟動
window.addEventListener('DOMContentLoaded', () => {
  fetchVolunteers();
  // 在此處綁定 btn-reload, btn-export 及各式表單的監聽器...
});
