// Synthetic UI-only fixture, excluded from the production entry. No city data.
import React from 'react';
import { createRoot } from 'react-dom/client';
import ReviewerAvailability from '../../src/components/government/ReviewerAvailability';
import '../../src/index.css';
import '../../src/components/government/gov-workspace.css';

let fail = false;
const state = { eligible:true, state:'offline', effective_state:'offline', capacity:5, open_reviews:2, version:0,
    heartbeat_seconds:30, lease_seconds:120, last_seen_at:null, accepting_new_reviews:false, routing_enabled:true };
window.fetch = async (url, options={}) => {
    if (!String(url).includes('/api/gov/report-review/availability/me')) return new Response('{}',{status:404});
    if (fail) return new Response(JSON.stringify({detail:'SAMPLE connection failure; no live employee record.'}),{status:503});
    if (options.method === 'PATCH') {
        const payload = JSON.parse(options.body);
        if (payload.expected_version !== state.version) return new Response(JSON.stringify({detail:'SAMPLE stale status. Refresh.'}),{status:409});
        Object.assign(state, {state:payload.state,capacity:payload.capacity,version:state.version+1,last_seen_at:new Date().toISOString()});
    }
    state.effective_state = state.state === 'available' && state.open_reviews >= state.capacity ? 'at_capacity' : state.state;
    state.accepting_new_reviews = state.effective_state === 'available';
    return new Response(JSON.stringify(state),{headers:{'Content-Type':'application/json'}});
};

createRoot(document.getElementById('root')).render(<main style={{minHeight:'100vh',background:'var(--gov-canvas)',color:'var(--gov-text)'}}>
    <header className="gov-page-header"><div className="gov-page-heading"><h1>SAMPLE review queue</h1><p>Synthetic UI fixture. No employee or city record.</p></div>
        <div className="gov-page-header__account"><ReviewerAvailability userId={3}/></div>
    </header>
    <section style={{padding:16,display:'flex',flexWrap:'wrap',gap:12}}>
        <button className="gov-button" onClick={()=>document.documentElement.classList.toggle('dark')}>Toggle fixture theme</button>
        <label><input type="checkbox" onChange={e=>{fail=e.target.checked;}}/> Simulate connection error</label>
        <button className="gov-button" onClick={()=>Object.assign(state,{state:'away',version:state.version+1})}>Simulate another tab choosing Away</button>
        <p>Available accepts new reviews; Away and Offline retain existing work.</p>
    </section>
</main>);
