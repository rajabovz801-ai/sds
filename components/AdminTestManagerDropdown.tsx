'use client';

import { useEffect } from 'react';

export function AdminTestManagerDropdown() {
  useEffect(() => {
    const root = document.querySelector('.adminRoot') || document.body;

    const attach = () => {
      const library = document.querySelector<HTMLElement>('.adminLibrary');
      const header = library?.querySelector<HTMLElement>('.adminLibraryHeader');
      if (!library || !header) return;

      library.dataset.sort = 'date-desc';
      if (!library.dataset.dropdownInitialized) {
        library.dataset.dropdownInitialized = 'true';
        library.dataset.collapsed = 'true';
      }

      let toggle = header.querySelector<HTMLButtonElement>('.adminTestCollapseToggle');
      if (!toggle) {
        toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'adminTestCollapseToggle';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = '<span><b>Testlarni ochish</b><small>Sana: yangi → eski</small></span><i aria-hidden="true"></i>';
        toggle.addEventListener('click', () => {
          const collapsed = library.dataset.collapsed !== 'false';
          library.dataset.collapsed = collapsed ? 'false' : 'true';
          toggle?.setAttribute('aria-expanded', collapsed ? 'true' : 'false');
          const label = toggle?.querySelector('b');
          if (label) label.textContent = collapsed ? 'Testlarni yopish' : 'Testlarni ochish';
        });
        header.appendChild(toggle);
      }
    };

    attach();
    const observer = new MutationObserver(attach);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <style>{`
      .adminLibrary{overflow:hidden!important}
      .adminLibraryHeader{gap:12px!important;align-items:center!important}
      .adminTestCollapseToggle{height:50px;min-width:176px;padding:0 14px;border:1px solid rgba(16,43,82,.1);border-radius:14px;background:#fff;color:#102b52;display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;box-shadow:0 7px 18px rgba(17,41,70,.035);transition:.18s ease;font-family:inherit}
      .adminTestCollapseToggle:hover{background:#f9fafb;border-color:rgba(16,43,82,.16)}
      .adminTestCollapseToggle span{display:block;text-align:left;line-height:1.1}.adminTestCollapseToggle b{display:block;font-size:11px;font-weight:900}.adminTestCollapseToggle small{display:block;margin-top:4px;color:#8b97a7;font-size:8px;font-weight:800;letter-spacing:.02em}
      .adminTestCollapseToggle i{position:relative;width:28px;height:28px;flex:0 0 28px;border-radius:9px;background:#f3f6f8}.adminTestCollapseToggle i:before,.adminTestCollapseToggle i:after{content:"";position:absolute;top:13px;width:7px;height:2px;border-radius:2px;background:#173c6c;transition:transform .18s ease}.adminTestCollapseToggle i:before{left:7px;transform:rotate(45deg)}.adminTestCollapseToggle i:after{right:7px;transform:rotate(-45deg)}
      .adminLibrary[data-collapsed="false"] .adminTestCollapseToggle i:before{transform:rotate(-45deg)}.adminLibrary[data-collapsed="false"] .adminTestCollapseToggle i:after{transform:rotate(45deg)}
      .adminLibrary[data-collapsed="true"]>.adminTestList,.adminLibrary[data-collapsed="true"]>.adminLoading,.adminLibrary[data-collapsed="true"]>.emptyState,.adminLibrary[data-collapsed="true"]>#admin-professional-test-filters{display:none!important}
      .adminLibrary[data-collapsed="true"] .adminLibraryHeader .adminSearch{display:none!important}
      .adminLibrary[data-collapsed="true"]{min-height:0!important}
      .adminLibrary[data-collapsed="false"]>.adminTestList{max-height:570px;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin}
      .adminLibrary[data-collapsed="false"]>.adminTestList .adminTestRow{content-visibility:auto;contain-intrinsic-size:96px}
      @media(max-width:900px){.adminLibraryHeader{flex-wrap:wrap!important}.adminTestCollapseToggle{width:100%;min-width:0}.adminLibrary[data-collapsed="false"]>.adminTestList{max-height:520px}}
    `}</style>
  );
}
