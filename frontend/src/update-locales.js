import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const enPath = path.join(__dirname, 'locales', 'en.json');
const tlPath = path.join(__dirname, 'locales', 'tl.json');

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const tlData = JSON.parse(fs.readFileSync(tlPath, 'utf8'));

enData.translation.register = {
    home: "Home",
    welcome: "Welcome to",
    pulso: "PULSO",
    desc: "Create your account to unlock premium structural reporting features and stay updated with the latest community news. Join our network and embark on an exciting journey with us!",
    createAccount: "Create your account",
    fullName: "Full name",
    enterFullName: "Enter full name",
    mobile: "Mobile Number",
    mobilePlaceholder: "e.g. 0917 123 4567",
    barangay: "Home Barangay",
    selectArea: "Select Area...",
    brgy_bs: "Bagong Silang (176)",
    brgy_tala: "Tala (180, 184-188)",
    brgy_camarin: "Camarin (174-178)",
    brgy_deparo: "Deparo (168, 170)",
    password: "Password",
    enterPassword: "Enter Password",
    terms: "I agree to the terms and Conditions",
    signUp: "Sign Up",
    haveAccount: "Already have an account?",
    signIn: "Sign In"
};

tlData.translation.register = {
    home: "Home",
    welcome: "Maligayang pagdating sa",
    pulso: "PULSO",
    desc: "Lumikha ng iyong account upang ma-access ang premium na mga tampok sa pag-uulat ng istraktura at manatiling napapanahon sa pinakabagong balita sa komunidad. Sumali sa aming network at simulan ang isang kapana-panabik na paglalakbay kasama namin!",
    createAccount: "Gumawa ng account",
    fullName: "Buong pangalan",
    enterFullName: "Ilagay ang buong pangalan",
    mobile: "Numero ng Mobile",
    mobilePlaceholder: "hal. 0917 123 4567",
    barangay: "Barangay",
    selectArea: "Pumili ng Lugar...",
    brgy_bs: "Bagong Silang (176)",
    brgy_tala: "Tala (180, 184-188)",
    brgy_camarin: "Camarin (174-178)",
    brgy_deparo: "Deparo (168, 170)",
    password: "Password",
    enterPassword: "Ilagay ang Password",
    terms: "Sumasang-ayon ako sa mga tuntunin at kundisyon",
    signUp: "Mag-sign Up",
    haveAccount: "May account na?",
    signIn: "Mag-sign In"
};

fs.writeFileSync(enPath, JSON.stringify(enData, null, 2));
fs.writeFileSync(tlPath, JSON.stringify(tlData, null, 2));
console.log('Register JSON written');
