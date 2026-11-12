export function updateState(release, installed) {
  if (release?.applicationId !== installed.id || !Number.isSafeInteger(release.versionCode) ||
      release.versionCode < 1 || typeof release.versionName !== 'string' ||
      !/^\d+\.\d+\.\d+$/.test(release.versionName) || !/^[a-f0-9]{64}$/.test(release.sha256) ||
      !Number.isSafeInteger(release.size) || release.size <= 0 || !/^\d+$/.test(installed.build)) {
    throw new Error('Invalid app update response');
  }
  return release.versionCode > Number(installed.build) ? 'available' : 'current';
}
