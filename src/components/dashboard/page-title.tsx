"use client";
import "./_page-title.css"

import { Button } from "@/components/ui/button";

export function PageTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: string }) {
  return (
    <div className="is_View _f-27493358 _ai-1238633270 _jc-509505936 _g-924523110 ep-page-title"    >
      <div className="is_View _f-2057920087 _mw-839999524 _mw-2095260364 _g-924523017"  >
        <span className="is_Text font_heading _us-601593343 _ws-974065937 _ff-163417665 _m-2017216831 _fs-2127568250 _ls-888140243 _lh-465165333 _c-479604596 _fw-291940586 ep-page-heading"  >{title}</span>
        {eyebrow ? <span className="is_Text _c-1589498260 _fs-553824545 _lh-341113514"  >{eyebrow}</span> : null}
      </div>
      {action ? <Button>{action}</Button> : null}
    </div>
  );
}
