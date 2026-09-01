export function AdminOverviewSelectorFix() {
  return (
    <style>{`
      /* Correct CSS-module substring collisions from the Overview polish layer. */
      .adminRoot #admin-professional-overview [class*="opsCards"]{
        position:static!important;
        width:auto!important;
        height:auto!important;
        min-height:0!important;
        max-height:none!important;
        padding:0!important;
        border:0!important;
        border-radius:0!important;
        background:transparent!important;
        box-shadow:none!important;
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        grid-auto-rows:96px!important;
        gap:10px!important;
        align-self:start!important;
        align-items:start!important;
        overflow:visible!important;
        text-align:initial!important;
        transform:none!important;
      }
      .adminRoot #admin-professional-overview [class*="opsCards"]:before{
        content:none!important;
        display:none!important;
      }
      .adminRoot #admin-professional-overview [class*="opsCards"]>[class*="opsCard"]{
        position:relative!important;
        width:100%!important;
        height:96px!important;
        min-height:96px!important;
        max-height:96px!important;
        padding:13px 15px 12px!important;
        border:1px solid rgba(14,32,56,.09)!important;
        border-radius:16px!important;
        background:rgba(255,253,248,.98)!important;
        box-shadow:0 9px 24px rgba(28,35,42,.045)!important;
        display:flex!important;
        flex-direction:column!important;
        justify-content:center!important;
        overflow:hidden!important;
        text-align:left!important;
      }

      .adminRoot #admin-professional-overview [class*="liveCardHead"]{
        position:static!important;
        width:auto!important;
        height:auto!important;
        min-height:0!important;
        max-height:none!important;
        padding:0!important;
        border:0!important;
        border-radius:0!important;
        background:transparent!important;
        box-shadow:none!important;
        display:flex!important;
        align-items:center!important;
        justify-content:space-between!important;
        overflow:visible!important;
        transform:none!important;
        margin-bottom:7px!important;
      }
      .adminRoot #admin-professional-overview [class*="liveCardHead"]:before{
        content:none!important;
        display:none!important;
      }
      .adminRoot #admin-professional-overview [class*="liveRows"]{
        display:grid!important;
        grid-template-columns:1fr!important;
        grid-auto-rows:auto!important;
        align-items:stretch!important;
        gap:0!important;
        min-height:0!important;
        height:auto!important;
        max-height:none!important;
        padding:0!important;
        border:0!important;
        background:transparent!important;
        box-shadow:none!important;
        overflow:visible!important;
      }
      .adminRoot #admin-professional-overview [class*="liveRows"]>[class*="liveRow"]{
        display:grid!important;
        grid-template-columns:27px minmax(0,1fr) auto!important;
        align-items:center!important;
        min-height:31px!important;
        height:auto!important;
        max-height:none!important;
        gap:8px!important;
        padding:5px 0!important;
        border-radius:0!important;
        background:transparent!important;
        box-shadow:none!important;
        overflow:visible!important;
      }

      @media(max-width:1180px){
        .adminRoot #admin-professional-overview [class*="opsCards"]{
          grid-template-columns:repeat(4,minmax(0,1fr))!important;
          grid-auto-rows:92px!important;
        }
        .adminRoot #admin-professional-overview [class*="opsCards"]>[class*="opsCard"]{
          height:92px!important;
          min-height:92px!important;
          max-height:92px!important;
        }
      }
      @media(max-width:700px){
        .adminRoot #admin-professional-overview [class*="opsCards"]{
          grid-template-columns:repeat(2,minmax(0,1fr))!important;
        }
      }
      @media(max-width:460px){
        .adminRoot #admin-professional-overview [class*="opsCards"]{
          grid-template-columns:1fr!important;
          grid-auto-rows:88px!important;
        }
        .adminRoot #admin-professional-overview [class*="opsCards"]>[class*="opsCard"]{
          height:88px!important;
          min-height:88px!important;
          max-height:88px!important;
        }
      }
    `}</style>
  );
}
