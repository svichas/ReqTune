# ReqTune privacy policy

Effective 3 November 2026. Applies to ReqTune 0.1.5 and later.

ReqTune collects no data. It makes no network requests, has no server, and includes no analytics, advertising or tracking. Nothing you enter ever leaves your device.

## What ReqTune stores

- **Your groups.** The names, URL patterns and headers (names and values) you enter are saved in Chrome's local extension storage (`chrome.storage.local`) on your device, so they persist between sessions. Header values, including tokens you type, are stored unencrypted there. Anyone with access to your Chrome profile can read them.
- **Tab picks.** If you target a group at specific tabs, ReqTune saves only the ids of the tabs you pick, in session storage (`chrome.storage.session`). Chrome clears it when it restarts.

ReqTune doesn't use synced storage, so your groups aren't uploaded to your Google account. Removing the extension deletes everything it stored.

## How ReqTune uses your data

Only to do what you set it up to do. Your groups are turned into Chrome `declarativeNetRequest` rules, and Chrome itself adds your headers to matching requests. ReqTune doesn't read page content, request or response bodies, cookies or your browsing history.

The tab picker reads the titles, addresses and icons of your open tabs to show them in the list. This happens on your device, and none of it is saved or sent anywhere. Site icons come from Chrome's local icon cache.

## Sharing

ReqTune doesn't sell, share or transfer your data to anyone, because it never has it.

## Permissions

| Permission | Why |
| --- | --- |
| Access to all sites | Applies your headers on whichever sites your patterns name. You can limit it in the extension's Chrome settings. |
| `declarativeNetRequestWithHostAccess` | Applies the header rules |
| `storage` | Saves your groups |
| `sidePanel` | Shows the interface in Chrome's side panel |
| `favicon` | Shows site icons in the tab picker |

## Headers you send

Headers you set are sent by Chrome to the sites your patterns match, as part of your normal browsing. Those sites receive them, so don't set a header with a secret on a pattern broader than you intend.

## Changes and contact

If this policy changes, the new version will be published here with a new effective date.

Questions or concerns: [open an issue](https://github.com/svichas/ReqTune/issues).
