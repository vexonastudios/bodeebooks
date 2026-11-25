// Shared by the account download panel and the family setup guide.
export async function requestInstallerCode() {
  const response = await fetch('/guard/install/code/', {
    method:'POST', credentials:'same-origin', cache:'no-store', redirect:'error', signal:AbortSignal.timeout(15000)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.code || !(Date.parse(result.expiresAt) > Date.now()))
    throw Error(result.error || 'Could not create a download code. Please try again.');
  return result;
}
