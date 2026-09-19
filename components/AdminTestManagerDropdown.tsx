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
      .adminTestCollapseToggle{
        min-width:196px!important;
        height:52px!important;
        padding:0 11px 0 15px!important;
        border:1px solid #e1e4e8!important;
        border-radius:12px!important;
        background:#fff!important;
        color:#202329!important;
        display:flex!important;
        align-items:center!important;
        justify-content:space-between!important;
        gap:14px!important;
        box-shadow:0 1px 2px rgba(17,19,24,.03)!important;
        font-family:var(--font-poppins),Poppins,Arial,sans-serif!important;
        cursor:pointer!important;
        transition:background .15s ease,border-color .15s ease,box-shadow .15s ease!important
      }
      .adminTestCollapseToggle:hover{
        background:#fafbfc!important;
        border-color:#d7dbe0!important;
        box-shadow:0 4px 14px rgba(17,19,24,.05)!important
      }
      .adminTestCollapseToggle span{display:block!important;min-width:0!important;text-align:left!important;line-height:1.12!important}
      .adminTestCollapseToggle b{display:block!important;color:#202329!important;font-size:10.5px!important;font-weight:800!important;white-space:nowrap!important}
      .adminTestCollapseToggle small{display:block!important;margin-top:4px!important;color:#9298a2!important;font-size:7.5px!important;font-weight:750!important;letter-spacing:.015em!important;white-space:nowrap!important}
      .adminTestCollapseToggle i{
        position:relative!important;
        width:32px!important;
        height:32px!important;
        flex:0 0 32px!important;
        border:1px solid #eceef1!important;
        border-radius:9px!important;
        background:#f5f6f8!important
      }
      .adminTestCollapseToggle i:before{
        content:""!important;
        position:absolute!important;
        left:50%!important;
        top:50%!important;
        width:8px!important;
        height:8px!important;
        border-right:2px solid #34404d!important;
        border-bottom:2px solid #34404d!important;
        transform:translate(-50%,-62%) rotate(45deg)!important;
        transform-origin:center!important;
        transition:transform .16s ease!important
      }
      .adminTestCollapseToggle i:after{content:none!important}
      .adminLibrary[data-collapsed="false"] .adminTestCollapseToggle i:before{
        transform:translate(-50%,-38%) rotate(225deg)!important
      }
      .adminLibrary[data-collapsed="true"]>.adminTestList,
      .adminLibrary[data-collapsed="true"]>.adminLoading,
      .adminLibrary[data-collapsed="true"]>.emptyState,
      .adminLibrary[data-collapsed="true"]>#admin-professional-test-filters{display:none!important}
      .adminLibrary[data-collapsed="true"] .adminLibraryHeader .adminSearch{display:none!important}
      .adminLibrary[data-collapsed="true"]{min-height:0!important}
      .adminLibrary[data-collapsed="false"]>.adminTestList{
        max-height:min(570px,calc(100vh - 250px))!important;
        overflow:auto!important;
        overscroll-behavior:contain!important;
        scrollbar-width:thin!important
      }
      .adminLibrary[data-collapsed="false"]>.adminTestList .adminTestRow{
        content-visibility:auto;
        contain-intrinsic-size:76px
      }
      @media(max-width:900px){
        .adminLibraryHeader{flex-wrap:wrap!important}
        .adminTestCollapseToggle{width:100%!important;min-width:0!important}
        .adminLibrary[data-collapsed="false"]>.adminTestList{max-height:520px!important}
      }
    `}</style>
  );
}
