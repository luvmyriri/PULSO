import React from 'react';

/**
 * Official 1:1 SVG Flag Components (MIT Licensed - flag-icons / Lipis)
 * Rendered with circular crop compatibility, official proportions and colors.
 */

export const FlagPH = ({ className = 'w-full h-full', ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className={className} aria-hidden="true" {...props}>
    <path fill="#0038a8" d="M0 0h512v256H0z" />
    <path fill="#ce1126" d="M0 256h512v256H0z" />
    <path fill="#fff" d="M443.4 256 0 512V0" />
    <path fill="#fcd116" d="m25.2 44.4 15.4 13.3 17.9-9.8-8 18.7 15 14L45 78.9l-8.6 18.4-4.7-19.8-20.2-2.6L29 64.4zM372.1 229l.4 20.3 19.3 6.7-19.3 6.7-.4 20.3-12.3-16.2-19.5 6L352 256l-11.7-16.7 19.5 5.9zM36.5 414.7l8.6 18.4 20.3-1.7-14.8 14 7.9 18.7-17.9-9.8-15.4 13.3 3.9-20-17.5-10.5 20.2-2.6zM158.9 148l-6.6 6.6 3.2 50.3-3.3.3-6-45.9-5.5 5.4 8.2 41a51 51 0 0 0-18.4 7.7l-23.3-34.8h-7.7l28.2 36.8-2.5 2.1-33.3-38h-9.4v9.5l38 33.3-2.2 2.5-36.8-28.2v7.7l34.8 23.3a51 51 0 0 0-7.6 18.4l-41-8.2-5.5 5.5 46 6-.4 3.4-50.3-3.3-6.7 6.6 6.7 6.6 50.3-3.2.3 3.3-45.9 6 5.4 5.5 41-8.2a51 51 0 0 0 7.7 18.4l-34.8 23.3v7.7l36.8-28.2 2.1 2.5-38 33.3v9.4H92l33.3-38 2.5 2.2-28.2 36.8h7.7l23.3-34.8a51 51 0 0 0 18.4 7.6l-8.2 41 5.5 5.5 6-46 3.3.4-3.2 50.3 6.6 6.7 6.6-6.7-3.2-50.3 3.3-.3 6 45.9 5.5-5.4-8.2-41a51 51 0 0 0 18.4-7.7l23.3 34.8h7.7L190 296.6l2.5-2.1 33.3 38h9.4V323l-38-33.3 2.2-2.5 36.8 28.2v-7.7l-34.8-23.3A51 51 0 0 0 209 266l41 8.2 5.5-5.5-46-6 .4-3.3 50.3 3.2 6.7-6.6-6.7-6.6-50.3 3.3q0-1.8-.3-3.4l45.9-6-5.4-5.5-41 8.2a51 51 0 0 0-7.7-18.4l34.8-23.3v-7.7l-36.8 28.2-2.1-2.5 38-33.3v-9.4h-9.5l-33.3 38-2.5-2.2 28.2-36.8h-7.7l-23.3 34.8a51 51 0 0 0-18.4-7.6l8.2-41-5.5-5.5-6 46-3.3-.4 3.2-50.3z" />
  </svg>
);

export const FlagUS = ({ className = 'w-full h-full', ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className={className} aria-hidden="true" {...props}>
    <path fill="#bd3d44" d="M0 0h512v512H0" />
    <path stroke="#fff" strokeWidth="40" d="M0 58h512M0 137h512M0 216h512M0 295h512M0 374h512M0 453h512" />
    <path fill="#192f5d" d="M0 0h390v275H0z" />
    <marker id="us-a-pulso-flag" markerHeight="30" markerWidth="30">
      <path fill="#fff" d="m15 0 9.3 28.6L0 11h30L5.7 28.6" />
    </marker>
    <path fill="none" markerMid="url(#us-a-pulso-flag)" d="m0 0 18 11h65 65 65 65 66L51 39h65 65 65 65L18 66h65 65 65 65 66L51 94h65 65 65 65L18 121h65 65 65 65 66L51 149h65 65 65 65L18 177h65 65 65 65 66L51 205h65 65 65 65L18 232h65 65 65 65 66z" />
  </svg>
);
