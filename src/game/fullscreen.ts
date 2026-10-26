export function isFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  const doc = document as any;
  return Boolean(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement
  );
}

export function requestFullScreenSafely() {
  if (typeof document === "undefined" || isFullscreen()) return;
  const el = document.documentElement as any;
  const rfs =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.mozRequestFullScreen ||
    el.msRequestFullscreen;

  if (rfs) {
    try {
      const p = rfs.call(el);
      if (p && typeof p.then === "function") {
        p.then(() => {
          try {
            if (screen.orientation && (screen.orientation as any).lock) {
              (screen.orientation as any).lock("landscape").catch(() => {});
            }
          } catch {
            /* ignore */
          }
        }).catch(() => {});
      }
    } catch {
      /* ignore */
    }
  }
}

export function exitFullScreenSafely() {
  if (typeof document === "undefined" || !isFullscreen()) return;
  const doc = document as any;
  const efs =
    doc.exitFullscreen ||
    doc.webkitExitFullscreen ||
    doc.mozCancelFullScreen ||
    doc.msExitFullscreen;
  if (efs) {
    try {
      const p = efs.call(doc);
      if (p && typeof p.catch === "function") {
        p.catch(() => {});
      }
    } catch {
      /* ignore */
    }
  }
}

export function toggleFullScreen() {
  if (isFullscreen()) {
    exitFullScreenSafely();
  } else {
    requestFullScreenSafely();
  }
}
