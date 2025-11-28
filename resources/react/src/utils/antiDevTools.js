/**
 * Anti DevTools Protection
 * Chống mở DevTools trong production
 * ADMIN có thể bypass bằng cách set flag trong localStorage
 */

let devtoolsOpen = false;

// Kiểm tra user có phải ADMIN và được phép bypass không
const canBypassProtection = () => {
  try {
    // Check localStorage flag
    const bypassFlag = localStorage.getItem('__dev_bypass__');
    if (bypassFlag) {
      const data = JSON.parse(bypassFlag);
      // Check expiry và role
      if (data.expires > Date.now() && data.role === 'ADMIN') {
        return true;
      }
    }
    return false;
  } catch (e) {
    return false;
  }
};

// Phát hiện DevTools mở
const detectDevTools = () => {
  const threshold = 160;
  const widthThreshold = window.outerWidth - window.innerWidth > threshold;
  const heightThreshold = window.outerHeight - window.innerHeight > threshold;

  return widthThreshold || heightThreshold;
};

// Vô hiệu hóa DevTools
export const disableDevTools = () => {
  // Nếu ADMIN bypass, không áp dụng protection
  if (canBypassProtection()) {
    console.log('%c🔓 ADMIN Mode: DevTools protection bypassed', 'color: green; font-size: 14px; font-weight: bold;');
    return () => {}; // Return empty cleanup function
  }

  // 1. Detect DevTools với console trick
  const devtools = /./;
  devtools.toString = function() {
    devtoolsOpen = true;
  };

  // Kiểm tra liên tục
  const checkInterval = setInterval(() => {
    // Re-check bypass trong loop (trường hợp admin login sau)
    if (canBypassProtection()) {
      clearInterval(checkInterval);
      console.log('%c🔓 ADMIN Mode: DevTools protection disabled', 'color: green; font-size: 14px; font-weight: bold;');
      return;
    }

    console.log('%c', devtools);
    console.clear();

    if (devtoolsOpen || detectDevTools()) {
      handleDevToolsDetected();
    }
  }, 1000);

  // 2. Vô hiệu hóa chuột phải
  const handleContextMenu = (e) => {
    if (!canBypassProtection()) {
      e.preventDefault();
      return false;
    }
  };
  document.addEventListener('contextmenu', handleContextMenu);

  // 3. Vô hiệu hóa phím tắt
  const handleKeyDown = (e) => {
    if (canBypassProtection()) return; // ADMIN bypass
    // F12
    if (e.keyCode === 123) {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+I (Inspect)
    if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+C (Element picker)
    if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
      e.preventDefault();
      return false;
    }

    // Ctrl+U (View Source)
    if (e.ctrlKey && e.keyCode === 85) {
      e.preventDefault();
      return false;
    }

    // Ctrl+S (Save)
    if (e.ctrlKey && e.keyCode === 83) {
      e.preventDefault();
      return false;
    }
  };
  document.addEventListener('keydown', handleKeyDown);

  // 4. Xóa console định kỳ
  const clearConsoleInterval = setInterval(() => {
    if (!canBypassProtection()) {
      console.clear();
    }
  }, 100);

  // 5. Ngăn select text (tùy chọn)
  const handleSelectStart = (e) => {
    if (!canBypassProtection()) {
      e.preventDefault();
      return false;
    }
  };
  document.addEventListener('selectstart', handleSelectStart);

  // 6. Phát hiện resize window
  const handleResize = () => {
    if (!canBypassProtection() && detectDevTools()) {
      handleDevToolsDetected();
    }
  };
  window.addEventListener('resize', handleResize);

  // Cleanup function
  return () => {
    clearInterval(checkInterval);
    clearInterval(clearConsoleInterval);
    document.removeEventListener('contextmenu', handleContextMenu);
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('selectstart', handleSelectStart);
    window.removeEventListener('resize', handleResize);
  };
};

// Xử lý khi phát hiện DevTools
const handleDevToolsDetected = () => {
  // Redirect hoặc reload
  document.body.innerHTML = '<h1 style="text-align:center;margin-top:50px;">⚠️ Không được mở Developer Tools!</h1>';

  // Có thể thêm:
  // window.location.href = '/'; // Redirect về trang chủ
  // hoặc
  // setTimeout(() => window.location.reload(), 1000); // Reload sau 1s
};

// Disable console functions
export const disableConsole = () => {
  // ADMIN bypass
  if (canBypassProtection()) {
    console.log('%c🔓 ADMIN Mode: Console enabled', 'color: green; font-size: 14px; font-weight: bold;');
    return;
  }

  if (typeof window !== 'undefined') {
    window.console.log = () => {};
    window.console.info = () => {};
    window.console.warn = () => {};
    window.console.error = () => {};
    window.console.debug = () => {};
    window.console.table = () => {};
    window.console.trace = () => {};
    window.console.dir = () => {};
    window.console.dirxml = () => {};
    window.console.group = () => {};
    window.console.groupEnd = () => {};
    window.console.time = () => {};
    window.console.timeEnd = () => {};
    window.console.assert = () => {};
    window.console.profile = () => {};
  }
};

// Obfuscate strings (mã hóa strings)
export const obfuscateString = (str) => {
  return btoa(encodeURIComponent(str));
};

export const deobfuscateString = (str) => {
  return decodeURIComponent(atob(str));
};

// Prevent copy
export const preventCopy = () => {
  document.addEventListener('copy', (e) => {
    e.preventDefault();
    return false;
  });
};

// Watermark (dấu vết cho biết ai copy code)
export const addWatermark = (text = '© NQ57 Portal') => {
  const style = document.createElement('style');
  style.innerHTML = `
    body::after {
      content: "${text}";
      position: fixed;
      bottom: 10px;
      right: 10px;
      opacity: 0.1;
      font-size: 12px;
      pointer-events: none;
      z-index: 9999;
    }
  `;
  document.head.appendChild(style);
};

/**
 * Enable bypass protection for ADMIN
 * Gọi function này sau khi ADMIN đăng nhập thành công
 *
 * @param {Object} user - User object with role property
 * @param {number} duration - Thời gian bypass (ms), default 24 giờ
 */
export const enableDevToolsBypass = (user, duration = 24 * 60 * 60 * 1000) => {
  if (user && user.role === 'ADMIN') {
    const bypassData = {
      role: 'ADMIN',
      userId: user.id,
      email: user.email,
      expires: Date.now() + duration,
      timestamp: Date.now()
    };

    localStorage.setItem('__dev_bypass__', JSON.stringify(bypassData));
    console.log('%c✅ DevTools bypass enabled for ADMIN', 'color: green; font-size: 14px; font-weight: bold;');
    console.log('Bypass expires in:', duration / (1000 * 60 * 60), 'hours');

    // Reload để áp dụng
    window.location.reload();
  } else {
    console.warn('Only ADMIN can enable DevTools bypass');
  }
};

/**
 * Disable bypass protection
 * Tự động gọi khi logout hoặc hết hạn
 */
export const disableDevToolsBypass = () => {
  localStorage.removeItem('__dev_bypass__');
  console.log('%c🔒 DevTools bypass disabled', 'color: orange; font-size: 14px;');
  window.location.reload();
};

/**
 * Check bypass status
 */
export const checkBypassStatus = () => {
  if (canBypassProtection()) {
    const data = JSON.parse(localStorage.getItem('__dev_bypass__'));
    const remainingTime = data.expires - Date.now();
    console.log('%c✅ Bypass is ACTIVE', 'color: green; font-weight: bold;');
    console.log('User:', data.email);
    console.log('Expires in:', Math.round(remainingTime / (1000 * 60)), 'minutes');
    return true;
  } else {
    console.log('%c❌ Bypass is INACTIVE', 'color: red; font-weight: bold;');
    return false;
  }
};
