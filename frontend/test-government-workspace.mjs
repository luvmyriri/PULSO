// Component/interaction checks. This is not a browser or visual acceptance run.
import {createServer} from 'vite';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import assert from 'node:assert/strict';

const storage=()=>({getItem:()=>null,setItem(){},removeItem(){}});
globalThis.sessionStorage=storage();
globalThis.localStorage=storage();
globalThis.window={getSelection:()=>({toString:()=>''}),innerWidth:1466,location:{port:'',hostname:'test.invalid',host:'test.invalid',origin:'https://test.invalid',pathname:'/gov/reports',search:''}};
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try {
    const {GovTable,GovPageHeader,GovRecordRow}=await server.ssrLoadModule('/src/components/government/GovWorkspace.jsx');
    const {default:Selection}=await server.ssrLoadModule('/src/components/government/ReportSelectionActions.jsx');
    const {ThemeContext}=await server.ssrLoadModule('/src/contexts/ThemeContext.jsx');
    const wrap=element=>React.createElement(MemoryRouter,{initialEntries:['/gov/reports?search=sample']},element);
    const rows=[{id:1,ticket_id:'TEST-1',issue:'Test concern'},{id:2,ticket_id:'TEST-2',issue:'Second concern'}];
    const columns=[{key:'ticket_id',label:'Report'},{key:'issue',label:'Issue'}];
    const table=renderToStaticMarkup(wrap(React.createElement(GovTable,{label:'Test register',columns,rows,rowKey:r=>r.id,onSelect:()=>{},selected:1})));
    assert.match(table,/<table>/);
    assert.match(table,/<caption class="sr-only">Test register/);
    assert.match(table,/type="button" class="gov-record-link"/);
    assert.match(table,/aria-expanded="true"/);
    assert.doesNotMatch(table,/role="button"/); // Keep native table semantics.

    let calls=0,focused=false;
    const trigger={focus:options=>{focused=options.preventScroll;}};
    const row=GovRecordRow({row:rows[0],columns,selected:false,onSelect:(record,element)=>{calls++;assert.equal(record.id,1);assert.equal(element,trigger);}});
    const event={target:{closest:()=>null},currentTarget:{querySelector:()=>trigger}};
    row.props.onClick(event);
    assert.equal(calls,1);assert.equal(focused,true); // Any ordinary cell opens once, preserving queue scroll.
    row.props.onClick({...event,target:{closest:()=>({})}});
    assert.equal(calls,1); // Buttons, links, checkboxes and labels retain their own action.
    window.getSelection=()=>({toString:()=> 'Selected evidence text'});
    row.props.onClick(event);assert.equal(calls,1); // Copying text must not navigate.
    window.getSelection=()=>({toString:()=>''});
    const readOnly=GovRecordRow({row:rows[0],columns,selected:false});
    assert.equal(readOnly.props.onClick,undefined);
    assert.doesNotMatch(readOnly.props.className,/is-openable/);

    const empty=renderToStaticMarkup(wrap(React.createElement(Selection,{reports:rows,selectedIds:[],onReview:()=>{},onClear:()=>{}})));
    assert.equal(empty,'');
    const selection=renderToStaticMarkup(wrap(React.createElement(Selection,{reports:rows,selectedIds:[1,2,999],activeId:1,onReview:()=>{},onClear:()=>{}})));
    assert.match(selection,/2 selected/);assert.match(selection,/ids=1%2C2/);assert.doesNotMatch(selection,/999/);
    assert.match(selection,/Review next selected report/);assert.doesNotMatch(selection,/Assign reviewer/);
    const header=renderToStaticMarkup(wrap(React.createElement(ThemeContext.Provider,{value:{theme:'light',isDark:false,changeTheme:()=>{}}},React.createElement(GovPageHeader,{title:'Reports',description:'Review incoming reports.',user:{full_name:'TEST Staff',role:'city_engineer'}}))));
    assert.match(header,/<header class="gov-page-header">/);assert.match(header,/<h1>Reports<\/h1>/);assert.doesNotMatch(header,/Citizen Services/);
    const {UpdateForm}=await server.ssrLoadModule('/src/pages/GovAnnouncementEditor.jsx');
    const scope={citywide_allowed:true,districts:[{id:1,name:'TEST District'}],barangays:[{id:1,name:'Barangay 171',district_id:1},{id:2,name:'171',district_id:1}]};
    const editor=renderToStaticMarkup(wrap(React.createElement(UpdateForm,{initial:null,permissions:{review:false},scope})));
    assert.match(editor,/Save draft/);assert.match(editor,/Send for review/);
    assert.match(editor,/appearance-none/);assert.match(editor,/type="file" class="sr-only"/);
    assert.match(editor,/Choose a file or drop it here/);assert.match(editor,/text-\[clamp\(24px,2\.8vw,36px\)\]/);
    assert.doesNotMatch(editor,/class="gov-field/);assert.doesNotMatch(editor,/multiple=""/);
    assert.doesNotMatch(editor,/Email, phone push and SMS broadcasting are not configured/);
    const restricted=renderToStaticMarkup(wrap(React.createElement(UpdateForm,{initial:null,permissions:{review:false},scope:{...scope,citywide_allowed:false,districts:[...scope.districts,{id:2,name:'TEST Second district'}]}})));
    assert.match(restricted,/Choose a district to select barangays/);assert.match(restricted,/No district selected/);
    assert.doesNotMatch(restricted,/<option value="">Citywide/);
    console.log('Government workspace component checks passed, including the publication editor, styled controls, upload input, review boundary and restricted audience state.');
} finally {
    await server.close();
}
