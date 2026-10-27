import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { GovButton } from '../components/government/GovWorkspace';
import { governmentRequest } from '../utils/governmentApi';

export default function StaffPasswordPage(){
    const [token,setToken]=useState(()=>new URLSearchParams(window.location.hash.slice(1)).get('token')||'');
    const [busy,setBusy]=useState(false);
    const [error,setError]=useState('');
    const [success,setSuccess]=useState(false);
    const form=useRef(null);
    const result=useRef(null);
    async function save(event){
        event.preventDefault();if(busy)return;
        const values=new FormData(form.current);
        if(values.get('password')!==values.get('confirmation')){setError('The passwords do not match. Re-enter the confirmation.');return;}
        setBusy(true);setError('');
        try{
            await governmentRequest('/api/admin/staff-credentials/accept',{method:'POST',body:{token,password:values.get('password')}});
            form.current.reset();setToken('');setSuccess(true);window.history.replaceState(null,'',window.location.pathname);requestAnimationFrame(()=>result.current?.focus());
        }catch(cause){setError(cause.message);}finally{setBusy(false);}
    }
    return <div className="gov-core-workspace gov-account-page"><main className="gov-account-sheet"><header><Link to="/gov" className="gov-record-link">PULSO · Government</Link><ThemeToggle/></header>
        {success?<><h1 ref={result} tabIndex={-1}>Your password is saved</h1><p>Sign in with your staff email and new password.</p><Link className="gov-button is-primary" to="/gov">Staff sign-in</Link></>:<><h1>Set your staff password</h1>{token.length<40?<><p>This account link is missing or incomplete. Ask your administrator for a new invitation or recovery link.</p><Link className="gov-record-link" to="/gov">Back to staff sign-in</Link></>:<><p>Choose a password for your PULSO staff account.</p><form ref={form} onSubmit={save}><label className="gov-field">New password<input name="password" type="password" required minLength={12} maxLength={72} autoComplete="new-password" aria-describedby="staff-password-help" disabled={busy}/></label><p id="staff-password-help">Use at least 12 characters. A longer passphrase is easier to remember.</p><label className="gov-field">Confirm new password<input name="confirmation" type="password" required minLength={12} maxLength={72} autoComplete="new-password" disabled={busy}/></label>{error&&<p className="gov-error" role="alert">{error}</p>}<GovButton primary type="submit" disabled={busy}>{busy?'Saving password…':'Save password'}</GovButton></form></>}</>}
    </main></div>;
}
