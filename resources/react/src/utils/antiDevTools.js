/**
 * Anti DevTools Protection
 * Chống mở DevTools trong production
 */

let devtoolsOpen = false;

// Phát hiện DevTools mở
const detectDevTools = () => {
  const threshold = 160;
  const widthThreshold = window.outerWidth - window.innerWidth > threshold;
  const heightThreshold = window.outerHeight - window.innerHeight > threshold;

  return widthThreshold || heightThreshold;
};

// Vô hiệu hóa DevTools
export const disableDevTools = () => {
  // 1. Detect DevTools với console trick
  const devtools = /./;
  devtools.toString = function() {
    devtoolsOpen = true;
  };

  // Kiểm tra liên tục
  const checkInterval = setInterval(() => {
    console.log('%c', devtools);
    console.clear();

    if (devtoolsOpen || detectDevTools()) {
      handleDevToolsDetected();
    }
  }, 1000);

  // 2. Vô hiệu hóa chuột phải
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // 3. Vô hiệu hóa phím tắt
  document.addEventListener('keydown', (e) => {
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
  });

  // 4. Xóa console định kỳ
  setInterval(() => {
    console.clear();
  }, 100);

  // 5. Ngăn select text (tùy chọn)
  document.addEventListener('selectstart', (e) => {
    e.preventDefault();
    return false;
  });

  // 6. Phát hiện resize window
  window.addEventListener('resize', () => {
    if (detectDevTools()) {
      handleDevToolsDetected();
    }
  });

  return () => {
    clearInterval(checkInterval);
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
