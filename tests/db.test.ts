import "fake-indexeddb/auto"
import { describe, it, expect, beforeEach } from "vitest"
import {
  upsertContact,
  addInteraction,
  getAllContacts,
  getContact,
  updateContactStatus,
  updateContact,
  deleteContact,
  getInteractionsForContact,
  getFollowUpsDue,
} from "../background/db"

beforeEach(() => {
  // Reset IndexedDB between tests
  indexedDB = new IDBFactory()
})

describe("upsertContact", () => {
  it("inserts a new contact", async () => {
    const id = await upsertContact({
      name: "John Doe",
      linkedinUrl: "https://www.linkedin.com/in/john-doe/",
      company: "Goldman Sachs",
      title: "VP",
      firstContactDate: "2026-07-01T00:00:00Z",
      lastContactDate: "2026-07-01T00:00:00Z",
      status: "copied",
      source: "coldcraft",
    })
    expect(id).toBeGreaterThan(0)

    const contacts = await getAllContacts()
    expect(contacts).toHaveLength(1)
    expect(contacts[0].name).toBe("John Doe")
  })

  it("updates existing contact by linkedinUrl", async () => {
    await upsertContact({
      name: "John Doe",
      linkedinUrl: "https://www.linkedin.com/in/john-doe/",
      company: "Goldman Sachs",
      title: "VP",
      firstContactDate: "2026-07-01T00:00:00Z",
      lastContactDate: "2026-07-01T00:00:00Z",
      status: "copied",
      source: "coldcraft",
    })

    await upsertContact({
      name: "John Doe Updated",
      linkedinUrl: "https://www.linkedin.com/in/john-doe/",
      company: "JPMorgan",
      title: "MD",
      firstContactDate: "2026-07-05T00:00:00Z",
      lastContactDate: "2026-07-05T00:00:00Z",
      status: "copied",
      source: "coldcraft",
    })

    const contacts = await getAllContacts()
    expect(contacts).toHaveLength(1)
    expect(contacts[0].name).toBe("John Doe Updated")
    expect(contacts[0].company).toBe("JPMorgan")
  })

  it("preserves existing status on upsert with copied status", async () => {
    await upsertContact({
      name: "Jane",
      linkedinUrl: "https://www.linkedin.com/in/jane/",
      company: "MS",
      title: "",
      firstContactDate: "2026-07-01T00:00:00Z",
      lastContactDate: "2026-07-01T00:00:00Z",
      status: "waiting",
      source: "coldcraft",
    })

    await upsertContact({
      name: "Jane",
      linkedinUrl: "https://www.linkedin.com/in/jane/",
      company: "MS",
      title: "",
      firstContactDate: "2026-07-02T00:00:00Z",
      lastContactDate: "2026-07-02T00:00:00Z",
      status: "copied",
      source: "coldcraft",
    })

    const contacts = await getAllContacts()
    expect(contacts[0].status).toBe("waiting")
  })
})

describe("addInteraction", () => {
  it("adds an interaction linked to a contact", async () => {
    const contactId = await upsertContact({
      name: "Test",
      linkedinUrl: "https://www.linkedin.com/in/test/",
      company: "Test Co",
      title: "",
      firstContactDate: "2026-07-01T00:00:00Z",
      lastContactDate: "2026-07-01T00:00:00Z",
      status: "copied",
      source: "coldcraft",
    })

    const id = await addInteraction({
      contactId,
      messageText: "Hello!",
      messageType: "cold",
      date: "2026-07-01T00:00:00Z",
    })

    expect(id).toBeGreaterThan(0)
    const interactions = await getInteractionsForContact(contactId)
    expect(interactions).toHaveLength(1)
    expect(interactions[0].messageText).toBe("Hello!")
  })
})

describe("updateContactStatus", () => {
  it("updates the status of a contact", async () => {
    const id = await upsertContact({
      name: "Test",
      linkedinUrl: "https://www.linkedin.com/in/test/",
      company: "Co",
      title: "",
      firstContactDate: "2026-07-01T00:00:00Z",
      lastContactDate: "2026-07-01T00:00:00Z",
      status: "copied",
      source: "coldcraft",
    })

    await updateContactStatus(id, "waiting")
    const contact = await getContact(id)
    expect(contact?.status).toBe("waiting")
  })
})

describe("updateContact", () => {
  it("updates contact fields", async () => {
    const id = await upsertContact({
      name: "Old Name",
      linkedinUrl: "https://www.linkedin.com/in/test/",
      company: "Old Co",
      title: "Old Title",
      firstContactDate: "2026-07-01T00:00:00Z",
      lastContactDate: "2026-07-01T00:00:00Z",
      status: "copied",
      source: "coldcraft",
    })

    await updateContact(id, { name: "New Name", company: "New Co" })
    const contact = await getContact(id)
    expect(contact?.name).toBe("New Name")
    expect(contact?.company).toBe("New Co")
    expect(contact?.title).toBe("Old Title")
  })
})

describe("deleteContact", () => {
  it("removes the contact and its interactions", async () => {
    const id = await upsertContact({
      name: "Delete Me",
      linkedinUrl: "https://www.linkedin.com/in/delete/",
      company: "Co",
      title: "",
      firstContactDate: "2026-07-01T00:00:00Z",
      lastContactDate: "2026-07-01T00:00:00Z",
      status: "copied",
      source: "coldcraft",
    })

    await addInteraction({ contactId: id, messageText: "Hi", messageType: "cold", date: "2026-07-01T00:00:00Z" })
    await deleteContact(id)

    const contacts = await getAllContacts()
    expect(contacts).toHaveLength(0)
    const interactions = await getInteractionsForContact(id)
    expect(interactions).toHaveLength(0)
  })
})

describe("getFollowUpsDue", () => {
  it("returns contacts in waiting status older than threshold", async () => {
    const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    const recentDate = new Date().toISOString()

    await upsertContact({
      name: "Old Waiting",
      linkedinUrl: "https://www.linkedin.com/in/old/",
      company: "Co",
      title: "",
      firstContactDate: oldDate,
      lastContactDate: oldDate,
      status: "waiting",
      source: "coldcraft",
    })

    await upsertContact({
      name: "Recent Waiting",
      linkedinUrl: "https://www.linkedin.com/in/recent/",
      company: "Co",
      title: "",
      firstContactDate: recentDate,
      lastContactDate: recentDate,
      status: "waiting",
      source: "coldcraft",
    })

    await upsertContact({
      name: "Old Replied",
      linkedinUrl: "https://www.linkedin.com/in/replied/",
      company: "Co",
      title: "",
      firstContactDate: oldDate,
      lastContactDate: oldDate,
      status: "replied",
      source: "coldcraft",
    })

    const due = await getFollowUpsDue(7)
    expect(due).toHaveLength(1)
    expect(due[0].name).toBe("Old Waiting")
  })
})
