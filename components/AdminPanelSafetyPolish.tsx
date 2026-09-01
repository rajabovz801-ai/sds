export function AdminPanelSafetyPolish() {
  return (
    <style>{`
      /* Admin-only safety primitives. Keep selectors exact to avoid CSS-module parent/child collisions. */
      .adminRoot{
        -webkit-font-smoothing:antialiased;
        -moz-osx-font-smoothing:grayscale;
        text-rendering:optimizeLegibility;
      }
      .adminRoot button,
      .adminRoot a,
      .adminRoot input,
      .adminRoot select,
      .adminRoot textarea{font-family:inherit}
      .adminRoot button:focus-visible,
      .adminRoot a:focus-visible,
      .adminRoot input:focus-visible,
      .adminRoot select:focus-visible,
      .adminRoot textarea:focus-visible{
        outline:2px solid rgba(49,93,99,.38)!important;
        outline-offset:2px!important;
      }
      .adminRoot button:not(:disabled){cursor:pointer}

      /* Known global admin containers only. */
      .adminRoot .adminStudentRows>button,
      .adminRoot .adminStudentRows>button>div,
      .adminRoot .adminTestCopy,
      .adminRoot .adminStudentProfile>div,
      .adminRoot .adminStudentResults article>div,
      .adminRoot .adminResultNumbers{min-width:0}
      .adminRoot .adminStudentRows b,
      .adminRoot .adminStudentRows small,
      .adminRoot .adminTestCopy h3,
      .adminRoot .adminTestCopy small{
        overflow:hidden;
        text-overflow:ellipsis;
      }
      .adminRoot .adminTopActions button,
      .adminRoot .adminNav button{min-height:34px}

      @media(max-width:760px){
        .adminRoot .adminNav{
          overflow-x:auto;
          -webkit-overflow-scrolling:touch;
          scrollbar-width:thin;
        }
        .adminRoot .adminNav button{flex:0 0 auto}
      }
    `}</style>
  );
}
