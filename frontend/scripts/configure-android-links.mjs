import { readFile, writeFile } from 'node:fs/promises';

const manifestPath = new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url);
let manifest = await readFile(manifestPath, 'utf8');

const marker = 'android:autoVerify="true"';
if (!manifest.includes(marker)) {
  const activityEnd = manifest.indexOf('</activity>');
  if (activityEnd < 0) throw new Error('Could not find the MainActivity closing tag in AndroidManifest.xml');

  const intentFilter = `
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="medio.mywire.org" android:pathPrefix="/share/" />
            </intent-filter>
`;

  manifest = `${manifest.slice(0, activityEnd)}${intentFilter}${manifest.slice(activityEnd)}`;
  await writeFile(manifestPath, manifest);
}

console.log('Android App Link filter is configured for https://medio.mywire.org/share/.');
