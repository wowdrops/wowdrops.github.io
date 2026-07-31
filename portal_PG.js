function checkForPaymentRedirect() {
  const urlParams = new URLSearchParams(window.location.search);
  const txnId = urlParams.get('txnId');

  if (txnId) {
    // Display a secure loading overlay
    document.body.insertAdjacentHTML('beforeend', `
      <div id="payment-verify-overlay" class="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
        <div class="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h3 class="text-white font-bold text-lg">Verifying Payment...</h3>
        <p class="text-indigo-200 text-sm mt-2 text-center max-w-xs">Please do not close this window while we securely confirm your transaction with PhonePe.</p>
      </div>
    `);

    // Remove the txnId from the URL immediately so it doesn't re-trigger on refresh
    window.history.replaceState({}, document.title, window.location.pathname);

    // Fire the API call to your Apps Script
    callBackendAPI("checkPaymentStatus", { txnId: txnId }, 
      function(res) {
        document.getElementById('payment-verify-overlay').remove();

        if (res.success) {
          alert("✅ " + res.message);
          // Refresh the dashboard so the new outstanding balance shows!
          if (activeUserSession) refreshCustomerSessionData(activeUserSession.cpn);
        } else if (res.status === 'PENDING') {
          alert("⏳ Payment is still pending. It will be updated automatically once cleared.");
        } else {
          alert("❌ Payment Failed or Cancelled. Please try again.");
        }
      },
      function(err) {
        document.getElementById('payment-verify-overlay').remove();
        alert("Network error while verifying payment. We will verify it in the background.");
      }
    );
  }
}