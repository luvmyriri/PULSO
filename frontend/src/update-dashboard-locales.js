import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const enPath = path.join(__dirname, 'locales', 'en.json');
const tlPath = path.join(__dirname, 'locales', 'tl.json');

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const tlData = JSON.parse(fs.readFileSync(tlPath, 'utf8'));

enData.translation.dashboard = {
    sidebar: {
        portal: "Resident Portal",
        overview: "Overview",
        reports: "My Reports",
        profile: "Profile",
        settings: "Settings",
        help: "Help & Support",
        signOut: "Sign Out"
    },
    overview: {
        greeting: "Good morning, {{name}}!",
        greetingSubtitle: "Your vigilance keeps '{{barangay}}' safe. Here is a summary of your community's active infrastructure status.",
        active: "Active",
        resolved: "Resolved",
        trustScore: "Trust Score",
        topReporters: "Top 5% of Reporters",
        recentActivity: "Recent Activity",
        viewAll: "View All",
        latestUpdate: "Latest Update"
    },
    quickReport: {
        title: "Quick Report",
        desc: "Snap a priority infrastructure hazard",
        remove: "Remove",
        tapCamera: "Tap to open Camera",
        coordsTagged: "Coordinates Tagged",
        acquiringGPS: "Acquiring GPS...",
        gpsStandby: "GPS Standby",
        requirePhoto: "Requires photo capture",
        placeholder: "Brief details about the hazard...",
        submit: "Submit Priority Report",
        zoneCoverage: "Zone 15 Coverage",
        gpsAccuracy: "GPS accuracy:"
    },
    offline: "Offline Mode: Reports will be saved locally.",
    reports: {
        history: "Report History",
        historyDesc: "Track the status of all your submitted infrastructure issues.",
        all: "All",
        pending: "Pending",
        resolved: "Resolved",
        allUpdates: "All Updates"
    },
    profile: {
        verified: "Verified Resident",
        personalInfo: "Personal Information",
        regName: "Registered Name",
        accountId: "Account ID",
        regAddress: "Registered Address (Barangay)",
        memberSince: "Member Since",
        update: "Update Information"
    },
    settings: {
        alerts: "Announcements & Alerts",
        alertsDesc: "Manage how the LGU contacts you for updates.",
        push: "Push Notifications",
        pushDesc: "Real-time alerts for your submitted reports.",
        sms: "SMS Emergency Alerts",
        smsDesc: "Critical infrastructure failures in your immediate area.",
        email: "Weekly Summary Emails",
        emailDesc: "A digest of fixes completed in your barangay.",
        privacy: "Privacy & Security",
        privacyDesc: "Manage your data and account security.",
        pw: "Change Password",
        loginActivity: "Review Login Activity",
        delete: "Request Account Deletion"
    },
    help: {
        assist: "Need direct assistance?",
        assistDesc: "Our support team is available during standard operating hours to assist with application issues.",
        contact: "Contact Support",
        hotlines: "Emergency Hotlines",
        hotlinesDesc: "For immediate life-threatening infrastructure failures, bypass the app and call these numbers directly.",
        cityEng: "City Engineering Desk",
        maynilad: "Maynilad Emergency",
        meralco: "Meralco Hotline",
        faq: "Frequently Asked Questions",
        q1: "How long does it take for a report to be verified?",
        a1: "Most priority reports submitted with clear GPS and photo evidence are reviewed by the engineering AI within 15 minutes. Manual review may take up to 2 hours.",
        q2: "What is a Trust Score?",
        a2: "Your Trust Score increases as you submit accurate, high-quality reports that get verified and resolved. Higher scores grant your future reports priority routing.",
        q3: "Can I report issues outside my registered barangay?",
        a3: "Yes. While your home base is pinned to your profile, the Quick Report tool uses your live phone GPS to tag the exact coordinate of the hazard, regardless of where you are in the city."
    },
    mock: {
        r1Type: "Water Pipe Burst",
        r1Desc: "Large pipe leaking onto the main road causing a slip hazard.",
        r1u1: "Report verified by engineering AI.",
        r1u2: "Team Beta dispatched to location.",
        r2Type: "Fallen Tree Branches",
        r2Desc: "Branches blocking the pedestrian walkway after last night's wind.",
        r2u1: "Report received and queued for review.",
        r3Type: "Streetlight Outage",
        r3Desc: "Three consecutive streetlights are out, making it very dark.",
        r3u1: "Report verified.",
        r3u2: "Maintenance crew replaced bulbs. Issue closed.",
        alertSuccess: "Report successfully submitted to the Engineering Office!",
        newReportText: "Report securely transmitted."
    }
};

tlData.translation.dashboard = {
    sidebar: {
        portal: "Portal ng Residente",
        overview: "Pangkalahatang-ideya",
        reports: "Mga Ulat Ko",
        profile: "Profile",
        settings: "Mga Setting",
        help: "Tulong at Suporta",
        signOut: "Mag-sign Out"
    },
    overview: {
        greeting: "Magandang umaga, {{name}}!",
        greetingSubtitle: "Ang iyong pagiging mapagmatyag ay nagpapanatiling ligtas sa '{{barangay}}'. Narito ang buod ng status ng imprastraktura ng iyong komunidad.",
        active: "Aktibo",
        resolved: "Naresolba",
        trustScore: "Trust Score",
        topReporters: "Nangungunang 5% na Nag-uulat",
        recentActivity: "Kamakailang Aktibidad",
        viewAll: "Tingnan Lahat",
        latestUpdate: "Pinakabagong Update"
    },
    quickReport: {
        title: "Mabilisang Ulat",
        desc: "Kuhanan ang pangunahing panganib sa imprastraktura",
        remove: "Alisin",
        tapCamera: "I-tap upang buksan ang Camera",
        coordsTagged: "Na-tag ang Coordinates",
        acquiringGPS: "Kumukuha ng GPS...",
        gpsStandby: "GPS Standby",
        requirePhoto: "Kinakailangang kumuha ng litrato",
        placeholder: "Maikling detalye tungkol sa panganib...",
        submit: "Isumite ang Pangunahing Ulat",
        zoneCoverage: "Saklaw ng Zone 15",
        gpsAccuracy: "Katumpakan ng GPS:"
    },
    offline: "Offline Mode: Ang mga ulat ay ise-save nang lokal.",
    reports: {
        history: "Kasaysayan ng Ulat",
        historyDesc: "Sundan ang katayuan ng lahat ng iyong isinumiteng isyu sa imprastraktura.",
        all: "Lahat",
        pending: "Nakabinbin",
        resolved: "Naresolba",
        allUpdates: "Lahat ng Updates"
    },
    profile: {
        verified: "Na-verify na Residente",
        personalInfo: "Personal na Impormasyon",
        regName: "Nakarehistrong Pangalan",
        accountId: "Account ID",
        regAddress: "Nakarehistrong Address (Barangay)",
        memberSince: "Miyembro Mula Noong",
        update: "I-update ang Impormasyon"
    },
    settings: {
        alerts: "Mga Anunsyo at Alerto",
        alertsDesc: "Pamahalaan kung paano nakikipag-ugnayan ang LGU sa iyo para sa mga update.",
        push: "Mga Push Notification",
        pushDesc: "Real-time na alerto para sa iyong mga isinumiteng ulat.",
        sms: "Mga SMS na Pang-emergency na Alerto",
        smsDesc: "Kritikal na pagkabigo ng imprastraktura sa iyong lugar.",
        email: "Lingguhang Buod na Email",
        emailDesc: "Isang buod ng mga pag-aayos na natapos sa inyong barangay.",
        privacy: "Pagkapribado at Seguridad",
        privacyDesc: "Pamahalaan ang iyong data at seguridad ng account.",
        pw: "Palitan ang Password",
        loginActivity: "Suriin ang Aktibidad sa Pag-login",
        delete: "Humiling na Tanggalin ang Account"
    },
    help: {
        assist: "Kailangan ng direktang tulong?",
        assistDesc: "Available ang aming support team sa mga oras ng pagpapatakbo upang tumulong sa mga isyu sa application.",
        contact: "Makipag-ugnayan sa Suporta",
        hotlines: "Mga Hotline Pang-emergency",
        hotlinesDesc: "Para sa agad na mga pagkabigo sa imprastraktura na nagbabanta sa buhay, tawagan nang direkta ang mga numerong ito.",
        cityEng: "City Engineering Desk",
        maynilad: "Maynilad Emergency",
        meralco: "Meralco Hotline",
        faq: "Mga Madalas Itanong",
        q1: "Gaano katagal bago ma-verify ang isang ulat?",
        a1: "Ang karamihan sa mga pangunahing ulat na isinumite na may malinaw na GPS at litrato ay sinusuri ng engineering AI sa loob ng 15 minuto. Maaaring abutin nang hanggang 2 oras kapag manu-mano.",
        q2: "Ano ang Trust Score?",
        a2: "Tumataas ang iyong Trust Score kapag nagsumite ka ng tumpak, may mataas na kalidad na mga ulat na nabe-verify at nareresolba. Ang mas matataas na marka ay nagbibigay ng priyoridad sa iyong mga ulat.",
        q3: "Maaari ba akong mag-ulat ng mga isyu sa labas ng aking nakarehistrong barangay?",
        a3: "Oo. Habang nakapako ang iyong home base sa iyong profile, ginagamit ng Quick Report tool ang iyong live na GPS upang i-tag ang eksaktong coordinate ng panganib, nasaan ka man sa lungsod."
    },
    mock: {
        r1Type: "Pumutok na Tubo ng Tubig",
        r1Desc: "Malaking tubo na tumutulo sa pangunahing kalsada na nagdudulot ng panganib sa pagkadulas.",
        r1u1: "Ulat na na-verify ng engineering AI.",
        r1u2: "Ipinadala ang Team Beta sa lokasyon.",
        r2Type: "Mga Natumbang Sanga ng Puno",
        r2Desc: "Mga sanga na humaharang sa daanan ng mga naglalakad pagkatapos ng hangin kagabi.",
        r2u1: "Ulat na natanggap at nakapila para sa pagsusuri.",
        r3Type: "Patay na Ilaw sa Kalye",
        r3Desc: "Tatlong sunod-sunod na ilaw sa kalye ang patay, kaya't napakadilim.",
        r3u1: "Ulat na na-verify.",
        r3u2: "Pinalitan ng mga maintenance crew ang bombilya. Isyu isinara.",
        alertSuccess: "Matagumpay na isinumite ang ulat sa Engineering Office!",
        newReportText: "Ligtas na naipadala ang ulat."
    }
};

fs.writeFileSync(enPath, JSON.stringify(enData, null, 2));
fs.writeFileSync(tlPath, JSON.stringify(tlData, null, 2));
console.log('Dashboard locales added');
