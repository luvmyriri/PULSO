const fs = require('fs');
const path = 'c:/Apache24/htdocs/PULSO/frontend/src/index.css';

let content = fs.readFileSync(path, 'utf8');

const cssToAdd = `
/* Hide Spline Watermark globally */
#logo,
.spline-watermark,
a[href*="spline.design"],
canvas + div {
  display: none !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
`;

if (!content.includes('Hide Spline Watermark globally')) {
    fs.appendFileSync(path, cssToAdd, 'utf8');
    console.log('Spline hiding CSS appended successfully');
} else {
    console.log('CSS already exists');
}
