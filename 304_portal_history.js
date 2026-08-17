// ==========================================
// HISTORY & ACTIVITY LOG
// ==========================================
function fetchDashboardActivity() {
  callBackendAPI("getLatestDashboardActivity", { cpn: activeUserSession.cpn },
    function (res) {
      try {
        var ldCard = document.getElementById('widget-latest-delivery');
        if (res.delivery) {
          if (!res.delivery.isOutForDelivery) {
            if (ldCard) ldCard.classList.remove('hidden');
            var elDate = document.getElementById('ld-date'); if (elDate) elDate.innerText = res.delivery.date;
            var elActD = document.getElementById('ld-actd'); if (elActD) elActD.innerText = res.delivery.actD;
            var elActE = document.getElementById('ld-acte'); if (elActE) elActE.innerText = res.delivery.actE;
            var elAmt = document.getElementById('ld-amt'); if (elAmt) elAmt.innerText = "₹" + res.delivery.amt;

            var elThumb = document.getElementById('ld-thumb');
            if (elThumb) {
              var safeDelImg = getDriveDirectUrl(res.delivery.link);
              var thumbHtml = res.delivery.link ? "<a href='" + res.delivery.link + "' target='_blank'><img src='" + safeDelImg + "' class='w-full h-full object-cover' onerror=\"this.parentElement.innerHTML='<div class=\\'w-full h-full flex items-center justify-center text-[8px] text-slate-400 font-bold p-1 text-center\\'>Image</div>'\"></a>" : "<div class='w-full h-full flex items-center justify-center text-[8px] text-slate-400 font-bold p-1 text-center'>No Photo</div>";
              elThumb.innerHTML = thumbHtml;
            }
          } else {
            if (ldCard) ldCard.classList.add('hidden');

            var poDetails = document.getElementById('po-details');
            var poEmpty = document.getElementById('po-empty-msg');
            var pendingBanner = document.getElementById('pending-alert-banner');

            if (poDetails) poDetails.classList.remove('hidden');
            if (poEmpty) poEmpty.classList.add('hidden');
            if (pendingBanner) pendingBanner.classList.add('hidden');

            var elPoDate = document.getElementById('po-date'); if (elPoDate) elPoDate.innerText = "Today";
            var elPoCans = document.getElementById('po-cans'); if (elPoCans) elPoCans.innerText = res.delivery.ordD;
            var elPoEmpties = document.getElementById('po-empties'); if (elPoEmpties) elPoEmpties.innerText = res.delivery.ordE;

            var statusBadge = document.getElementById('po-status-badge');
            if (statusBadge) {
              statusBadge.innerText = "🚚 Out for Delivery";
              statusBadge.className = "mt-2 text-[10px] font-bold text-amber-800 bg-amber-100 p-1.5 rounded-md inline-block shadow-sm";
            }

            var poRepContainer = document.getElementById('po-rep-container');
            var poRepText = document.getElementById('po-rep-text');
            if (res.delivery.replaceQty > 0 && poRepContainer && poRepText) {
              poRepText.innerText = res.delivery.replaceQty + " Replacement(s) (" + res.delivery.replaceReason + ")";
              poRepContainer.classList.remove('hidden');
            } else if (poRepContainer) {
              poRepContainer.classList.add('hidden');
            }
          }
        } else {
          if (ldCard) ldCard.classList.add('hidden');
        }
      } catch (err) {
        console.error("Delivery widget render error: " + err);
      }

      try {
        var sHtml = "";
        if (res.sale) {
          sHtml = "<div class='flex justify-between items-end mt-1'>" +
            "<div>" +
            "<div class='text-sm'><span class='font-bold text-slate-800'>" + res.sale.date + "</span></div>" +
            "<div class='flex gap-3 text-xs mt-1 font-medium text-slate-600'>" +
            "<span>Dropped: <b class='text-indigo-600'>" + res.sale.actD + "</b></span>" +
            "<span>Empties: <b class='text-indigo-600'>" + res.sale.actE + "</b></span>" +
            "</div>" +
            "</div>" +
            "<div class='font-black text-indigo-700 text-lg'>₹" + res.sale.amt + "</div>" +
            "</div>";
        } else { sHtml = "<p class='text-xs text-slate-400 mt-2 font-medium'>No recent sales found.</p>"; }
        var elSales = document.getElementById('widget-sales');
        if (elSales) elSales.innerHTML = sHtml;
      } catch (e1) { console.error("Sales widget error: " + e1); }

      try {
        var pHtml = "";
        if (res.pay) {
          pHtml = "<div class='flex justify-between items-end mt-1'>" +
            "<div>" +
            "<div class='text-sm'><span class='font-bold text-slate-800'>" + res.pay.date + "</span></div>" +
            "<div class='text-xs mt-1 font-medium text-slate-500'>Payment successfully credited to ledger.</div>" +
            "</div>" +
            "<div class='font-black text-emerald-700 text-lg'>₹" + res.pay.amt + "</div>" +
            "</div>";
        } else { pHtml = "<p class='text-xs text-slate-400 mt-2 font-medium'>No recent payments found.</p>"; }
        var elPays = document.getElementById('widget-pays');
        if (elPays) elPays.innerHTML = pHtml;
      } catch (e2) { console.error("Pays widget error: " + e2); }

      try {
        var ssHtml = "";
        if (res.ss2) {
          var statusColor = String(res.ss2.bankStatus).toUpperCase() === 'CLEARED' ? 'text-emerald-600' : 'text-amber-600';
          ssHtml = "<div class='flex justify-between items-end mt-1'>" +
            "<div>" +
            "<div class='text-xs text-slate-500'>Submitted: <span class='font-bold text-slate-800'>" + res.ss2.updatedOn + "</span></div>" +
            "<div class='text-xs mt-1 font-bold " + statusColor + "'>Status: " + res.ss2.bankStatus + "</div>" +
            "</div>" +
            "<div class='font-black text-amber-700 text-lg'>₹" + res.ss2.amt + "</div>" +
            "</div>";
        } else { ssHtml = "<p class='text-xs text-slate-400 mt-2 font-medium'>No recent screenshots uploaded.</p>"; }
        var elSs2 = document.getElementById('widget-ss2');
        if (elSs2) elSs2.innerHTML = ssHtml;
      } catch (e3) { console.error("SS2 widget error: " + e3); }
    }
  );
}

function loadActivityLogLazy() {
  if (isServerBusy()) return; 
  var activityContainer = document.getElementById('recent-activity-container');
  var toggleIcon = document.getElementById('icon-toggle-activity');
  var toggleText = document.getElementById('text-toggle-activity');
  
  if (activityContainer.classList.contains('hidden')) {
      toggleIcon.classList.add('rotate-180');
      toggleText.innerText = "FETCHING DATA...";
      activityContainer.classList.remove('hidden');
      
      setTimeout(() => {
          activityContainer.classList.remove('opacity-0');
          activityContainer.classList.add('opacity-100');
      }, 50);
      
      fetchDashboardActivity();
      
      setTimeout(() => {
          toggleText.innerText = "RECENT ACTIVITY LOG";
      }, 800);
  } else {
      activityContainer.classList.remove('opacity-100');
      activityContainer.classList.add('opacity-0');
      toggleIcon.classList.remove('rotate-180');
      
      setTimeout(() => {
          activityContainer.classList.add('hidden');
      }, 300);
  }
}

function openSalesHistory() {
  switchView('view-sales-history');
  var dates = getDefaultDateRange();
  document.getElementById('sales-start').value = dates.start;
  document.getElementById('sales-end').value = dates.end;
  loadSalesData();
}

function loadSalesData() {
  var start = document.getElementById('sales-start').value;
  var end = document.getElementById('sales-end').value;
  var listEl = document.getElementById('sales-list');
  listEl.innerHTML = "<div class='flex justify-center py-10'><p class='text-sm text-indigo-600 font-bold animate-pulse'>Fetching sales records...</p></div>";

  callBackendAPI("fetchSalesHistory", { cpn: activeUserSession.cpn, startDate: start, endDate: end },
    function (res) {
      if (!res.success) { listEl.innerHTML = "<p class='text-center text-sm text-red-500 py-10 font-bold'>" + res.message + "</p>"; return; }
      if (res.data.length === 0) { listEl.innerHTML = "<p class='text-center text-sm text-slate-500 py-10 font-bold'>No sales records found.</p>"; return; }

      var html = '';
      res.data.forEach(function (r) {
        var safeImg = getDriveDirectUrl(r.link);
        var imgHtml = r.link ? "<a href='" + r.link + "' target='_blank' class='shrink-0'><img src='" + safeImg + "' class='w-14 h-16 object-cover rounded border shadow-sm' onerror=\"this.parentElement.innerHTML='<div class=\\'w-14 h-16 bg-slate-100 flex items-center justify-center rounded border text-[8px] text-center text-slate-400 font-bold p-1\\'>Image</div>'\"></a>" : "";
        html += "<div class='bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex gap-3'>" + imgHtml +
          "<div class='flex-1 flex justify-between items-center'>" +
          "<div><p class='text-[11px] text-slate-500 font-black mb-1.5 uppercase tracking-wide'>" + r.dateStr + "</p>" +
          "<div class='flex space-x-2 text-[10px] font-bold'><span class='bg-indigo-50 text-indigo-700 px-2 py-1 rounded'>Delivered: " + r.actD + "</span>" +
          "<span class='bg-emerald-50 text-emerald-700 px-2 py-1 rounded'>Empties: " + r.actE + "</span></div></div>" +
          "<div class='text-right'><p class='text-[9px] text-slate-400 font-bold uppercase mb-0.5'>Amount</p>" +
          "<span class='text-lg font-black text-slate-800'>₹" + r.amount + "</span></div>" +
          "</div></div>";
      });
      listEl.innerHTML = html;
    }
  );
}

function openPaymentHistory() {
  switchView('view-payment-history');
  var dates = getDefaultDateRange();
  document.getElementById('pays-start').value = dates.start;
  document.getElementById('pays-end').value = dates.end;
  loadPaymentData();
}

function loadPaymentData() {
  var start = document.getElementById('pays-start').value;
  var end = document.getElementById('pays-end').value;
  var listEl = document.getElementById('payment-list');
  listEl.innerHTML = "<div class='flex justify-center py-10'><p class='text-sm text-indigo-600 font-bold animate-pulse'>Fetching payment records...</p></div>";

  callBackendAPI("fetchPaymentHistory", { cpn: activeUserSession.cpn, startDate: start, endDate: end },
    function (res) {
      if (!res.success) { listEl.innerHTML = "<p class='text-center text-sm text-red-500 py-10 font-bold'>" + res.message + "</p>"; return; }
      if (res.data.length === 0) { listEl.innerHTML = "<p class='text-center text-sm text-slate-500 py-10 font-bold'>No payments found.</p>"; return; }

      var html = '';
      res.data.forEach(function (r) {
        var commentUI = r.comment ? "<p class='text-[11px] text-slate-600 mt-1 font-medium bg-slate-50 p-1.5 rounded inline-block'>" + r.comment + "</p>" : "";
        html += "<div class='bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center'>" +
          "<div><p class='text-[11px] text-slate-500 font-black mb-0.5 uppercase tracking-wide'>" + r.dateStr + "</p>" + commentUI + "</div>" +
          "<div class='text-right'><p class='text-[9px] text-slate-400 font-bold uppercase mb-0.5'>Paid</p>" +
          "<span class='text-lg font-black text-emerald-600'>₹" + r.amount + "</span></div></div>";
      });
      listEl.innerHTML = html;
    }
  );
}

function getDriveDirectUrl(url) {
  if (!url) return '';
  var fileId = '';
  var matchD = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) { fileId = matchD[1]; } else {
    var matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchId && matchId[1]) fileId = matchId[1];
  }
  if (fileId) return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w200';
  return url;
}

function compressImage(file) {
  return new Promise(function (resolve, reject) {
    if (!file) { resolve(null); return; }
    var reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function (event) {
      var img = new Image();
      img.src = event.target.result;
      img.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = 800; canvas.height = img.height * (800 / img.width);
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    };
    reader.onerror = function (e) { reject(e); };
  });
}

function openScreenshots() {
  switchView('view-screenshots');
  document.getElementById('ss-date').value = new Date().toISOString().split('T')[0];
  var dates = getDefaultDateRange();
  document.getElementById('ss-start').value = dates.start;
  document.getElementById('ss-end').value = dates.end;
  loadScreenshotData();
}

async function uploadPaymentScreenshot() {
  var dStr = document.getElementById('ss-date').value;
  var amt = document.getElementById('ss-amt').value;
  var rmk = document.getElementById('ss-remark').value;
  var fileIn = document.getElementById('ss-file');

  if (!dStr || !amt || !fileIn.files || fileIn.files.length === 0) {
    alert("Payment Date, Amount, and Image File are mandatory.");
    return;
  }

  toggleButtonState('btn-ss-upload', true, 'Compressing Image...');
  var b64 = await compressImage(fileIn.files[0]);

  toggleButtonState('btn-ss-upload', true, 'Uploading...');

  callBackendAPI("submitCustomerScreenshot", { cpn: activeUserSession.cpn, payDate: dStr, amount: amt, remark: rmk, base64Image: b64 },
    function (res) {
      toggleButtonState('btn-ss-upload', false, 'Upload Screenshot');
      if (res.success) {
        alert(res.message);
        document.getElementById('ss-amt').value = '';
        document.getElementById('ss-remark').value = '';
        document.getElementById('ss-file').value = '';
        loadScreenshotData();
      } else { alert(res.message); }
    }
  );
}

function loadScreenshotData() {
  var start = document.getElementById('ss-start').value;
  var end = document.getElementById('ss-end').value;
  var listEl = document.getElementById('screenshot-list');

  listEl.innerHTML = "<div class='flex justify-center py-10'><p class='text-sm text-slate-500 font-bold animate-pulse'>Fetching uploaded screenshots...</p></div>";

  callBackendAPI("fetchScreenshotHistory", { cpn: activeUserSession.cpn, startDate: start, endDate: end },
    function (res) {
      if (!res.success) { listEl.innerHTML = "<p class='text-center text-sm text-red-500 py-10 font-bold'>" + res.message + "</p>"; return; }

      var html = '';
      html += "<h6 class='font-extrabold text-amber-600 text-xs uppercase tracking-wider mt-4 mb-2 px-1 flex items-center gap-1'>⏳ Pending Review (" + res.pending.length + ")</h6>";
      if (res.pending.length === 0) {
        html += "<p class='text-[11px] text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl p-4 text-center font-medium shadow-sm'>No pending screenshots tracking at this time.</p>";
      } else {
        res.pending.forEach(function (r) {
          var safeImg = getDriveDirectUrl(r.link);
          var displayStatus = r.bankComment || "Awaiting Verification";
          var safeLinkParam = encodeURIComponent(r.link);
          html += "<div class='bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4 border-l-4 border-l-amber-400 relative group'>" +
            "<a href='" + r.link + "' target='_blank' class='shrink-0'><img src='" + safeImg + "' class='w-16 h-20 object-cover rounded-lg border shadow-sm' onerror=\"this.parentElement.innerHTML='<div class=\\'w-16 h-20 bg-slate-100 flex items-center justify-center rounded-lg border text-[8px] text-center text-slate-400 font-bold p-1\\'>View Link</div>'\"></a>" +
            "<div class='flex-1 flex flex-col justify-between'><div><div class='flex justify-between items-start pr-6'><span class='text-[10px] font-black text-slate-400 uppercase'>" + r.payDate + "</span><span class='text-sm font-black text-slate-800'>₹" + r.amount + "</span></div><p class='text-[11px] text-slate-600 mt-1 line-clamp-2'>" + (r.remark ? '<b>Note:</b> ' + r.remark : '') + "</p></div><div class='text-[10px] font-bold p-1.5 rounded-md mt-2 w-max border text-amber-600 bg-amber-50 border-amber-100'>" + displayStatus + "</div></div>" +
            "<button onclick=\"confirmScreenshotDeletion('" + safeLinkParam + "')\" class='absolute top-3 right-3 text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition' title='Delete Upload'><svg class='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'></path></svg></button></div>";
        });
      }

      html += "<h6 class='font-extrabold text-emerald-600 text-xs uppercase tracking-wider mt-6 mb-2 px-1 flex items-center gap-1'>✅ Processed Payments (" + res.processed.length + ")</h6>";
      if (res.processed.length === 0) {
        html += "<p class='text-[11px] text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl p-4 text-center font-medium shadow-sm'>No historical data matches this date window.</p>";
      } else {
        res.processed.forEach(function (r) {
          var safeImg = getDriveDirectUrl(r.link);
          var stColor = String(r.bankComment).toUpperCase() === 'CLEARED' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-slate-600 bg-slate-50 border-slate-200';
          var displayStatus = r.bankComment || "Processed";
          html += "<div class='bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-4 border-l-4 border-l-emerald-400'>" +
            "<a href='" + r.link + "' target='_blank' class='shrink-0'><img src='" + safeImg + "' class='w-16 h-20 object-cover rounded-lg border shadow-sm' onerror=\"this.parentElement.innerHTML='<div class=\\'w-16 h-20 bg-slate-100 flex items-center justify-center rounded-lg border text-[8px] text-center text-slate-400 font-bold p-1\\'>View Link</div>'\"></a>" +
            "<div class='flex-1 flex flex-col justify-between'><div><div class='flex justify-between items-start'><span class='text-[10px] font-black text-slate-400 uppercase'>" + r.payDate + "</span><span class='text-sm font-black text-slate-800'>₹" + r.amount + "</span></div><p class='text-[11px] text-slate-600 mt-1 line-clamp-2'>" + (r.remark ? '<b>Note:</b> ' + r.remark : '') + "</p></div><div class='text-[10px] font-bold p-1.5 rounded-md mt-2 w-max border " + stColor + "'>" + displayStatus + "</div></div></div>";
        });
      }
      listEl.innerHTML = html;
    }
  );
}

function confirmScreenshotDeletion(encodedUrl) {
  var clearUrl = decodeURIComponent(encodedUrl);
  if (confirm("Are you sure you want to remove this screenshot submission? This action cannot be undone.")) {
    var listEl = document.getElementById('screenshot-list');
    listEl.style.opacity = "0.5";

    callBackendAPI("deleteCustomerScreenshot", { cpn: activeUserSession.cpn, fileUrl: clearUrl },
      function (res) {
        listEl.style.opacity = "1.0";
        alert(res.message);
        if (res.success) {
          loadScreenshotData();
        }
      },
      function (err) {
        listEl.style.opacity = "1.0";
        alert("Network timeout. Please try again.");
      }
    );
  }
}