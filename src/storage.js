import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'

const DB_NAME = 'hesabaty'
const TABLE = 'app_storage'

let native = false
let db = null
let cache = new Map()
let initialized = false

function snapshotLocalStorage() {
  const result = []
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i)
    if (key) result.push([key, window.localStorage.getItem(key)])
  }
  return result
}

async function initNativeStorage() {
  const sqlite = new SQLiteConnection(CapacitorSQLite)
  db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false)
  await db.open()
  await db.execute(`CREATE TABLE IF NOT EXISTS ${TABLE} (key TEXT PRIMARY KEY NOT NULL, value TEXT)`)

  const result = await db.query(`SELECT key, value FROM ${TABLE}`)
  const rows = result.values || []

  // أول تشغيل بعد التحويل: ننقل بيانات localStorage القديمة مرة واحدة إلى SQLite.
  if (rows.length === 0) {
    const oldData = snapshotLocalStorage()
    for (const [key, value] of oldData) {
      await db.run(
        `INSERT OR REPLACE INTO ${TABLE} (key, value) VALUES (?, ?)`,
        [key, value]
      )
    }
    cache = new Map(oldData)
  } else {
    cache = new Map(rows.map(row => [row.key, row.value]))
  }

  patchLocalStorage()
  initialized = true
}

function patchLocalStorage() {
  const storage = window.localStorage
  storage.getItem = key => cache.has(String(key)) ? cache.get(String(key)) : null
  storage.setItem = (key, value) => {
    const k = String(key)
    const v = String(value)
    cache.set(k, v)
    // الكتابة في SQLite غير متزامنة، لكن التطبيق يحتفظ بالكاش فورًا.
    db.run(
      `INSERT OR REPLACE INTO ${TABLE} (key, value) VALUES (?, ?)`,
      [k, v]
    ).catch(console.error)
  }
  storage.removeItem = key => {
    const k = String(key)
    cache.delete(k)
    db.run(`DELETE FROM ${TABLE} WHERE key = ?`, [k]).catch(console.error)
  }
  storage.clear = () => {
    cache.clear()
    db.execute(`DELETE FROM ${TABLE}`).catch(console.error)
  }
  storage.key = index => {
    const keys = Array.from(cache.keys())
    return keys[index] ?? null
  }}

export async function initStorage() {
  if (initialized) return

  native = Capacitor.isNativePlatform()
  if (native) {
    try {
      await initNativeStorage()
      return
    } catch (error) {
      console.error('SQLite initialization failed:', error)
      // fallback آمن للويب/التطوير بدل تعطيل التطبيق بالكامل.
    }
  }

  initialized = true
}

export function isSQLiteStorage() {
  return native && Boolean(db)
}
