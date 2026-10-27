import './ai-brand-mark.css';

/** User-supplied PULSO AI artwork; labels belong to the enclosing control. */
export default function AiBrandMark({ className = '', size }) {
    return <span className={`ai-brand-mark ${className}`} style={size ? { width: size, height: size } : undefined} aria-hidden="true">
        <img src="/pulso-ai-logo.png" alt="" width="1263" height="1246" draggable="false" />
    </span>;
}
