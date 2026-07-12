export type ContactStatus = "copied" | "waiting" | "replied" | "dead"
export type ContactSource = "coldcraft" | "manual"

export type Contact = {
  id?: number
  name: string
  linkedinUrl: string
  company: string
  title: string
  firstContactDate: string
  lastContactDate: string
  status: ContactStatus
  source: ContactSource
  notes?: string
}

export type Interaction = {
  id?: number
  contactId: number
  messageText: string
  messageType: string
  date: string
  notes?: string
}

const DB_NAME = "coldcraft-tracker"
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains("contacts")) {
        const contactStore = db.createObjectStore("contacts", { keyPath: "id", autoIncrement: true })
        contactStore.createIndex("linkedinUrl", "linkedinUrl", { unique: true })
      }
      if (!db.objectStoreNames.contains("interactions")) {
        const interactionStore = db.createObjectStore("interactions", { keyPath: "id", autoIncrement: true })
        interactionStore.createIndex("contactId", "contactId", { unique: false })
      }
    }
  })
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err: any) {
    if (err?.name === "AbortError" || err?.name === "InvalidStateError") {
      return await fn()
    }
    throw err
  }
}

export async function upsertContact(contact: Omit<Contact, "id">): Promise<number> {
  return withRetry(async () => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction("contacts", "readwrite")
      const store = tx.objectStore("contacts")
      const index = store.index("linkedinUrl")
      const getReq = index.get(contact.linkedinUrl)

      getReq.onsuccess = () => {
        const existing = getReq.result as Contact | undefined
        if (existing) {
          const updated: Contact = {
            ...existing,
            name: contact.name || existing.name,
            company: contact.company || existing.company,
            title: contact.title || existing.title,
            lastContactDate: contact.lastContactDate,
            status: contact.status !== "copied" ? contact.status : existing.status,
            notes: contact.notes ?? existing.notes,
          }
          const putReq = store.put(updated)
          putReq.onsuccess = () => resolve(updated.id!)
          putReq.onerror = () => reject(putReq.error)
        } else {
          const addReq = store.add(contact)
          addReq.onsuccess = () => resolve(addReq.result as number)
          addReq.onerror = () => reject(addReq.error)
        }
      }
      getReq.onerror = () => reject(getReq.error)
      tx.oncomplete = () => db.close()
      tx.onerror = () => { db.close(); reject(tx.error) }
    })
  })
}

export async function addInteraction(interaction: Omit<Interaction, "id">): Promise<number> {
  return withRetry(async () => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction("interactions", "readwrite")
      const store = tx.objectStore("interactions")
      const req = store.add(interaction)
      req.onsuccess = () => resolve(req.result as number)
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => db.close()
      tx.onerror = () => { db.close(); reject(tx.error) }
    })
  })
}

export async function getAllContacts(): Promise<Contact[]> {
  return withRetry(async () => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction("contacts", "readonly")
      const store = tx.objectStore("contacts")
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => db.close()
    })
  })
}

export async function getContact(id: number): Promise<Contact | undefined> {
  return withRetry(async () => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction("contacts", "readonly")
      const store = tx.objectStore("contacts")
      const req = store.get(id)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => db.close()
    })
  })
}

export async function updateContactStatus(id: number, status: ContactStatus): Promise<void> {
  return withRetry(async () => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction("contacts", "readwrite")
      const store = tx.objectStore("contacts")
      const req = store.get(id)
      req.onsuccess = () => {
        const contact = req.result as Contact | undefined
        if (!contact) { reject(new Error("Contact not found")); return }
        contact.status = status
        store.put(contact)
      }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    })
  })
}

export async function updateContact(id: number, updates: Partial<Pick<Contact, "name" | "company" | "title" | "notes">>): Promise<void> {
  return withRetry(async () => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction("contacts", "readwrite")
      const store = tx.objectStore("contacts")
      const req = store.get(id)
      req.onsuccess = () => {
        const contact = req.result as Contact | undefined
        if (!contact) { reject(new Error("Contact not found")); return }
        if (updates.name !== undefined) contact.name = updates.name
        if (updates.company !== undefined) contact.company = updates.company
        if (updates.title !== undefined) contact.title = updates.title
        if (updates.notes !== undefined) contact.notes = updates.notes
        store.put(contact)
      }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    })
  })
}

export async function deleteContact(id: number): Promise<void> {
  return withRetry(async () => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["contacts", "interactions"], "readwrite")
      const contactStore = tx.objectStore("contacts")
      const interactionStore = tx.objectStore("interactions")
      const interactionIndex = interactionStore.index("contactId")

      contactStore.delete(id)
      const cursorReq = interactionIndex.openCursor(IDBKeyRange.only(id))
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    })
  })
}

export async function getInteractionsForContact(contactId: number): Promise<Interaction[]> {
  return withRetry(async () => {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction("interactions", "readonly")
      const store = tx.objectStore("interactions")
      const index = store.index("contactId")
      const req = index.getAll(contactId)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
      tx.oncomplete = () => db.close()
    })
  })
}

export async function getFollowUpsDue(daysThreshold = 7): Promise<Contact[]> {
  const contacts = await getAllContacts()
  const cutoff = Date.now() - daysThreshold * 24 * 60 * 60 * 1000
  return contacts.filter(
    (c) => c.status === "waiting" && new Date(c.lastContactDate).getTime() < cutoff
  )
}

export async function migrateFromHistory(): Promise<{ migrated: number }> {
  const result = await chrome.storage.local.get(["message_history", "trackerMigrationComplete"])
  if (result.trackerMigrationComplete) return { migrated: 0 }

  const history: Array<{ text: string; date: string; recipientName: string }> = result.message_history || []
  let migrated = 0

  for (const entry of history) {
    const linkedinUrl = `https://www.linkedin.com/in/${entry.recipientName.toLowerCase().replace(/\s+/g, "-")}`
    const contactId = await upsertContact({
      name: entry.recipientName,
      linkedinUrl,
      company: "",
      title: "",
      firstContactDate: entry.date,
      lastContactDate: entry.date,
      status: "copied",
      source: "coldcraft",
    })
    await addInteraction({
      contactId,
      messageText: entry.text,
      messageType: "cold",
      date: entry.date,
    })
    migrated++
  }

  await chrome.storage.local.set({ trackerMigrationComplete: true })
  await chrome.storage.local.remove("message_history")
  return { migrated }
}
