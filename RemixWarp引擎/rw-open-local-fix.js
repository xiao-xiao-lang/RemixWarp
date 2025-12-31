
/**
 * RemixWarp / TurboWarp HTML Patch
 * Fix: File > 从电脑中打开
 * Strategy:
 * 1) Prefer reusing the existing hidden import <input type="file"> used by "导入作品"
 *    so the native loading animation and logic are preserved.
 * 2) Fallback: create a hidden input and load via window.vm with a minimal loading overlay.
 *
 * Safe to inject once. Idempotent.
 */
(() => {
  'use strict';

  const MENU_TEXT = '从电脑中打开';
  const FILE_ACCEPT = '.sb3,.sb2';

  // Utility: find menu item by visible text
  function findMenuItemByText(text) {
    const items = Array.from(document.querySelectorAll('li, [role="menuitem"], .goog-menuitem'));
    return items.find(el => el.textContent && el.textContent.trim() === text);
  }

  // Utility: find existing import input (used by 导入作品)
  function findExistingImportInput() {
    // Heuristics: any hidden file input accepting sb3/sb2
    const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
    return inputs.find(i => (i.accept || '').includes('sb') && i.style.display === 'none') ||
           inputs.find(i => (i.accept || '').includes('sb'));
  }

  // Minimal loading overlay (fallback only)
  let overlay;
  function showFallbackLoading() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center;
      z-index: 999999;
    `;
    const spinner = document.createElement('div');
    spinner.style.cssText = `
      width: 48px; height: 48px; border-radius: 50%;
      border: 4px solid #fff; border-top-color: transparent;
      animation: spin 1s linear infinite;
    `;
    const style = document.createElement('style');
    style.textContent = `@keyframes spin{to{transform:rotate(360deg)}}`;
    overlay.appendChild(style);
    overlay.appendChild(spinner);
    document.body.appendChild(overlay);
  }
  function hideFallbackLoading() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  // Fallback loader using window.vm
  async function loadViaVM(file) {
    if (!window.vm || !window.vm.loadProject) {
      alert('未找到项目加载核心（vm）。');
      return;
    }
    showFallbackLoading();
    try {
      const buf = await file.arrayBuffer();
      await window.vm.loadProject(buf);
    } catch (e) {
      console.error(e);
      alert('加载项目失败。');
    } finally {
      hideFallbackLoading();
    }
  }

  function ensureHiddenInput() {
    let input = document.getElementById('rw-open-local-hidden-input');
    if (input) return input;
    input = document.createElement('input');
    input.id = 'rw-open-local-hidden-input';
    input.type = 'file';
    input.accept = FILE_ACCEPT;
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (file) loadViaVM(file);
      input.value = '';
    });
    document.body.appendChild(input);
    return input;
  }

  function bind() {
    const item = findMenuItemByText(MENU_TEXT);
    if (!item || item.__rw_bound) return false;
    item.__rw_bound = true;

    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Preferred path: reuse existing import input to preserve native animation
      const existing = findExistingImportInput();
      if (existing) {
        existing.click();
        return;
      }

      // Fallback path
      const input = ensureHiddenInput();
      input.click();
    }, true);

    return true;
  }

  // Observe menus because they are often recreated
  const mo = new MutationObserver(() => bind());
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // Initial attempt
  bind();
})();
