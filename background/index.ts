import { getFollowUpsDue, migrateFromHistory } from "./db"

async function recalcBadge() {
  try {
    const due = await getFollowUpsDue()
    await chrome.action.setBadgeText({ text: due.length > 0 ? String(due.length) : "" })
    await chrome.action.setBadgeBackgroundColor({ color: "#fbbf24" })
  } catch {}
}

chrome.runtime.onInstalled.addListener(async () => {
  await migrateFromHistory()
  await chrome.alarms.create("recalcBadge", { periodInMinutes: 1440 })
  await recalcBadge()
})

chrome.runtime.onStartup.addListener(async () => {
  await recalcBadge()
})

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "recalcBadge") {
    await recalcBadge()
  }
})

export {}
