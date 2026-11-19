

const RoadIcon = ({ size = 20, className = "" }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M4 19L9 5M20 19L15 5M12 7V9M12 13V15M12 19V21" />
    </svg>
);
export default RoadIcon;
