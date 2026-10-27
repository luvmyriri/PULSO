import { useContext, useMemo, useState } from 'react';
import { GovAssistantContext } from './govAssistantContext';

export function GovAssistantProvider({ children }) {
    const [host, setHost] = useState(null);
    const value = useMemo(() => ({ host, setHost }), [host]);
    return <GovAssistantContext.Provider value={value}>{children}</GovAssistantContext.Provider>;
}

export function GovAssistantSlot() {
    const { setHost } = useContext(GovAssistantContext);
    return <div ref={setHost} className="gov-assistant-slot" />;
}
