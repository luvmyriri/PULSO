// Google publishes this key for local v2 testing. Never select it in a production build.
const LOCAL_TEST_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

export function getRecaptchaConfig() {
    const hostname = typeof window === 'undefined' ? '' : window.location.hostname;
    const localTest = import.meta.env.DEV
        && import.meta.env.VITE_RECAPTCHA_LOCAL_TEST === 'true'
        && loopbackHosts.has(hostname);
    return {
        localTest,
        siteKey: localTest ? LOCAL_TEST_SITE_KEY : import.meta.env.VITE_RECAPTCHA_SITE_KEY || '',
    };
}
