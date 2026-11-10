import { Camera, ClipboardCheck, LocateFixed, ReceiptText, ScanSearch, Send } from 'lucide-react';

// Instructional line drawings only; these do not represent submitted reports or real locations.
export default function NativeGuideDiagram({ step }) {
  return (
    <div className="native-guide__diagram" aria-hidden="true">
      <svg viewBox="0 0 320 144" fill="none" focusable="false">
        <g className="native-guide__drawing" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path className="native-guide__corners" d="M12 29V13h16m264 0h16v16M12 115v16h16m264 0h16v-16" />
          {step === 1 && <>
            <path d="M39 113V83l30-9v39m9 0V64l25-9v58m115 0V73h26v40m9 0V88l28-9v34M26 113h268M49 87h9m-9 10h9m29-26h7m-7 12h7m-7 12h7m132-12h8m-8 12h8m28 0h8" />
            <rect className="native-guide__paper" x="119" y="20" width="81" height="105" rx="10" />
            <path d="M145 28h29M133 75h52m-52 12h42m-42 12h29" />
            <Camera className="native-guide__drawing-accent" x="145" y="41" width="30" height="26" />
            <path className="native-guide__drawing-accent" d="M132 113h55" strokeWidth="5" />
          </>}
          {step === 2 && <>
            <path d="M66 106h32m-32-16h21m143-38h24m-24 14h37" />
            <rect className="native-guide__paper" x="110" y="17" width="100" height="112" rx="10" />
            <ScanSearch className="native-guide__drawing-accent" x="126" y="31" width="31" height="31" />
            <path d="M126 78h68m-68 14h53m-53 14h38" />
            <path className="native-guide__drawing-accent" d="m193 85 28-28 9 9-28 28-13 4zM215 63l9 9" />
          </>}
          {step === 3 && <>
            <path className="native-guide__paper" d="m58 31 65-12 74 13 65-13v95l-65 13-74-13-65 13z" />
            <path d="M123 19v95m74-82v95M58 67l65 12 74-20 65 13M83 27l19 38-17 57m145-97-11 37 20 56" />
            <path className="native-guide__map-road" d="m61 104 64-18 70 16 64-12" strokeWidth="7" />
            <LocateFixed className="native-guide__drawing-accent" x="143" y="36" width="40" height="48" />
          </>}
          {step === 4 && <>
            <rect className="native-guide__paper" x="73" y="28" width="174" height="93" rx="12" />
            <ClipboardCheck className="native-guide__drawing-accent" x="135" y="49" width="50" height="50" />
            <path d="M90 49v12m0 25v12m136-37V49m0 49V86" />
            <path className="native-guide__drawing-accent" d="M55 45V33H43m222 0h12v12M43 105h12v12m222-12v12h-12" />
          </>}
          {step === 5 && <>
            <path className="native-guide__paper" d="M113 17h94v111l-12-7-12 7-11-7-12 7-12-7-11 7-12-7-12 7z" />
            <ReceiptText className="native-guide__drawing-accent" x="126" y="32" width="28" height="28" />
            <path d="M128 77h63m-63 13h43m-43 13h54M65 75h25m-10-10 10 10-10 10m150-32h21m-21 13h30" />
            <Send className="native-guide__drawing-accent" x="229" y="85" width="26" height="26" />
          </>}
        </g>
      </svg>
    </div>
  );
}
