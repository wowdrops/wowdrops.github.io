// Ensure the global object is perfectly defined
window.activeHandshakeTimerInterval = null;
window.handshakeStartTime = 0;

window.switchHsTab = function(tabId) {
    document.querySelectorAll('.hs-tab-content').forEach(function(el) { el.classList.add('hidden'); });
    var targetTab = document.getElementById('hs-tab-' + tabId);
    if(targetTab) targetTab.classList.remove('hidden');

    document.querySelectorAll('.hs-tab-btn').forEach(function(btn) {
        btn.className = "hs-tab-btn w-full text-left px-4 py-3 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all border border-transparent shrink-0 md:shrink flex justify-between items-center";
    });

    var activeBtn = document.getElementById('hs-tab-btn-' + tabId);
    if (activeBtn) {
        if(tabId === 'queue') {
            activeBtn.className = "hs-tab-btn w-full text-left px-4 py-3 rounded-xl font-black text-sm transition-all bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm shrink-0 md:shrink flex justify-between items-center";
        } else {
            activeBtn.className = "hs-tab-btn w-full text-left px-4 py-3 rounded-xl font-black text-sm transition-all bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm shrink-0 md:shrink";
        }
    }
};

window.startHsTimer = function (actionLabel) {
  var badge = document.getElementById('handshake-live-timer');
  if (!badge) return;
  badge.outerHTML = '<span id="handshake-live-timer" class="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-black px-3 py-1.5 rounded-lg text-xs tracking-widest uppercase border border-emerald-200 dark:border-emerald-800 shadow-inner flex items-center gap-1.5 min-w-max"><svg class="w-4 h-4 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>' + actionLabel + ': <span id="hs-timer-sec">0.00</span>s</span>';
  document.getElementById('handshake-live-timer').classList.remove('hidden');

  window.handshakeStartTime = performance.now();
  if (window.activeHandshakeTimerInterval) clearInterval(window.activeHandshakeTimerInterval);
  window.activeHandshakeTimerInterval = setInterval(function () {
    var secEl = document.getElementById('hs-timer-sec');
    if (secEl) secEl.innerText = ((performance.now() - window.handshakeStartTime) / 1000).toFixed(2);
  }, 50);
};

window.stopHsTimer = function (successLabel, isError) {
  if (window.activeHandshakeTimerInterval) clearInterval(window.activeHandshakeTimerInterval);
  var finalTime = ((performance.now() - window.handshakeStartTime) / 1000).toFixed(2);
  var badge = document.getElementById('handshake-live-timer');
  if (badge) {
    if (isError) {
      badge.outerHTML = '<span id="handshake-live-timer" class="bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 font-black px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 text-[10px] uppercase tracking-widest shadow-sm min-w-max">Failed</span>';
    } else {
      badge.outerHTML = '<span id="handshake-live-timer" class="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-black px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-[10px] uppercase tracking-widest shadow-sm min-w-max">' + successLabel + ' in ' + finalTime + 's</span>';
    }
  }
};

window.formatDisplayDate = function(isoString) {
    if(!isoString) return "-";
    var d = new Date(isoString);
    return d.toLocaleDateString('en-IN', {day:'2-digit', month:'short'}) + " " + d.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit', hour12:true});
};

// 1. UPDATED LIVE QUEUE LOGIC (Now includes the Crew Button)
window.loadHandshakeQueue = async function() {
    window.startHsTimer('Fetching Queue');
    var container = document.getElementById('hs-queue-container');
    container.innerHTML = '<div class="col-span-full text-center py-12"><svg class="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p class="text-xs font-black text-slate-400 uppercase tracking-widest">Scanning Yard...</p></div>';

    try {
        const { data, error } = await window.supabase1
            .from('eod_log')
            .select('*')
            .in('status', ['Active', 'Pending Handover'])
            .order('created_at', { ascending: true });

        if (error) throw error;

        var badge = document.getElementById('hs-queue-badge');
        if(badge) {
            badge.innerText = data ? data.length : 0;
            badge.classList.toggle('hidden', !data || data.length === 0);
        }

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="col-span-full text-center py-16"><div class="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-slate-700 shadow-inner text-3xl">☕</div><p class="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Yard is Empty</p><p class="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-2">No drivers waiting for handover.</p></div>';
            window.stopHsTimer('Updated', false);
            return;
        }

        var html = '';
        data.forEach(function(log) {
            var isReady = log.status === 'Pending Handover';
            var statBadge = isReady 
                ? '<span class="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest shadow-sm">Ready In Yard</span>'
                : '<span class="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest shadow-sm">On Route</span>';

            html += `
            <div class="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-colors hover:shadow-md">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider">${log.driver_mail_id}</h4>
                        <p class="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1">Shift Start: ${window.formatDisplayDate(log.created_at)}</p>
                    </div>
                    ${statBadge}
                </div>
                
                <div class="flex gap-2 mt-4">
                    <button onclick="window.openCrewModal(${log.id}, '${log.driver_mail_id}')" class="w-1/3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl flex flex-col items-center justify-center p-2 transition-colors shadow-sm outline-none">
                        <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                        <span class="text-[9px] font-black uppercase tracking-widest">Crew</span>
                    </button>
                    <button onclick="window.openInwardModal(${log.id}, '${log.driver_mail_id}')" class="w-2/3 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-black text-[10px] px-2 py-2 rounded-xl transition-all shadow-sm flex flex-col items-center justify-center uppercase tracking-widest outline-none text-center">
                        <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                        Physical Inward
                    </button>
                </div>
            </div>`;
        });
        
        container.innerHTML = html;
        window.stopHsTimer('Updated', false);

    } catch (err) {
        window.stopHsTimer('Failed', true);
        if(window.showToast) window.showToast("Queue Fetch Error: " + err.message, "error");
        container.innerHTML = `<div class="col-span-full text-center py-8"><p class="text-rose-500 font-bold uppercase tracking-widest text-xs">Failed to load queue.</p></div>`;
    }
};

// ==========================================
// NEW: ACTIVE CREW MANAGEMENT LOGIC
// ==========================================
window.openCrewModal = async function(tripId, driverName) {
    document.getElementById('hs-crew-driver-name').innerText = driverName;
    var container = document.getElementById('hs-crew-list');
    container.innerHTML = '<div class="text-center py-8"><svg class="w-6 h-6 animate-spin text-indigo-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Crew...</p></div>';

    var modal = document.getElementById('hs-crew-modal');
    if (modal && modal.parentNode !== document.body) document.body.appendChild(modal);
    modal.classList.remove('hidden');
    if(typeof window.toggleScrollLock === 'function') window.toggleScrollLock(true);

    try {
        const { data, error } = await window.supabase1
            .from('shift_log')
            .select('*')
            .eq('trip_id', tripId)
            // Removed the .eq('status', 'Active') filter to show ALL crew
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<p class="text-center text-sm font-bold text-slate-500 dark:text-slate-400 py-6">No crew members found for this trip.</p>';
            return;
        }

        var html = '';
        data.forEach(crew => {
            var roleBadge = crew.role.includes('DRIVER') 
                ? '<span class="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest">Driver</span>'
                : '<span class="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest">Helper</span>';

            var statusBadge = crew.status === 'Completed'
                ? '<span class="text-[9px] text-emerald-600 dark:text-emerald-500 font-black tracking-widest uppercase ml-2">✓ Closed</span>'
                : '<span class="text-[9px] text-amber-600 dark:text-amber-500 font-black tracking-widest uppercase ml-2 animate-pulse">⏳ Open</span>';

            var isMainDriver = crew.mail_id.toLowerCase() === driverName.toLowerCase();
            
            var actionBtn = '';
            if (crew.status === 'Completed') {
                actionBtn = '<span class="text-[9px] font-black text-emerald-500 uppercase tracking-widest px-3">Done</span>';
            } else if (isMainDriver) {
                // If main driver is stuck open, Admin can FORCE CLOSE them rather than delete them
                actionBtn = `<button onclick="window.forceCloseCrewMember(${crew.id}, ${tripId}, '${driverName}')" class="text-amber-500 hover:text-white bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-600 dark:hover:bg-amber-700 border border-amber-200 dark:border-amber-800/50 p-2 rounded-lg transition-colors outline-none" title="Force Close Shift">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                             </button>`;
            } else {
                // If a helper is stuck open, Admin can kick/delete them
                actionBtn = `<button onclick="window.removeCrewMember(${crew.id}, ${tripId}, '${driverName}')" class="text-rose-500 hover:text-white bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-600 dark:hover:bg-rose-700 border border-rose-200 dark:border-rose-800/50 p-2 rounded-lg transition-colors outline-none" title="Kick from Trip">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"></path></svg>
                             </button>`;
            }

            html += `
            <div class="flex items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-sm transition-colors">
                <div>
                    <p class="font-black text-sm text-slate-800 dark:text-white">${crew.mail_id}</p>
                    <div class="flex items-center gap-1 mt-1">
                        ${roleBadge}
                        ${statusBadge}
                    </div>
                    <p class="text-[9px] font-bold text-slate-400 mt-1">In: ${window.formatDisplayDate(crew.clock_in)}</p>
                </div>
                ${actionBtn}
            </div>`;
        });

        container.innerHTML = html;

    } catch (err) {
        if(window.showToast) window.showToast("Crew Fetch Error: " + err.message, "error");
        container.innerHTML = '<p class="text-center text-rose-500 font-bold text-xs uppercase tracking-widest py-6">Failed to load crew.</p>';
    }
};

// ADD THIS NEW FUNCTION ANYWHERE IN THE FILE
window.forceCloseCrewMember = async function(shiftId, tripId, driverName) {
    if(!confirm("Force close this user's shift? This will mark their handshake as completed for Delivery QC.")) return;
    try {
        const { error } = await window.supabase1
            .from('shift_log')
            .update({ status: 'Completed', clock_out: new Date().toISOString() })
            .eq('id', shiftId);

        if (error) throw error;
        
        if(window.showToast) window.showToast("Shift manually closed.", "success");
        window.openCrewModal(tripId, driverName); 
    } catch (err) {
        if(window.showToast) window.showToast("Failed to close shift: " + err.message, "error");
    }
};

window.closeCrewModal = function() {
    var modal = document.getElementById('hs-crew-modal');
    if (modal) modal.classList.add('hidden');
    if(typeof window.toggleScrollLock === 'function') window.toggleScrollLock(false);
};

window.removeCrewMember = async function(shiftId, tripId, driverName) {
    if(!confirm("Are you sure you want to remove this user from the active trip?")) return;

    try {
        const { error } = await window.supabase1
            .from('shift_log')
            .delete()
            .eq('id', shiftId);

        if (error) throw error;
        
        if(window.showToast) window.showToast("Crew member successfully removed from trip.", "success");
        window.openCrewModal(tripId, driverName); // Refresh the modal list

    } catch (err) {
        if(window.showToast) window.showToast("Failed to remove user: " + err.message, "error");
    }
};

window.openInwardModal = async function(logId, driverName) {
    document.getElementById('hs-modal-log-id').value = logId;
    document.getElementById('hs-modal-driver-name').innerText = driverName;
    
    // 1. Reset user inputs
    var inputs = ['fvj', 'fnvj', 'evj', 'envj', 'rvj', 'rnvj'];
    inputs.forEach(function(id) {
        var el = document.getElementById('hs-inp-' + id);
        if(el) el.value = "0";
    });

    // 2. Set "Loading" state for the Math boxes
    ['load-vj', 'del-vj', 'exp-vj', 'load-nvj', 'del-nvj', 'exp-nvj', 'exp-evj', 'exp-envj', 'exp-rvj', 'exp-rnvj'].forEach(id => {
        var el = document.getElementById('hs-sys-' + id);
        if (el) el.innerText = "...";
    });

    var modal = document.getElementById('hs-inward-modal');
    if (modal && modal.parentNode !== document.body) document.body.appendChild(modal);
    modal.classList.remove('hidden');
    if(typeof window.toggleScrollLock === 'function') window.toggleScrollLock(true);

    try {
        // 3. Fetch Morning Dispatch Load
        const { data: dispatchData } = await window.supabase1.from('van_dispatch_log')
            .select('load_full_vj, load_full_nvj')
            .eq('trip_id', logId)
            .maybeSingle();

        let loadVj = dispatchData ? (dispatchData.load_full_vj || 0) : 0;
        let loadNvj = dispatchData ? (dispatchData.load_full_nvj || 0) : 0;

        // 4. Fetch Actuals from Deliveries
        const { data: delData } = await window.supabase1.from('deliveries')
            .select('act_d_vj, act_d_nvj, act_e_vj, act_e_nvj, replace_act_vj, replace_act_nvj')
            .eq('trip_id', logId);

        let delVj = 0, delNvj = 0, collEvj = 0, collEnvj = 0, repVj = 0, repNvj = 0;
        
        if (delData) {
            delData.forEach(d => {
                delVj += (d.act_d_vj || 0);
                delNvj += (d.act_d_nvj || 0);
                collEvj += (d.act_e_vj || 0);
                collEnvj += (d.act_e_nvj || 0);
                repVj += (d.replace_act_vj || 0);
                repNvj += (d.replace_act_nvj || 0);
            });
        }

        // 5. Calculate Expected Returns
        // Replacements consume a fresh loaded can, so they are added to total delivered
        let totalDelVj = delVj + repVj; 
        let totalDelNvj = delNvj + repNvj;
        
        let expReturnVj = Math.max(0, loadVj - totalDelVj);
        let expReturnNvj = Math.max(0, loadNvj - totalDelNvj);

        // 6. Inject into UI
        document.getElementById('hs-sys-load-vj').innerText = loadVj;
        document.getElementById('hs-sys-del-vj').innerText = totalDelVj;
        document.getElementById('hs-sys-exp-vj').innerText = expReturnVj;

        document.getElementById('hs-sys-load-nvj').innerText = loadNvj;
        document.getElementById('hs-sys-del-nvj').innerText = totalDelNvj;
        document.getElementById('hs-sys-exp-nvj').innerText = expReturnNvj;

        document.getElementById('hs-sys-exp-evj').innerText = collEvj;
        document.getElementById('hs-sys-exp-envj').innerText = collEnvj;

        document.getElementById('hs-sys-exp-rvj').innerText = repVj;
        document.getElementById('hs-sys-exp-rnvj').innerText = repNvj;

    } catch (err) {
        console.error("Failed to load expected counts:", err);
        // Fallback to N/A if query fails
        ['load-vj', 'del-vj', 'exp-vj', 'load-nvj', 'del-nvj', 'exp-nvj', 'exp-evj', 'exp-envj', 'exp-rvj', 'exp-rnvj'].forEach(id => {
            var el = document.getElementById('hs-sys-' + id);
            if (el) el.innerText = "N/A";
        });
    }
};

window.submitPhysicalInward = async function() {
    var logId = document.getElementById('hs-modal-log-id').value;
    if(!logId) return;

    var btn = document.getElementById('hs-btn-save');
    btn.innerHTML = '<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Saving Inward...'; 
    btn.disabled = true;

    try {
        var currentUser = window.activeAdminSession ? window.activeAdminSession.username : 'ADMIN';

        var payload = {
            manager_mail_id: currentUser,
            status: 'Completed',     // <--- THIS WAS THE MISSING LINE!
            recon_status: 'PENDING',
            full_vj: parseInt(document.getElementById('hs-inp-fvj').value) || 0,
            full_nvj: parseInt(document.getElementById('hs-inp-fnvj').value) || 0,
            empty_vj: parseInt(document.getElementById('hs-inp-evj').value) || 0,
            empty_nvj: parseInt(document.getElementById('hs-inp-envj').value) || 0,
            replace_vj: parseInt(document.getElementById('hs-inp-rvj').value) || 0,
            replace_nvj: parseInt(document.getElementById('hs-inp-rnvj').value) || 0
        };

        const { error } = await window.supabase1.from('eod_log').update(payload).eq('id', logId);
        if (error) throw error;

        if(window.showToast) window.showToast("Stock Inwarded! Give the driver the Handshake PIN.", "success");
        if(typeof window.closeModal === 'function') window.closeModal('hs-inward-modal');
        else document.getElementById('hs-inward-modal').classList.add('hidden');
        
        window.loadHandshakeQueue();

    } catch (err) {
        if(window.showToast) window.showToast("Database Error: " + err.message, "error");
    } finally {
        btn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> Confirm Physical Inward';
        btn.disabled = false;
    }
};

window.loadHandshakeHistory = async function() {
    window.startHsTimer('Fetching History');
    var tbody = document.getElementById('hs-history-tbody');
    var dateFrom = document.getElementById('hs-flt-date-from').value;
    var dateTo = document.getElementById('hs-flt-date-to').value;
    
    if(tbody) tbody.innerHTML = '<tr><td colspan="11" class="text-center py-12"><svg class="w-6 h-6 animate-spin text-slate-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></td></tr>';

    try {
        let query = window.supabase1.from('eod_log').select('*').eq('status', 'Completed').order('created_at', { ascending: false }).limit(100);
        
        if (dateFrom && dateTo) {
            query = query.gte('created_at', dateFrom + "T00:00:00").lte('created_at', dateTo + "T23:59:59");
        }

        const { data, error } = await query;
        if (error) throw error;

        if (!data || data.length === 0) {
            if(tbody) tbody.innerHTML = '<tr><td colspan="11" class="text-center py-12 text-slate-400 font-bold uppercase tracking-widest text-xs">No records found.</td></tr>';
            window.stopHsTimer('Updated', false);
            return;
        }

        var html = '';
        data.forEach(function(log) {
            var reconStr = '';
            var rs = String(log.recon_status || 'PENDING').toUpperCase();
            
            if(rs === 'COMPLETED') reconStr = '<span class="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest shadow-sm">Matched</span>';
            else if(rs === 'COMPLETED (SHORTAGE)') reconStr = '<span class="bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest shadow-sm cursor-pointer" title="' + (log.godown_variance_reason || 'Variance found') + '">Shortage ⚠️</span>';
            else reconStr = '<span class="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest shadow-sm">Pending QC</span>';

            var crewBtn = `<button onclick="window.openCrewModal(${log.id}, '${log.driver_mail_id}')" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-1.5 rounded shadow-sm text-[9px] font-black uppercase tracking-widest transition-colors dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 dark:text-indigo-400 dark:border-indigo-800 outline-none">Crew</button>`;
            var reviewBtn = `<button onclick="window.openDetailsModal(${log.id}, '${log.driver_mail_id}')" class="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1.5 rounded shadow-sm text-[9px] font-black uppercase tracking-widest transition-colors dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800 outline-none">Review</button>`;

            html += `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                <td class="p-3 pl-4 text-slate-600 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wider">${window.formatDisplayDate(log.created_at)}</td>
                <td class="p-3 font-black text-slate-700 dark:text-slate-300 text-xs">#${log.id}</td>
                <td class="p-3">
                    <span class="font-black text-indigo-700 dark:text-indigo-400 uppercase text-xs block">${log.driver_mail_id}</span>
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">By: ${log.manager_mail_id || 'Admin'}</span>
                </td>
                <td class="p-3 text-center border-l border-slate-100 dark:border-slate-800 bg-indigo-50/20 dark:bg-indigo-900/5 font-black text-indigo-700 dark:text-indigo-300 text-lg">${log.full_vj || 0}</td>
                <td class="p-3 text-center bg-indigo-50/20 dark:bg-indigo-900/5 font-bold text-indigo-500 dark:text-indigo-400 text-base">${log.full_nvj || 0}</td>
                <td class="p-3 text-center border-l border-slate-100 dark:border-slate-800 bg-emerald-50/20 dark:bg-emerald-900/5 font-black text-emerald-700 dark:text-emerald-400 text-lg">${log.empty_vj || 0}</td>
                <td class="p-3 text-center bg-emerald-50/20 dark:bg-emerald-900/5 font-bold text-emerald-500 dark:text-emerald-400 text-base">${log.empty_nvj || 0}</td>
                <td class="p-3 text-center border-l border-slate-100 dark:border-slate-800 bg-amber-50/20 dark:bg-amber-900/5 font-black text-amber-700 dark:text-amber-400 text-base">${log.replace_vj || 0}</td>
                <td class="p-3 text-center bg-amber-50/20 dark:bg-amber-900/5 font-bold text-amber-500 dark:text-amber-400 text-sm">${log.replace_nvj || 0}</td>
                <td class="p-3 text-center border-l border-slate-100 dark:border-slate-800">${reconStr}</td>
                <td class="p-3 text-center border-l border-slate-100 dark:border-slate-800 flex justify-center gap-1">${crewBtn} ${reviewBtn}</td>
            </tr>`;
        });
        
        if(tbody) tbody.innerHTML = html;
        window.stopHsTimer('Updated', false);

    } catch (err) {
        window.stopHsTimer('Failed', true);
        if(window.showToast) window.showToast("History Fetch Error: " + err.message, "error");
    }
};

window.openDetailsModal = async function(tripId, driverName) {
    document.getElementById('hs-det-trip-id').innerText = tripId;
    document.getElementById('hs-det-driver').innerText = driverName;
    document.getElementById('hs-det-loader').classList.remove('hidden');
    document.getElementById('hs-det-content').classList.add('hidden');

    var modal = document.getElementById('hs-details-modal');
    if (modal && modal.parentNode !== document.body) document.body.appendChild(modal);
    modal.classList.remove('hidden');
    if(typeof window.toggleScrollLock === 'function') window.toggleScrollLock(true);

    try {
        // 1. Fetch EOD Log (Godown Received)
        const { data: eodData, error: eodErr } = await window.supabase1.from('eod_log').select('*').eq('id', tripId).single();
        if (eodErr) throw eodErr;

        // 2. Fetch Dispatch Log (Morning Load)
        const { data: dispatchData } = await window.supabase1.from('van_dispatch_log').select('load_full_vj, load_full_nvj').eq('trip_id', tripId).maybeSingle();
        let loadVj = dispatchData ? (dispatchData.load_full_vj || 0) : 0;
        let loadNvj = dispatchData ? (dispatchData.load_full_nvj || 0) : 0;

        // 3. Fetch App Actuals (Sum of Deliveries + Sales)
        const { data: delData } = await window.supabase1.from('deliveries').select('act_d_vj, act_d_nvj, act_e_vj, act_e_nvj, replace_act_vj, replace_act_nvj').eq('trip_id', tripId);
        const { data: salesData } = await window.supabase1.from('sales').select('act_d_vj, act_d_nvj, act_e_vj, act_e_nvj, replace_act_vj, replace_act_nvj').eq('trip_id', tripId);

        let appDelVj = 0, appDelNvj = 0, appEvj = 0, appEnvj = 0, appRvj = 0, appRnvj = 0;
        
        let allRecords = (delData || []).concat(salesData || []);
        allRecords.forEach(d => {
            appDelVj += (d.act_d_vj || 0);
            appDelNvj += (d.act_d_nvj || 0);
            appEvj += (d.act_e_vj || 0);
            appEnvj += (d.act_e_nvj || 0);
            appRvj += (d.replace_act_vj || 0);
            appRnvj += (d.replace_act_nvj || 0);
        });

        // 4. Calculate Expected
        let expReturnVj = Math.max(0, loadVj - (appDelVj + appRvj));
        let expReturnNvj = Math.max(0, loadNvj - (appDelNvj + appRnvj));

        // 5. Variances (Godown Received - Expected)
        let vFvj = (eodData.full_vj || 0) - expReturnVj;
        let vFnvj = (eodData.full_nvj || 0) - expReturnNvj;
        let vEvj = (eodData.empty_vj || 0) - appEvj;
        let vEnvj = (eodData.empty_nvj || 0) - appEnvj;
        let vRvj = (eodData.replace_vj || 0) - appRvj;
        let vRnvj = (eodData.replace_nvj || 0) - appRnvj;

        // 6. Populate UI
        document.getElementById('hd-load-vj').innerText = loadVj;
        document.getElementById('hd-del-vj').innerText = appDelVj + appRvj;
        document.getElementById('hd-exp-vj').innerText = expReturnVj;
        document.getElementById('hd-act-vj').innerText = eodData.full_vj || 0;
        
        document.getElementById('hd-load-nvj').innerText = loadNvj;
        document.getElementById('hd-del-nvj').innerText = appDelNvj + appRnvj;
        document.getElementById('hd-exp-nvj').innerText = expReturnNvj;
        document.getElementById('hd-act-nvj').innerText = eodData.full_nvj || 0;

        document.getElementById('hd-exp-evj').innerText = appEvj;
        document.getElementById('hd-act-evj').innerText = eodData.empty_vj || 0;
        document.getElementById('hd-exp-envj').innerText = appEnvj;
        document.getElementById('hd-act-envj').innerText = eodData.empty_nvj || 0;

        document.getElementById('hd-exp-rvj').innerText = appRvj;
        document.getElementById('hd-act-rvj').innerText = eodData.replace_vj || 0;
        document.getElementById('hd-exp-rnvj').innerText = appRnvj;
        document.getElementById('hd-act-rnvj').innerText = eodData.replace_nvj || 0;

        // Helper to format variance rows
        function setVarRow(val, rowId, valId) {
            let el = document.getElementById(valId);
            let row = document.getElementById(rowId);
            el.innerText = (val > 0 ? "+" : "") + val;
            if (val !== 0) {
                row.className = "flex justify-between font-black mt-1 p-1 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
            } else {
                row.className = "flex justify-between font-black mt-1 p-1 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
            }
        }

        setVarRow(vFvj, 'hd-var-vj-row', 'hd-var-vj');
        setVarRow(vFnvj, 'hd-var-nvj-row', 'hd-var-nvj');
        setVarRow(vEvj, 'hd-var-evj-row', 'hd-var-evj');
        setVarRow(vEnvj, 'hd-var-envj-row', 'hd-var-envj');
        setVarRow(vRvj, 'hd-var-rvj-row', 'hd-var-rvj');
        setVarRow(vRnvj, 'hd-var-rnvj-row', 'hd-var-rnvj');

        // Status Banner
        let banner = document.getElementById('hs-det-status-banner');
        if (vFvj === 0 && vFnvj === 0 && vEvj === 0 && vEnvj === 0 && vRvj === 0 && vRnvj === 0) {
            banner.className = "p-3 rounded-xl border text-center font-black uppercase tracking-widest text-sm shadow-sm bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-300";
            banner.innerText = "✅ Perfectly Matched";
        } else {
            banner.className = "p-3 rounded-xl border text-center font-black uppercase tracking-widest text-sm shadow-sm bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-900/40 dark:border-rose-800 dark:text-rose-300";
            banner.innerText = "⚠️ Shortage / Variance Detected";
        }

        document.getElementById('hs-det-loader').classList.add('hidden');
        document.getElementById('hs-det-content').classList.remove('hidden');

    } catch (err) {
        if(window.showToast) window.showToast("Failed to load details: " + err.message, "error");
        window.closeDetailsModal();
    }
};

window.closeDetailsModal = function() {
    var modal = document.getElementById('hs-details-modal');
    if (modal) modal.classList.add('hidden');
    if(typeof window.toggleScrollLock === 'function') window.toggleScrollLock(false);
};

window.tabActions['handshake-log'] = function() {
    var dateFrom = document.getElementById('hs-flt-date-from');
    var dateTo = document.getElementById('hs-flt-date-to');
    var today = new Date().toISOString().split('T')[0];
    if(dateFrom && !dateFrom.value) dateFrom.value = today;
    if(dateTo && !dateTo.value) dateTo.value = today;
    
    window.switchHsTab('queue');
    window.loadHandshakeQueue();
};